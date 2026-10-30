from ..database import SessionLocal
from ..models.db_models import AttackSignatureRecord
from .signature_db import FastAttackSignatureDB
from .vector_attack_db import vector_attack_db

def seed_attack_signatures():
    """Seeds the database with both fast regex rules and expanded vector attack patterns."""
    db = SessionLocal()
    try:
        # 1. Seed Fast Regex Rules
        for entry in FastAttackSignatureDB.KNOWN_ATTACK_PATTERNS:
            existing = db.query(AttackSignatureRecord).filter(AttackSignatureRecord.id == entry["id"]).first()
            if not existing:
                rec = AttackSignatureRecord(
                    id=entry["id"],
                    pattern=entry["pattern"],
                    signature_type="regex",
                    attack_family=entry["family"],
                    description=f"Precompiled {entry['severity']} severity rule"
                )
                db.add(rec)
        db.commit()

        # 2. Seed Expanded Vector Dataset from Authentic Benchmarks
        vector_count = vector_attack_db.seed_to_db(db, overwrite=True)

        # 3. Reload in-memory vector index from DB
        loaded_count = vector_attack_db.sync_from_db(db)
        print(f"[ContractGuard] Attack database ready: {loaded_count} persistent signatures loaded.")
    except Exception as e:
        print(f"[ContractGuard] Warning during signature seeding: {e}")
        db.rollback()
    finally:
        db.close()
