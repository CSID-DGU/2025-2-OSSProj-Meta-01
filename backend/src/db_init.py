import os
import mysql.connector
import django
from dotenv import load_dotenv
from pathlib import Path
from django.contrib.auth.hashers import make_password

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

# .env 로드
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(env_path)

MYSQL_HOST = os.getenv('MYSQL_HOST')
MYSQL_PORT = os.getenv('MYSQL_PORT')
MYSQL_USER = os.getenv('MYSQL_USER')
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD')
MYSQL_DATABASE = os.getenv('MYSQL_DATABASE')

connection = mysql.connector.connect(
    host=MYSQL_HOST,
    user=MYSQL_USER,
    password=MYSQL_PASSWORD,
    port=MYSQL_PORT
)
cursor = connection.cursor()

cursor.execute(f"""
    SELECT SCHEMA_NAME 
    FROM INFORMATION_SCHEMA.SCHEMATA 
    WHERE SCHEMA_NAME = '{MYSQL_DATABASE}';
""")

db_exists = cursor.fetchone() is not None

if not db_exists:
    print(f">>> Database '{MYSQL_DATABASE}' does not exist. Creating...")
    cursor.execute(f"CREATE DATABASE {MYSQL_DATABASE};")
else:
    print(f">>> Database '{MYSQL_DATABASE}' already exists. Using existing DB.")

cursor.execute(f"USE {MYSQL_DATABASE};")

