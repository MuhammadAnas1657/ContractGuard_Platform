from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .config import settings
from .database import init_db, engine
from .core.seed_data import seed_attack_signatures
from .core.nebius_client import nebius_service
from .api import nebius, projects, policies, simulations, metrics, auth, deployment_guard, admin, agentic_ai

# Initialize database tables on startup & seed attack signatures into PostgreSQL / SQLite
init_db()
seed_attack_signatures()

app = FastAPI(
    title="ContractGuard-X Platform API",
    description="Dual-End Policy Synthesizer & Stateful Reference Monitor for AI Agents (Nebius x NVIDIA Hackathon)",
    version=settings.VERSION
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers under /api and standard /v1
app.include_router(auth.router, prefix="/api")
app.include_router(deployment_guard.router, prefix="/api")
app.include_router(deployment_guard.router)  # Also expose directly at /v1/... per Methodology Section 7
app.include_router(nebius.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(policies.router, prefix="/api")
app.include_router(simulations.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(agentic_ai.router, prefix="/api")


@app.get("/health")
@app.get("/api/health")
def health_check():
    """Process health check endpoint (Methodology Section 7)."""
    return {
        "status": "healthy",
        "service": "ContractGuard-X Security Core",
        "version": settings.VERSION
    }


@app.get("/ready")
@app.get("/api/ready")
def readiness_check():
    """Database and Nebius provider readiness status (Methodology Section 7)."""
    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        db_ok = False

    is_live = nebius_service.is_live_configured()
    return {
        "status": "ready" if db_ok else "degraded",
        "ready": db_ok,
        "database_connected": db_ok,
        "database_dialect": engine.dialect.name,
        "nebius_provider": {
            "base_url": settings.NEBIUS_BASE_URL,
            "synthesis_model": settings.NEMOTRON_SYNTHESIS_MODEL,
            "verifier_model": settings.NEMOTRON_VERIFIER_MODEL,
            "live_api_key_configured": is_live,
            "provider_mode": "live" if is_live else "offline"
        }
    }


@app.get("/api/status")
def get_system_status():
    is_live = nebius_service.is_live_configured()
    return {
        "status": "operational",
        "service": "ContractGuard-X",
        "version": settings.VERSION,
        "database": f"{engine.dialect.name} (SQLAlchemy ORM)",
        "nebius_live": is_live,
        "provider_mode": "live" if is_live else "offline",
        "nebius_cloud": {
            "connected": is_live,
            "is_live": is_live,
            "provider_mode": "live" if is_live else "offline",
            "base_url": settings.NEBIUS_BASE_URL,
            "synthesis_model": settings.NEMOTRON_SYNTHESIS_MODEL,
            "verifier_model": settings.NEMOTRON_VERIFIER_MODEL
        }
    }


@app.get("/")
def root():
    return {
        "message": "Welcome to ContractGuard-X Platform API. Visit /docs for OpenAPI documentation.",
        "version": settings.VERSION
    }
