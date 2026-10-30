"""
Shared fixtures and test helpers for ContractGuard-X E2E Test Suite.
Opaque-box design: interacts strictly through FastAPI TestClient and public contracts.
"""
import io
import zipfile
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
    """Session-scoped FastAPI TestClient for opaque-box API testing."""
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Standard authenticated developer headers."""
    return {"X-API-Key": "demo_evaluator_key"}


@pytest.fixture
def auth_jwt_headers(client):
    """JWT Bearer authenticated headers from demo-login."""
    res = client.post("/api/auth/demo-login")
    if res.status_code == 200:
        token = res.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    return {"X-API-Key": "demo_evaluator_key"}


@pytest.fixture
def make_zip():
    """Helper factory to generate in-memory zip archives from filename->content map."""
    def _make(files_dict: dict) -> bytes:
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for fname, content in files_dict.items():
                if isinstance(content, str):
                    zf.writestr(fname, content)
                elif isinstance(content, bytes):
                    zf.writestr(fname, content)
        buf.seek(0)
        return buf.getvalue()
    return _make


@pytest.fixture
def sample_python_code():
    return '''"""
Financial Ops Agent
Tools for bank statements and fund transfers.
"""

def fetch_bank_statement(account_id: str) -> dict:
    """Retrieves verified bank statement for customer account."""
    return {"account_id": account_id, "balance": 5000.0}

def transfer_funds(amount: float, recipient_iban: str) -> dict:
    """Executes wire transfer to destination account."""
    return {"transferred": amount, "recipient": recipient_iban}
'''


@pytest.fixture
def sample_typescript_code():
    return '''/**
 * Customer Support Agent CRM Tools
 */
export async function fetchCustomerRecord(customerId: string): Promise<Record<string, any>> {
    // Fetches CRM customer profile
    return { id: customerId, name: "Alice" };
}

export async function processCustomerRefund(amount: number, targetAccount: string): Promise<boolean> {
    // Issues refund to customer
    return true;
}
'''
