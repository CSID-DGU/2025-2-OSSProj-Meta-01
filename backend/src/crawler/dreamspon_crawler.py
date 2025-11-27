"""
Dreamspon 장학금 크롤러

https://www.dreamspon.com 장학금 정보를 크롤링합니다.
로그인이 필요한 사이트입니다.
"""

import os
import re
import time
import logging
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

try:
    from .base_crawler import BaseCrawler
except ImportError:
    from base_crawler import BaseCrawler

load_dotenv()

logger = logging.getLogger('crawler.dreamspon')


class DreamsponCrawler(BaseCrawler):
    """Dreamspon 장학금 크롤러"""
    
    BASE_URL = "https://www.dreamspon.com"
    LIST_URL = f"{BASE_URL}/scholarship/list.html"
    VIEW_URL = f"{BASE_URL}/scholarship/view.html"
    LOGIN_URL = f"{BASE_URL}/process/checkuser.html"
    FILE_DOWNLOAD_URL = f"{BASE_URL}/process/fileDown.html"
    
    def __init__(self, mongo_config: Optional[Dict] = None):
        """
        Dreamspon 크롤러 초기화
        
        Args:
            mongo_config: MongoDB 설정
        """
        # 세션 먼저 생성 (부모 클래스 초기화 전)
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Origin": self.BASE_URL,
            "Referer": f"{self.BASE_URL}/member/login.html"
        })
        
        # 부모 클래스 초기화
        super().__init__(mongo_config)
        
        # 로그인
        self._login()
    
    def get_source_name(self) -> str:
        return 'dreamspon'
    
    def _login(self):
        """Dreamspon 로그인"""
        login_id = os.getenv('DREAMSPON_ID')
        login_pw = os.getenv('DREAMSPON_PW')
        
        if not login_id or not login_pw:
            raise ValueError("DREAMSPON_ID, DREAMSPON_PW 환경변수가 필요합니다.")
        
        self.logger.info("Dreamspon 로그인 시도 중...")
        
        # 로그인 요청 (AJAX)
        login_data = {
            'mode': 'login',
            'userid': login_id,
            'userpw': login_pw,
            'idsaveCheck': 'Y',
            'autoLogin': 'Y',
            'pageReferer': self.BASE_URL
        }
        
        response = self.session.post(
            self.LOGIN_URL,
            data=login_data,
            headers={
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest"
            }
        )
        
        try:
            result = response.json()
            if result.get('result') and result.get('checkyn') == 'Y':
                self.logger.info("Dreamspon 로그인 성공!")
                return
            elif result.get('checkyn') == 'N':
                self.logger.error("로그인 실패: 아이디 또는 비밀번호가 일치하지 않습니다.")
                self.logger.error("DREAMSPON_ID와 DREAMSPON_PW 환경변수를 확인해주세요.")
                raise Exception("Dreamspon 로그인 실패: 아이디/비밀번호 불일치")
            else:
                raise Exception(f"로그인 실패: {result}")
        except ValueError as e:
            self.logger.error(f"로그인 응답 JSON 파싱 실패: {e}")
            raise Exception("Dreamspon 로그인 실패: 응답 파싱 오류")
    
    def crawl_pages(self, max_pages: Optional[int] = None) -> List[Dict]:
        """
        리스트 페이지에서 장학금 목록 크롤링
        
        Args:
            max_pages: 크롤링할 최대 페이지 수
            
        Returns:
            list: 장학금 목록
        """
        self.logger.info("리스트 페이지 크롤링 시작")
        
        all_articles = []
        page = 1
        empty_page_count = 0
        
        while True:
            if max_pages and page > max_pages:
                break
            
            url = f"{self.LIST_URL}?page={page}"
            self.logger.debug(f"페이지 {page} 크롤링 중: {url}")
            
            try:
                response = self.session.get(url, timeout=30)
                soup = BeautifulSoup(response.text, 'html.parser')
                
                articles = self._parse_list_page(soup)
                
                if not articles:
                    empty_page_count += 1
                    if empty_page_count >= 2:
                        self.logger.info(f"더 이상 게시글 없음 (페이지 {page})")
                        break
                else:
                    empty_page_count = 0
                    all_articles.extend(articles)
                    self.logger.info(f"페이지 {page}: {len(articles)}개 수집 (누적: {len(all_articles)}개)")
                
                page += 1
                time.sleep(0.5)  # Rate limiting
                
            except Exception as e:
                self.logger.error(f"페이지 {page} 크롤링 실패: {e}")
                break
        
        self.logger.info(f"리스트 크롤링 완료: 총 {len(all_articles)}개")
        return all_articles
    
    def _parse_list_page(self, soup: BeautifulSoup) -> List[Dict]:
        """
        리스트 페이지 HTML 파싱
        
        HTML 구조:
        <div class="bo_table">
            <table>
                <tbody>
                    <tr>
                        <td class="td_subject">
                            <p class="title"><a href="/scholarship/view.html?idx=8696">제목</a></p>
                            <div class="hashtag"><span>#키워드</span></div>
                        </td>
                        <td>기관명</td>
                        <td class="td_day">
                            <span class="count">D-1</span>
                            <span class="state">마감임박</span>
                        </td>
                        <td class="hit">79</td>
                    </tr>
                </tbody>
            </table>
        </div>
        """
        articles = []
        
        # 테이블의 tbody에서 tr 추출
        rows = soup.select('.bo_table table tbody tr')
        
        for row in rows:
            try:
                # 제목 및 링크 추출
                title_link = row.select_one('.td_subject .title a')
                if not title_link:
                    continue
                
                href = title_link.get('href', '')
                title = title_link.get_text(strip=True)
                
                # idx 추출 (view.html?idx=8696)
                idx_match = re.search(r'idx=(\d+)', href)
                if not idx_match:
                    continue
                
                idx = idx_match.group(1)
                
                # 기관명 추출 (두 번째 td)
                tds = row.select('td')
                organization = tds[1].get_text(strip=True) if len(tds) > 1 else ''
                
                # 해시태그 추출
                hashtags = [
                    tag.get_text(strip=True).replace('#', '')
                    for tag in row.select('.td_subject .hashtag span')
                ]
                
                # D-Day 추출
                d_day_elem = row.select_one('.td_day .count span')
                d_day = d_day_elem.get_text(strip=True) if d_day_elem else ''
                
                # 상태 추출 (모집중, 마감임박, 모집마감 등)
                state_elem = row.select_one('.td_day .state')
                state = state_elem.get_text(strip=True) if state_elem else ''
                
                # 조회수 추출
                hit_elem = row.select_one('.hit')
                views = int(hit_elem.get_text(strip=True)) if hit_elem else 0
                
                articles.append({
                    'id': idx,
                    'title': title,
                    'url': f"{self.VIEW_URL}?idx={idx}",
                    'organization': organization,
                    'hashtags': hashtags,
                    'd_day': d_day,
                    'state': state,
                    'views': views
                })
                
            except Exception as e:
                self.logger.debug(f"행 파싱 실패: {e}")
                continue
        
        return articles
    
    def enrich_articles(self, articles: List[Dict]) -> List[Dict]:
        """
        상세 페이지 크롤링
        
        Args:
            articles: 장학금 목록
            
        Returns:
            list: enriched 장학금 목록
        """
        self.logger.info(f"상세 페이지 크롤링 시작 ({len(articles)}개)")
        
        def enrich_single(article):
            try:
                return self._enrich_article(article)
            except Exception as e:
                self.logger.error(f"상세 크롤링 실패 (idx={article.get('id')}): {e}")
                return self.normalize_data(article)
        
        enriched_list = []
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(enrich_single, article): article for article in articles}
            for i, future in enumerate(as_completed(futures), 1):
                enriched_list.append(future.result())
                if i % 10 == 0:
                    self.logger.info(f"상세 크롤링 진행: {i}/{len(articles)}")
                time.sleep(0.3)  # Rate limiting
        
        self.logger.info(f"상세 페이지 크롤링 완료: {len(enriched_list)}개")
        return enriched_list
    
    def _enrich_article(self, article: Dict) -> Dict:
        """
        개별 상세 페이지 크롤링
        
        Args:
            article: 장학금 기본 정보
            
        Returns:
            dict: enriched 장학금 정보
        """
        url = article['url']
        response = self.session.get(url, timeout=30)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 기본 정보 추출
        article['title'] = self._safe_text(soup.select_one('.v_hd .subject')) or article.get('title', '')
        article['organization'] = self._safe_text(soup.select_one('.v_hd .name')) or article.get('organization', '')
        article['views'] = self._extract_number(soup.select_one('.v_hd .hit')) or article.get('views', 0)
        article['d_day'] = self._safe_text(soup.select_one('.opt-bx .state span')) or article.get('d_day', '')
        
        # 장학 정보 테이블 추출
        info_table = soup.select('.infoTable.basic-info ul')
        
        if len(info_table) >= 1:
            article['scholarship_type'] = self._safe_text(info_table[0].select_one('li:nth-of-type(2)'))
        if len(info_table) >= 2:
            article['selection_count'] = self._safe_text(info_table[1].select_one('li:nth-of-type(2)'))
        if len(info_table) >= 3:
            article['benefit'] = self._safe_text(info_table[2].select_one('li p'))
        if len(info_table) >= 4:
            article['target'] = self._safe_text(info_table[3].select_one('li:nth-of-type(2)'))
        
        # 신청기간
        period_elem = soup.select_one('.infoTable ul li.day p')
        article['application_period'] = self._safe_text(period_elem)
        article['date'] = article['application_period']  # 정규화용
        
        # 요약 및 키워드
        article['summary_text'] = self._safe_text(soup.select_one('.key_summary .memo'))
        article['keywords'] = article.get('hashtags', []) + [
            kw.get_text(strip=True).replace('#', '')
            for kw in soup.select('.key_summary .word .keyword')
        ]
        # 중복 제거
        article['keywords'] = list(set(article['keywords']))
        
        # 본문 내용
        content_elem = soup.select_one('#tab1s dl.scholarship04 dd')
        article['content'] = content_elem.get_text(separator='\n', strip=True) if content_elem else ''
        article['content_html'] = str(content_elem) if content_elem else ''
        
        # 첨부파일 정보
        article['attachments'] = self._extract_attachments(soup, article.get('id', ''))
        
        # 이미지 정보
        article['images'] = self._extract_images(soup)
        
        # 원문공고 링크
        article['original_url'] = self._extract_original_url(soup)
        
        # 재단 정보
        article['foundation_info'] = self._extract_foundation_info(soup)
        
        return self.normalize_data(article)
    
    def _extract_attachments(self, soup: BeautifulSoup, idx: str) -> List[Dict]:
        """첨부파일 정보 추출"""
        attachments = []
        
        for link in soup.select('.pop-file-bx .file-list a.btn_file_down'):
            filepath = link.get('data-filepath', '')
            filename = link.get_text(strip=True)
            
            if filepath:
                attachments.append({
                    'filename': filename,
                    'filepath': filepath,
                    'idx': idx,
                    'download_url': self.FILE_DOWNLOAD_URL
                })
        
        return attachments
    
    def _extract_images(self, soup: BeautifulSoup) -> List[str]:
        """이미지 URL 추출"""
        images = []
        
        for img_link in soup.select('.demo-gallery a[href]'):
            href = img_link.get('href', '')
            if href and not href.startswith('#') and not href.startswith('javascript'):
                # 상대 경로를 절대 경로로 변환
                full_url = href if href.startswith('http') else f"{self.BASE_URL}{href}"
                images.append(full_url)
        
        return images
    
    def _extract_original_url(self, soup: BeautifulSoup) -> str:
        """원문공고 링크 추출"""
        # goScholarship('O', 'URL', idx) 패턴 찾기
        for link in soup.select('a[href*="goScholarship"]'):
            onclick = link.get('href', '')
            match = re.search(r"goScholarship\([^,]+,\s*'([^']+)'", onclick)
            if match:
                return match.group(1)
        return ''
    
    def _extract_foundation_info(self, soup: BeautifulSoup) -> Dict:
        """재단 정보 추출"""
        info = {}
        
        tab2 = soup.select_one('#tab2s')
        if tab2:
            dl = tab2.select_one('dl.scholarship04')
            if dl:
                dts = dl.select('dt')
                dds = dl.select('dd')
                
                for dt, dd in zip(dts, dds):
                    key = dt.get_text(strip=True).replace('·', '').strip()
                    value = dd.get_text(strip=True)
                    if key:
                        info[key] = value
        
        return info
    
    def download_attachment(self, attachment_info: Dict) -> bytes:
        """
        첨부파일 다운로드
        
        Args:
            attachment_info: 첨부파일 정보 (filepath, idx 필요)
            
        Returns:
            bytes: 파일 바이트 데이터
        """
        # POST 요청으로 파일 다운로드
        response = self.session.post(
            attachment_info['download_url'],
            data={
                'file1': attachment_info['filepath'],
                'idx': attachment_info.get('idx', '')
            },
            timeout=60
        )
        
        return response.content
    
    def normalize_data(self, raw_data: Dict) -> Dict:
        """
        데이터를 동국대 크롤러와 동일한 스키마로 정규화
        
        Args:
            raw_data: 원본 데이터
            
        Returns:
            dict: 정규화된 데이터 (동국대 구조와 동일)
        """
        # 글번호: 1000xxxx 형식 (10000000 + idx)
        article_id = raw_data.get('id', '0')
        article_no = str(10000000 + int(article_id))
        
        # content 구성: 본문 + 메타 정보
        content_parts = []
        
        # 기관명
        organization = raw_data.get('organization', '')
        if organization:
            content_parts.append(f"[기관] {organization}")
        
        # 선발인원
        selection_count = raw_data.get('selection_count', '')
        if selection_count:
            content_parts.append(f"[선발인원] {selection_count}")
        
        # 장학혜택
        benefit = raw_data.get('benefit', '')
        if benefit:
            content_parts.append(f"[장학혜택] {benefit}")
        
        # 선발대상
        target = raw_data.get('target', '')
        if target:
            content_parts.append(f"[선발대상] {target}")
        
        # 신청기간
        application_period = raw_data.get('application_period', '')
        if application_period:
            content_parts.append(f"[신청기간] {application_period}")
        
        # 본문 내용 추가
        main_content = raw_data.get('content', '')
        if main_content:
            content_parts.append(f"\n{main_content}")
        
        combined_content = '\n'.join(content_parts)
        
        return {
            # 동국대와 동일한 필드 구조
            '글번호': article_no,
            '제목': raw_data.get('title', ''),
            'URL': raw_data.get('url', ''),
            '등록일': application_period or raw_data.get('date', ''),
            'content': combined_content,
            'attachments': raw_data.get('attachments', []),
            'images': raw_data.get('images', []),
            'isImage': len(raw_data.get('images', [])) > 0
        }
    
    def save_to_mongodb(self, enriched_articles: List[Dict], collection_name: str = 'scholarships') -> int:
        """
        MongoDB 저장 (글번호 1000xxxx 패턴으로 기존 데이터 삭제)
        
        Args:
            enriched_articles: 저장할 게시글 목록
            collection_name: 저장할 컬렉션 이름
            
        Returns:
            int: 저장된 게시글 수
        """
        from pymongo import MongoClient
        
        self.logger.info(f"MongoDB 저장 시작 ({collection_name})")
        
        connection_string = f"mongodb://{self.mongo_config['user']}:{self.mongo_config['password']}@{self.mongo_config['host']}:{self.mongo_config['port']}/"
        client = MongoClient(connection_string)
        db = client[self.mongo_config['database']]
        collection = db[collection_name]
        
        # 글번호가 1000xxxx 패턴인 기존 데이터 삭제 (Dreamspon 데이터만)
        delete_result = collection.delete_many({
            '글번호': {'$regex': '^1000'}
        })
        self.logger.info(f"기존 Dreamspon 데이터 삭제: {delete_result.deleted_count}개")
        
        # 데이터 삽입
        if enriched_articles:
            result = collection.insert_many(enriched_articles)
            self.logger.info(f"MongoDB 저장 완료: {len(result.inserted_ids)}개")
        
        client.close()
        return len(enriched_articles)
    
    def _safe_text(self, elem) -> str:
        """안전하게 텍스트 추출"""
        return elem.get_text(strip=True) if elem else ''
    
    def _extract_number(self, elem) -> int:
        """숫자 추출"""
        if elem:
            text = elem.get_text(strip=True)
            match = re.search(r'\d+', text)
            if match:
                return int(match.group())
        return 0


# 테스트용 코드
if __name__ == "__main__":
    import sys
    
    # 로깅 설정
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s'
    )
    
    try:
        crawler = DreamsponCrawler()
        
        # 테스트: 1페이지만 크롤링
        results = crawler.run_pipeline(max_pages=1)
        
        print(f"\n총 {len(results)}개 장학금 크롤링 완료")
        
        # 샘플 출력
        if results:
            sample = results[0]
            print("\n=== 샘플 데이터 ===")
            print(f"제목: {sample.get('제목')}")
            print(f"기관: {sample.get('organization')}")
            print(f"장학종류: {sample.get('scholarship_type')}")
            print(f"혜택: {sample.get('benefit')}")
            print(f"상태: {sample.get('state')}")
            print(f"D-Day: {sample.get('d_day')}")
            print(f"첨부파일: {len(sample.get('attachments', []))}개")
            print(f"이미지: {len(sample.get('images', []))}개")
            
    except Exception as e:
        print(f"오류: {e}")
        sys.exit(1)

