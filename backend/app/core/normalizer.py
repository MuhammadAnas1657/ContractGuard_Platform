"""
ContractGuard-X Module 2: Provenance-Aware Hybrid Input Normalization & Detection
Handles trust envelopes, bounded Base64/Unicode normalization, and advisory perimeter triage.
"""
from __future__ import annotations
import base64
import hashlib
import unicodedata
import time
from enum import Enum
from typing import Dict, List, Any, Optional, Tuple
from pydantic import BaseModel, Field

from .signature_db import signature_db

class SourceTrustLevel(str, Enum):
    AUTHENTICATED_USER = "authenticated_user"
    UNTRUSTED_EXTERNAL = "untrusted_external"
    INTERNAL_DB = "internal_db"
    SYSTEM_CONFIG = "system_config"
    TOOL_RESULT = "tool_result"

class ContentEnvelope(BaseModel):
    """Immutable envelope encapsulating ingress text with verified provenance."""
    content_id: str
    source_type: SourceTrustLevel
    source_name: str
    raw_text: str
    normalized_views: List[str] = Field(default_factory=list)
    sha256_hash: str
    timestamp: float = Field(default_factory=time.time)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ContentRiskAssessment(BaseModel):
    """Advisory content risk assessment (never confers authorization)."""
    content_id: str
    is_suspicious: bool
    risk_level: str  # "SAFE", "SUSPICIOUS", "MALICIOUS"
    signature_matches: List[str] = Field(default_factory=list)
    detected_encodings: List[str] = Field(default_factory=list)
    latency_ms: float
    explanation: str

class InputNormalizer:
    """
    Provenance-aware ingress processor executing bounded decoding and Unicode normalization.
    """

    MAX_DECODE_DEPTH = 2
    MAX_PAYLOAD_BYTES = 65536

    @classmethod
    def wrap_envelope(
        cls,
        text: str,
        source_type: SourceTrustLevel = SourceTrustLevel.UNTRUSTED_EXTERNAL,
        source_name: str = "incoming_stream",
        metadata: Optional[Dict[str, Any]] = None
    ) -> ContentEnvelope:
        clean_text = text or ""
        sha = hashlib.sha256(clean_text.encode("utf-8")).hexdigest()
        cid = f"env_{sha[:12]}"

        # Bounded normalization views
        views = [clean_text]

        # 1. Unicode Normalization (NFKC)
        nfkc_text = unicodedata.normalize("NFKC", clean_text)
        if nfkc_text != clean_text:
            views.append(nfkc_text)

        # 2. Bounded Base64 Decoding Check
        decoded_b64 = cls._try_bounded_b64_decode(clean_text)
        if decoded_b64 and decoded_b64 not in views:
            views.append(decoded_b64)

        return ContentEnvelope(
            content_id=cid,
            source_type=source_type,
            source_name=source_name,
            raw_text=clean_text,
            normalized_views=views,
            sha256_hash=sha,
            metadata=metadata or {}
        )

    @classmethod
    def _try_bounded_b64_decode(cls, text: str) -> Optional[str]:
        """Safely decodes potential Base64 strings without vulnerability to decompression bombs."""
        stripped = text.strip()
        if len(stripped) < 8 or len(stripped) > cls.MAX_PAYLOAD_BYTES:
            return None

        # Check if text looks like valid Base64
        import re
        if not re.match(r"^[A-Za-z0-9+/=]+$", stripped):
            return None

        try:
            raw_bytes = base64.b64decode(stripped, validate=True)
            decoded = raw_bytes.decode("utf-8", errors="ignore")
            # Ensure it is readable printable text
            if len(decoded) > 3 and any(c.isalnum() for c in decoded):
                return decoded
        except Exception:
            pass
        return None

    @classmethod
    def assess_risk(cls, envelope: ContentEnvelope) -> ContentRiskAssessment:
        """Runs fast in-memory signature scan across all normalized views."""
        start = time.perf_counter()
        matches = []
        encodings = []

        if len(envelope.normalized_views) > 1:
            encodings.append("Base64/Unicode Normalized")

        # Scan each view against signature database
        for view in envelope.normalized_views:
            sig = signature_db.scan(view)
            if sig and sig["id"] not in matches:
                matches.append(sig["id"])

        elapsed = (time.perf_counter() - start) * 1000

        if matches:
            risk = "MALICIOUS"
            is_susp = True
            expl = f"Ingress payload matched {len(matches)} perimeter attack signature(s): {', '.join(matches)}."
        elif len(encodings) > 0:
            risk = "SUSPICIOUS"
            is_susp = True
            expl = "Encoded payload detected. Normalized for inspection; trust level preserved."
        else:
            risk = "SAFE"
            is_susp = False
            expl = "Zero perimeter attack signatures detected."

        return ContentRiskAssessment(
            content_id=envelope.content_id,
            is_suspicious=is_susp,
            risk_level=risk,
            signature_matches=matches,
            detected_encodings=encodings,
            latency_ms=round(elapsed, 3),
            explanation=expl
        )

input_normalizer = InputNormalizer()
