import os
import io
import zipfile
import logging
from dotenv import load_dotenv
import boto3
import requests

load_dotenv()

# 로거 설정
logger = logging.getLogger('ai.parsing_tools')


class ParsingTools:
    """
    파싱 도구 클래스
    
    S3에서 파일을 다운로드하고 Upstage API로 파싱합니다.
    ZIP 파일의 경우 최대 3단계까지 중첩 탐색하여 내부 파일들을 개별 파싱합니다.
    """
    
    # 지원하는 파일 확장자
    SUPPORTED_EXTENSIONS = {
        '.hwp', '.pdf', '.docx', '.doc', 
        '.xlsx', '.xls', '.pptx', '.ppt',
        '.jpg', '.jpeg', '.png', '.gif', '.bmp'
    }
    
    # ZIP 최대 중첩 깊이
    MAX_ZIP_DEPTH = 3
    
    # 최대 파일 크기 (50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024
    
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
        """
        이미지 파일을 S3에서 가져와서 Upstage로 파싱
        
        Args:
            image: S3 key (예: 'images/123_0.jpg')
            
        Returns:
            list: 파싱된 파일 리스트
                [{'s3_url': ..., 's3_key': ..., 'parsed_content': ...}]
        """
        logger.debug(f"이미지 파싱 시작: {image}")
        base_url = f"https://{self.bucket_name}.s3.ap-northeast-2.amazonaws.com/{image}"
        
        try:
            file_content = self.s3.get_object(Bucket=self.bucket_name, Key=image)['Body'].read()
            filename = image.split('/')[-1]
            parsed = self._upstage_parse(file_content, filename)
            
            logger.debug(f"이미지 파싱 완료: {image}")
            return [{
                's3_url': base_url,
                's3_key': image,
                'parsed_content': parsed
            }]
        except Exception as e:
            logger.error(f"이미지 파싱 실패 ({image}): {e}")
            return [{
                's3_url': base_url,
                's3_key': image,
                'parsed_content': None,
                'error': str(e)
            }]
    
    def parse_attachment_to_content(self, attachment):
        """
        첨부파일을 S3에서 가져와서 Upstage로 파싱 (ZIP 파일 지원)
        
        Args:
            attachment: S3 key (예: 'attachments/123_서류.zip')
            
        Returns:
            list: 파싱된 파일 리스트
                [{'s3_url': ..., 's3_key': ..., 'parsed_content': ...}, ...]
        """
        logger.debug(f"첨부파일 파싱 시작: {attachment}")
        filename = attachment.split('/')[-1].lower()
        base_url = f"https://{self.bucket_name}.s3.ap-northeast-2.amazonaws.com/{attachment}"
        
        try:
            file_content = self.s3.get_object(Bucket=self.bucket_name, Key=attachment)['Body'].read()
            
            if filename.endswith('.zip'):
                # ZIP 파일 처리
                logger.info(f"ZIP 파일 감지: {attachment}")
                return self._parse_zip_recursive(
                    zip_content=file_content,
                    base_url=base_url,
                    base_key=attachment,
                    current_depth=1
                )
            else:
                # 일반 파일 처리
                parsed = self._upstage_parse(file_content, filename)
                logger.debug(f"첨부파일 파싱 완료: {attachment}")
                return [{
                    's3_url': base_url,
                    's3_key': attachment,
                    'parsed_content': parsed
                }]
        except Exception as e:
            logger.error(f"첨부파일 파싱 실패 ({attachment}): {e}")
            return [{
                's3_url': base_url,
                's3_key': attachment,
                'parsed_content': None,
                'error': str(e)
            }]
    
    def _parse_zip_recursive(self, zip_content, base_url, base_key, current_depth):
        """
        ZIP 파일 재귀 파싱 (최대 3단계)
        
        Args:
            zip_content: ZIP 파일 바이트 데이터
            base_url: 기본 S3 URL
            base_key: 기본 S3 key
            current_depth: 현재 중첩 깊이
            
        Returns:
            list: 파싱된 파일 리스트
        """
        results = []
        
        try:
            with zipfile.ZipFile(io.BytesIO(zip_content), 'r') as zf:
                file_list = zf.namelist()
                logger.info(f"ZIP 파일 내용 (depth={current_depth}): {len(file_list)}개 항목")
                
                for file_info in file_list:
                    # 디렉토리 건너뛰기
                    if file_info.endswith('/'):
                        continue
                    
                    # 파일명 추출
                    filename = file_info.split('/')[-1]
                    if not filename:
                        continue
                    
                    # 현재 파일의 URL과 Key 생성 (# 구분자 사용)
                    file_url = f"{base_url}#{file_info}"
                    file_key = f"{base_key}#{file_info}"
                    
                    try:
                        file_content = zf.read(file_info)
                        
                        # 파일 크기 체크
                        if len(file_content) > self.MAX_FILE_SIZE:
                            logger.warning(f"파일 크기 초과 (>{self.MAX_FILE_SIZE // 1024 // 1024}MB): {file_key}")
                            results.append({
                                's3_url': file_url,
                                's3_key': file_key,
                                'parsed_content': None,
                                'error': 'File size exceeded'
                            })
                            continue
                        
                        # 중첩 ZIP 파일 처리
                        if filename.lower().endswith('.zip'):
                            if current_depth < self.MAX_ZIP_DEPTH:
                                logger.info(f"중첩 ZIP 파일 발견 (depth={current_depth}): {filename}")
                                nested_results = self._parse_zip_recursive(
                                    zip_content=file_content,
                                    base_url=file_url,
                                    base_key=file_key,
                                    current_depth=current_depth + 1
                                )
                                results.extend(nested_results)
                            else:
                                logger.warning(f"최대 중첩 깊이 초과 ({self.MAX_ZIP_DEPTH}): {file_key}")
                                results.append({
                                    's3_url': file_url,
                                    's3_key': file_key,
                                    'parsed_content': None,
                                    'error': f'Max ZIP depth ({self.MAX_ZIP_DEPTH}) exceeded'
                                })
                        
                        # 지원하는 파일 형식 파싱
                        elif self._is_supported_file(filename):
                            logger.debug(f"파일 파싱 중: {filename}")
                            parsed = self._upstage_parse(file_content, filename)
                            results.append({
                                's3_url': file_url,
                                's3_key': file_key,
                                'parsed_content': parsed
                            })
                        else:
                            logger.debug(f"지원하지 않는 파일 형식 건너뜀: {filename}")
                            
                    except Exception as e:
                        logger.error(f"ZIP 내부 파일 처리 실패 ({file_info}): {e}")
                        results.append({
                            's3_url': file_url,
                            's3_key': file_key,
                            'parsed_content': None,
                            'error': str(e)
                        })
                        continue
                        
        except zipfile.BadZipFile:
            logger.error(f"손상된 ZIP 파일: {base_key}")
            results.append({
                's3_url': base_url,
                's3_key': base_key,
                'parsed_content': None,
                'error': 'Bad ZIP file'
            })
        except Exception as e:
            logger.error(f"ZIP 파일 처리 실패 ({base_key}): {e}")
            results.append({
                's3_url': base_url,
                's3_key': base_key,
                'parsed_content': None,
                'error': str(e)
            })
        
        logger.info(f"ZIP 파싱 완료 (depth={current_depth}): {len(results)}개 파일")
        return results
    
    def _is_supported_file(self, filename):
        """
        지원하는 파일 형식인지 확인
        
        Args:
            filename: 파일명
            
        Returns:
            bool: 지원 여부
        """
        if '.' not in filename:
            return False
        ext = '.' + filename.lower().split('.')[-1]
        return ext in self.SUPPORTED_EXTENSIONS
    
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
                logger.warning(f"Upstage API 오류 (상태 코드: {response.status_code}): {filename}")
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
                logger.warning(f"Upstage API 응답에서 content를 찾을 수 없음: {filename}")
                return None
                
        except Exception as e:
            logger.error(f"Upstage API 호출 실패 ({filename}): {e}")
            return None
