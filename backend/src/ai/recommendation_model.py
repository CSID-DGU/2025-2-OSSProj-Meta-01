import os
import gc
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import mysql.connector
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()


class KoSimCSEEmbedder:
    """KoSimCSE-roberta를 사용한 텍스트 임베딩"""
    
    def __init__(self):
        from transformers import AutoModel, AutoTokenizer
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = AutoModel.from_pretrained('BM-K/KoSimCSE-roberta').to(self.device)
        self.tokenizer = AutoTokenizer.from_pretrained('BM-K/KoSimCSE-roberta')
        self.model.eval()
    
    def embed(self, texts):
        """텍스트 리스트를 임베딩"""
        if isinstance(texts, str):
            texts = [texts]
        
        with torch.no_grad():
            inputs = self.tokenizer(texts, padding=True, truncation=True, return_tensors="pt", max_length=512)
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            outputs = self.model(**inputs)
            embeddings = outputs.last_hidden_state[:, 0, :]  # [CLS] 토큰
            return embeddings.cpu().numpy()
    
    def release(self):
        """메모리 해제"""
        del self.model
        del self.tokenizer
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


class TwoTowerModel(nn.Module):
    """PyTorch Two-Tower 추천 모델"""
    
    def __init__(self, embedding_dim=768, hidden_dim=128, output_dim=64):
        super().__init__()
        
        # User Tower
        self.user_tower = nn.Sequential(
            nn.Linear(embedding_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim)
        )
        
        # Scholarship Tower
        self.scholarship_tower = nn.Sequential(
            nn.Linear(embedding_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim)
        )
    
    def forward(self, user_emb, scholarship_emb):
        user_vec = self.user_tower(user_emb)
        scholarship_vec = self.scholarship_tower(scholarship_emb)
        return user_vec, scholarship_vec
    
    def get_user_vector(self, user_emb):
        return self.user_tower(user_emb)
    
    def get_scholarship_vector(self, scholarship_emb):
        return self.scholarship_tower(scholarship_emb)


