from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings


def _build_engine():
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite"):
        return create_engine(db_url, connect_args={"check_same_thread": False}, pool_pre_ping=True)
    try:
        eng = create_engine(db_url, pool_pre_ping=True, connect_args={"connect_timeout": 3})
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return eng
    except Exception:
        fallback_url = "sqlite:///./contractguard.db"
        return create_engine(fallback_url, connect_args={"check_same_thread": False}, pool_pre_ping=True)


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from .models import db_models
    Base.metadata.create_all(bind=engine)