# 테이블 생성 (없으면 자동 생성)
sql_commands = [
    """
    CREATE TABLE IF NOT EXISTS Universities (
        university_id INT NOT NULL AUTO_INCREMENT,
        university_name VARCHAR(100) NOT NULL UNIQUE,
        PRIMARY KEY (university_id)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS Majors (
        major_id INT NOT NULL AUTO_INCREMENT,
        university_id INT NOT NULL,
        major_name VARCHAR(200) NOT NULL,
        PRIMARY KEY (major_id),
        CONSTRAINT FK_Universities_TO_Majors FOREIGN KEY (university_id)
            REFERENCES Universities (university_id)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS Organizations (
        organization_id INT NOT NULL AUTO_INCREMENT,
        organization_name VARCHAR(100) NOT NULL UNIQUE,
        PRIMARY KEY (organization_id)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS Users (
        user_id INT NOT NULL AUTO_INCREMENT,
        id VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        user_name VARCHAR(50) NOT NULL,
        phone VARCHAR(30) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        major_id INT NOT NULL,
        year ENUM('1','2','3','4','5','6') NOT NULL,
        gpa VARCHAR(10) NOT NULL,
        income_level ENUM('1분위','2분위','3분위','4분위','5분위','6분위','7분위','8분위','9분위','10분위') NULL,
        receive_notifications TINYINT(1) NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id),
        CONSTRAINT FK_Majors_TO_Users FOREIGN KEY (major_id)
            REFERENCES Majors (major_id)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS Scholarships (
        scholarship_id INT NOT NULL AUTO_INCREMENT,
        university_id INT NULL,
        organization_id INT NULL,
        scholarship_name VARCHAR(200) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        url TEXT NOT NULL,
        image_url TEXT NULL,
        PRIMARY KEY (scholarship_id),
        CONSTRAINT FK_Universities_TO_Scholarships FOREIGN KEY (university_id)
            REFERENCES Universities (university_id),
        CONSTRAINT FK_Organizations_TO_Scholarships FOREIGN KEY (organization_id)
            REFERENCES Organizations (organization_id)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS Keywords (
        keyword_id INT NOT NULL AUTO_INCREMENT,
        keyword VARCHAR(50) NOT NULL,
        PRIMARY KEY (keyword_id)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS UserKeywords (
        user_keyword_id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        keyword_id INT NOT NULL,
        PRIMARY KEY (user_keyword_id),
        CONSTRAINT FK_Users_TO_UserKeywords_1 FOREIGN KEY (user_id)
            REFERENCES Users (user_id),
        CONSTRAINT FK_Keywords_TO_UserKeywords_1 FOREIGN KEY (keyword_id)
            REFERENCES Keywords (keyword_id),
        CONSTRAINT UQ_userword_unique UNIQUE (user_id, keyword_id)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS ScholarshipKeywords (
        scholarship_keyword_id INT NOT NULL AUTO_INCREMENT,
        scholarship_id INT NOT NULL,
        keyword_id INT NOT NULL,
        PRIMARY KEY (scholarship_keyword_id),
        CONSTRAINT FK_Scholarships_TO_ScholarshipKeywords_1 FOREIGN KEY (scholarship_id)
            REFERENCES Scholarships (scholarship_id),
        CONSTRAINT FK_Keywords_TO_ScholarshipKeywords_1 FOREIGN KEY (keyword_id)
            REFERENCES Keywords (keyword_id),
        CONSTRAINT UQ_scholarshipkeyword_unique UNIQUE (scholarship_id, keyword_id)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS Bookmarks (
        bookmark_id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        scholarship_id INT NOT NULL,
        PRIMARY KEY (bookmark_id),
        CONSTRAINT FK_Users_TO_Bookmarks_1 FOREIGN KEY (user_id)
            REFERENCES Users (user_id),
        CONSTRAINT FK_Scholarships_TO_Bookmarks_1 FOREIGN KEY (scholarship_id)
            REFERENCES Scholarships (scholarship_id),
        CONSTRAINT UQ_bookmark_unique UNIQUE (user_id, scholarship_id)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS Notifications (
        notification_id INT NOT NULL AUTO_INCREMENT,
        bookmark_id INT NOT NULL,
        notification_date INT NOT NULL,
        PRIMARY KEY (notification_id),
        CONSTRAINT FK_Bookmarks_TO_Notifications_1 FOREIGN KEY (bookmark_id)
            REFERENCES Bookmarks (bookmark_id),
        CONSTRAINT UQ_notification_unique UNIQUE (bookmark_id, notification_date)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS Recommendations (
        recommendation_id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        scholarship_id INT NOT NULL,
        PRIMARY KEY (recommendation_id),
        CONSTRAINT FK_Users_TO_Recommendations_1 FOREIGN KEY (user_id)
            REFERENCES Users (user_id),
        CONSTRAINT FK_Scholarships_TO_Recommendations_1 FOREIGN KEY (scholarship_id)
            REFERENCES Scholarships (scholarship_id),
        CONSTRAINT UQ_recommendation_unique UNIQUE (user_id, scholarship_id)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS Certifications (
        certification_id INT NOT NULL AUTO_INCREMENT,
        certification_name VARCHAR(200) NOT NULL UNIQUE,
        category VARCHAR(50) NOT NULL,
        PRIMARY KEY (certification_id)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS UserCertifications (
        user_certification_id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        certification_id INT NOT NULL,
        score VARCHAR(50) NULL,
        acquired_date DATE NOT NULL,
        expiration_date DATE NULL,
        PRIMARY KEY (user_certification_id),
        CONSTRAINT FK_Users_TO_UserCertifications_1 FOREIGN KEY (user_id)
            REFERENCES Users (user_id),
        CONSTRAINT FK_Certifications_TO_UserCertifications_1 FOREIGN KEY (certification_id)
            REFERENCES Certifications (certification_id),
        CONSTRAINT UQ_usercertification_unique UNIQUE (user_id, certification_id)
    );
    """
]

for command in sql_commands:
    cursor.execute(command)

# 초기 데이터 삽입
# 1. 대학교 (실제)
cursor.execute("""
INSERT INTO Universities (university_name)
SELECT * FROM (SELECT '동국대학교') AS tmp
WHERE NOT EXISTS (SELECT university_name FROM Universities WHERE university_name = '동국대학교');
""")

