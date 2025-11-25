"""
배치 추천 계산 및 MySQL 저장

학습된 모델(two_tower_model.pt)을 로드하여
모든 사용자에 대해 장학금 추천 점수를 계산하고
MySQL Recommendations 테이블에 저장합니다.
"""

import os
import gc
import numpy as np
import torch
import torch.nn.functional as F
import mysql.connector
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()


class TwoTowerModel(torch.nn.Module):
    """PyTorch Two-Tower 추천 모델"""
    
    def __init__(self, embedding_dim=768, hidden_dim=128, output_dim=64):
        super().__init__()
        
        self.user_tower = torch.nn.Sequential(
            torch.nn.Linear(embedding_dim, hidden_dim),
            torch.nn.ReLU(),
            torch.nn.Linear(hidden_dim, output_dim)
        )
        
        self.scholarship_tower = torch.nn.Sequential(
            torch.nn.Linear(embedding_dim, hidden_dim),
            torch.nn.ReLU(),
            torch.nn.Linear(hidden_dim, output_dim)
        )
    
    def get_user_vector(self, user_emb):
        return self.user_tower(user_emb)
    
    def get_scholarship_vector(self, scholarship_emb):
        return self.scholarship_tower(scholarship_emb)


class KoSimCSEEmbedder:
    """KoSimCSE-roberta 임베딩"""
    
    def __init__(self):
        from transformers import AutoModel, AutoTokenizer
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = AutoModel.from_pretrained('BM-K/KoSimCSE-roberta').to(self.device)
        self.tokenizer = AutoTokenizer.from_pretrained('BM-K/KoSimCSE-roberta')
        self.model.eval()
    
    def embed(self, texts):
        if isinstance(texts, str):
            texts = [texts]
        
        with torch.no_grad():
            inputs = self.tokenizer(texts, padding=True, truncation=True, return_tensors="pt", max_length=512)
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            outputs = self.model(**inputs)
            embeddings = outputs.last_hidden_state[:, 0, :]
            return embeddings.cpu().numpy()
    
    def release(self):
        del self.model
        del self.tokenizer
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


