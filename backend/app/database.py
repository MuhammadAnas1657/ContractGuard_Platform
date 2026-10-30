from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings


def _build_engine():
    db_url = settings.DATABASE_URL
    return create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        connect_args={"connect_timeout": 5} if db_url.startswith("postgresql") else {"check_same_thread": False}
    )


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate_schema():
    """
    Safely inspects tables and adds project_id and key_type columns
    to existing SQLite and PostgreSQL tables if missing.
    """
    try:
        inspector = inspect(engine)
        if "api_keys" in inspector.get_table_names():
            existing_cols = {col["name"] for col in inspector.get_columns("api_keys")}
            with engine.connect() as conn:
                if "project_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE api_keys ADD COLUMN project_id VARCHAR(64)"))
                if "key_type" not in existing_cols:
                    conn.execute(text("ALTER TABLE api_keys ADD COLUMN key_type VARCHAR(32) DEFAULT 'gateway'"))
                conn.commit()
        if "projects" in inspector.get_table_names():
            existing_proj_cols = {col["name"] for col in inspector.get_columns("projects")}
            with engine.connect() as conn:
                if "policy_yaml" not in existing_proj_cols:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN policy_yaml TEXT"))
                if "policy_json" not in existing_proj_cols:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN policy_json JSON"))
                conn.commit()
    except Exception:
        pass


def init_db():
    from .models import db_models
    Base.metadata.create_all(bind=engine)
    try:
        _migrate_schema()
    except Exception:
        pass
