from ..database import SessionLocal
from ..models.db_models import AttackSignatureRecord
from .signature_db import FastAttackSignatureDB

def seed_attack_signatures():
    """Seeds the PostgreSQL database with known attack patterns if empty."""
    db = SessionLocal()
    try:
        count = db.query(AttackSignatureRecord).count()
        if count == 0:
            for entry in FastAttackSignatureDB.KNOWN_ATTACK_PATTERNS:
                rec = AttackSignatureRecord(
                    id=entry["id"],
                    pattern=entry["pattern"],
                    signature_type="regex",
                    attack_family=entry["family"],
                    description=f"Precompiled {entry['severity']} severity rule"
                )
                db.add(rec)
            db.commit()
            print(f"[ContractGuard] Successfully seeded {len(FastAttackSignatureDB.KNOWN_ATTACK_PATTERNS)} attack signatures into PostgreSQL.")
        else:
            print(f"[ContractGuard] Attack signatures already present in PostgreSQL ({count} rules).")
    except Exception as e:
        print(f"[ContractGuard] Warning during signature seeding: {e}")
        db.rollback()
    finally:
        db.close()