# 2. 전공 (실제)
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '불교학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '불교학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '문화유산학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '문화유산학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '국어국문문예창작학부'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '국어국문문예창작학부');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '영어영문학부'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '영어영문학부');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '일본학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '일본학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '중어중문학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '중어중문학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '철학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '철학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '사학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '사학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '수학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '수학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '화학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '화학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '통계학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '통계학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '물리반도체과학부'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '물리반도체과학부');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '물리학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '물리학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '법학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '법학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '정치외교학전공'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '정치외교학전공');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '행정학전공'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '행정학전공');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '북한학전공'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '북한학전공');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '경제학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '경제학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '국제통상학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '국제통상학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '사회학전공'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '사회학전공');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '미디어커뮤니케이션학전공'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '미디어커뮤니케이션학전공');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '식품산업관리학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '식품산업관리학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '광고홍보학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '광고홍보학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '사회복지학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '사회복지학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '경찰행정학부'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '경찰행정학부');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '경영학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '경영학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '회계학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '회계학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '경영정보학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '경영정보학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '바이오환경과학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '바이오환경과학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '생명과학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '생명과학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '식품생명공학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '식품생명공학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '의생명공학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '의생명공학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '전자전기공학부'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '전자전기공학부');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '정보통신공학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '정보통신공학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '건설환경공학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '건설환경공학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '화공생물공학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '화공생물공학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '기계로봇에너지공학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '기계로봇에너지공학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '건축공학부'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '건축공학부');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '산업시스템공학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '산업시스템공학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '에너지신소재공학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '에너지신소재공학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '컴퓨터AI학부'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '컴퓨터AI학부');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '시스템반도체학부'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '시스템반도체학부');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '의료인공지능공학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '의료인공지능공학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '지능형네트워크융합학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '지능형네트워크융합학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '지능IoT학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '지능IoT학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '교육학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '교육학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '국어교육과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '국어교육과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '역사교육과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '역사교육과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '지리교육과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '지리교육과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '수학교육과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '수학교육과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '가정교육과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '가정교육과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '체육교육과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '체육교육과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '미술학부'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '미술학부');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '연극학부'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '연극학부');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '영화영상학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '영화영상학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '스포츠문화학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '스포츠문화학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '한국음악과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '한국음악과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '약학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '약학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '융합보안학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '융합보안학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '사회복지상담학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '사회복지상담학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '글로벌무역학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '글로벌무역학과');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '다르마칼리지'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '다르마칼리지');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '열린전공학부'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '열린전공학부');
""")

# 3. 사용자 (테스트용 가짜)
cursor.execute("""
INSERT INTO Users (id, password, user_name, phone, email, major_id, year, gpa, income_level, receive_notifications)
SELECT * FROM (
    SELECT 
        'test1' AS id,
        %s AS password,
        '김김김' AS user_name,
        '01011111111' AS phone,
        '111@test.com' AS email,
        10 AS major_id,
        '4' AS year,
        '3.00' AS gpa,
        '4분위' AS income_level,
        1 AS receive_notifications
) AS tmp
WHERE NOT EXISTS (SELECT id FROM Users WHERE id='test1');
""", (make_password('password1'),))
cursor.execute("""
INSERT INTO Users (id, password, user_name, phone, email, major_id, year, gpa, income_level, receive_notifications)
SELECT * FROM (
    SELECT 
        'test2' AS id,
        %s AS password,
        '이이이' AS user_name,
        '01022222222' AS phone,
        '222@test.com' AS email,
        20 AS major_id,
        '2' AS year,
        '3.50' AS gpa,
        '5분위' AS income_level,
        0 AS receive_notifications
) AS tmp
WHERE NOT EXISTS (SELECT id FROM Users WHERE id='test2');
""", (make_password('password2'),))
cursor.execute("""
INSERT INTO Users (id, password, user_name, phone, email, major_id, year, gpa, income_level, receive_notifications)
SELECT * FROM (
    SELECT 
        'test3' AS id,
        %s AS password,
        '박박박' AS user_name,
        '01033333333' AS phone,
        '333@test.com' AS email,
        30 AS major_id,
        '5' AS year,
        '2.70' AS gpa,
        '2분위' AS income_level,
        1 AS receive_notifications
) AS tmp
WHERE NOT EXISTS (SELECT id FROM Users WHERE id='test3');
""", (make_password('password3'),))

# 4. 키워드 (실제)
cursor.execute("""
INSERT INTO Keywords (keyword)
SELECT * FROM (SELECT '교내장학' AS keyword) AS tmp
WHERE NOT EXISTS (SELECT keyword FROM Keywords WHERE keyword='교내장학');
""")
cursor.execute("""
INSERT INTO Keywords (keyword)
SELECT * FROM (SELECT '교외장학' AS keyword) AS tmp
WHERE NOT EXISTS (SELECT keyword FROM Keywords WHERE keyword='교외장학');
""")
cursor.execute("""
INSERT INTO Keywords (keyword)
SELECT * FROM (SELECT '국가장학' AS keyword) AS tmp
WHERE NOT EXISTS (SELECT keyword FROM Keywords WHERE keyword='국가장학');
""")
cursor.execute("""
INSERT INTO Keywords (keyword)
SELECT * FROM (SELECT '봉사' AS keyword) AS tmp
WHERE NOT EXISTS (SELECT keyword FROM Keywords WHERE keyword='봉사');
""")
cursor.execute("""
INSERT INTO Keywords (keyword)
SELECT * FROM (SELECT '성적우수' AS keyword) AS tmp
WHERE NOT EXISTS (SELECT keyword FROM Keywords WHERE keyword='성적우수');
""")
cursor.execute("""
INSERT INTO Keywords (keyword)
SELECT * FROM (SELECT '등록금지원' AS keyword) AS tmp
WHERE NOT EXISTS (SELECT keyword FROM Keywords WHERE keyword='등록금지원');
""")
cursor.execute("""
INSERT INTO Keywords (keyword)
SELECT * FROM (SELECT '생활비지원' AS keyword) AS tmp
WHERE NOT EXISTS (SELECT keyword FROM Keywords WHERE keyword='생활비지원');
""")
cursor.execute("""
INSERT INTO Keywords (keyword)
SELECT * FROM (SELECT '이공계' AS keyword) AS tmp
WHERE NOT EXISTS (SELECT keyword FROM Keywords WHERE keyword='이공계');
""")
cursor.execute("""
INSERT INTO Keywords (keyword)
SELECT * FROM (SELECT '인문계' AS keyword) AS tmp
WHERE NOT EXISTS (SELECT keyword FROM Keywords WHERE keyword='인문계');
""")
cursor.execute("""
INSERT INTO Keywords (keyword)
SELECT * FROM (SELECT '예체능' AS keyword) AS tmp
WHERE NOT EXISTS (SELECT keyword FROM Keywords WHERE keyword='예체능');
""")
cursor.execute("""
INSERT INTO Keywords (keyword)
SELECT * FROM (SELECT '종교' AS keyword) AS tmp
WHERE NOT EXISTS (SELECT keyword FROM Keywords WHERE keyword='종교');
""")
cursor.execute("""
INSERT INTO Keywords (keyword)
SELECT * FROM (SELECT '저소득층' AS keyword) AS tmp
WHERE NOT EXISTS (SELECT keyword FROM Keywords WHERE keyword='저소득층');
""")
cursor.execute("""
INSERT INTO Keywords (keyword)
SELECT * FROM (SELECT '기업연계' AS keyword) AS tmp
WHERE NOT EXISTS (SELECT keyword FROM Keywords WHERE keyword='기업연계');
""")
cursor.execute("""
INSERT INTO Keywords (keyword)
SELECT * FROM (SELECT '자격증' AS keyword) AS tmp
WHERE NOT EXISTS (SELECT keyword FROM Keywords WHERE keyword='자격증');
""")

# 5. 자격증 (실제)
cursor.execute("""
INSERT INTO Certifications (certification_name, category)
SELECT * FROM (
    SELECT 'TOEIC' AS certification_name, '어학' AS category
) AS tmp
WHERE NOT EXISTS (SELECT certification_name FROM Certifications WHERE certification_name='TOEIC');
""")
cursor.execute("""
INSERT INTO Certifications (certification_name, category)
SELECT * FROM (
    SELECT 'TOEFL' AS certification_name, '어학' AS category
) AS tmp
WHERE NOT EXISTS (SELECT certification_name FROM Certifications WHERE certification_name='TOEFL');
""")
cursor.execute("""
INSERT INTO Certifications (certification_name, category)
SELECT * FROM (
    SELECT 'IELTS' AS certification_name, '어학' AS category
) AS tmp
WHERE NOT EXISTS (SELECT certification_name FROM Certifications WHERE certification_name='IELTS');
""")
cursor.execute("""
INSERT INTO Certifications (certification_name, category)
SELECT * FROM (
    SELECT '전기기사' AS certification_name, '국가기술' AS category
) AS tmp
WHERE NOT EXISTS (SELECT certification_name FROM Certifications WHERE certification_name='전기기사');
""")
cursor.execute("""
INSERT INTO Certifications (certification_name, category)
SELECT * FROM (
    SELECT '전자기사' AS certification_name, '국가기술' AS category
) AS tmp
WHERE NOT EXISTS (SELECT certification_name FROM Certifications WHERE certification_name='전자기사');
""")
cursor.execute("""
INSERT INTO Certifications (certification_name, category)
SELECT * FROM (
    SELECT '정보처리기능사' AS certification_name, '국가기술' AS category
) AS tmp
WHERE NOT EXISTS (SELECT certification_name FROM Certifications WHERE certification_name='정보처리기능사');
""")

# 6. 기관 (테스트용 가짜)
cursor.execute("""
INSERT INTO Organizations (organization_name)
SELECT * FROM (SELECT '가나다라재단') AS tmp
WHERE NOT EXISTS (
    SELECT organization_name FROM Organizations WHERE organization_name = '가나다라재단'
);
""")
cursor.execute("""
INSERT INTO Organizations (organization_name)
SELECT * FROM (SELECT '마바사재단') AS tmp
WHERE NOT EXISTS (
    SELECT organization_name FROM Organizations WHERE organization_name = '마바사재단'
);
""")

# 7. 장학금 (테스트용 가짜)
cursor.execute("""
INSERT INTO Scholarships (university_id, organization_id, scholarship_name, start_date, end_date, url, image_url)
SELECT 
    (SELECT university_id FROM Universities WHERE university_name='동국대학교'),
    NULL,
    '동국대학교 어쩌구장학금',
    '2025-11-10',
    '2025-12-20',
    'https://eclass.dongguk.edu/',
    'https://picsum.photos/400/300'