class ScholarshipRecommender:
    """장학금 추천 시스템 (PyTorch)"""
    
    def __init__(self):
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
        
        # 데이터 캐시
        self.user_embeddings = {}
        self.scholarship_embeddings = {}
        self.scholarship_ids = []
        self.scholarship_docs = {}
        
        # 모델
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = TwoTowerModel().to(self.device)
    
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
        """MongoDB 장학금 문서를 텍스트로 변환"""
        parts = []
        
        # 제목
        title = doc.get('제목', '')
        if title:
            parts.append(title)
        
        # content
        content = doc.get('content', '')
        if content:
            parts.append(content[:1000])
        
        # attachment_content
        attachment_content = doc.get('attachment_content', [])
        for att in attachment_content:
            parsed = att.get('parsed_content', '')
            if parsed:
                parts.append(parsed[:500])
        
        # image_content
        image_content = doc.get('image_content', [])
        for img in image_content:
            parsed = img.get('parsed_content', '')
            if parsed:
                parts.append(parsed[:500])
        
        # classification labels
        classification = doc.get('classification', {})
        labels = classification.get('labels', [])
        if labels:
            parts.append(' '.join(labels))
        
        return ' '.join(parts)
    
    def prepare_data(self):
        """데이터 준비 및 임베딩 생성"""
        print("데이터 준비 중...")
        
        # 유저 데이터 (MySQL)
        self.cursor.execute("SELECT * FROM Users")
        users = self.cursor.fetchall()
        
        # 장학금 데이터 (MongoDB) - scholarship_id 순서로 매핑하기 위해 순서 유지
        scholarships = list(self.mongo_collection.find({}).sort('_id', 1))
        
        print(f"유저 {len(users)}명, 장학금 {len(scholarships)}개 로드 완료")
        
        # 임베딩 모델 로드
        print("\n[1/2] 임베딩 모델 로드...")
        embedder = KoSimCSEEmbedder()
        
        # 유저 임베딩
        print("[2/2] 임베딩 생성 중...")
        user_texts = [self.get_user_text(u) for u in users]
        user_embs = embedder.embed(user_texts)
        for i, user in enumerate(users):
            self.user_embeddings[user['user_id']] = user_embs[i]
        print(f"  유저 {len(users)}명 완료")
        
        # 장학금 임베딩 (글번호 = MySQL scholarship_id)
        for idx, doc in enumerate(scholarships):
            # MongoDB 글번호를 scholarship_id로 사용
            scholarship_id = int(doc.get('글번호', 0))
            if scholarship_id == 0:
                continue
                
            scholarship_text = self.get_scholarship_text(doc)
            
            emb = embedder.embed(scholarship_text)
            self.scholarship_embeddings[scholarship_id] = emb[0]
            self.scholarship_ids.append(scholarship_id)
            self.scholarship_docs[scholarship_id] = doc
            
            if (idx + 1) % 10 == 0:
                print(f"  장학금 {idx + 1}/{len(scholarships)} 완료...")
        
        # 메모리 해제
        embedder.release()
        del embedder
        gc.collect()
        
        print("데이터 준비 완료!")
        return users, scholarships
    
    def info_nce_loss(self, user_vec, scholarship_vec, temperature=0.07):
        """InfoNCE Loss (Contrastive Learning)
        
        배치 내 다른 장학금을 negative로 사용
        """
        # L2 정규화
        user_vec = F.normalize(user_vec, dim=1)
        scholarship_vec = F.normalize(scholarship_vec, dim=1)
        
        # 유사도 행렬: (batch_size, batch_size)
        # similarity[i][j] = user_i와 scholarship_j의 유사도
        similarity = torch.matmul(user_vec, scholarship_vec.T) / temperature
        
        # 대각선이 positive pair (user_i와 scholarship_i)
        # 나머지는 negative pair
        batch_size = user_vec.size(0)
        labels = torch.arange(batch_size).to(self.device)
        
        # Cross-entropy loss: 각 유저에 대해 올바른 장학금을 선택하도록
        loss = F.cross_entropy(similarity, labels)
        
        return loss
    
    def load_bookmarks(self):
        """MySQL에서 Bookmarks 데이터 로드"""
        self.cursor.execute("""
            SELECT user_id, scholarship_id FROM Bookmarks
        """)
        bookmarks = self.cursor.fetchall()
        print(f"북마크 {len(bookmarks)}개 로드")
        return bookmarks
    
    def train(self, epochs=30, batch_size=64, lr=0.001, temperature=0.07):
        """모델 학습 (Bookmarks 기반 Contrastive Learning)"""
        users, scholarships = self.prepare_data()
        
        # Bookmarks에서 positive pairs 로드
        bookmarks = self.load_bookmarks()
        
        if not bookmarks:
            print("북마크 데이터가 없습니다. 먼저 북마크를 생성하세요.")
            return
        
        # 디버깅: 키 범위 확인
        user_emb_keys = set(self.user_embeddings.keys())
        scholarship_emb_keys = set(self.scholarship_embeddings.keys())
        bookmark_user_ids = set(b['user_id'] for b in bookmarks)
        bookmark_scholarship_ids = set(b['scholarship_id'] for b in bookmarks)
        
        print(f"\n[디버그] 유저 임베딩 키: {min(user_emb_keys)}~{max(user_emb_keys)} (총 {len(user_emb_keys)}개)")
        print(f"[디버그] 장학금 임베딩 키 샘플: {list(scholarship_emb_keys)[:5]}... (총 {len(scholarship_emb_keys)}개)")
        print(f"[디버그] 북마크 user_id 범위: {min(bookmark_user_ids)}~{max(bookmark_user_ids)}")
        print(f"[디버그] 북마크 scholarship_id 샘플: {list(bookmark_scholarship_ids)[:5]}...")
        print(f"[디버그] 겹치는 scholarship_id: {len(bookmark_scholarship_ids & scholarship_emb_keys)}개")
        
        # 북마크 기반 positive pairs 생성
        user_emb_list = []
        scholarship_emb_list = []
        
        for bookmark in bookmarks:
            user_id = bookmark['user_id']
            scholarship_id = bookmark['scholarship_id']
            # scholarship_id가 직접 키로 사용됨
            if user_id in self.user_embeddings and scholarship_id in self.scholarship_embeddings:
                user_emb_list.append(self.user_embeddings[user_id])
                scholarship_emb_list.append(self.scholarship_embeddings[scholarship_id])
        
        print(f"학습에 사용할 positive pairs: {len(user_emb_list)}개")
        
        if len(user_emb_list) < batch_size:
            print(f"데이터가 batch_size({batch_size})보다 적습니다. batch_size를 {len(user_emb_list)}로 조정합니다.")
            batch_size = len(user_emb_list)
        
        user_tensor = torch.tensor(np.array(user_emb_list), dtype=torch.float32).to(self.device)
        scholarship_tensor = torch.tensor(np.array(scholarship_emb_list), dtype=torch.float32).to(self.device)
        
        dataset = torch.utils.data.TensorDataset(user_tensor, scholarship_tensor)
        dataloader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, shuffle=True, drop_last=True)
        
        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        
        print(f"\n학습 시작 (epochs={epochs}, batch_size={batch_size}, temperature={temperature})")
        
        self.model.train()
        for epoch in range(epochs):
            total_loss = 0
            num_batches = 0
            
            for batch_user, batch_scholarship in dataloader:
                optimizer.zero_grad()
                
                user_vec, scholarship_vec = self.model(batch_user, batch_scholarship)
                
                # InfoNCE Loss (in-batch negatives)
                loss = self.info_nce_loss(user_vec, scholarship_vec, temperature)
                
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
                num_batches += 1
            
            if num_batches > 0:
                avg_loss = total_loss / num_batches
                print(f"Epoch {epoch+1}/{epochs}, Loss: {avg_loss:.4f}")
        
        print("모델 학습 완료!")
    
    def recommend(self, user_id, top_k=10):
        """특정 유저에게 장학금 추천"""
        if user_id not in self.user_embeddings:
            print(f"유저 {user_id}의 임베딩이 없습니다.")
            return []
        
        self.model.eval()
        with torch.no_grad():
            user_emb = torch.tensor(self.user_embeddings[user_id], dtype=torch.float32).unsqueeze(0).to(self.device)
            user_vec = self.model.get_user_vector(user_emb)
            
            scores = []
            for scholarship_id in self.scholarship_ids:
                scholarship_emb = torch.tensor(
                    self.scholarship_embeddings[scholarship_id], dtype=torch.float32
                ).unsqueeze(0).to(self.device)
                scholarship_vec = self.model.get_scholarship_vector(scholarship_emb)
                
                score = F.cosine_similarity(user_vec, scholarship_vec).item()
                scores.append((scholarship_id, score))
        
        # 상위 k개 반환
        scores.sort(key=lambda x: x[1], reverse=True)
        top_scholarships = scores[:top_k]
        
        results = []
        for scholarship_id, score in top_scholarships:
            if scholarship_id in self.scholarship_docs:
                doc = self.scholarship_docs[scholarship_id]
                results.append({
                    'scholarship_id': scholarship_id,
                    'title': doc.get('제목', 'N/A'),
                    'url': doc.get('URL', ''),
                    'labels': doc.get('classification', {}).get('labels', []),
                    'score': float(score)
                })
        
        return results
    
    def save_model(self, path='two_tower_model.pt'):
        """모델 저장"""
        torch.save(self.model.state_dict(), path)
        print(f"모델 저장: {path}")
    
    def load_model(self, path='two_tower_model.pt'):
        """모델 로드"""
        self.model.load_state_dict(torch.load(path, map_location=self.device))
        print(f"모델 로드: {path}")
    
    def close(self):
        """연결 종료"""
        self.cursor.close()
        self.connection.close()
        self.mongo_client.close()


if __name__ == "__main__":
    recommender = ScholarshipRecommender()
    
    try:
        # 모델 학습
        recommender.train()
        
        # 모델 저장
        recommender.save_model()
        
        # 추천 테스트 (user_id=1)
        print("\n=== 유저 1에 대한 장학금 추천 ===")
        recommendations = recommender.recommend(user_id=1, top_k=5)
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. {rec['title']} (점수: {rec['score']:.4f})")
            print(f"   레이블: {', '.join(rec['labels'])}")
    finally:
        recommender.close()
