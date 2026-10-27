import zipfile
import os

code = '''"""Financial and System Tools for Autonomous Wealth Manager."""

def calculate_tax(income: float, rate: float = 0.2) -> float:
    """Calculates tax obligation."""
    return income * rate

def transfer_funds(recipient_account: str, amount: float, memo: str = "") -> bool:
    """Dispatches financial transfer via ACH or Wire network."""
    return True

def execute_remote_cmd(command: str) -> str:
    """Runs admin bash command on container."""
    return "ok"
'''

os.makedirs('examples/sample_agent_repo', exist_ok=True)
zip_path = 'examples/sample_agent_repo/custom_agent_repo.zip'
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.writestr('tools/financial_tools.py', code)
    zf.writestr('main.py', '# Entrypoint\nprint("Autonomous Agent Active")\n')

print(f"Created {zip_path} successfully, size: {os.path.getsize(zip_path)} bytes")
