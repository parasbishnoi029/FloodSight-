from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.api.routes import health, analysis, verification, external
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="FloodSight AI — Satellite Flood Damage Intelligence Platform Backend API",
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": {"error": "INTERNAL_SERVER_ERROR", "message": "An unexpected server error occurred."}}
    )

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routes
app.include_router(health.router, prefix="/api")
app.include_router(verification.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(external.router, prefix="/api")

@app.get("/")
async def root():
    return {
        "service": "FloodSight AI API",
        "status": "online",
        "phase": "Verification & Inference Pipeline",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