class BatchRecommender:
    """배치 추천 계산 및 저장"""
    
    def __init__(self, model_path='two_tower_model.pt'):
        self.model_path = model_path
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # MySQL 연결
        self.connection = mysql.connector.connect(
            host=os.getenv('MYSQL_HOST'),
            user=os.getenv('MYSQL_USER'),
            password=os.getenv('MYSQL_PASSWORD'),
            port=os.getenv('MYSQL_PORT'),
            database=os.getenv('MYSQL_DATABASE')
        )
        self.cursor = self.connection.cursor(dictionary=True)
        
        # MongoDB 연결
        mongo_uri = f"mongodb://{os.getenv('MONGO_USER')}:{os.getenv('MONGO_PASSWORD')}@{os.getenv('MONGO_HOST')}:{os.getenv('MONGO_PORT')}/"
        self.mongo_client = MongoClient(mongo_uri)
        self.mongo_db = self.mongo_client[os.getenv('MONGO_DATABASE', 'dongguk_db')]
        self.mongo_collection = self.mongo_db['scholarships_processed']
        
        # 모델 로드
        self.model = TwoTowerModel().to(self.device)
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.eval()
        print(f"모델 로드 완료: {model_path}")
        
        # 임베딩 캐시
        self.user_embeddings = {}
        self.scholarship_embeddings = {}
        self.scholarship_ids = []
    
    def get_user_text(self, user):
        """유저 정보를 텍스트로 변환"""
        self.cursor.execute("""
            SELECT k.keyword FROM UserKeywords uk
            JOIN Keywords k ON uk.keyword_id = k.keyword_id
            WHERE uk.user_id = %s
        """, (user['user_id'],))
        keywords = [row['keyword'] for row in self.cursor.fetchall()]
        
        return f"{user['year']}학년 학점 {user['gpa']} {user.get('income_level', '')} {' '.join(keywords)}"
    
    def get_scholarship_text(self, doc):
        """장학금 문서를 텍스트로 변환"""
        parts = []
        
        title = doc.get('제목', '')
        if title:
            parts.append(title)
        
        content = doc.get('content', '')
        if content:
            parts.append(content[:1000])
        
        for att in doc.get('attachment_content', []):
            parsed = att.get('parsed_content', '')
            if parsed:
                parts.append(parsed[:500])
        
        for img in doc.get('image_content', []):
            parsed = img.get('parsed_content', '')
            if parsed:
                parts.append(parsed[:500])
        
        labels = doc.get('classification', {}).get('labels', [])
        if labels:
            parts.append(' '.join(labels))
        
        return ' '.join(parts)
    
    def prepare_embeddings(self):
        """임베딩 생성"""
        print("임베딩 생성 중...")
        
        # 유저 데이터
        self.cursor.execute("SELECT * FROM Users")
        users = self.cursor.fetchall()
        
        # 장학금 데이터
        scholarships = list(self.mongo_collection.find({}).sort('_id', 1))
        
        print(f"유저 {len(users)}명, 장학금 {len(scholarships)}개")
        
        # 임베딩 모델 로드
        embedder = KoSimCSEEmbedder()
        
        # 유저 임베딩
        user_texts = [self.get_user_text(u) for u in users]
        user_embs = embedder.embed(user_texts)
        for i, user in enumerate(users):
            self.user_embeddings[user['user_id']] = user_embs[i]
        print(f"  유저 임베딩 완료")
        
        # 장학금 임베딩
        for idx, doc in enumerate(scholarships):
            scholarship_id = int(doc.get('글번호', 0))
            if scholarship_id == 0:
                continue
            
            emb = embedder.embed(self.get_scholarship_text(doc))
            self.scholarship_embeddings[scholarship_id] = emb[0]
            self.scholarship_ids.append(scholarship_id)
            
            if (idx + 1) % 20 == 0:
                print(f"  장학금 {idx + 1}/{len(scholarships)} 완료...")
        
        embedder.release()
        del embedder
        gc.collect()
        
        print("임베딩 생성 완료!")
    
    def calculate_all_scores(self, top_k=10):
        """모든 유저에 대해 장학금 추천 점수 계산"""
        print(f"\n모든 유저에 대해 Top-{top_k} 추천 계산 중...")
        
        all_recommendations = []
        
        with torch.no_grad():
            for user_id, user_emb in self.user_embeddings.items():
                user_tensor = torch.tensor(user_emb, dtype=torch.float32).unsqueeze(0).to(self.device)
                user_vec = self.model.get_user_vector(user_tensor)
                
                scores = []
                for scholarship_id in self.scholarship_ids:
                    scholarship_tensor = torch.tensor(
                        self.scholarship_embeddings[scholarship_id], dtype=torch.float32
                    ).unsqueeze(0).to(self.device)
                    scholarship_vec = self.model.get_scholarship_vector(scholarship_tensor)
                    
                    score = F.cosine_similarity(user_vec, scholarship_vec).item()
                    scores.append((scholarship_id, score))
                
                # 상위 k개 선택
                scores.sort(key=lambda x: x[1], reverse=True)
                top_scholarships = scores[:top_k]
                
                for scholarship_id, score in top_scholarships:
                    all_recommendations.append({
                        'user_id': user_id,
                        'scholarship_id': scholarship_id,
                        'score': score
                    })
        
        print(f"총 {len(all_recommendations)}개 추천 생성")
        return all_recommendations
    
    def save_to_mysql(self, recommendations):
        """추천 결과를 MySQL Recommendations 테이블에 저장"""
        print("\nMySQL에 저장 중...")
        
        # 기존 데이터 삭제
        self.cursor.execute("DELETE FROM Recommendations")
        
        # 새 데이터 삽입
        insert_query = """
            INSERT INTO Recommendations (user_id, scholarship_id)
            VALUES (%s, %s)
        """
        
        inserted = 0
        for rec in recommendations:
            try:
                self.cursor.execute(insert_query, (rec['user_id'], rec['scholarship_id']))
                inserted += 1
            except mysql.connector.Error as e:
                print(f"삽입 오류: {e}")
                continue
        
        self.connection.commit()
        print(f"MySQL 저장 완료: {inserted}개 추천")
    
    def run(self, top_k=10):
        """전체 배치 프로세스 실행"""
        print("=" * 50)
        print("배치 추천 계산 시작")
        print("=" * 50)
        
        # 1. 임베딩 생성
        self.prepare_embeddings()
        
        # 2. 점수 계산
        recommendations = self.calculate_all_scores(top_k=top_k)
        
        # 3. MySQL 저장
        self.save_to_mysql(recommendations)
        
        print("\n" + "=" * 50)
        print("배치 추천 계산 완료!")
        print("=" * 50)
    
    def close(self):
        """연결 종료"""
        self.cursor.close()
        self.connection.close()
        self.mongo_client.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='배치 추천 계산')
    parser.add_argument('--model', default='two_tower_model.pt', help='모델 파일 경로')
    parser.add_argument('--top_k', type=int, default=30, help='유저당 추천 개수')
    args = parser.parse_args()
    
    recommender = BatchRecommender(model_path=args.model)
    
    try:
        recommender.run(top_k=args.top_k)
    finally:
        recommender.close()

