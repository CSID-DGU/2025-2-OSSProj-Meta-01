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
        file_content = self.s3.get_object(Bucket=self.bucket_name, Key=image)['Body'].read()
        return self._upstage_parse(file_content)
    
    def parse_attachment_to_content(self, attachment):
        file_content = self.s3.get_object(Bucket=self.bucket_name, Key=attachment)['Body'].read()
        return self._upstage_parse(file_content)
    
    def _upstage_parse(self, file_content):
        headers = {"Authorization": f"Bearer {self.upstage_api_key}"}
        files = {"document": file_content}
        data = {"ocr": "force", "base64_encoding": "['table']", "model": "document-parse", "output_format": "['markdown']"}
        response = requests.post(self.upstage_url, headers=headers, files=files, data=data)
        return response.json()