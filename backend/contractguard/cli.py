from __future__ import annotations
import os
import ast
import json
from typing import List, Dict, Any
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt

from .client import NebiusTokenFactoryClient
from .contracts import SecurityContract

console = Console()

def extract_tools_from_directory(root_dir: str = ".") -> List[Dict[str, Any]]:
    """Simple AST parser to discover Python tool definitions in a project."""
    discovered = []
    for dirpath, _, filenames in os.walk(root_dir):
        if "contractguard" in dirpath or ".venv" in dirpath or "__pycache__" in dirpath:
            continue
        for fn in filenames:
            if fn.endswith(".py"):
                fpath = os.path.join(dirpath, fn)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        tree = ast.parse(f.read(), filename=fn)
                        for node in ast.walk(tree):
                            if isinstance(node, ast.FunctionDef):
                                is_tool = False
                                for dec in node.decorator_list:
                                    dec_id = getattr(dec, "id", "") or getattr(getattr(dec, "value", None), "id", "")
                                    if "tool" in dec_id.lower():
                                        is_tool = True
                                        break
                                if is_tool or "refund" in node.name or "transfer" in node.name or "email" in node.name:
                                    params = {
                                        "type": "object",
                                        "properties": {
                                            arg.arg: {"type": "string" if "name" in arg.arg or "to" in arg.arg or "email" in arg.arg else "number"}
                                            for arg in node.args.args if arg.arg != "self"
                                        }
                                    }
                                    discovered.append({
                                        "name": node.name,
                                        "description": ast.get_docstring(node) or f"Auto-detected tool function {node.name}",
                                        "parameters": params,
                                        "source_file": fn
                                    })
                except Exception:
                    continue
    return discovered

def run_init():
    console.print(Panel.fit(
        "[bold cyan]ContractGuard CLI[/bold cyan] - Powered by [bold green]NVIDIA Nemotron on Nebius Token Factory[/bold green]\n"
        "Autonomous Policy Synthesizer for LLM Agents",
        border_style="cyan"
    ))

    client = NebiusTokenFactoryClient()
    if client.is_live:
        console.print("[green]✔ Connected to live Nebius Token Factory API.[/green]")
    else:
        console.print("[yellow]ℹ NEBIUS_API_KEY not set; running in local rapid simulation mode.[/yellow]")

    console.print("\n[bold]Scanning project directory for LangChain/Python tools...[/bold]")
    tools = extract_tools_from_directory(".")
    
    if not tools:
        # Default mock tools if empty folder
        tools = [
            {
                "name": "process_refund",
                "description": "Issues a financial refund to a customer account",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "amount": {"type": "number"},
                        "target_account": {"type": "string"}
                    }
                }
            },
            {
                "name": "send_customer_email",
                "description": "Sends an email notification to a recipient",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "to_email": {"type": "string"},
                        "subject": {"type": "string"},
                        "body": {"type": "string"}
                    }
                }
            }
        ]
        console.print("[dim]No local @tool decorators found; using default agent tool template for demo.[/dim]")

    console.print(f"[bold green]Found {len(tools)} tools:[/bold green]")
    for t in tools:
        console.print(f"  • [cyan]{t['name']}[/cyan]: {t['description']}")

    console.print("\n[bold yellow]═══ Developer Security Policy Interview ═══[/bold yellow]")
    agent_name = Prompt.ask("1. What is the name of your AI Agent?", default="CustomerServiceAgent")
    max_budget = Prompt.ask("2. What is the maximum cumulative budget allowed per session ($)?", default="1000")
    allow_email_funds = Prompt.ask("3. Should external emails/webpages be allowed to set payee/recipient accounts? (yes/no)", default="no")

    dev_answers = {
        "agent_name": agent_name,
        "max_cumulative_budget": max_budget,
        "allow_untrusted_payee": allow_email_funds
    }

    console.print("\n[cyan]Synthesizing declarative security contract using NVIDIA Nemotron...[/cyan]")
    yaml_content = client.synthesize_policy(tools, dev_answers)

    contract_path = "contracts.yaml"
    with open(contract_path, "w", encoding="utf-8") as f:
        f.write(yaml_content)

    console.print(Panel(
        yaml_content,
        title="[bold green]Generated contracts.yaml[/bold green]",
        border_style="green"
    ))
    console.print(f"[bold green]✔ Successfully wrote {contract_path}![/bold green]")
    console.print("[dim]Your agent is now protected with 3 runtime defense stages.[/dim]\n")

if __name__ == "__main__":
    run_init()
