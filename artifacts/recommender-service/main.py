from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from model import engine_instance
import os
import uvicorn

app = FastAPI(title="Recommendation Engine Service")

@app.on_event("startup")
async def startup_event():
    # Train initially on startup
    engine_instance.train()

@app.post("/train")
async def trigger_training(background_tasks: BackgroundTasks):
    background_tasks.add_task(engine_instance.train)
    return {"message": "Training started in background"}

@app.get("/recommend/{user_id}")
async def get_recommendations(user_id: int, limit: int = 20):
    recommendations = engine_instance.recommend_for_user(user_id, limit)
    return {"user_id": user_id, "recommendations": recommendations}

@app.get("/similar/{item_id}")
async def get_similar_items(item_id: int, limit: int = 10):
    similar = engine_instance.similar_items(item_id, limit)
    return {"item_id": item_id, "similar": similar}

@app.get("/health")
async def health_check():
    return {"status": "ok", "model_trained": engine_instance.is_trained}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
