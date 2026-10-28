import re
from typing import Optional, Tuple, Dict, Any, List


class FastAttackSignatureDB:
    """
    Tier 1A Fast Perimeter Defense (<0.5 ms latency).
    Indexes known direct injection attacks, DAN patterns, GCG suffixes, and system overrides.
    Operates strictly in memory without token/LLM overhead.
    """

    KNOWN_ATTACK_PATTERNS: List[Dict[str, Any]] = [
        {
            "id": "SIG_SYS_OVERRIDE_01",
            "pattern": r"(?i)(ignore\s+all\s+(previous|prior)\s+(instructions|prompts|rules)|disregard\s+(previous|prior|above)\s+instructions|system\s+override)",
            "family": "System Override Jailbreak",
            "severity": "CRITICAL"
        },
        {
            "id": "SIG_DAN_JAILBREAK_02",
            "pattern": r"(?i)(you\s+are\s+now\s+in\s+developer\s+mode|act\s+as\s+DAN|do\s+anything\s+now|bypass\s+all\s+safety\s+filters)",
            "family": "Role-Play Jailbreak (DAN)",
            "severity": "CRITICAL"
        },
        {
            "id": "SIG_SQL_INJECTION_03",
            "pattern": r"(?i)(;\s*DROP\s+TABLE|drop\s+all\s+\w+\s+tables|UNION\s+SELECT|OR\s+1\s*=\s*1\s*--|DELETE\s+FROM\s+\w+)",
            "family": "Direct SQL/Database Injection",
            "severity": "CRITICAL"
        },
        {
            "id": "SIG_SHELL_EXEC_04",
            "pattern": r"(?i)(?:^|[;&|`\n]\s*)(rm\s+-rf|curl\s+http|wget\s+http|cat\s+/etc/passwd|nc\s+-e|bash\s+-i)|execute_shell\s*\(",
            "family": "Arbitrary Command Injection",
            "severity": "CRITICAL"
        },
        {
            "id": "SIG_MARKDOWN_EXFIL_05",
            "pattern": r"!\[.*?\]\(https?://[^\s\)]+(?:\?|&)(?:token|key|secret|password|account|data|auth)=.*?\)",
            "family": "Markdown UI Image Exfiltration",
            "severity": "HIGH"
        },
        {
            "id": "SIG_BASE64_OBFUSCATION_06",
            "pattern": r"(?i)(base64\s+decode|echo\s+[A-Za-z0-9+/=]{20,}\s*\|\s*base64\s+-d)",
            "family": "Encoded Payload Obfuscation",
            "severity": "HIGH"
        }
    ]

    def __init__(self):
        # Precompile all regex patterns for maximum sub-millisecond throughput
        self.compiled_rules = [
            (re.compile(entry["pattern"]), entry)
            for entry in self.KNOWN_ATTACK_PATTERNS
        ]

    def scan(self, text: str) -> Optional[Tuple[bool, str, str]]:
        """
        Scans input string against precompiled attack patterns.
        Returns: (is_attack: True, signature_id, attack_family) or None if clean.
        """
        if not text:
            return None

        for regex, meta in self.compiled_rules:
            if regex.search(text):
                return True, meta["id"], f"{meta['family']} ({meta['severity']})"

        return None

    def scan_all(self, text: str) -> List[Dict[str, Any]]:
        """
        Scans input string and returns all matched signature metadata dictionaries.
        """
        if not text:
            return []
        matched = []
        for regex, meta in self.compiled_rules:
            if regex.search(text):
                matched.append({
                    "id": meta["id"],
                    "family": meta["family"],
                    "severity": meta["severity"]
                })
        return matched


# Singleton instance for high-speed reuse
signature_db = FastAttackSignatureDB()
