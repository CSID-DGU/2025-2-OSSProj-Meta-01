"""
초기 데이터 설정 파이프라인

사전 조건:
    - python db_init.py 실행 (MySQL 테이블 및 기본 데이터 생성)

실행 단계:
    Phase 1: 장학금 데이터 수집 및 처리
        - Step 1: 크롤링 (장학금 페이지 → S3 → MongoDB)
        - Step 2: AI 파싱 (Upstage API)
        - Step 3: AI 분류/요약 (OpenAI GPT-4o-mini)
    
    Phase 2: MySQL 장학금 데이터 동기화
        - Step 4: MongoDB → MySQL Scholarships
    
    Phase 3: 더미 데이터 생성
        - Step 5: 더미 유저 생성
        - Step 6: 더미 북마크 생성

이후 실행:
    - 추천 모델 학습: python -m ai.recommendation_model
    - 배치 추천 계산: python -m ai.batch_recommend

사용법:
    python -m pipeline.initial_setup [옵션]
    
옵션:
    --max-pages N     크롤링할 최대 페이지 수 (기본값: 전체)
    --num-users N     생성할 더미 유저 수 (기본값: 100)
    --skip-crawl      크롤링 건너뛰기 (기존 MongoDB 데이터 사용)
"""

import os
import sys
import time
import logging
import argparse
from datetime import datetime
from dotenv import load_dotenv
from pymongo import MongoClient
from concurrent.futures import ThreadPoolExecutor, as_completed

# 상위 디렉토리 모듈 import를 위한 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crawler.crawl_tools import CrawlTools
from crawler.dreamspon_crawler import DreamsponCrawler
from ai.parsing_tools import ParsingTools
from ai.llm_tools import LLMSummaryTool, LLMClassificationTool
from ai.create_user_dummies import CreateDummies
from ai.recommendation_model import ScholarshipRecommender
from ai.batch_recommend import BatchRecommender

# 지원하는 크롤러 소스
CRAWLER_SOURCES = {
    'dongguk': CrawlTools,
    'dreamspon': DreamsponCrawler
}

load_dotenv()


def setup_logging(log_level=logging.INFO):
    """전역 로깅 설정"""
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # 외부 라이브러리 로깅 레벨 조정
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('boto3').setLevel(logging.WARNING)
    logging.getLogger('botocore').setLevel(logging.WARNING)


