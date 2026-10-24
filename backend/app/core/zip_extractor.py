import os
import ast
import zipfile
import tempfile
import shutil
from typing import List, Dict, Any, Tuple

class ZipToolExtractor:
    """
    Safely unpacks developer agent .zip archives in an isolated sandbox,
    scanning Python AST for @tool functions and signatures.
    """

    @staticmethod
    def extract_tools_from_zip(zip_bytes: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
        temp_dir = tempfile.mkdtemp(prefix="contractguard_ingest_")
        extracted_files = []
        discovered_tools = []

        try:
            zip_path = os.path.join(temp_dir, "archive.zip")
            with open(zip_path, "wb") as f:
                f.write(zip_bytes)

            with zipfile.ZipFile(zip_path, "r") as zf:
                zf.extractall(temp_dir)

            # Walk through directory
            for root, _, files in os.walk(temp_dir):
                for fn in files:
                    if fn.endswith(".py"):
                        rel_path = os.path.relpath(os.path.join(root, fn), temp_dir)
                        extracted_files.append(rel_path)
                        full_path = os.path.join(root, fn)

                        try:
                            with open(full_path, "r", encoding="utf-8", errors="ignore") as pf:
                                tree = ast.parse(pf.read(), filename=fn)
                                for node in ast.walk(tree):
                                    if isinstance(node, ast.FunctionDef):
                                        # Detect tools by decorator or semantic name
                                        is_tool = False
                                        for dec in node.decorator_list:
                                            dec_id = getattr(dec, "id", "") or getattr(getattr(dec, "value", None), "id", "")
                                            if "tool" in dec_id.lower():
                                                is_tool = True
                                                break

                                        name_lower = node.name.lower()
                                        if is_tool or any(k in name_lower for k in ["refund", "transfer", "pay", "email", "ticket", "exec", "query"]):
                                            params = {
                                                arg.arg: {
                                                    "type": "string" if any(x in arg.arg for x in ["name", "to", "email", "account", "ticket", "query"]) else "number"
                                                }
                                                for arg in node.args.args if arg.arg != "self"
                                            }
                                            discovered_tools.append({
                                                "name": node.name,
                                                "description": ast.get_docstring(node) or f"Agent tool function {node.name}",
                                                "parameters": params,
                                                "source_file": rel_path
                                            })
                        except Exception:
                            continue

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

        return extracted_files, discovered_tools

    @staticmethod
    def get_preset_template(template_name: str) -> List[Dict[str, Any]]:
        """Returns standard agent tool presets for one-click testing without a zip upload."""
        if template_name == "devops_agent":
            return [
                {
                    "name": "read_github_issue",
                    "description": "Reads incoming issue reports or comments from GitHub",
                    "parameters": {"issue_id": {"type": "number"}}
                },
                {
                    "name": "run_unit_tests",
                    "description": "Executes testing container for branch",
                    "parameters": {"test_suite": {"type": "string"}}
                },
                {
                    "name": "merge_pull_request",
                    "description": "Merges PR branch into production branch",
                    "parameters": {"pr_id": {"type": "number"}}
                }
            ]
        elif template_name == "financial_agent":
            return [
                {
                    "name": "fetch_bank_statement",
                    "description": "Retrieves authorized account transactions",
                    "parameters": {"account_id": {"type": "string"}}
                },
                {
                    "name": "transfer_funds",
                    "description": "Sends wire payment to external account",
                    "parameters": {"amount": {"type": "number"}, "recipient_iban": {"type": "string"}}
                }
            ]
        else: # Default: customer_support
            return [
                {
                    "name": "read_customer_email",
                    "description": "Reads untrusted incoming support email or complaint",
                    "parameters": {"ticket_id": {"type": "string"}}
                },
                {
                    "name": "lookup_customer_db",
                    "description": "Retrieves verified customer profile and order history",
                    "parameters": {"customer_id": {"type": "string"}}
                },
                {
                    "name": "process_refund",
                    "description": "Issues a financial refund to the customer account",
                    "parameters": {"amount": {"type": "number"}, "target_account": {"type": "string"}}
                },
                {
                    "name": "reply_to_user",
                    "description": "Outputs conversational response to customer",
                    "parameters": {"response_text": {"type": "string"}}
                }
            ]
