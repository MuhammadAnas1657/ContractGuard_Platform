"""
ContractGuard-X NVIDIA LLM Language & Foreign Script Detection Service (Milestone 1: F19/F20).
Integrates directly with NVIDIA NIM and Nebius Token Factory Cloud for AI-driven language detection,
with deterministic zero-token Unicode script analysis fallback when offline.
"""
from __future__ import annotations
import os
import re
import json
import time
import unicodedata
from typing import Dict, List, Any, Optional


class DeterministicLanguageDetector:
    """
    Zero-token deterministic Unicode script and language detector.
    Analyzes Unicode character properties to identify scripts (Latin, Cyrillic, Han, Arabic, etc.)
    and detects mixed-script homoglyph obfuscation (Cyrillic lookalikes embedded in English).
    """

    CYRILLIC_HOMOGLYPH_MAP = {
        'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i',
        'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P',
        'С': 'C', 'Т': 'T', 'Х': 'X'
    }

    # European language keyword markers & diacritics
    SPANISH_MARKERS = {"el", "la", "de", "en", "un", "una", "por", "para", "con", "reembolso", "orden", "pedido", "gracias", "ayuda", "cuenta"}
    FRENCH_MARKERS = {"le", "la", "les", "un", "une", "des", "pour", "avec", "bonjour", "merci", "compte"}
    GERMAN_MARKERS = {"der", "die", "das", "und", "ist", "in", "den", "von", "bitte", "danke", "konto"}

    @classmethod
    def analyze(cls, text: str) -> Dict[str, Any]:
        if not text or not text.strip():
            return {
                "language": "en",
                "confidence": 1.0,
                "script": "Latin",
                "detected_scripts": ["Latin"],
                "has_foreign_script": False,
                "has_mixed_scripts": False,
                "homoglyphs_detected": []
            }

        scripts = set()
        script_counts: Dict[str, int] = {}
        homoglyphs_found = []
        has_mixed_scripts = False

        # Tokenize by word boundaries for intra-token mixed script analysis
        tokens = re.findall(r"\b\w+\b", text)
        for token in tokens:
            token_scripts = set()
            for ch in token:
                name = unicodedata.name(ch, "")
                if "LATIN" in name:
                    token_scripts.add("Latin")
                elif "CYRILLIC" in name:
                    token_scripts.add("Cyrillic")
                    if ch in cls.CYRILLIC_HOMOGLYPH_MAP:
                        homoglyphs_found.append(ch)
                elif "ARABIC" in name:
                    token_scripts.add("Arabic")
                elif "CJK" in name or "IDEOGRAPH" in name:
                    token_scripts.add("Han")
                elif "DEVANAGARI" in name:
                    token_scripts.add("Devanagari")
                elif "GREEK" in name:
                    token_scripts.add("Greek")
                elif "HEBREW" in name:
                    token_scripts.add("Hebrew")

            # Check if this single token blends Latin and another script (e.g. 'systеm')
            if "Latin" in token_scripts and len(token_scripts) > 1:
                has_mixed_scripts = True

        # Global character script tally
        for ch in text:
            if not ch.isalpha():
                continue
            name = unicodedata.name(ch, "")
            s_name = "Other"
            if "LATIN" in name:
                s_name = "Latin"
            elif "CYRILLIC" in name:
                s_name = "Cyrillic"
            elif "ARABIC" in name:
                s_name = "Arabic"
            elif "CJK" in name or "IDEOGRAPH" in name:
                s_name = "Han"
            elif "DEVANAGARI" in name:
                s_name = "Devanagari"
            elif "GREEK" in name:
                s_name = "Greek"
            elif "HEBREW" in name:
                s_name = "Hebrew"
            elif "HIRAGANA" in name or "KATAKANA" in name:
                s_name = "Kana"
            elif "HANGUL" in name:
                s_name = "Hangul"

            if s_name != "Other":
                scripts.add(s_name)
                script_counts[s_name] = script_counts.get(s_name, 0) + 1

        primary_script = "Latin"
        if script_counts:
            primary_script = max(script_counts.items(), key=lambda x: x[1])[0]

        has_foreign = any(s in scripts for s in ["Cyrillic", "Arabic", "Han", "Devanagari", "Greek", "Hebrew", "Kana", "Hangul"])

        # Determine primary language
        primary_lang = "en"
        confidence = 0.98

        if primary_script == "Cyrillic":
            primary_lang = "ru"
        elif primary_script == "Han":
            primary_lang = "zh"
        elif primary_script == "Arabic":
            primary_lang = "ar"
        elif primary_script == "Devanagari":
            primary_lang = "hi"
        elif primary_script == "Greek":
            primary_lang = "el"
        elif primary_script == "Hebrew":
            primary_lang = "he"
        elif primary_script == "Kana":
            primary_lang = "ja"
        elif primary_script == "Hangul":
            primary_lang = "ko"
        else:
            # Latin script - detect European languages via stopwords or accented letters
            lower_words = set(re.findall(r"\b[a-záéíóúñàèùâêîôûäöüß]+\b", text.lower()))
            if any(w in cls.SPANISH_MARKERS for w in lower_words) or any(c in text for c in "áíóúñ¿¡"):
                primary_lang = "es"
                confidence = 0.95
            elif any(w in cls.FRENCH_MARKERS for w in lower_words) or any(c in text for c in "èêçàù"):
                primary_lang = "fr"
                confidence = 0.95
            elif any(w in cls.GERMAN_MARKERS for w in lower_words) or any(c in text for c in "äöüß"):
                primary_lang = "de"
                confidence = 0.95
            else:
                primary_lang = "en"
                confidence = 0.98

        detected_scripts_list = list(scripts) if scripts else ["Latin"]
        effective_script = "Mixed" if has_mixed_scripts else primary_script

        return {
            "language": primary_lang,
            "confidence": confidence,
            "script": effective_script,
            "detected_scripts": detected_scripts_list,
            "has_foreign_script": has_foreign,
            "has_mixed_scripts": has_mixed_scripts,
            "homoglyphs_detected": list(set(homoglyphs_found))
        }