class InitialSetupPipeline:
    """
    초기 데이터 설정 파이프라인
    
    크롤링, AI 처리, MySQL 동기화, 더미 데이터 생성을 순차적으로 실행합니다.
    다중 소스 지원: dongguk, dreamspon, all
    """
    
    def __init__(self):
        """
        파이프라인 초기화
        
        """
        self.logger = logging.getLogger('pipeline.initial_setup')
        
        # MongoDB 설정
        self.mongo_config = {
            'host': os.getenv('MONGO_HOST', 'localhost'),
            'port': int(os.getenv('MONGO_PORT', 27017)),
            'user': os.getenv('MONGO_USER', 'admin'),
            'password': os.getenv('MONGO_PASSWORD', 'admin123'),
            'database': os.getenv('MONGO_DATABASE', 'dongguk_db')
        }
        
        # 크롤러 초기화 (항상 모든 소스)
        self.crawlers = {}
        for name, crawler_class in CRAWLER_SOURCES.items():
            try:
                self.crawlers[name] = crawler_class(mongo_config=self.mongo_config)
                self.logger.info(f"크롤러 초기화 완료: {name}")
            except Exception as e:
                self.logger.warning(f"크롤러 초기화 실패 ({name}): {e}")
        
        # 기본 크롤러 설정 (MySQL 동기화용 - CrawlTools 사용)
        # DreamsponCrawler는 import_scholarships_to_mysql 메소드가 없으므로
        # MySQL 동기화를 위해 CrawlTools 인스턴스를 별도로 생성
        self.crawler = self.crawlers.get('dongguk')
        if not self.crawler:
            # dongguk 크롤러가 없으면 MySQL 동기화용으로 CrawlTools 생성
            self.mysql_sync_crawler = CrawlTools(mongo_config=self.mongo_config)
        else:
            self.mysql_sync_crawler = self.crawler
        
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
        self.raw_collection = self.db['scholarships']
        self.processed_collection = self.db['scholarships_processed']
        
        self.logger.info("파이프라인 초기화 완료")
    
    def _print_phase_header(self, phase_num, phase_name):
        """Phase 헤더 출력"""
        self.logger.info("=" * 70)
        self.logger.info(f"[Phase {phase_num}] {phase_name}")
        self.logger.info("=" * 70)
    
    def _print_step_header(self, step_num, step_name):
        """Step 헤더 출력"""
        self.logger.info("-" * 50)
        self.logger.info(f"[Step {step_num}] {step_name}")
        self.logger.info("-" * 50)
    
    # =========================================================================
    # Phase 1: 장학금 데이터 수집 및 처리
    # =========================================================================
    
    def phase1_crawl_and_process(self, max_pages=None):
        """
        Phase 1: 크롤링 및 AI 처리
        
        Args:
            max_pages: 크롤링할 최대 페이지 수 (None이면 전체)
            
        Returns:
            int: 처리된 문서 수
        """
        self._print_phase_header(1, "장학금 데이터 수집 및 처리")
        
        # Step 1: 크롤링
        self._step1_crawl(max_pages)
        
        # Step 2: MongoDB에서 데이터 읽기
        documents = self._step2_read_from_mongodb()
        
        if not documents:
            self.logger.warning("MongoDB에 데이터가 없습니다. 파이프라인을 중단합니다.")
            return 0
        
        # Step 3: AI 파싱
        documents = self._step3_parse_attachments_and_images(documents)
        
        # Step 4: AI 분류 및 요약
        documents = self._step4_classify_and_summarize(documents)
        
        # Step 5: 처리된 데이터 저장
        count = self._step5_save_processed_data(documents)
        
        self.logger.info(f"Phase 1 완료: {count}개 문서 처리됨")
        return count
    
    def _step1_crawl(self, max_pages=None):
        """Step 1: 크롤링 (다중 소스 지원)"""
        sources_str = ', '.join(self.crawlers.keys()) if self.crawlers else 'none'
        self._print_step_header(1, f"크롤링 ({sources_str})")
        
        total_results = 0
        
        for name, crawler in self.crawlers.items():
            try:
                self.logger.info(f"--- {name} 크롤링 시작 ---")
                results = crawler.run_pipeline(max_pages=max_pages)
                total_results += len(results)
                self.logger.info(f"--- {name} 크롤링 완료: {len(results)}개 문서 ---")
            except Exception as e:
                self.logger.error(f"{name} 크롤링 실패: {e}")
                continue
        
        self.logger.info(f"전체 크롤링 완료: {total_results}개 문서를 MongoDB에 저장")
        return total_results
    
    def _step2_read_from_mongodb(self):
        """Step 2: MongoDB에서 데이터 읽기"""
        self._print_step_header(2, "MongoDB에서 데이터 읽기")
        
        documents = list(self.raw_collection.find({}))
        self.logger.info(f"MongoDB에서 {len(documents)}개 문서 로드 완료")
        return documents
    
    def _step3_parse_attachments_and_images(self, documents):
        """Step 3: 첨부파일 및 이미지 파싱 (ZIP 파일 지원)"""
        self._print_step_header(3, "AI 파싱 (Upstage Document Parse API)")
        
        total_attachments = sum(len(doc.get('attachment_s3_urls', [])) for doc in documents)
        total_images = sum(len(doc.get('image_s3_urls', [])) for doc in documents)
        
        self.logger.info(f"파싱 대상: 첨부파일 {total_attachments}개, 이미지 {total_images}개")
        self.logger.info("(ZIP 파일은 최대 3단계까지 중첩 탐색)")
        
        def process_single_document(doc):
            """개별 문서 처리"""
            article_no = doc.get('글번호', '')
            attachment_contents = []
            image_contents = []
            
            # 첨부파일 파싱 (ZIP 파일 지원 - 리스트 반환)
            if doc.get('attachment_s3_urls'):
                for s3_url in doc['attachment_s3_urls']:
                    try:
                        s3_key = '/'.join(s3_url.split('/')[-2:])
                        # parse_attachment_to_content()는 이제 리스트를 반환
                        parsed_files = self.parser.parse_attachment_to_content(s3_key)
                        attachment_contents.extend(parsed_files)
                    except Exception as e:
                        self.logger.warning(f"첨부파일 파싱 실패 (문서 {article_no}): {e}")
                        attachment_contents.append({
                            's3_url': s3_url,
                            's3_key': s3_key,
                            'parsed_content': None,
                            'error': str(e)
                        })
            
            # 이미지 파싱 (리스트 반환)
            if doc.get('image_s3_urls'):
                for s3_url in doc['image_s3_urls']:
                    try:
                        s3_key = '/'.join(s3_url.split('/')[-2:])
                        # parse_image_to_content()는 이제 리스트를 반환
                        parsed_files = self.parser.parse_image_to_content(s3_key)
                        image_contents.extend(parsed_files)
                    except Exception as e:
                        self.logger.warning(f"이미지 파싱 실패 (문서 {article_no}): {e}")
                        image_contents.append({
                            's3_url': s3_url,
                            's3_key': s3_key,
                            'parsed_content': None,
                            'error': str(e)
                        })
            
            doc['attachment_content'] = attachment_contents
            doc['image_content'] = image_contents
            return doc
        
        # 병렬 처리
        processed_docs = []
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(process_single_document, doc): doc for doc in documents}
            for i, future in enumerate(as_completed(futures), 1):
                processed_docs.append(future.result())
                if i % 10 == 0:
                    self.logger.info(f"파싱 진행: {i}/{len(documents)}")
        
        # 파싱된 총 파일 수 계산
        total_parsed = sum(
            len(doc.get('attachment_content', [])) + len(doc.get('image_content', []))
            for doc in processed_docs
        )
        self.logger.info(f"AI 파싱 완료: {len(processed_docs)}개 문서, 총 {total_parsed}개 파일 파싱됨")
        return processed_docs
    
    def _step4_classify_and_summarize(self, documents):
        """Step 4: AI 분류 및 요약"""
        self._print_step_header(4, "AI 분류 및 요약 (OpenAI GPT-4o-mini)")
        
        def process_single_document(doc):
            """개별 문서 처리"""
            article_no = doc.get('글번호', '')
            
            # 전체 컨텐츠 조합
            combined_content = doc.get('content', '')
            
            # attachment_content 추가
            if doc.get('attachment_content'):
                for att in doc['attachment_content']:
                    if att.get('parsed_content'):
                        parsed = att['parsed_content']
                        if isinstance(parsed, dict):
                            text = parsed.get('content', str(parsed))
                        else:
                            text = str(parsed)
                        combined_content += f"\n\n[첨부파일 내용]\n{text}"
            
            # image_content 추가
            if doc.get('image_content'):
                for img in doc['image_content']:
                    if img.get('parsed_content'):
                        parsed = img['parsed_content']
                        if isinstance(parsed, dict):
                            text = parsed.get('content', str(parsed))
                        else:
                            text = str(parsed)
                        combined_content += f"\n\n[이미지 내용]\n{text}"
            
            # 분류 (재시도 포함)
            max_retries = 2
            for retry in range(max_retries):
                try:
                    classification = self.classifier.classify_content(combined_content)
                    doc['classification'] = classification
                    break
                except Exception as e:
                    if retry < max_retries - 1:
                        self.logger.warning(f"분류 실패 (문서 {article_no}), 60초 후 재시도: {e}")
                        time.sleep(60)
                    else:
                        self.logger.error(f"분류 최종 실패 (문서 {article_no}): {e}")
                        doc['classification'] = None
                        doc['classification_error'] = str(e)
            
            # 요약 (재시도 포함)
            for retry in range(max_retries):
                try:
                    summary = self.summarizer.summarize_content(combined_content)
                    doc['summary'] = summary
                    break
                except Exception as e:
                    if retry < max_retries - 1:
                        self.logger.warning(f"요약 실패 (문서 {article_no}), 60초 후 재시도: {e}")
                        time.sleep(60)
                    else:
                        self.logger.error(f"요약 최종 실패 (문서 {article_no}): {e}")
                        doc['summary'] = None
                        doc['summary_error'] = str(e)
            
            return doc
        
        # 병렬 처리
        processed_docs = []
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(process_single_document, doc): doc for doc in documents}
            for i, future in enumerate(as_completed(futures), 1):
                processed_docs.append(future.result())
                if i % 5 == 0:
                    self.logger.info(f"분류/요약 진행: {i}/{len(documents)}")
        
        self.logger.info(f"AI 분류/요약 완료: {len(processed_docs)}개 문서")
        return processed_docs
    
    def _step5_save_processed_data(self, documents):
        """Step 5: 처리된 데이터 저장"""
        self._print_step_header(5, "처리된 데이터 MongoDB 저장")
        
        # 기존 데이터 삭제
        self.processed_collection.delete_many({})
        
        # _id 필드 제거 후 삽입
        if documents:
            for doc in documents:
                if '_id' in doc:
                    del doc['_id']
            
            result = self.processed_collection.insert_many(documents)
            count = len(result.inserted_ids)
        else:
            count = 0
        
        self.logger.info(f"MongoDB 저장 완료: {count}개 문서 → 'scholarships_processed'")
        return count
    
    # =========================================================================
    # Phase 2: MySQL 장학금 데이터 동기화
    # =========================================================================
    
    def phase2_sync_to_mysql(self):
        """
        Phase 2: MySQL 장학금 데이터 동기화
        
        Returns:
            int: MySQL에 저장된 장학금 수
        """
        self._print_phase_header(2, "MySQL 장학금 데이터 동기화")
        self._print_step_header(6, "MongoDB → MySQL Scholarships")
        
        # MySQL 동기화용 크롤러 사용 (CrawlTools)
        count = self.mysql_sync_crawler.import_scholarships_to_mysql(source_collection='scholarships_processed')
        
        self.logger.info(f"Phase 2 완료: MySQL에 {count}개 장학금 저장됨")
        return count
    
    # =========================================================================
    # Phase 3: 더미 데이터 생성
    # =========================================================================
    
    def phase3_create_dummies(self, num_users=100):
        """
        Phase 3: 더미 데이터 생성
        
        Args:
            num_users: 생성할 더미 유저 수
            
        Returns:
            tuple: (생성된 유저 수, 생성된 북마크 수)
        """
        self._print_phase_header(3, "더미 데이터 생성")
        
        with CreateDummies() as dummy_creator:
            # Step 7: 더미 유저 생성
            self._print_step_header(7, f"더미 유저 생성 ({num_users}명)")
            user_ids = dummy_creator.create_complete_users(num_users=num_users)
            self.logger.info(f"더미 유저 생성 완료: {len(user_ids)}명")
            
            # Step 8: 더미 북마크 생성
            self._print_step_header(8, "더미 북마크 생성")
            dummy_creator.add_user_bookmarks(user_ids=user_ids, min_bookmarks=5, max_bookmarks=15)
            self.logger.info("더미 북마크 생성 완료")
        
        self.logger.info(f"Phase 3 완료: {len(user_ids)}명 유저 및 북마크 생성됨")
        return len(user_ids)
    
    # =========================================================================
    # 전체 파이프라인 실행
    # =========================================================================
    
    def run(self, max_pages=1, num_users=100, skip_crawl=False,
            train_recommender=False, batch_recommend=False):
        """
        전체 파이프라인 실행
        
        Args:
            max_pages: 크롤링할 최대 페이지 수 (None이면 전체)
            num_users: 생성할 더미 유저 수
            skip_crawl: True면 크롤링 건너뛰고 기존 데이터 사용
        """
        self.logger.info("=" * 70)
        self.logger.info("초기 설정 파이프라인 시작")
        self.logger.info(f"옵션: max_pages={max_pages}, num_users={num_users}, skip_crawl={skip_crawl}")
        self.logger.info("=" * 70)
        
        start_time = time.time()
        
        try:
            # Phase 1: 장학금 데이터 수집 및 처리
            if skip_crawl:
                self.logger.info("[Phase 1] 크롤링 건너뛰기 - 기존 데이터 사용")
                # 기존 데이터로 AI 처리만 수행
                documents = self._step2_read_from_mongodb()
                if documents:
                    documents = self._step3_parse_attachments_and_images(documents)
                    documents = self._step4_classify_and_summarize(documents)
                    doc_count = self._step5_save_processed_data(documents)
                else:
                    self.logger.warning("MongoDB에 데이터가 없습니다. 먼저 크롤링을 실행하세요.")
                    return
            else:
                doc_count = self.phase1_crawl_and_process(max_pages=max_pages)
            
            if doc_count == 0:
                self.logger.error("처리된 문서가 없습니다. 파이프라인을 중단합니다.")
                return
            
            # Phase 2: MySQL 장학금 데이터 동기화
            mysql_count = self.phase2_sync_to_mysql()
            
            # Phase 3: 더미 데이터 생성
            user_count = self.phase3_create_dummies(num_users=num_users)

            # (선택) 추천 모델 학습
            if train_recommender:
                self._print_step_header(9, "추천 모델 학습")
                recommender = ScholarshipRecommender()
                try:
                    recommender.train()
                    recommender.save_model()
                finally:
                    recommender.close()

            # (선택) 배치 추천 계산 및 저장
            if batch_recommend:
                self._print_step_header(10, "배치 추천 계산 및 저장")
                batch = BatchRecommender()
                try:
                    batch.run()
                finally:
                    batch.close()
            
            # 완료 메시지
            elapsed = time.time() - start_time
            elapsed_str = f"{int(elapsed // 60)}분 {int(elapsed % 60)}초"
            
            self.logger.info("=" * 70)
            self.logger.info("파이프라인 완료!")
            self.logger.info(f"  - 처리된 문서: {doc_count}개")
            self.logger.info(f"  - MySQL 장학금: {mysql_count}개")
            self.logger.info(f"  - 더미 유저: {user_count}명")
            self.logger.info(f"  - 소요 시간: {elapsed_str}")
            self.logger.info("=" * 70)
            self.logger.info("")
            self.logger.info("다음 단계:")
            self.logger.info("  1. 추천 모델 학습: python -m ai.recommendation_model")
            self.logger.info("  2. 배치 추천 계산: python -m ai.batch_recommend")
            self.logger.info("=" * 70)
            
        except Exception as e:
            self.logger.error(f"파이프라인 실행 중 오류 발생: {e}")
            import traceback
            traceback.print_exc()
        finally:
            self.close()
    
    def run_single_phase(self, phase, max_pages=1, num_users=100):
        """
        특정 Phase만 실행
        
        Args:
            phase: 실행할 Phase 번호 (1, 2, 3)
            max_pages: 크롤링할 최대 페이지 수 (Phase 1용)
            num_users: 생성할 더미 유저 수 (Phase 3용)
        """
        self.logger.info("=" * 70)
        self.logger.info(f"Phase {phase} 단독 실행")
        self.logger.info("=" * 70)
        
        start_time = time.time()
        
        try:
            if phase == 1:
                # Phase 1: 크롤링 및 AI 처리
                doc_count = self.phase1_crawl_and_process(max_pages=max_pages)
                self.logger.info(f"Phase 1 완료: {doc_count}개 문서 처리됨")
                
            elif phase == 2:
                # Phase 2: MySQL 장학금 데이터 동기화
                mysql_count = self.phase2_sync_to_mysql()
                self.logger.info(f"Phase 2 완료: MySQL에 {mysql_count}개 장학금 저장됨")
                
            elif phase == 3:
                # Phase 3: 더미 데이터 생성
                user_count = self.phase3_create_dummies(num_users=num_users)
                self.logger.info(f"Phase 3 완료: {user_count}명 유저 생성됨")
            
            elapsed = time.time() - start_time
            self.logger.info("=" * 70)
            self.logger.info(f"Phase {phase} 완료! (소요 시간: {elapsed:.2f}초)")
            self.logger.info("=" * 70)
            
        except Exception as e:
            self.logger.error(f"Phase {phase} 실행 중 오류 발생: {e}")
            import traceback
            traceback.print_exc()
        finally:
            self.close()
    
    def close(self):
        """리소스 정리"""
        self.client.close()
        # MySQL 동기화 크롤러의 MySQL 연결 종료
        if hasattr(self.mysql_sync_crawler, 'mysql_connection') and self.mysql_sync_crawler.mysql_connection:
            self.mysql_sync_crawler.close_mysql()
        self.logger.info("리소스 정리 완료")


