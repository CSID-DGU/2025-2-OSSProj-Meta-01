import os
import mysql.connector
from dotenv import load_dotenv

# .env 로드
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

connection = mysql.connector.connect(
    host=os.getenv('MYSQL_HOST'),
    user=os.getenv('MYSQL_USER'),
    password=os.getenv('MYSQL_PASSWORD'),
    port=os.getenv('MYSQL_PORT')
)

cursor = connection.cursor()

# DB 생성 (없으면 자동 생성)
cursor.execute(f"CREATE DATABASE IF NOT EXISTS {os.getenv('MYSQL_DATABASE')};")
cursor.execute(f"USE {os.getenv('MYSQL_DATABASE')};")

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
        gpa DECIMAL(3,2) NOT NULL,
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
        url VARCHAR(500) NOT NULL,
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
# 1. 대학교
cursor.execute("""
INSERT INTO Universities (university_name)
SELECT * FROM (SELECT '동국대학교') AS tmp
WHERE NOT EXISTS (SELECT university_name FROM Universities WHERE university_name = '동국대학교');
""")
cursor.execute("""
INSERT INTO Universities (university_name)
SELECT * FROM (SELECT '서울대학교') AS tmp
WHERE NOT EXISTS (SELECT university_name FROM Universities WHERE university_name = '서울대학교');
""")

# 2. 전공
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '전자전기공학부'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '전자전기공학부');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='동국대학교'), '국어국문문예창작학부'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '국어국문문예창작학부');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='서울대학교'), '전기정보공학부'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '전기정보공학부');
""")
cursor.execute("""
INSERT INTO Majors (university_id, major_name)
SELECT (SELECT university_id FROM Universities WHERE university_name='서울대학교'), '국어국문학과'
WHERE NOT EXISTS (SELECT major_name FROM Majors WHERE major_name = '국어국문학과');
""")

# 3. 사용자
cursor.execute("""
INSERT INTO Users (id, password, user_name, phone, email, major_id, year, gpa, income_level, receive_notifications)
SELECT * FROM (
    SELECT 
        'test1' AS id,
        'password1' AS password,
        '김김김' AS user_name,
        '01011111111' AS phone,
        '111@test.com' AS email,
        1 AS major_id,
        '4' AS year,
        3.00 AS gpa,
        '4분위' AS income_level,
        1 AS receive_notifications
) AS tmp
WHERE NOT EXISTS (SELECT id FROM Users WHERE id='test1');
""")

cursor.execute("""
INSERT INTO Users (id, password, user_name, phone, email, major_id, year, gpa, income_level, receive_notifications)
SELECT * FROM (
    SELECT 
        'test2' AS id,
        'password2' AS password,
        '이이이' AS user_name,
        '01022222222' AS phone,
        '222@test.com' AS email,
        2 AS major_id,
        '2' AS year,
        3.50 AS gpa,
        '5분위' AS income_level,
        1 AS receive_notifications
) AS tmp
WHERE NOT EXISTS (SELECT id FROM Users WHERE id='test2');
""")

cursor.execute("""
INSERT INTO Users (id, password, user_name, phone, email, major_id, year, gpa, income_level, receive_notifications)
SELECT * FROM (
    SELECT 
        'test3' AS id,
        'password3' AS password,
        '박박박' AS user_name,
        '01033333333' AS phone,
        '333@test.com' AS email,
        4 AS major_id,
        '5' AS year,
        2.70 AS gpa,
        '2분위' AS income_level,
        1 AS receive_notifications
) AS tmp
WHERE NOT EXISTS (SELECT id FROM Users WHERE id='test3');
""")

# 4. 키워드
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

# 5. 자격증
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

connection.commit()
cursor.close()
connection.close()

print("MySQL DB 초기화 완료")