WHERE NOT EXISTS (
    SELECT scholarship_name FROM Scholarships WHERE scholarship_name='동국대학교 어쩌구장학금'
);
""")
cursor.execute("""
INSERT INTO Scholarships (university_id, organization_id, scholarship_name, start_date, end_date, url, image_url)
SELECT 
    (SELECT university_id FROM Universities WHERE university_name='동국대학교'),
    NULL,
    '동국대학교 저쩌구장학금',
    '2025-11-20',
    '2025-11-30',
    'https://ndrims.dongguk.edu/unis/index.do',
    'https://picsum.photos/400/500'
WHERE NOT EXISTS (
    SELECT scholarship_name FROM Scholarships WHERE scholarship_name='동국대학교 저쩌구장학금'
);
""")
cursor.execute("""
INSERT INTO Scholarships (university_id, organization_id, scholarship_name, start_date, end_date, url, image_url)
SELECT 
    NULL,
    (SELECT organization_id FROM Organizations WHERE organization_name='가나다라재단'),
    '가나장학금',
    '2025-02-01',
    '2025-03-01',
    'https://www.naver.com/',
    'https://picsum.photos/500/500'
WHERE NOT EXISTS (
    SELECT scholarship_name FROM Scholarships WHERE scholarship_name='가나장학금'
);
""")
cursor.execute("""
INSERT INTO Scholarships (university_id, organization_id, scholarship_name, start_date, end_date, url, image_url)
SELECT 
    NULL,
    (SELECT organization_id FROM Organizations WHERE organization_name='가나다라재단'),
    '다라장학금',
    '2025-12-01',
    '2025-12-10',
    'https://www.youtube.com/',
    'https://picsum.photos/300/300'
