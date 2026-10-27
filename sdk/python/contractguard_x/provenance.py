"""
ContractGuard-X SDK Provenance & Source Tagging
"""
from __future__ import annotations
import time
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from .models import SourceTrust

class TaggedInput(BaseModel):
    source_id: str
    source_type: SourceTrust
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: float = Field(default_factory=time.time)

class ProvenanceTracker:
    """Tracks context origins and evaluates whether parameter values possess verified authority."""

    def __init__(self):
        self._registry: List[TaggedInput] = []

    def register(
        self,
        content: str,
        source_type: SourceTrust,
        source_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> TaggedInput:
        if source_id is None:
            source_id = f"src_{len(self._registry) + 1}_{source_type.value}"
        entry = TaggedInput(
            source_id=source_id,
            source_type=source_type,
            content=content,
            metadata=metadata or {}
        )
        self._registry.append(entry)
        return entry

    def tag_user_input(self, text: str, user_id: str = "user_default") -> TaggedInput:
        return self.register(
            content=text,
            source_type=SourceTrust.AUTHENTICATED_USER,
            source_id=f"user_{user_id}_{int(time.time())}"
        )

    def tag_untrusted_input(self, text: str, source_name: str = "incoming_data") -> TaggedInput:
        return self.register(
            content=text,
            source_type=SourceTrust.UNTRUSTED_EXTERNAL,
            source_id=f"untrusted_{source_name}_{int(time.time())}",
            metadata={"origin": source_name}
        )

    def find_origins(self, value: Any) -> List[TaggedInput]:
        str_val = str(value).strip().lower()
        if not str_val or len(str_val) < 2:
            return []

        matched_sources: List[TaggedInput] = []
        for entry in self._registry:
            if str_val in entry.content.lower():
                matched_sources.append(entry)
        return matched_sources

    def is_authorized_value(self, value: Any, allowed_sources: List[str], forbidden_sources: List[str]) -> tuple[bool, str]:
        origins = self.find_origins(value)
        if not origins:
            if "authenticated_user" in allowed_sources and len(allowed_sources) == 1:
                return False, f"Value '{value}' does not originate from authenticated user prompt."
            return True, "Value generated autonomously within schema bounds."

        # Check for forbidden sources
        for origin in origins:
            source_type_str = origin.source_type.value
            source_name = origin.metadata.get("origin", "")
            for forbidden in forbidden_sources:
                if forbidden in source_type_str or forbidden in source_name or forbidden == origin.source_id:
                    return False, f"Value '{value}' was injected from forbidden source: {origin.source_id} ({origin.source_type.value})."

        # Check for allowed sources
        has_allowed = False
        for origin in origins:
            for allowed in allowed_sources:
                if allowed in origin.source_type.value or allowed in origin.source_id:
                    has_allowed = True
                    break
            if has_allowed:
                break

        if not has_allowed and allowed_sources:
            return False, f"Value '{value}' not authorized. Allowed: {allowed_sources}."

        return True, "Value authorized by verified source evidence."
