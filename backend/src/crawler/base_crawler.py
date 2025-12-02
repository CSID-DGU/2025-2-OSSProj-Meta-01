"""
기본 크롤러 인터페이스

모든 크롤러가 상속받는 추상 기본 클래스입니다.
동일한 데이터 구조로 MongoDB에 저장하도록 표준화합니다.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import logging
import os
import io
import zipfile
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import boto3
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()


class BaseCrawler(ABC):
    """모든 크롤러가 상속받는 기본 클래스"""
    
    def __init__(self, mongo_config: Optional[Dict] = None):
        """
        기본 크롤러 초기화
        
        Args:
            mongo_config: MongoDB 설정 딕셔너리
        """
        self.logger = logging.getLogger(f'crawler.{self.get_source_name()}')
        
        # MongoDB 설정
        if mongo_config is None:
            self.mongo_config = {
                'host': os.getenv('MONGO_HOST', 'localhost'),
                'port': int(os.getenv('MONGO_PORT', 27017)),
                'user': os.getenv('MONGO_USER', 'admin'),
                'password': os.getenv('MONGO_PASSWORD', 'admin123'),
                'database': os.getenv('MONGO_DATABASE', 'dongguk_db')
            }
        else:
            self.mongo_config = mongo_config
        
        # AWS S3 설정
        self.aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.bucket_name = os.getenv('S3_BUCKET_NAME')
        aws_region = os.getenv('AWS_REGION', 'ap-northeast-2')
        
        self.s3 = boto3.client(
            's3',
            aws_access_key_id=self.aws_access_key,
            aws_secret_access_key=self.aws_secret_key,
            region_name=aws_region
        )
        
        # HTTP 기본 헤더
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        self.logger.info(f"{self.get_source_name()} 크롤러 초기화 완료")
    
    @abstractmethod
    def get_source_name(self) -> str:
        """
        소스 이름 반환 (예: 'dongguk', 'dreamspon')
        
        Returns:
            str: 소스 이름
        """
        pass
    
    @abstractmethod
    def crawl_pages(self, max_pages: Optional[int] = None) -> List[Dict]:
        """
        리스트 페이지에서 게시글 목록 크롤링
        
        Args:
            max_pages: 크롤링할 최대 페이지 수 (None이면 전체)
            
        Returns:
            list: 게시글 목록
        """
        pass
    
    @abstractmethod
    def enrich_articles(self, articles: List[Dict]) -> List[Dict]:
        """
        상세 페이지 크롤링 (본문, 첨부파일, 이미지)
        
        Args:
            articles: 게시글 목록
            
        Returns:
            list: enriched 게시글 목록
        """
        pass
    
    @abstractmethod
    def download_attachment(self, attachment_info: Dict) -> bytes:
        """
        첨부파일 다운로드
        
        Args:
            attachment_info: 첨부파일 정보
            
        Returns:
            bytes: 파일 바이트 데이터
        """
        pass
    
    def normalize_data(self, raw_data: Dict) -> Dict:
        """
        데이터를 통합 스키마로 정규화
        
        Args:
            raw_data: 원본 데이터
            
        Returns:
            dict: 정규화된 데이터
        """
        source = self.get_source_name()
        article_id = raw_data.get('id', '')
        
        return {
            # 공통 필드
            '글번호': f"{source}_{article_id}",
            '제목': raw_data.get('title', ''),
            'URL': raw_data.get('url', ''),
            '등록일': raw_data.get('date', ''),
            'content': raw_data.get('content', ''),
            'attachments': raw_data.get('attachments', []),
            'images': raw_data.get('images', []),
            'isImage': len(raw_data.get('images', [])) > 0,
            
            # 소스 구분
            'source': source,
            
            # 원본 데이터 보존
            'raw_data': raw_data
        }
    
    # 지원하는 파일 확장자 (ZIP 내부 파일 필터링용)
    SUPPORTED_EXTENSIONS = {
        '.hwp', '.pdf', '.docx', '.doc', 
        '.xlsx', '.xls', '.pptx', '.ppt',
        '.jpg', '.jpeg', '.png', '.gif', '.bmp',
        '.txt', '.csv'
    }
    
    def upload_attachments_to_s3(self, enriched_articles: List[Dict]) -> List[Dict]:
        """
        첨부파일 다운로드 및 S3 업로드 (ZIP 파일은 풀어서 개별 업로드)
        
        Args:
            enriched_articles: enriched 게시글 목록
            
        Returns:
            list: S3 URL이 추가된 게시글 목록
        """
        total_attachments = sum(len(article.get('attachments', [])) for article in enriched_articles)
        self.logger.info(f"첨부파일 S3 업로드 시작 (총 {total_attachments}개, ZIP은 풀어서 업로드)")
        
        uploaded_count = 0
        
        def upload_attachment(article):
            nonlocal uploaded_count
            article_no = article['글번호']
            s3_urls = []
            
            for idx, att in enumerate(article.get('attachments', [])):
                try:
                    filename = att.get('filename', f'file_{idx}')
                    
                    # 파일 다운로드
                    file_content = self.download_attachment(att)
                    
                    # ZIP 파일인 경우 풀어서 개별 업로드
                    if filename.lower().endswith('.zip'):
                        extracted_urls = self._extract_and_upload_zip(
                            file_content, article_no, filename
                        )
                        s3_urls.extend(extracted_urls)
                        uploaded_count += len(extracted_urls)
                        self.logger.debug(f"ZIP 파일 추출 업로드: {filename} → {len(extracted_urls)}개 파일")
                    else:
                        # 일반 파일은 그대로 업로드
                        s3_url = self._upload_single_file(file_content, article_no, filename)
                        if s3_url:
                            s3_urls.append(s3_url)
                            uploaded_count += 1
                            self.logger.debug(f"첨부파일 업로드: {filename}")
                    
                except Exception as e:
                    self.logger.error(f"첨부파일 업로드 실패 ({filename}): {e}")
                    continue
            
            article['attachment_s3_urls'] = s3_urls
            return article
        
        updated_articles = []
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(upload_attachment, article): article for article in enriched_articles}
            for future in as_completed(futures):
                updated_articles.append(future.result())
        
        self.logger.info(f"첨부파일 S3 업로드 완료: {uploaded_count}개")
        return updated_articles
    
    def _upload_single_file(self, file_content: bytes, article_no: str, filename: str) -> Optional[str]:
        """단일 파일을 S3에 업로드"""
        try:
            ext = os.path.splitext(filename)[1] or '.bin'
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
            temp_file.write(file_content)
            temp_file.close()
            
            s3_key = f"attachments/{article_no}_{filename}"
            self.s3.upload_file(
                Filename=temp_file.name,
                Bucket=self.bucket_name,
                Key=s3_key,
                ExtraArgs={'ContentType': 'application/octet-stream'}
            )
            
            os.unlink(temp_file.name)
            
            return f"https://{self.bucket_name}.s3.ap-northeast-2.amazonaws.com/{s3_key}"
        except Exception as e:
            self.logger.error(f"파일 업로드 실패 ({filename}): {e}")
            return None
    
    def _extract_and_upload_zip(self, zip_content: bytes, article_no: str, zip_filename: str) -> List[str]:
        """
        ZIP 파일을 풀어서 내부 파일들을 개별적으로 S3에 업로드
        
        Args:
            zip_content: ZIP 파일 바이트 데이터
            article_no: 게시글 번호
            zip_filename: 원본 ZIP 파일명
            
        Returns:
            list: 업로드된 파일들의 S3 URL 리스트
        """
        s3_urls = []
        zip_base = os.path.splitext(zip_filename)[0]  # .zip 제거
        
        try:
            with zipfile.ZipFile(io.BytesIO(zip_content), 'r') as zf:
                for file_info in zf.namelist():
                    # 디렉토리 건너뛰기
                    if file_info.endswith('/'):
                        continue
                    
                    # 파일명 추출
                    inner_filename = file_info.split('/')[-1]
                    if not inner_filename:
                        continue
                    
                    # 지원하는 파일 형식만 업로드
                    ext = os.path.splitext(inner_filename)[1].lower()
                    if ext not in self.SUPPORTED_EXTENSIONS:
                        self.logger.debug(f"지원하지 않는 파일 건너뜀: {inner_filename}")
                        continue
                    
                    try:
                        # ZIP 내부 파일 읽기
                        file_content = zf.read(file_info)
                        
                        # S3 업로드 (파일명: article_no_zipbase_innerfile)
                        s3_filename = f"{zip_base}_{inner_filename}"
                        s3_url = self._upload_single_file(file_content, article_no, s3_filename)
                        
                        if s3_url:
                            s3_urls.append(s3_url)
                            
                    except Exception as e:
                        self.logger.error(f"ZIP 내부 파일 처리 실패 ({file_info}): {e}")
                        continue
                        
        except zipfile.BadZipFile:
            self.logger.error(f"손상된 ZIP 파일: {zip_filename}")
        except Exception as e:
            self.logger.error(f"ZIP 파일 처리 실패 ({zip_filename}): {e}")
        
        return s3_urls
    
    def upload_images_to_s3(self, enriched_articles: List[Dict]) -> List[Dict]:
        """
        이미지 다운로드 및 S3 업로드
        
        Args:
            enriched_articles: enriched 게시글 목록
            
        Returns:
            list: S3 URL이 추가된 게시글 목록
        """
        total_images = sum(len(article.get('images', [])) for article in enriched_articles)
        self.logger.info(f"이미지 S3 업로드 시작 (총 {total_images}개)")
        
        uploaded_count = 0
        
        def upload_images(article):
            nonlocal uploaded_count
            article_no = article['글번호']
            s3_urls = []
            
            for idx, img_url in enumerate(article.get('images', [])):
                try:
                    # 이미지 다운로드
                    response = requests.get(img_url, headers=self.headers, timeout=30)
                    
                    # 임시 파일로 저장
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
                    temp_file.write(response.content)
                    temp_file.close()
                    
                    # S3 업로드
                    s3_key = f"images/{article_no}_{idx}.jpg"
                    self.s3.upload_file(
                        Filename=temp_file.name,
                        Bucket=self.bucket_name,
                        Key=s3_key,
                        ExtraArgs={'ContentType': 'image/jpeg'}
                    )
                    
                    # 임시 파일 삭제
                    os.unlink(temp_file.name)
                    
                    s3_url = f"https://{self.bucket_name}.s3.ap-northeast-2.amazonaws.com/{s3_key}"
                    s3_urls.append(s3_url)
                    
                    uploaded_count += 1
                    self.logger.debug(f"이미지 업로드 [{uploaded_count}/{total_images}]: 이미지 #{idx}")
                    
                except Exception as e:
                    self.logger.error(f"이미지 업로드 실패 ({img_url}): {e}")
                    continue
            
            article['image_s3_urls'] = s3_urls
            return article
        
        updated_articles = []
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(upload_images, article): article for article in enriched_articles}
            for future in as_completed(futures):
                updated_articles.append(future.result())
        
        self.logger.info(f"이미지 S3 업로드 완료: {uploaded_count}개")
        return updated_articles
    
    def save_to_mongodb(self, enriched_articles: List[Dict], collection_name: str = 'scholarships') -> int:
        """
        MongoDB 저장
        
        Args:
            enriched_articles: 저장할 게시글 목록
            collection_name: 저장할 컬렉션 이름
            
        Returns:
            int: 저장된 게시글 수
        """
        self.logger.info(f"MongoDB 저장 시작 ({collection_name})")
        
        connection_string = f"mongodb://{self.mongo_config['user']}:{self.mongo_config['password']}@{self.mongo_config['host']}:{self.mongo_config['port']}/"
        client = MongoClient(connection_string)
        db = client[self.mongo_config['database']]
        collection = db[collection_name]
        
        # source별로 기존 데이터 삭제 (다른 소스 데이터는 유지)
        source = self.get_source_name()
        collection.delete_many({'source': source})
        
        # 데이터 삽입
        if enriched_articles:
            result = collection.insert_many(enriched_articles)
            self.logger.info(f"MongoDB 저장 완료: {len(result.inserted_ids)}개 ({source})")
        
        client.close()
        return len(enriched_articles)
    
    def run_pipeline(self, max_pages: Optional[int] = None) -> List[Dict]:
        """
        전체 크롤링 파이프라인 실행
        
        Args:
            max_pages: 크롤링할 페이지 수 (None이면 전체)
            
        Returns:
            list: 최종 처리된 게시글 목록
        """
        start_time = time.time()
        source = self.get_source_name()
        
        self.logger.info("=" * 60)
        self.logger.info(f"[{source}] 크롤링 파이프라인 시작")
        self.logger.info("=" * 60)
        
        try:
            # 1. 페이지 목록 크롤링
            articles = self.crawl_pages(max_pages=max_pages)
            self.logger.info(f"[1/5] 리스트 크롤링 완료: {len(articles)}개")
            
            # 2. 상세 페이지 enrichment
            enriched = self.enrich_articles(articles)
            self.logger.info(f"[2/5] 상세 크롤링 완료: {len(enriched)}개")
            
            # 3. 첨부파일 S3 업로드
            with_attachments = self.upload_attachments_to_s3(enriched)
            self.logger.info("[3/5] 첨부파일 S3 업로드 완료")
            
            # 4. 이미지 S3 업로드
            with_images = self.upload_images_to_s3(with_attachments)
            self.logger.info("[4/5] 이미지 S3 업로드 완료")
            
            # 5. MongoDB 저장
            saved_count = self.save_to_mongodb(with_images)
            self.logger.info(f"[5/5] MongoDB 저장 완료: {saved_count}개")
            
            elapsed = time.time() - start_time
            
            self.logger.info("=" * 60)
            self.logger.info(f"[{source}] 크롤링 파이프라인 완료!")
            self.logger.info(f"총 처리: {saved_count}개")
            self.logger.info(f"소요 시간: {elapsed:.2f}초")
            self.logger.info("=" * 60)
            
            return with_images
            
        except Exception as e:
            self.logger.error(f"파이프라인 실행 중 오류: {e}")
            raise

