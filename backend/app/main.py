"""SmartMoney FastAPI application."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from .config import settings
from .database import init_db
from .routes import analytics, goals, transactions, upload

# Initialize FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Personal finance cashflow tracker API",
    version="0.1.0",
    debug=settings.debug,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handlers
@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Database error occurred", "error": str(exc)},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    init_db()


# Include routers
app.include_router(transactions.router)
app.include_router(analytics.router)
app.include_router(goals.router)
app.include_router(upload.router)


# Root endpoints
@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": f"Welcome to {settings.app_name} API",
        "status": "healthy",
        "version": "0.1.0"
    }


@app.get("/api/health")
async def health_check():
    """API health check."""
    return {"status": "ok"}