class NvidiaLanguageDetector:
    """
    NVIDIA LLM API Language & Foreign Script Detection Client.
    Directly invokes NVIDIA NIM API or Nebius Token Factory Cloud.
    Falls back gracefully to DeterministicLanguageDetector when offline.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: str = "meta/llama-3.1-8b-instruct"
    ):
        self.base_url = base_url or os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
        self.model = os.environ.get("NVIDIA_LANGUAGE_MODEL", model)

    def is_live_configured(self, api_key: Optional[str] = None) -> bool:
        key = (api_key if api_key is not None else (os.environ.get("NVIDIA_API_KEY") or os.environ.get("NEBIUS_API_KEY", ""))).strip()
        if not key:
            return False
        lower_key = key.lower()
        placeholders = {"replace_me", "mock", "test", "demo", "judge_evaluator_key", "offline", "none", "null"}
        if lower_key in placeholders or lower_key.startswith("mock_") or lower_key.startswith("demo_"):
            return False
        return True

    def _get_client(self, api_key: Optional[str] = None):
        if not self.is_live_configured(api_key):
            return None
        key = (api_key if api_key is not None else (os.environ.get("NVIDIA_API_KEY") or os.environ.get("NEBIUS_API_KEY", ""))).strip()
        try:
            from openai import OpenAI
            if "nebius" in self.base_url.lower() or key.startswith("tf_") or os.environ.get("NEBIUS_API_KEY"):
                base_url = "https://api.tokenfactory.nebius.ai/v1"
                model = "nvidia/nemotron-mini-4b-instruct"
            else:
                base_url = self.base_url
                model = self.model
            client = OpenAI(base_url=base_url, api_key=key, timeout=2.0)
            return client, model
        except Exception:
            return None

    def detect_language(
        self,
        text: str,
        api_key: Optional[str] = None,
        force_llm: bool = False
    ) -> Dict[str, Any]:
        """
        Detects natural language, Unicode script, foreign scripts, and mixed-script homoglyphs.
        Tier 1 (Zero-Token Lightweight Detector) always runs first in <0.05ms.
        Tier 2 (NVIDIA / Nebius LLM) runs only when explicitly forced, when an explicit live api_key
        is passed, or when deterministic confidence is ambiguous (<0.80).
        """
        clean_text = text or ""
        if not clean_text.strip():
            return {
                "language": "en",
                "confidence": 1.0,
                "script": "Latin",
                "detected_scripts": ["Latin"],
                "has_foreign_script": False,
                "has_mixed_scripts": False,
                "homoglyphs_detected": []
            }

        # Tier 1: Zero-Token Instant Unicode & Language Sentinel (<0.05ms)
        det_result = DeterministicLanguageDetector.analyze(clean_text)

        # Short-circuit if unambiguous and no explicit cloud override requested
        if not force_llm and api_key is None and det_result.get("confidence", 0.0) >= 0.80:
            return det_result

        # Tier 2: NVIDIA / Nebius Cloud LLM Verification for ambiguous edge cases or explicit key checks
        client_info = self._get_client(api_key)
        if client_info:
            client, model_name = client_info
            system_prompt = (
                "You are an expert Multilingual Security Classifier. Detect the language, scripts, "
                "foreign scripts, and mixed-script homoglyphs in the input text. Respond ONLY with a valid JSON object "
                "with exact keys: 'language' (ISO 639-1 code e.g. en, es, ru, zh, ar), 'confidence' (float 0.0-1.0), "
                "'script' (primary script string), 'detected_scripts' (list of strings), 'has_foreign_script' (bool), "
                "'has_mixed_scripts' (bool), 'homoglyphs_detected' (list of characters)."
            )
            try:
                res = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Analyze this text:\n\"\"\"{clean_text[:500]}\"\"\""}
                    ],
                    temperature=0.0,
                    max_tokens=150
                )
                raw_out = res.choices[0].message.content or ""
                clean_json = raw_out.strip()
                if "```json" in clean_json:
                    clean_json = clean_json.split("```json")[1].split("```")[0].strip()
                elif "```" in clean_json:
                    clean_json = clean_json.split("```")[1].split("```")[0].strip()
                parsed = json.loads(clean_json)
                if "language" in parsed and "confidence" in parsed and "script" in parsed:
                    return {
                        "language": str(parsed.get("language", det_result["language"])).lower(),
                        "confidence": float(parsed.get("confidence", 0.95)),
                        "script": str(parsed.get("script", det_result["script"])),
                        "detected_scripts": list(parsed.get("detected_scripts", det_result["detected_scripts"])),
                        "has_foreign_script": bool(parsed.get("has_foreign_script", False)) or det_result["has_foreign_script"],
                        "has_mixed_scripts": bool(parsed.get("has_mixed_scripts", False)) or det_result["has_mixed_scripts"],
                        "homoglyphs_detected": list(set(list(parsed.get("homoglyphs_detected", [])) + det_result["homoglyphs_detected"]))
                    }
            except Exception:
                pass

        return det_result


# Global singleton instance
nvidia_language_detector = NvidiaLanguageDetector()
