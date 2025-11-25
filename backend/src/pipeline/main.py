import os
import sys
import time
from dotenv import load_dotenv
from pymongo import MongoClient
from concurrent.futures import ThreadPoolExecutor, as_completed

# 상위 디렉토리 모듈 import를 위한 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crawler.crawl_tools import CrawlTools
from ai.parsing_tools import ParsingTools
from ai.llm_tools import LLMSummaryTool, LLMClassificationTool

load_dotenv()


class DataPipeline:
    def __init__(self):
        """데이터 파이프라인 초기화"""
        # MongoDB 설정
        self.mongo_config = {
            'host': os.getenv('MONGO_HOST', 'localhost'),
            'port': int(os.getenv('MONGO_PORT', 27017)),
            'user': os.getenv('MONGO_USER', 'admin'),
            'password': os.getenv('MONGO_PASSWORD', 'admin123'),
            'database': os.getenv('MONGO_DATABASE', 'dongguk_db')
        }
        
        # 크롤러 초기화
        self.crawler = CrawlTools(mongo_config=self.mongo_config)
        
        # 파싱 도구 초기화
        self.parser = ParsingTools()
        
        # LLM 도구 초기화
        self.summarizer = LLMSummaryTool()
        self.classifier = LLMClassificationTool()
        
        # MongoDB 클라이언트
        connection_string = f"mongodb://{self.mongo_config['user']}:{self.mongo_config['password']}@{self.mongo_config['host']}:{self.mongo_config['port']}/"
        self.client = MongoClient(connection_string)
        self.db = self.client[self.mongo_config['database']]
        
        # 컬렉션 설정
        self.raw_collection = self.db['scholarships']  # 원본 데이터
        self.processed_collection = self.db['scholarships_processed']  # 처리된 데이터
    
    def step1_crawl_and_save(self, max_pages=None):
        """
        단계 1: 크롤러를 사용해서 페이지를 크롤링하고 MongoDB에 저장
        
        Args:
            max_pages: 크롤링할 최대 페이지 수 (None이면 전체)
        """
        print("\n" + "=" * 80)
        print("단계 1: 크롤링 및 MongoDB 저장 시작")
        print("=" * 80)
        
        # 크롤러 파이프라인 실행
        results = self.crawler.run_pipeline(max_pages=max_pages)
        
        print(f"✓ 단계 1 완료: {len(results)}개 문서를 MongoDB에 저장했습니다.")
        return len(results)
    
    def step2_read_from_mongodb(self):
        """
        단계 2: MongoDB에서 데이터 읽기
        
        Returns:
            list: MongoDB에서 읽어온 문서 리스트
        """
        print("\n" + "=" * 80)
        print("단계 2: MongoDB에서 데이터 읽기")
        print("=" * 80)
        
        documents = list(self.raw_collection.find({}))
        
        print(f"✓ 단계 2 완료: {len(documents)}개 문서를 읽어왔습니다.")
        return documents
    
    def step3_parse_attachments_and_images(self, documents):
        """
        단계 3: attachment와 이미지 파싱
        
        Args:
            documents: MongoDB에서 읽어온 문서 리스트
            
        Returns:
            list: 파싱된 내용이 추가된 문서 리스트
        """
        print("\n" + "=" * 80)
        print("단계 3: S3에서 첨부파일 및 이미지 파싱")
        print("=" * 80)
        
        def process_single_document(doc):
            """개별 문서 처리"""
            article_no = doc.get('글번호', '')
            attachment_contents = []
            image_contents = []
            
            # 2-1. attachment 파싱
            if doc.get('attachment_s3_urls'):
                print(f"  처리 중: 문서 {article_no} - {len(doc['attachment_s3_urls'])}개 첨부파일")
                for s3_url in doc['attachment_s3_urls']:
                    try:
                        # S3 URL에서 Key 추출 (attachments/파일명 형태)
                        s3_key = '/'.join(s3_url.split('/')[-2:])
                        parsed_content = self.parser.parse_attachment_to_content(s3_key)
                        attachment_contents.append({
                            's3_url': s3_url,
                            's3_key': s3_key,
                            'parsed_content': parsed_content
                        })
                    except Exception as e:
                        print(f"    ⚠ 첨부파일 파싱 실패 ({s3_url}): {e}")
                        attachment_contents.append({
                            's3_url': s3_url,
                            's3_key': s3_key,
                            'parsed_content': None,
                            'error': str(e)
                        })
            
            # 2-2. 이미지 파싱
            if doc.get('image_s3_urls'):
                print(f"  처리 중: 문서 {article_no} - {len(doc['image_s3_urls'])}개 이미지")
                for s3_url in doc['image_s3_urls']:
                    try:
                        # S3 URL에서 Key 추출 (images/파일명 형태)
                        s3_key = '/'.join(s3_url.split('/')[-2:])
                        parsed_content = self.parser.parse_image_to_content(s3_key)
                        image_contents.append({
                            's3_url': s3_url,
                            's3_key': s3_key,
                            'parsed_content': parsed_content
                        })
                    except Exception as e:
                        print(f"    ⚠ 이미지 파싱 실패 ({s3_url}): {e}")
                        image_contents.append({
                            's3_url': s3_url,
                            's3_key': s3_key,
                            'parsed_content': None,
                            'error': str(e)
                        })
            
            # 파싱 결과를 문서에 추가
            doc['attachment_content'] = attachment_contents
            doc['image_content'] = image_contents
            
            return doc
        
        # 병렬 처리로 모든 문서 처리
        processed_docs = []
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(process_single_document, doc): doc for doc in documents}
            for future in as_completed(futures):
                processed_docs.append(future.result())
        
        print(f"✓ 단계 3 완료: {len(processed_docs)}개 문서의 첨부파일 및 이미지 파싱 완료")
        return processed_docs
    
    def step4_classify_and_summarize(self, documents):
        """
        단계 4: OpenAI API로 분류 및 요약
        
        Args:
            documents: 파싱된 문서 리스트
            
        Returns:
            list: 분류 및 요약이 추가된 문서 리스트
        """
        print("\n" + "=" * 80)
        print("단계 4: OpenAI API로 분류 및 요약")
        print("=" * 80)
        
        def process_single_document(doc):
            """개별 문서 처리"""
            article_no = doc.get('글번호', '')
            print(f"  처리 중: 문서 {article_no}")
            
            # 전체 컨텐츠 조합
            combined_content = doc.get('content', '')
            
            # attachment_content 추가
            if doc.get('attachment_content'):
                for att in doc['attachment_content']:
                    if att.get('parsed_content'):
                        # Upstage 파싱 결과에서 텍스트 추출
                        parsed = att['parsed_content']
                        if isinstance(parsed, dict):
                            # parsed_content가 dict인 경우 (예: {"content": "..."})
                            text = parsed.get('content', str(parsed))
                        else:
                            text = str(parsed)
                        combined_content += f"\n\n[첨부파일 내용]\n{text}"
            
            # image_content 추가
            if doc.get('image_content'):
                for img in doc['image_content']:
                    if img.get('parsed_content'):
                        # Upstage 파싱 결과에서 텍스트 추출
                        parsed = img['parsed_content']
                        if isinstance(parsed, dict):
                            text = parsed.get('content', str(parsed))
                        else:
                            text = str(parsed)
                        combined_content += f"\n\n[이미지 내용]\n{text}"
            
            # OpenAI로 분류 (재시도 포함)
            classification_retry_count = 0
            max_retries = 2  # 최대 재시도 횟수
            while classification_retry_count < max_retries:
                try:
                    classification = self.classifier.classify_content(combined_content)
                    doc['classification'] = classification
                    break
                except Exception as e:
                    classification_retry_count += 1
                    if classification_retry_count < max_retries:
                        print(f"    ⚠ 분류 실패 ({classification_retry_count}/{max_retries}): {e}")
                        print(f"    ⏳ 60초 대기 후 재시도...")
                        time.sleep(60)
                    else:
                        print(f"    ❌ 분류 최종 실패: {e}")
                        doc['classification'] = None
                        doc['classification_error'] = str(e)
            
            # OpenAI로 요약 (재시도 포함)
            summary_retry_count = 0
            while summary_retry_count < max_retries:
                try:
                    summary = self.summarizer.summarize_content(combined_content)
                    doc['summary'] = summary
                    break
                except Exception as e:
                    summary_retry_count += 1
                    if summary_retry_count < max_retries:
                        print(f"    ⚠ 요약 실패 ({summary_retry_count}/{max_retries}): {e}")
                        print(f"    ⏳ 60초 대기 후 재시도...")
                        time.sleep(60)
                    else:
                        print(f"    ❌ 요약 최종 실패: {e}")
                        doc['summary'] = None
                        doc['summary_error'] = str(e)
            
            return doc
        
        # 병렬 처리로 모든 문서 처리
        processed_docs = []
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(process_single_document, doc): doc for doc in documents}
            for future in as_completed(futures):
                processed_docs.append(future.result())
        
        print(f"✓ 단계 4 완료: {len(processed_docs)}개 문서의 분류 및 요약 완료")
        return processed_docs
    
    def step5_save_processed_data(self, documents):
        """
        단계 5: 처리된 데이터를 새로운 컬렉션에 저장
        
        Args:
            documents: 처리된 문서 리스트
            
        Returns:
            int: 저장된 문서 수
        """
        print("\n" + "=" * 80)
        print("단계 5: 처리된 데이터를 MongoDB에 저장")
        print("=" * 80)
        
        # 기존 처리된 데이터 삭제
        self.processed_collection.delete_many({})
        
        # 새로운 데이터 삽입
        if documents:
            # _id 필드 제거 (MongoDB가 자동으로 새로운 _id 생성하도록)
            for doc in documents:
                if '_id' in doc:
                    del doc['_id']
            
            result = self.processed_collection.insert_many(documents)
            count = len(result.inserted_ids)
        else:
            count = 0
        
        print(f"✓ 단계 5 완료: {count}개 문서를 'scholarships_processed' 컬렉션에 저장했습니다.")
        return count
    
    def run_full_pipeline(self, max_pages=None):
        """
        전체 파이프라인 실행
        
        Args:
            max_pages: 크롤링할 최대 페이지 수 (None이면 전체)
        """
        print("\n" + "=" * 80)
        print("데이터 파이프라인 시작")
        print("=" * 80)
        
        import time
        start_time = time.time()
        
        try:
            # 단계 1: 크롤링 및 MongoDB 저장
            self.step1_crawl_and_save(max_pages=max_pages)
            
            # 단계 2: MongoDB에서 데이터 읽기
            documents = self.step2_read_from_mongodb()
            
            # 단계 3: 첨부파일 및 이미지 파싱
            documents = self.step3_parse_attachments_and_images(documents)
            
            # 단계 4: 분류 및 요약
            documents = self.step4_classify_and_summarize(documents)
            
            # 단계 5: 처리된 데이터 저장
            count = self.step5_save_processed_data(documents)
            
            # 단계 6: MySQL로 데이터 이동
            print("\n" + "=" * 80)
            print("단계 6: MySQL로 장학금 데이터 이동")
            print("=" * 80)
            mysql_count = self.crawler.import_scholarships_to_mysql(source_collection='scholarships_processed')
            
            elapsed = time.time() - start_time
            
            print("\n" + "=" * 80)
            print("파이프라인 완료!")
            print(f"총 처리: {count}개 문서")
            print(f"MySQL 저장: {mysql_count}개")
            print(f"총 소요 시간: {elapsed:.2f}초")
            print("=" * 80)
            
        except Exception as e:
            print(f"\n❌ 파이프라인 실행 중 오류 발생: {e}")
            import traceback
            traceback.print_exc()
        finally:
            # 연결 종료
            self.client.close()
            if hasattr(self.crawler, 'mysql_connection') and self.crawler.mysql_connection:
                self.crawler.close_mysql()
    
    def run_pipeline_from_existing_data(self):
        """
        기존 MongoDB 데이터를 사용하여 파이프라인 실행 (크롤링 제외)
        크롤링은 이미 완료되었고 MongoDB에 데이터가 있는 경우 사용
        """
        print("\n" + "=" * 80)
        print("데이터 파이프라인 시작 (기존 데이터 사용)")
        print("=" * 80)
        
        import time
        start_time = time.time()
        
        try:
            # 단계 2: MongoDB에서 데이터 읽기
            documents = self.step2_read_from_mongodb()
            
            if not documents:
                print("⚠ MongoDB에 데이터가 없습니다. 먼저 크롤링을 실행하세요.")
                return
            
            # 단계 3: 첨부파일 및 이미지 파싱
            documents = self.step3_parse_attachments_and_images(documents)
            
            # 단계 4: 분류 및 요약
            documents = self.step4_classify_and_summarize(documents)
            
            # 단계 5: 처리된 데이터 저장
            count = self.step5_save_processed_data(documents)
            
            # 단계 6: MySQL로 데이터 이동
            print("\n" + "=" * 80)
            print("단계 6: MySQL로 장학금 데이터 이동")
            print("=" * 80)
            mysql_count = self.crawler.import_scholarships_to_mysql(source_collection='scholarships_processed')
            
            elapsed = time.time() - start_time
            
            print("\n" + "=" * 80)
            print("파이프라인 완료!")
            print(f"총 처리: {count}개 문서")
            print(f"MySQL 저장: {mysql_count}개")
            print(f"총 소요 시간: {elapsed:.2f}초")
            print("=" * 80)
            
        except Exception as e:
            print(f"\n❌ 파이프라인 실행 중 오류 발생: {e}")
            import traceback
            traceback.print_exc()
        finally:
            # 연결 종료
            self.client.close()
            if hasattr(self.crawler, 'mysql_connection') and self.crawler.mysql_connection:
                self.crawler.close_mysql()


if __name__ == "__main__":
    # 파이프라인 실행 예시
    pipeline = DataPipeline()
    
    # 옵션 1: 전체 파이프라인 실행 (크롤링 포함)
    pipeline.run_full_pipeline(max_pages=10)  # 1페이지만 테스트
    
    # 옵션 2: 기존 데이터로 파이프라인 실행 (크롤링 제외)
    # pipeline.run_pipeline_from_existing_data()
