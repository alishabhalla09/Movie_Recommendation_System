import os
from pathlib import Path
from dotenv import load_dotenv

# Try loading from repo root or current directory
root_env = Path(__file__).resolve().parent.parent.parent / ".env"
if root_env.exists():
    load_dotenv(dotenv_path=root_env)
else:
    load_dotenv()

import pandas as pd
import numpy as np
from sqlalchemy import create_engine
import implicit
import scipy.sparse as sparse

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/mediahub")
engine = create_engine(DATABASE_URL)


class RecommendationEngine:
    def __init__(self):
        # Disable threading on some environments to avoid deadlock
        os.environ['OPENBLAS_NUM_THREADS'] = '1'
        self.model = implicit.als.AlternatingLeastSquares(
            factors=64,
            regularization=0.08,
            iterations=25,
            calculate_training_loss=True,
            random_state=42
        )
        self.user_item_matrix = None
        self.item_user_matrix = None
        self.user_mapping = {}
        self.reverse_user_mapping = {}
        self.item_mapping = {}
        self.reverse_item_mapping = {}
        self.is_trained = False

    def train(self):
        global engine, DATABASE_URL
        current_db_url = os.getenv("DATABASE_URL")
        if current_db_url and (engine is None or DATABASE_URL != current_db_url):
            DATABASE_URL = current_db_url
            engine = create_engine(DATABASE_URL)

        if not engine:
            print("Cannot train without DATABASE_URL.")
            return

        print("Fetching interactions from database...")
        query = """
            SELECT user_id, item_id, event_type, rating, watch_duration, created_at
            FROM interactions
            ORDER BY created_at ASC
        """
        try:
            df = pd.read_sql(query, engine)
        except Exception as e:
            print(f"Error reading interactions: {e}")
            return
        
        if df.empty:
            print("No interactions found. Cannot train model.")
            return

        # Implicit feedback weight mapping
        weights = {
            'rate': 8.0,
            'rating': 8.0,
            'like': 7.0,
            'complete': 7.0,
            'watch_90': 6.0,
            'watchlist': 5.0,
            'add_watchlist': 5.0,
            'purchase': 5.0,
            'watch_75': 5.0,
            'watch_50': 4.0,
            'watch_25': 3.0,
            'watch': 3.0,
            'play': 3.0,
            'trailer_complete': 2.0,
            'trailer_play': 2.0,
            'click': 2.0,
            'view': 1.0,
            'impression': 0.2
        }
        
        df['base_weight'] = df['event_type'].map(weights).fillna(1.0)
        
        # If explicit rating exists (1-10 or 1-5 scale), boost weight
        df['rating_boost'] = df['rating'].apply(lambda r: max(1.0, float(r) / 2.0) if pd.notnull(r) and r > 0 else 1.0)
        df['score'] = df['base_weight'] * df['rating_boost']
        
        # Group by user and item, summing interaction weights
        grouped = df.groupby(['user_id', 'item_id'])['score'].sum().reset_index()

        unique_users = grouped['user_id'].unique()
        unique_items = grouped['item_id'].unique()

        if len(unique_users) == 0 or len(unique_items) == 0:
            print("Insufficient data for ALS training.")
            return

        self.user_mapping = {u: i for i, u in enumerate(unique_users)}
        self.reverse_user_mapping = {i: u for i, u in enumerate(unique_users)}
        
        self.item_mapping = {i_id: idx for idx, i_id in enumerate(unique_items)}
        self.reverse_item_mapping = {idx: i_id for idx, i_id in enumerate(unique_items)}

        grouped['user_idx'] = grouped['user_id'].map(self.user_mapping)
        grouped['item_idx'] = grouped['item_id'].map(self.item_mapping)

        # Build user-item CSR matrix (users x items) for modern implicit
        self.user_item_matrix = sparse.csr_matrix(
            (grouped['score'].values.astype(np.float32), (grouped['user_idx'].values, grouped['item_idx'].values)),
            shape=(len(unique_users), len(unique_items))
        )
        
        self.item_user_matrix = self.user_item_matrix.T.tocsr()

        print(f"Training ALS model on {len(unique_users)} users and {len(unique_items)} items...")
        try:
            self.model.fit(self.user_item_matrix)
            self.is_trained = True
            print("ALS Training complete.")
        except Exception as err:
            print(f"Error fitting ALS model: {err}")


    def recommend_for_user(self, user_id, num_recommendations=20):
        if not self.is_trained or user_id not in self.user_mapping:
            return []
        
        user_idx = self.user_mapping[user_id]
        
        try:
            ids, scores = self.model.recommend(
                user_idx, 
                self.user_item_matrix[user_idx], 
                N=num_recommendations,
                filter_already_liked_items=True
            )
            
            recommendations = [
                {"item_id": int(self.reverse_item_mapping[idx]), "score": float(score)}
                for idx, score in zip(ids, scores)
                if idx in self.reverse_item_mapping
            ]
            return recommendations
        except Exception as err:
            print(f"Error in recommend_for_user: {err}")
            return []
        
    def similar_items(self, item_id, num_items=10):
        if not self.is_trained or item_id not in self.item_mapping:
            return []
            
        item_idx = self.item_mapping[item_id]
        
        try:
            ids, scores = self.model.similar_items(item_idx, N=num_items+1)
            
            similar = []
            for idx, score in zip(ids, scores):
                if idx == item_idx or idx not in self.reverse_item_mapping:
                    continue
                similar.append({"item_id": int(self.reverse_item_mapping[idx]), "score": float(score)})
                
            return similar[:num_items]
        except Exception as err:
            print(f"Error in similar_items: {err}")
            return []

engine_instance = RecommendationEngine()
