from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.routes import analyze, health, predict, predict_auto, segment

app = FastAPI(
    title="SIH 2026 Sonar ML Backend",
    description="Backend API for underwater sonar pipeline and human detection ML dashboard",
    version="1.0.0"
)

# Enable CORS for frontend dashboard communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core routes
app.include_router(health.router)
app.include_router(predict.router)
app.include_router(predict_auto.router)
app.include_router(analyze.router)
app.include_router(segment.router)

@app.get("/")
def root():
    return {
        "message": "SIH 2026 Underwater Sonar ML Backend is running",
        "health_check": "/health",
        "docs": "/docs"
    }
