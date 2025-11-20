import os
from dotenv import load_dotenv
import boto3
import requests
load_dotenv()

class ParsingTools:
    def __init__(self):
        # Upstage
        self.upstage_api_key = os.getenv('UPSTAGE_API_KEY')
        self.upstage_url = os.getenv('UPSTAGE_URL')
        # S3 클라이언트
        aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
        aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        aws_region = os.getenv('AWS_REGION', 'ap-northeast-2')
        self.bucket_name = os.getenv('S3_BUCKET_NAME')
        self.s3 = boto3.client(
            's3',
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            region_name=aws_region
        )
    
    def parse_image_to_content(self, image):
        """이미지 파일을 S3에서 가져와서 Upstage로 파싱"""
        file_content = self.s3.get_object(Bucket=self.bucket_name, Key=image)['Body'].read()
        filename = image.split('/')[-1]  # 파일명 추출
        return self._upstage_parse(file_content, filename)
    
    def parse_attachment_to_content(self, attachment):
        """첨부파일을 S3에서 가져와서 Upstage로 파싱"""
        file_content = self.s3.get_object(Bucket=self.bucket_name, Key=attachment)['Body'].read()
        filename = attachment.split('/')[-1]  # 파일명 추출
        return self._upstage_parse(file_content, filename)
    
    def _upstage_parse(self, file_content, filename="document.hwp"):
        """Upstage API를 사용하여 파일 내용을 파싱"""
        headers = {"Authorization": f"Bearer {self.upstage_api_key}"}
        
        # 파일을 올바른 형식으로 전송 (파일명, 내용, MIME 타입)
        files = {"document": (filename, file_content, "application/octet-stream")}
        
        # data 파라미터 수정 (문자열이 아닌 리스트/값으로)
        data = {
            "ocr": "force",
            "model": "document-parse",
            "output_format": "html"
        }
        
        try:
            response = requests.post(self.upstage_url, headers=headers, files=files, data=data)
            
            # 응답 상태 체크
            if response.status_code != 200:
                return None
            
            result = response.json()
            
            # 응답 구조에 따라 content 추출
            if "content" in result:
                content = result["content"]
                if isinstance(content, dict):
                    # content가 dict인 경우 html 키 확인
                    return content.get("html") or content.get("text") or str(content)
                else:
                    # content가 문자열인 경우
                    return content
            elif "html" in result:
                return result["html"]
            elif "text" in result:
                return result["text"]
            else:
                return None
                
        except Exception as e:
            return None