def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(
        description='초기 데이터 설정 파이프라인',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python -m pipeline.initial_setup                 # 동국대 + Dreamspon 전체 실행
  python -m pipeline.initial_setup --max-pages 3   # 각 소스 3페이지만 크롤링
  python -m pipeline.initial_setup --num-users 50  # 더미 유저 50명
  python -m pipeline.initial_setup --skip-crawl    # 크롤링 건너뛰기
  python -m pipeline.initial_setup --only-phase 2  # Phase 2만 실행 (MySQL 동기화)
  python -m pipeline.initial_setup --only-phase 3  # Phase 3만 실행 (더미 데이터)

Phase 설명:
  Phase 1: 크롤링 및 AI 처리 (MongoDB)
  Phase 2: MySQL 장학금 데이터 동기화
  Phase 3: 더미 데이터 생성

사전 조건:
  python db_init.py  # MySQL 테이블 및 기본 데이터 생성
        """
    )
    
    parser.add_argument(
        '--max-pages', 
        type=int, 
        default=1,
        help='각 소스에서 크롤링할 최대 페이지 수 (기본값: 1)'
    )
    parser.add_argument(
        '--num-users', 
        type=int, 
        default=100,
        help='생성할 더미 유저 수 (기본값: 100)'
    )
    parser.add_argument(
        '--skip-crawl', 
        action='store_true',
        help='크롤링 건너뛰기 (기존 MongoDB 데이터 사용)'
    )
    parser.add_argument(
        '--only-phase',
        type=int,
        choices=[1, 2, 3],
        default=None,
        help='특정 Phase만 실행 (1: 크롤링/AI, 2: MySQL동기화, 3: 더미데이터)'
    )
    parser.add_argument(
        '--train-recommender',
        action='store_true',
        help='Phase 3 이후 추천 모델 학습까지 실행'
    )
    parser.add_argument(
        '--batch-recommend',
        action='store_true',
        help='추천 모델 학습 후 배치 추천 계산까지 실행'
    )
    parser.add_argument(
        '--debug',
        action='store_true',
        help='디버그 로깅 활성화'
    )
    
    args = parser.parse_args()
    
    # 로깅 설정
    log_level = logging.DEBUG if args.debug else logging.INFO
    setup_logging(log_level)
    
    # 파이프라인 실행
    pipeline = InitialSetupPipeline()
    
    if args.only_phase:
        # 특정 Phase만 실행
        pipeline.run_single_phase(
            phase=args.only_phase,
            max_pages=args.max_pages,
            num_users=args.num_users
        )
    else:
        # 전체 파이프라인 실행
        pipeline.run(
            max_pages=args.max_pages,
            num_users=args.num_users,
            skip_crawl=args.skip_crawl,
            train_recommender=args.train_recommender,
            batch_recommend=args.batch_recommend,
        )


if __name__ == "__main__":
    main()

