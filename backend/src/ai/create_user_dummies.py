import os
import random
import mysql.connector
from dotenv import load_dotenv
from faker import Faker


class CreateDummies:
    """
    가상의 사용자 데이터를 생성하고 데이터베이스에 삽입하는 클래스
    """
    
    def __init__(self):
        """
        CreateDummies 클래스 초기화
        환경 변수를 로드하고 데이터베이스 연결을 설정합니다.
        """
        # .env 로드
        load_dotenv()
        
        # MySQL 데이터베이스 연결
        self.connection = mysql.connector.connect(
            host=os.getenv('MYSQL_HOST'),
            user=os.getenv('MYSQL_USER'),
            password=os.getenv('MYSQL_PASSWORD'),
            port=os.getenv('MYSQL_PORT'),
            database=os.getenv('MYSQL_DATABASE')
        )
        self.cursor = self.connection.cursor()
        
        # Faker 인스턴스 생성 (한국어)
        self.fake = Faker('ko_KR')
        
        # 전공 ID 목록 (하드코딩) - 63개
        self.major_ids = list(range(1, 5))
        
        # 키워드 ID 목록 (하드코딩) - 14개
        self.keyword_ids = list(range(1, 6))
        
        # 자격증 ID 목록 (하드코딩)
        self.certification_ids = list(range(1, 7))
        
        # # SQL에서 가져오는 코드 (주석처리)
        # # 전공 ID 목록 가져오기
        # self.cursor.execute("SELECT major_id FROM Majors")
        # self.major_ids = [row[0] for row in self.cursor.fetchall()]
        # 
        # # 키워드 ID 목록 가져오기
        # self.cursor.execute("SELECT keyword_id FROM Keywords")
        # self.keyword_ids = [row[0] for row in self.cursor.fetchall()]
        # 
        # # 자격증 ID 목록 가져오기
        # self.cursor.execute("SELECT certification_id FROM Certifications")
        # self.certification_ids = [row[0] for row in self.cursor.fetchall()]
        
    def create_users(self, num_users=10):
        """
        가상 사용자를 생성하여 데이터베이스에 삽입합니다.
        
        Args:
            num_users (int): 생성할 사용자 수 (기본값: 10)
            
        Returns:
            list: 생성된 사용자 ID 목록
        """
        created_user_ids = []
        
        for i in range(num_users):
            try:
                # 고유한 ID, 전화번호, 이메일 생성
                user_id = f"dummy_{i+1}_{random.randint(1000, 9999)}"
                phone = self.fake.phone_number().replace('-', '')[:11]
                email = f"dummy_{i+1}_{random.randint(1000, 9999)}@test.com"
                
                # 사용자 정보 생성
                user_data = {
                    'id': user_id,
                    'password': f"password{random.randint(1000, 9999)}",
                    'user_name': self.fake.name(),
                    'phone': phone,
                    'email': email,
                    'major_id': random.choice(self.major_ids) if self.major_ids else 1,
                    'year': str(random.randint(1, 6)),
                    'gpa': round(random.uniform(2.0, 4.5), 2),
                    'income_level': f"{random.randint(1, 10)}분위",
                    'receive_notifications': random.choice([0, 1])
                }
                
                # 사용자 삽입
                insert_query = """
                INSERT INTO Users (id, password, user_name, phone, email, major_id, year, gpa, income_level, receive_notifications)
                VALUES (%(id)s, %(password)s, %(user_name)s, %(phone)s, %(email)s, %(major_id)s, %(year)s, %(gpa)s, %(income_level)s, %(receive_notifications)s)
                """
                self.cursor.execute(insert_query, user_data)
                user_db_id = self.cursor.lastrowid
                created_user_ids.append(user_db_id)
                
                print(f"사용자 생성 완료: {user_data['user_name']} (ID: {user_id})")
                
            except mysql.connector.Error as err:
                print(f"사용자 생성 중 오류 발생: {err}")
                continue
        
        self.connection.commit()
        print(f"\n총 {len(created_user_ids)}명의 사용자가 생성되었습니다.")
        return created_user_ids
    
    def add_user_keywords(self, user_ids, min_keywords=1, max_keywords=3):
        """
        생성된 사용자에게 랜덤 키워드를 할당합니다.
        
        Args:
            user_ids (list): 사용자 ID 목록
            min_keywords (int): 사용자당 최소 키워드 수
            max_keywords (int): 사용자당 최대 키워드 수
        """
        if not self.keyword_ids:
            print("키워드가 없어 건너뜁니다.")
            return
        
        for user_id in user_ids:
            num_keywords = random.randint(min_keywords, max_keywords)
            selected_keywords = random.sample(self.keyword_ids, min(num_keywords, len(self.keyword_ids)))
            
            for keyword_id in selected_keywords:
                try:
                    insert_query = """
                    INSERT INTO UserKeywords (user_id, keyword_id)
                    VALUES (%s, %s)
                    """
                    self.cursor.execute(insert_query, (user_id, keyword_id))
                except mysql.connector.Error as err:
                    print(f"키워드 할당 중 오류 발생: {err}")
                    continue
        
        self.connection.commit()
        print(f"사용자에게 키워드가 할당되었습니다.")
    
    def add_user_certifications(self, user_ids, probability=0.5):
        """
        생성된 사용자에게 랜덤 자격증을 할당합니다.
        
        Args:
            user_ids (list): 사용자 ID 목록
            probability (float): 자격증을 가질 확률 (0.0 ~ 1.0)
        """
        if not self.certification_ids:
            print("자격증이 없어 건너뜁니다.")
            return
        
        for user_id in user_ids:
            # 일정 확률로 자격증 보유
            if random.random() > probability:
                continue
            
            # 1~3개의 자격증 할당
            num_certs = random.randint(1, min(3, len(self.certification_ids)))
            selected_certs = random.sample(self.certification_ids, num_certs)
            
            for cert_id in selected_certs:
                try:
                    # 랜덤 날짜 생성
                    acquired_date = self.fake.date_between(start_date='-3y', end_date='today')
                    
                    # 점수 (선택적)
                    score = None
                    if random.random() > 0.5:
                        score = str(random.randint(700, 990))
                    
                    # 만료일 (선택적)
                    expiration_date = None
                    if random.random() > 0.7:
                        expiration_date = self.fake.date_between(start_date='today', end_date='+2y')
                    
                    insert_query = """
                    INSERT INTO UserCertifications (user_id, certification_id, score, acquired_date, expiration_date)
                    VALUES (%s, %s, %s, %s, %s)
                    """
                    self.cursor.execute(insert_query, (user_id, cert_id, score, acquired_date, expiration_date))
                except mysql.connector.Error as err:
                    print(f"자격증 할당 중 오류 발생: {err}")
                    continue
        
        self.connection.commit()
        print(f"사용자에게 자격증이 할당되었습니다.")
    
    def add_user_bookmarks(self, user_ids=None, min_bookmarks=5, max_bookmarks=15):
        """
        특성 기반으로 북마크를 생성합니다.
        유저 키워드와 장학금 키워드가 겹치면 북마크 확률이 높아집니다.
        
        Args:
            user_ids (list): 사용자 ID 목록 (None이면 전체 유저)
            min_bookmarks (int): 유저당 최소 북마크 수
            max_bookmarks (int): 유저당 최대 북마크 수
        """
        # 유저 목록 가져오기
        if user_ids is None:
            self.cursor.execute("SELECT user_id FROM Users")
            user_ids = [row[0] for row in self.cursor.fetchall()]
        
        # 장학금 목록 가져오기
        self.cursor.execute("SELECT scholarship_id FROM Scholarships")
        scholarship_ids = [row[0] for row in self.cursor.fetchall()]
        
        if not scholarship_ids:
            print("장학금이 없어 북마크를 생성할 수 없습니다.")
            return
        
        print(f"\n유저 {len(user_ids)}명, 장학금 {len(scholarship_ids)}개 대상으로 북마크 생성...")
        
        total_bookmarks = 0
        
        for user_id in user_ids:
            # 유저의 키워드 가져오기
            self.cursor.execute("""
                SELECT keyword_id FROM UserKeywords WHERE user_id = %s
            """, (user_id,))
            user_keyword_ids = set(row[0] for row in self.cursor.fetchall())
            
            # 각 장학금에 대해 북마크 확률 계산
            scholarship_scores = []
            for scholarship_id in scholarship_ids:
                # 장학금의 키워드 가져오기
                self.cursor.execute("""
                    SELECT keyword_id FROM ScholarshipKeywords WHERE scholarship_id = %s
                """, (scholarship_id,))
                scholarship_keyword_ids = set(row[0] for row in self.cursor.fetchall())
                
                # 겹치는 키워드 수
                overlap = len(user_keyword_ids & scholarship_keyword_ids)
                scholarship_scores.append((scholarship_id, overlap))
            
            # 겹침 수가 높은 순으로 정렬
            scholarship_scores.sort(key=lambda x: x[1], reverse=True)
            
            # 북마크 수 결정
            num_bookmarks = random.randint(min_bookmarks, min(max_bookmarks, len(scholarship_ids)))
            
            # 상위 70%는 특성 기반, 30%는 랜덤
            top_count = int(num_bookmarks * 0.7)
            random_count = num_bookmarks - top_count
            
            selected = []
            # 특성 기반 선택 (겹침 많은 것 우선)
            for scholarship_id, overlap in scholarship_scores[:top_count]:
                selected.append(scholarship_id)
            
            # 랜덤 선택 (이미 선택된 것 제외)
            remaining = [s_id for s_id, _ in scholarship_scores if s_id not in selected]
            if remaining and random_count > 0:
                selected.extend(random.sample(remaining, min(random_count, len(remaining))))
            
            # 북마크 삽입
            for scholarship_id in selected:
                try:
                    self.cursor.execute("""
                        INSERT INTO Bookmarks (user_id, scholarship_id)
                        VALUES (%s, %s)
                    """, (user_id, scholarship_id))
                    total_bookmarks += 1
                except mysql.connector.Error:
                    continue  # 중복 무시
        
        self.connection.commit()
        print(f"총 {total_bookmarks}개의 북마크가 생성되었습니다.")
    
    def create_complete_users(self, num_users=10):
        """
        사용자와 함께 키워드, 자격증까지 모두 생성합니다.
        
        Args:
            num_users (int): 생성할 사용자 수
            
        Returns:
            list: 생성된 사용자 ID 목록
        """
        print(f"=== {num_users}명의 가상 사용자 생성 시작 ===\n")
        
        # 사용자 생성
        user_ids = self.create_users(num_users)
        
        # 키워드 할당
        print("\n--- 키워드 할당 ---")
        self.add_user_keywords(user_ids)
        
        # 자격증 할당
        print("\n--- 자격증 할당 ---")
        self.add_user_certifications(user_ids)
        
        print(f"\n=== 가상 사용자 생성 완료 ===")
        return user_ids
    
    def close(self):
        """
        데이터베이스 연결을 종료합니다.
        """
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
        print("데이터베이스 연결이 종료되었습니다.")
    
    def __enter__(self):
        """
        컨텍스트 매니저 진입
        """
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """
        컨텍스트 매니저 종료
        """
        self.close()


if __name__ == "__main__":
    # 사용 예시
    with CreateDummies() as dummy_creator:
        # 가상 사용자 생성 (키워드, 자격증 포함)
        dummy_creator.create_complete_users(num_users=20)