WHERE NOT EXISTS (
    SELECT scholarship_name FROM Scholarships WHERE scholarship_name='다라장학금'
);
""")
cursor.execute("""
INSERT INTO Scholarships (university_id, organization_id, scholarship_name, start_date, end_date, url, image_url)
SELECT 
    NULL,
    (SELECT organization_id FROM Organizations WHERE organization_name='마바사재단'),
    '마바장학금',
    '2025-11-10',
    '2025-11-15',
    'https://chatgpt.com/',
    'https://picsum.photos/300/200'
WHERE NOT EXISTS (
    SELECT scholarship_name FROM Scholarships WHERE scholarship_name='마바장학금'
);
""")
cursor.execute("""
INSERT INTO Scholarships (university_id, organization_id, scholarship_name, start_date, end_date, url, image_url)
SELECT 
    NULL,
    (SELECT organization_id FROM Organizations WHERE organization_name='마바사재단'),
    '사장학금',
    '2025-12-10',
    '2025-12-20',
    'https://www.acmicpc.net/',
    'https://picsum.photos/200/500'
WHERE NOT EXISTS (
    SELECT scholarship_name FROM Scholarships WHERE scholarship_name='사장학금'
);
""")

connection.commit()
cursor.close()
connection.close()

print("MySQL DB 초기화 완료")
