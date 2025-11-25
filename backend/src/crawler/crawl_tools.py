from concurrent.futures import ThreadPoolExecutor, as_completed
from bs4 import BeautifulSoup
import requests
import json
import time
import re
from datetime import datetime
import boto3
from pymongo import MongoClient
import mysql.connector
import os
import tempfile
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()


class CrawlTools:
    def __init__(self, aws_access_key=None, aws_secret_key=None, bucket_name=None, mongo_config=None):
        """
        크롤링 도구 초기화
        
        Args:
            aws_access_key: AWS 액세스 키 (None이면 환경변수에서 로드)
            aws_secret_key: AWS 시크릿 키 (None이면 환경변수에서 로드)
            bucket_name: S3 버킷 이름 (None이면 환경변수에서 로드)
            mongo_config: MongoDB 설정 딕셔너리 (None이면 환경변수에서 로드)
                {
                    'host': 'localhost',
                    'port': 27017,
                    'user': 'admin',
                    'password': 'admin123',
                    'database': 'dongguk_db'
                }
        """
        # 환경변수에서 AWS 설정 로드
        self.aws_access_key = aws_access_key or os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_key = aws_secret_key or os.getenv('AWS_SECRET_ACCESS_KEY')
        self.bucket_name = bucket_name or os.getenv('S3_BUCKET_NAME')
        aws_region = os.getenv('AWS_REGION', 'ap-northeast-2')
        
        # S3 클라이언트 설정
        self.s3 = boto3.client(
            's3',
            aws_access_key_id=self.aws_access_key,
            aws_secret_access_key=self.aws_secret_key,
            region_name=aws_region
        )
        
        # MongoDB 설정 (환경변수 또는 파라미터 사용)
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
        
        # HTTP 헤더
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        # MySQL 연결 (선택적)
        self.mysql_connection = None
        self.mysql_cursor = None
    
    def crawl_pages(self, max_pages=None):
        """
        함수1: 개별 페이지 크롤링 (리스트 반환)
        
        Args:
            max_pages: 크롤링할 최대 페이지 수 (None이면 전체)
            
        Returns:
            list: 게시글 목록
        """
        print("=== 함수1: 페이지 목록 크롤링 시작 ===")
        
        # 첫 페이지에서 총 페이지 수 확인
        r = requests.get("https://www.dongguk.edu/article/JANGHAKNOTICE/list", headers=self.headers)
        soup = BeautifulSoup(r.content, 'html.parser')
        total_count = int(soup.select_one('.count span').text)
        total_pages = (total_count + 9) // 10
        
        if max_pages:
            total_pages = min(total_pages, max_pages)
        
        print(f"크롤링할 페이지: {total_pages}개")
        
        def crawl_single_page(page):
            url = f"https://www.dongguk.edu/article/JANGHAKNOTICE/list?pageIndex={page}"
            r = requests.get(url, headers=self.headers, timeout=10)
            soup = BeautifulSoup(r.content, 'html.parser')
            board_list = soup.select('.board_list ul li')
            
            page_posts = []
            for li in board_list:
                if li.select_one('.fix'):
                    continue
                
                onclick = li.select_one('a')['onclick']
                article_id = onclick.split('(')[1].split(')')[0]
                title = li.select_one('.tit').text.strip()
                post_url = f"https://www.dongguk.edu/article/JANGHAKNOTICE/detail/{article_id}"
                date = li.select('.info span')[0].text.strip()
                has_file = li.select_one('.file') is not None
                
                page_posts.append({
                    '글번호': article_id,
                    '제목': title,
                    'URL': post_url,
                    '등록일': date,
                    '첨부파일': has_file
                })
            
            return page_posts
        
        all_posts = []
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(crawl_single_page, page): page for page in range(1, total_pages + 1)}
            for future in as_completed(futures):
                all_posts.extend(future.result())
        
        print(f"완료: {len(all_posts)}개 게시글\n")
        return all_posts
    
    def enrich_articles(self, articles):
        """
        함수2: enrichment (상세 페이지 크롤링)
        
        Args:
            articles: 게시글 목록
            
        Returns:
            list: enriched 게시글 목록
        """
        print("=== 함수2: 상세 페이지 enrichment 시작 ===")
        
        def crawl_detail(article):
            url = article['URL']
            r = requests.get(url, headers=self.headers, timeout=10)
            soup = BeautifulSoup(r.content, 'html.parser')
            board_view = soup.select_one('.board_view')
            
            # 본문 텍스트
            view_cont = board_view.select_one('.view_cont')
            content = view_cont.get_text(strip=True) if view_cont else ""
            
            # 첨부파일
            attachments = []
            view_files = board_view.select('.view_files ul li a')
            for file_link in view_files:
                href = file_link.get('href', '')
                if 'downGO' in href:
                    # downGO('파일명', '경로', '시스템파일명') 파싱
                    parts = href.split("'")
                    if len(parts) >= 6:
                        file_name = parts[1]
                        file_path = parts[3]
                        file_sys_nm = parts[5]
                        attachments.append({
                            'filename': file_name,
                            'download_url': f"https://www.dongguk.edu/cmmn/fileDown.do?filename={file_name}&filepath={file_path}&filerealname={file_sys_nm}"
                        })
            
            # 이미지
            images = []
            img_tags = view_cont.select('img') if view_cont else []
            for img in img_tags:
                img_src = img.get('src', '')
                if img_src:
                    full_url = 'https://www.dongguk.edu' + img_src if img_src.startswith('/') else img_src
                    images.append(full_url)
            
            enriched = {
                '글번호': article['글번호'],
                '제목': article['제목'],
                'URL': article['URL'],
                '등록일': article['등록일'],
                'content': content,
                'attachments': attachments,
                'images': images,
                'isImage': len(images) > 0
            }
            
            return enriched
        
        enriched_list = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(crawl_detail, article): article for article in articles}
            for future in as_completed(futures):
                enriched_list.append(future.result())
        
        print(f"완료: {len(enriched_list)}개 enrichment\n")
        return enriched_list
    
    def upload_attachments_to_s3(self, enriched_articles):
        """
        함수3: 첨부파일 다운로드 및 S3 업로드 (upload_file 방식)
        
        Args:
            enriched_articles: enriched 게시글 목록
            
        Returns:
            list: S3 URL이 추가된 게시글 목록
        """
        # 전체 첨부파일 개수 계산
        total_attachments = sum(len(article.get('attachments', [])) for article in enriched_articles)
        print(f"=== 함수3: 첨부파일 S3 업로드 시작 (총 {total_attachments}개) ===")
        
        uploaded_count = 0
        
        def upload_attachment(article):
            nonlocal uploaded_count
            article_no = article['글번호']
            s3_urls = []
            
            for idx, att in enumerate(article.get('attachments', [])):
                filename = att['filename']
                download_url = att['download_url']
                
                # 임시 파일로 다운로드
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1])
                response = requests.get(download_url, headers=self.headers, timeout=30)
                temp_file.write(response.content)
                temp_file.close()
                
                # S3 업로드 (upload_file 사용)
                s3_key = f"attachments/{article_no}_{filename}"
                self.s3.upload_file(
                    Filename=temp_file.name,
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    ExtraArgs={
                        'ContentType': 'application/octet-stream'
                    }
                )
                
                # 임시 파일 삭제
                os.unlink(temp_file.name)
                
                s3_url = f"https://{self.bucket_name}.s3.ap-northeast-2.amazonaws.com/{s3_key}"
                s3_urls.append(s3_url)
                
                # 진행상황 출력
                uploaded_count += 1
                print(f"  📎 [{uploaded_count}/{total_attachments}] 업로드 완료: {filename} (문서 {article_no})")
            
            article['attachment_s3_urls'] = s3_urls
            return article
        
        updated_articles = []
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(upload_attachment, article): article for article in enriched_articles}
            for future in as_completed(futures):
                updated_articles.append(future.result())
        
        print(f"✅ 완료: 첨부파일 S3 업로드 ({uploaded_count}개)\n")
        return updated_articles
    
    def upload_images_to_s3(self, enriched_articles):
        """
        함수4: 이미지 다운로드 및 S3 업로드 (upload_file 방식)
        
        Args:
            enriched_articles: enriched 게시글 목록
            
        Returns:
            list: S3 URL이 추가된 게시글 목록
        """
        # 전체 이미지 개수 계산
        total_images = sum(len(article.get('images', [])) for article in enriched_articles)
        print(f"=== 함수4: 이미지 S3 업로드 시작 (총 {total_images}개) ===")
        
        uploaded_count = 0
        
        def upload_images(article):
            nonlocal uploaded_count
            article_no = article['글번호']
            s3_urls = []
            
            for idx, img_url in enumerate(article.get('images', [])):
                # 임시 파일로 다운로드
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
                response = requests.get(img_url, headers=self.headers, timeout=30)
                temp_file.write(response.content)
                temp_file.close()
                
                # S3 업로드 (upload_file 사용)
                s3_key = f"images/{article_no}_{idx}.jpg"
                self.s3.upload_file(
                    Filename=temp_file.name,
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    ExtraArgs={
                        'ContentType': 'image/jpeg'
                    }
                )
                
                # 임시 파일 삭제
                os.unlink(temp_file.name)
                
                s3_url = f"https://{self.bucket_name}.s3.ap-northeast-2.amazonaws.com/{s3_key}"
                s3_urls.append(s3_url)
                
                # 진행상황 출력
                uploaded_count += 1
                print(f"  🖼️  [{uploaded_count}/{total_images}] 업로드 완료: 이미지 #{idx} (문서 {article_no})")
            
            article['image_s3_urls'] = s3_urls
            return article
        
        updated_articles = []
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(upload_images, article): article for article in enriched_articles}
            for future in as_completed(futures):
                updated_articles.append(future.result())
        
        print(f"✅ 완료: 이미지 S3 업로드 ({uploaded_count}개)\n")
        return updated_articles
    
    def save_to_mongodb(self, enriched_articles):
        """
        함수5: MongoDB 저장
        
        Args:
            enriched_articles: 저장할 게시글 목록
            
        Returns:
            int: 저장된 게시글 수
        """
        print("=== 함수5: MongoDB 저장 시작 ===")
        
        connection_string = f"mongodb://{self.mongo_config['user']}:{self.mongo_config['password']}@{self.mongo_config['host']}:{self.mongo_config['port']}/"
        client = MongoClient(connection_string)
        db = client[self.mongo_config['database']]
        collection = db['scholarships']
        
        # 기존 데이터 삭제
        collection.delete_many({})
        
        # 데이터 삽입
        if enriched_articles:
            result = collection.insert_many(enriched_articles)
            print(f"완료: MongoDB에 {len(result.inserted_ids)}개 저장\n")
        
        client.close()
        return len(enriched_articles)
    
    def run_pipeline(self, max_pages=1):
        """
        전체 크롤링 파이프라인 실행
        
        Args:
            max_pages: 크롤링할 페이지 수 (None이면 전체)
            
        Returns:
            list: 최종 처리된 게시글 목록
        """
        start_time = time.time()
        print("=" * 60)
        print("장학금 크롤링 파이프라인 시작")
        print("=" * 60)
        print()
        
        # 1. 페이지 목록 크롤링
        articles = self.crawl_pages(max_pages=max_pages)
        
        # 2. 상세 페이지 enrichment
        enriched = self.enrich_articles(articles)
        
        # 3. 첨부파일 S3 업로드
        with_attachments = self.upload_attachments_to_s3(enriched)
        
        # 4. 이미지 S3 업로드
        with_images = self.upload_images_to_s3(with_attachments)
        
        # 5. MongoDB 저장
        saved_count = self.save_to_mongodb(with_images)
        
        elapsed = time.time() - start_time
        
        print("=" * 60)
        print(f"파이프라인 완료!")
        print(f"총 처리: {saved_count}개")
        print(f"총 소요 시간: {elapsed:.2f}초")
        print("=" * 60)
        
        return with_images
    
    def connect_mysql(self):
        """
        MySQL 데이터베이스에 연결합니다.
        """
        if self.mysql_connection is None:
            self.mysql_connection = mysql.connector.connect(
                host=os.getenv('MYSQL_HOST'),
                user=os.getenv('MYSQL_USER'),
                password=os.getenv('MYSQL_PASSWORD'),
                port=os.getenv('MYSQL_PORT'),
                database=os.getenv('MYSQL_DATABASE')
            )
            self.mysql_cursor = self.mysql_connection.cursor()
            print("MySQL 연결 완료")
    
    def close_mysql(self):
        """
        MySQL 연결을 종료합니다.
        """
        if self.mysql_cursor:
            self.mysql_cursor.close()
        if self.mysql_connection:
            self.mysql_connection.close()
        print("MySQL 연결 종료")
    
    def parse_date(self, date_str):
        """
        다양한 날짜 형식을 파싱하여 datetime 객체로 변환합니다.
        
        Args:
            date_str (str): 파싱할 날짜 문자열
            
        Returns:
            datetime or None: 파싱된 datetime 객체 또는 None
        """
        if not date_str:
            return None
        
        # 문자열에서 날짜 부분만 추출 (예: "2025. 11. 20.(목) 09:00" -> "2025. 11. 20.")
        date_patterns = [
            r'(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.',  # "2025. 11. 20." 형식
            r'(\d{4})-(\d{1,2})-(\d{1,2})',            # "2025-11-20" 형식
            r'(\d{4})/(\d{1,2})/(\d{1,2})',            # "2025/11/20" 형식
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, date_str)
            if match:
                year, month, day = match.groups()
                try:
                    return datetime(int(year), int(month), int(day))
                except ValueError:
                    continue
        
        return None
    
    def import_scholarships_to_mysql(self, source_collection='scholarships_processed', limit=None):
        """
        MongoDB에서 장학금 정보를 가져와 MySQL Scholarships 테이블에 삽입합니다.
        
        Args:
            source_collection (str): MongoDB 소스 컬렉션 이름
            limit (int): 가져올 문서 수 제한 (기본값: None, 전체)
            
        Returns:
            int: 삽입된 장학금 수
        """
        print("=== MongoDB에서 MySQL로 장학금 데이터 이동 시작 ===\n")
        
        # MySQL 연결
        self.connect_mysql()
        
        # MongoDB 연결
        connection_string = f"mongodb://{self.mongo_config['user']}:{self.mongo_config['password']}@{self.mongo_config['host']}:{self.mongo_config['port']}/"
        mongo_client = MongoClient(connection_string)
        mongo_db = mongo_client[self.mongo_config['database']]
        mongo_collection = mongo_db[source_collection]
        
        # MongoDB에서 데이터 가져오기
        query = {}
        scholarships = mongo_collection.find(query).limit(limit) if limit else mongo_collection.find(query)
        
        inserted_count = 0
        
        for scholarship_doc in scholarships:
            try:
                # 제목
                scholarship_name = scholarship_doc.get('제목', '제목 없음')
                
                # URL
                url = scholarship_doc.get('URL', '')
                
                # 이미지 URL (첫 번째 이미지만 사용)
                image_s3_urls = scholarship_doc.get('image_s3_urls', [])
                image_url = image_s3_urls[0] if image_s3_urls else None
                
                # summary에서 날짜 정보 가져오기
                summary = scholarship_doc.get('summary', {})
                start_date_str = summary.get('신청시작일', '')
                end_date_str = summary.get('신청마감일', '')
                
                # 날짜 파싱
                start_date = self.parse_date(start_date_str)
                end_date = self.parse_date(end_date_str)
                
                # 날짜가 없으면 기본값 설정
                if not start_date:
                    start_date = datetime.now()
                if not end_date:
                    end_date = datetime(2025, 12, 31)
                
                # university_id 설정 (기본값: 동국대학교)
                university_id = 1
                
                # MySQL에 삽입
                insert_query = """
                INSERT INTO Scholarships (university_id, scholarship_name, start_date, end_date, url, image_url)
                VALUES (%s, %s, %s, %s, %s, %s)
                """
                self.mysql_cursor.execute(insert_query, (
                    university_id,
                    scholarship_name,
                    start_date.strftime('%Y-%m-%d'),
                    end_date.strftime('%Y-%m-%d'),
                    url,
                    image_url
                ))
                
                scholarship_id = self.mysql_cursor.lastrowid
                inserted_count += 1
                
                print(f"장학금 삽입 완료: {scholarship_name} (ID: {scholarship_id})")
                
                # 키워드 연결
                classification = scholarship_doc.get('classification', {})
                labels = classification.get('labels', [])
                self._link_scholarship_keywords(scholarship_id, labels)
                
            except Exception as e:
                print(f"장학금 삽입 중 오류 발생: {e}")
                continue
        
        self.mysql_connection.commit()
        mongo_client.close()
        
        print(f"\n총 {inserted_count}개의 장학금이 MySQL에 삽입되었습니다.")
        return inserted_count
    
    def _link_scholarship_keywords(self, scholarship_id, labels):
        """
        장학금과 키워드를 연결합니다.
        
        Args:
            scholarship_id (int): 장학금 ID
            labels (list): 키워드 레이블 리스트
        """
        for label in labels:
            try:
                # 키워드 찾기 또는 생성
                self.mysql_cursor.execute("SELECT keyword_id FROM Keywords WHERE keyword = %s", (label,))
                result = self.mysql_cursor.fetchone()
                
                if result:
                    keyword_id = result[0]
                else:
                    # 키워드가 없으면 새로 생성
                    self.mysql_cursor.execute("INSERT INTO Keywords (keyword) VALUES (%s)", (label,))
                    keyword_id = self.mysql_cursor.lastrowid
                
                # ScholarshipKeywords 테이블에 연결
                insert_query = """
                INSERT INTO ScholarshipKeywords (scholarship_id, keyword_id)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE scholarship_id = scholarship_id
                """
                self.mysql_cursor.execute(insert_query, (scholarship_id, keyword_id))
                
            except mysql.connector.Error as err:
                print(f"키워드 '{label}' 연결 중 오류: {err}")
                continue
