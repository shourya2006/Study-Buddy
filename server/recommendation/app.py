import os
import certifi
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from pymongo import MongoClient
from dotenv import load_dotenv
from recommender import recommend, recommend_for_subject

load_dotenv()

app = FastAPI(title="Vortex Recommendation Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGODB_URI = os.getenv("MONGODB_URI")
mongo_client = MongoClient(MONGODB_URI, tlsCAFile=certifi.where())
db = mongo_client.get_default_database()


class RecommendRequest(BaseModel):
    topic: Optional[str] = None
    courseName: Optional[str] = ""
    subjectId: Optional[str] = None
    topK: Optional[int] = 1


@app.get("/health")
def health():
    return {"status": "OK", "service": "recommendation-engine"}


@app.post("/recommend")
def get_recommendations(req: RecommendRequest):
    try:
        if req.topic:
            results = recommend(
                req.topic, req.courseName, subject_id=req.subjectId or "", top_k=req.topK
            )

            return {
                "success": True,
                "topic": req.topic,
                "recommendations": results,
            }

        elif req.subjectId:
            collection = db["processedlectures"]
            lectures = list(
                collection.find(
                    {"subjectId": req.subjectId},
                    {"title": 1, "courseName": 1, "_id": 0},
                )
            )

            lectures = [
                l for l in lectures
                if "Course and Instructor Introduction" not in l.get("title", "")
            ]

            if not lectures:
                raise HTTPException(status_code=404, detail="No topics found for this subject")

            topics = [
                {"title": l["title"], "courseName": l.get("courseName", "")}
                for l in lectures
            ]

            results = recommend_for_subject(
                topics, subject_id=req.subjectId, top_k_per_topic=req.topK
            )

            return {
                "success": True,
                "subjectId": req.subjectId,
                "totalTopics": len(topics),
                "recommendations": results,
            }



        else:
            raise HTTPException(status_code=400, detail="Either 'topic' or 'subjectId' is required")

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Recommendation API] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5002))
    print(f"Recommendation engine running on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
