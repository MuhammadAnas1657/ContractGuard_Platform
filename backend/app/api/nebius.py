from fastapi import APIRouter
from ..models.schemas import NebiusTestRequest, NebiusTestResponse
from ..core.nebius_client import nebius_service

router = APIRouter(prefix="/nebius", tags=["Nebius Token Factory"])

@router.post("/test-connection", response_model=NebiusTestResponse)
def test_nebius_connection(req: NebiusTestRequest):
    """Validates user's Nebius Token Factory API key and checks latency."""
    res = nebius_service.test_connection(req.api_key)
    return NebiusTestResponse(
        valid=res["valid"],
        latency_ms=res.get("latency_ms", 0.0),
        available_models=res.get("available_models", []),
        message=res["message"],
        is_live=res.get("is_live", False),
        mode=res.get("mode", "offline"),
    )
