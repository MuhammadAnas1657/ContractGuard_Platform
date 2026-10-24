from fastapi import APIRouter
from ..models.schemas import NebiusTestRequest, NebiusTestResponse
from ..core.nebius_client import nebius_service

router = APIRouter(prefix="/nebius", tags=["Nebius Token Factory"])

@router.post("/test-connection", response_model=NebiusTestResponse)
def test_nebius_connection(req: NebiusTestRequest):
    """Validates user's Nebius Token Factory API key and checks latency."""
    valid, latency, models, msg = nebius_service.test_connection(req.api_key)
    return NebiusTestResponse(
        valid=valid,
        latency_ms=latency,
        available_models=models,
        message=msg
    )
