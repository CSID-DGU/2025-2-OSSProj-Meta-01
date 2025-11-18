import os
import mysql.connector
from dotenv import load_dotenv

# .env.example 로드
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env.example'))

connection = mysql.connector.connect(
    host=os.getenv('MYSQL_HOST', 'localhost'),
    user=os.getenv('MYSQL_USER'),
    password=os.getenv('MYSQL_PASSWORD'),
    port=os.getenv('MYSQL_PORT', '3307')
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
users = [
    {
        "id": "test1",
        "password": "password1",
        "user_name": "김김김",
        "phone": "01011111111",
        "email": "111@test.com",
        "major_id": 1,
        "year": "4",
        "gpa": 3.00,
        "income_level": "4분위",
        "receive_notifications": 1
    },
    {
        "id": "test2",
        "password": "password2",
        "user_name": "이이이",
        "phone": "01022222222",
        "email": "222@test.com",
        "major_id": 2,
        "year": "2",
        "gpa": 3.50,
        "income_level": "5분위",
        "receive_notifications": 1
    },
    {
        "id": "test3",
        "password": "password3",
        "user_name": "박박박",
        "phone": "01033333333",
        "email": "333@test.com",
        "major_id": 4,
        "year": "5",
        "gpa": 2.70,
        "income_level": "2분위",
        "receive_notifications": 1
    }
]

for u in users:
    cursor.execute(f"""
    INSERT INTO Users (id, password, user_name, phone, email, major_id, year, gpa, income_level, receive_notifications)
    SELECT * FROM (
        SELECT 
            '{u['id']}', 
            '{u['password']}', 
            '{u['user_name']}', 
            '{u['phone']}', 
            '{u['email']}', 
            {u['major_id']},
            '{u['year']}',
            {u['gpa']},
            '{u['income_level']}',
            {u['receive_notifications']}
    ) AS tmp
    WHERE NOT EXISTS (SELECT id FROM Users WHERE id='{u['id']}');
    """)

connection.commit()
cursor.close()
connection.close()

print("MySQL DB 초기화 완료")