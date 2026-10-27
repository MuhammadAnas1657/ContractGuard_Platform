"""
ContractGuard-X SDK Decorators
Enables effortless zero-code security wrapping for LangChain, LlamaIndex, CrewAI, and native Python tools.
"""
from __future__ import annotations
import functools
from typing import Callable, Optional
from .client import ContractGuardClient
from .models import SecurityContract

_DEFAULT_CLIENT: Optional[ContractGuardClient] = None

def get_default_client() -> ContractGuardClient:
    global _DEFAULT_CLIENT
    if _DEFAULT_CLIENT is None:
        _DEFAULT_CLIENT = ContractGuardClient()
    return _DEFAULT_CLIENT

def guarded_tool(
    contract: Optional[SecurityContract] = None,
    client: Optional[ContractGuardClient] = None,
    tool_name: Optional[str] = None
) -> Callable:
    """
    Decorator to wrap any Python tool function.
    Usage:
        @guarded_tool()
        def process_refund(amount: float, target_account: str):
            ...
    """
    def decorator(fn: Callable) -> Callable:
        active_client = client or (ContractGuardClient(contract=contract) if contract else get_default_client())
        target_tool_name = tool_name or fn.__name__

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            # Evaluate tool call parameters
            decision = active_client.evaluate_action(target_tool_name, kwargs)
            if not decision.allowed:
                raise PermissionError(
                    f"[ContractGuard-X Interception - {decision.stage}]: {decision.reason} "
                    f"(Latency: {decision.latency_ms:.2f}ms)"
                )
            return fn(*args, **kwargs)

        return wrapper
    return decorator

def guard_agent(client: Optional[ContractGuardClient] = None) -> Callable:
    """
    Class decorator to automatically intercept all tool methods on an agent class.
    """
    def decorator(cls):
        active_client = client or get_default_client()
        for attr_name, attr_val in list(cls.__dict__.items()):
            if callable(attr_val) and not attr_name.startswith("_"):
                setattr(cls, attr_name, active_client.guard_tool(attr_val))
        return cls
    return decorator
