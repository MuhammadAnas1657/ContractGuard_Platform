from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import init_db
from .core.seed_data import seed_attack_signatures
from .api import nebius, projects, policies, simulations, metrics

# Initialize database tables on startup & seed attack signatures into PostgreSQL
init_db()
seed_attack_signatures()

app = FastAPI(
    title="ContractGuard Platform API",
    description="Dual-End Policy Synthesizer & Runtime Reference Monitor for AI Agents",
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

# Mount API Routers
app.include_router(nebius.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(policies.router, prefix="/api")
app.include_router(simulations.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")

@app.get("/api/status")
def get_system_status():
    return {
        "status": "healthy",
        "service": "ContractGuard Security Core",
        "version": settings.VERSION,
        "database": "PostgreSQL / SQLite (SQLAlchemy ORM)",
        "nebius_cloud": {
            "connected": bool(settings.DEFAULT_NEBIUS_API_KEY),
            "base_url": settings.NEBIUS_BASE_URL,
            "synthesis_model": settings.NEMOTRON_SYNTHESIS_MODEL,
            "verifier_model": settings.NEMOTRON_VERIFIER_MODEL
        }
    }

@app.get("/")
def root():
    return {
        "message": "Welcome to ContractGuard Platform API. Visit /docs for OpenAPI documentation.",
        "version": settings.VERSION
    }
