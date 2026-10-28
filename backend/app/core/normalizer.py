"""
ContractGuard-X Module 2: Provenance-Aware Hybrid Input Normalization & Detection
Handles trust envelopes, bounded Base64/Unicode normalization, and advisory perimeter triage.
"""
from __future__ import annotations
import base64
import hashlib
import re
import unicodedata
import time
from enum import Enum
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field

from .signature_db import signature_db


class SourceTrustLevel(str, Enum):
    AUTHENTICATED_USER = "authenticated_user"
    APPROVED_DEVELOPER = "approved_developer"
    UNTRUSTED_EXTERNAL = "untrusted_external"
    INTERNAL_DB = "internal_db"
    SYSTEM_CONFIG = "system_config"
    TOOL_RESULT = "tool_result"
    UNKNOWN = "unknown"


class ContentEnvelope(BaseModel):
    """Immutable envelope encapsulating ingress text with verified provenance."""
    content_id: str
    source_type: SourceTrustLevel
    source_name: str
    raw_text: str
    normalized_views: List[str] = Field(default_factory=list)
    sha256_hash: str
    decode_depth_reached: int = 0
    is_suspicious: bool = False
    timestamp: float = Field(default_factory=time.time)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ContentRiskAssessment(BaseModel):
    """Advisory content risk assessment (never confers authorization)."""
    content_id: str
    source_trust: SourceTrustLevel = SourceTrustLevel.UNTRUSTED_EXTERNAL
    is_suspicious: bool
    risk_level: str  # "SAFE", "SUSPICIOUS", "MALICIOUS"
    risk_score: float = 0.0
    signature_matches: List[str] = Field(default_factory=list)
    detected_encodings: List[str] = Field(default_factory=list)
    review_recommended: bool = False
    latency_ms: float
    explanation: str


class InputNormalizer:
    """
    Provenance-aware ingress processor executing bounded decoding and Unicode normalization.
    Invariant: Decoded views strictly inherit the original source_type (no trust elevation).
    """

    MAX_DECODE_DEPTH = 2
    MAX_PAYLOAD_BYTES = 65536
    B64_TOKEN_REGEX = re.compile(r"[A-Za-z0-9+/]{12,}={0,2}")

    @classmethod
    def wrap_envelope(
        cls,
        text: str,
        source_type: SourceTrustLevel = SourceTrustLevel.UNTRUSTED_EXTERNAL,
        source_name: str = "incoming_stream",
        metadata: Optional[Dict[str, Any]] = None
    ) -> ContentEnvelope:
        clean_text = text or ""
        if len(clean_text.encode("utf-8")) > cls.MAX_PAYLOAD_BYTES:
            clean_text = clean_text[:cls.MAX_PAYLOAD_BYTES]

        sha = hashlib.sha256(clean_text.encode("utf-8")).hexdigest()
        cid = f"env_{sha[:12]}"

        # Bounded normalization views (View 0 is always raw text)
        views: List[str] = [clean_text]

        # 1. Unicode Normalization (NFKC) — strips zero-width & homoglyph formatting
        nfkc_text = unicodedata.normalize("NFKC", clean_text)
        nfkc_cleaned = re.sub(r"[\u200b\u200c\u200d\ufeff]", "", nfkc_text)
        if nfkc_cleaned != clean_text and nfkc_cleaned not in views:
            views.append(nfkc_cleaned)

        # 2. Bounded Base64 Decoding (full string + inline spans, up to MAX_DECODE_DEPTH)
        depth_reached = 0
        current_candidates = [nfkc_cleaned]
        for depth in range(1, cls.MAX_DECODE_DEPTH + 1):
            next_candidates: List[str] = []
            for candidate in current_candidates:
                # Try whole string decode
                whole_dec = cls._try_bounded_b64_decode(candidate)
                if whole_dec and whole_dec not in views:
                    views.append(whole_dec)
                    next_candidates.append(whole_dec)
                    depth_reached = depth

                # Try inline Base64 spans inside mixed/multilingual text
                for match in cls.B64_TOKEN_REGEX.findall(candidate):
                    span_dec = cls._try_bounded_b64_decode(match)
                    if span_dec and span_dec not in views:
                        views.append(span_dec)
                        next_candidates.append(span_dec)
                        depth_reached = depth
            if not next_candidates:
                break
            current_candidates = next_candidates

        env = ContentEnvelope(
            content_id=cid,
            source_type=source_type,
            source_name=source_name,
            raw_text=clean_text,
            normalized_views=views,
            sha256_hash=sha,
            decode_depth_reached=depth_reached,
            metadata=metadata or {}
        )
        risk = cls.assess_risk(env)
        env.is_suspicious = risk.is_suspicious
        return env

    @classmethod
    def _try_bounded_b64_decode(cls, text: str) -> Optional[str]:
        """Safely decodes potential Base64 strings without vulnerability to decompression bombs."""
        stripped = text.strip()
        if len(stripped) < 8 or len(stripped) > cls.MAX_PAYLOAD_BYTES:
            return None
        if len(stripped) % 4 != 0:
            return None
        if not re.match(r"^[A-Za-z0-9+/]+={0,2}$", stripped):
            return None

        try:
            raw_bytes = base64.b64decode(stripped, validate=True)
            decoded = raw_bytes.decode("utf-8")
            # Ensure decoded text is mostly printable characters
            printable_ratio = sum(1 for c in decoded if c.isprintable() or c in "\r\n\t") / max(1, len(decoded))
            if len(decoded) >= 4 and printable_ratio >= 0.85 and any(c.isalpha() for c in decoded):
                return decoded.strip()
        except Exception:
            pass
        return None

    @classmethod
    def assess_risk(cls, envelope: ContentEnvelope) -> ContentRiskAssessment:
        """
        Runs fast in-memory signature scan across all normalized views.
        Invariant #8: Benign encoded or multilingual content is NOT marked malicious merely for being encoded.
        """
        start = time.perf_counter()
        matches: List[str] = []
        encodings: List[str] = []

        if envelope.decode_depth_reached > 0:
            encodings.append(f"Base64 (depth={envelope.decode_depth_reached})")
        if len(envelope.normalized_views) > 1 and envelope.decode_depth_reached == 0:
            encodings.append("Unicode NFKC")

        # Scan each view against signature database
        for view in envelope.normalized_views:
            matched_list = signature_db.scan_all(view)
            for m in matched_list:
                sig_id = m["id"]
                if sig_id not in matches:
                    matches.append(sig_id)

        elapsed = (time.perf_counter() - start) * 1000

        if matches:
            risk = "MALICIOUS"
            is_susp = True
            score = 0.95
            review_rec = True
            expl = f"Ingress payload matched {len(matches)} perimeter attack signature(s): {', '.join(matches)}."
        elif len(encodings) > 0:
            risk = "SAFE"
            is_susp = False
            score = 0.10
            review_rec = False
            expl = f"Encoded/normalized payload ({', '.join(encodings)}) inspected cleanly; zero attack signatures detected. Original trust label '{envelope.source_type.value}' preserved."
        else:
            risk = "SAFE"
            is_susp = False
            score = 0.02
            review_rec = False
            expl = "Zero perimeter attack signatures detected."

        return ContentRiskAssessment(
            content_id=envelope.content_id,
            source_trust=envelope.source_type,
            is_suspicious=is_susp,
            risk_level=risk,
            risk_score=score,
            signature_matches=matches,
            detected_encodings=encodings,
            review_recommended=review_rec,
            latency_ms=round(elapsed, 3),
            explanation=expl
        )


input_normalizer = InputNormalizer()
