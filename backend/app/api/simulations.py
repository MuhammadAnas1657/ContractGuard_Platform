import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any

from ..database import get_db
from ..models.db_models import SimulationRunRecord
from ..models.schemas import SimulationRequest, SimulationResponse
from ..core.simulator import agent_simulator
from .auth import require_auth

router = APIRouter(prefix="/simulate", tags=["Attack Simulator"])

@router.get("/scenarios")
def list_scenarios() -> Dict[str, Any]:
    """Returns list of pre-configured attack scenarios."""
    return agent_simulator.PRESET_SCENARIOS

@router.post("/run", response_model=SimulationResponse)
def run_simulation(
    req: SimulationRequest,
    auth: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Executes live multi-turn attack scenario simultaneously against:
    1. Unprotected Baseline Agent
    2. ContractGuard Protected Reference Monitor
    """
    res = agent_simulator.run_simulation(
        scenario_id=req.scenario_id,
        custom_user_goal=req.custom_user_goal,
        custom_malicious_payload=req.custom_malicious_payload,
        contract_yaml=req.contract_yaml,
        api_key=req.api_key
    )

    # Save simulation history to database
    run_id = f"sim_{uuid.uuid4().hex[:8]}"
    record = SimulationRunRecord(
        id=run_id,
        scenario_id=req.scenario_id,
        user_goal=req.custom_user_goal or "",
        malicious_payload=req.custom_malicious_payload or "",
        unprotected_status=res.unprotected_run.status,
        unprotected_outcome=res.unprotected_run.execution_outcome,
        contractguard_status=res.contractguard_run.status,
        interception_stage=res.contractguard_run.interception.get("stage", "") if res.contractguard_run.interception else "",
        interception_reason=res.contractguard_run.interception.get("reason", "") if res.contractguard_run.interception else "",
        latency_ms=res.contractguard_run.latency_ms,
        audit_trail=res.contractguard_run.audit_trail
    )
    db.add(record)
    db.commit()

    return res
