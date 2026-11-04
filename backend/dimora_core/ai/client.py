"""Open-source AI client: Qwen3.5 through Ollama (local) or OpenRouter (hosted).

provider = "auto"       → use Ollama if it is running and has the model, otherwise OpenRouter
provider = "ollama"     → local only (free, private)
provider = "openrouter" → hosted only (bigger model, needs an API key)

Every call returns plain text; ask_json() also extracts the JSON object from it.
"""
from __future__ import annotations

import json
import re
import time

import requests

from ..config import settings
from ..dsa.ratelimit import SlidingWindowLimiter

# Shared by every request in this process: protects the server's own OpenRouter key on a public site.
limiter = SlidingWindowLimiter(settings.ai_per_hour, settings.ai_per_day) if settings.public else None


class AIError(RuntimeError):
    pass


class AIUnavailable(AIError):
    """No provider is configured or reachable — callers fall back to rule-based logic."""


_THINK = re.compile(r"<think>.*?</think>", re.S)


def extract_json(text: str):
    """Pull the first JSON object/array out of a model reply (handles ```json fences and chatter)."""
    t = _THINK.sub("", str(text)).replace("```json", "").replace("```JSON", "").replace("```", "").strip()
    starts = [i for i in (t.find("{"), t.find("[")) if i >= 0]
    if not starts:
        raise AIError("No JSON in the model reply")
    s = min(starts)
    for e in range(len(t), s, -1):
        if t[e - 1] in "}]":
            try:
                return json.loads(t[s:e])
            except json.JSONDecodeError:
                continue
    raise AIError("Could not parse JSON from the model reply")


class AIClient:
    _ollama_cache: dict = {}

    def __init__(self, provider=None, openrouter_key=None, ollama_model=None, openrouter_model=None, ollama_url=None, visitor=None):
        self.provider = (provider or settings.ai_provider or "auto").lower()
        # Only calls paid with the server's key are metered; a visitor's own key is theirs to spend.
        self.quota_key = visitor if (limiter and not openrouter_key) else None
        self.openrouter_key = openrouter_key or settings.openrouter_key
        self.ollama_model = ollama_model or settings.ollama_model
        self.openrouter_model = openrouter_model or settings.openrouter_model
        self.ollama_url = (ollama_url or settings.ollama_url).rstrip("/")
        self.used = None  # "ollama:<model>" / "openrouter:<model>" after a call

    # ---------- discovery ----------
    def ollama_models(self):
        """List local models (cached for 20 s so every request doesn't ping Ollama)."""
        hit = self._ollama_cache.get(self.ollama_url)
        if hit and time.time() - hit[0] < 20:
            return hit[1]
        try:
            r = requests.get(self.ollama_url + "/api/tags", timeout=1.5)
            models = [m["name"] for m in r.json().get("models", [])] if r.ok else None
        except (requests.RequestException, ValueError):
            models = None
        self._ollama_cache[self.ollama_url] = (time.time(), models)
        return models

    def ollama_ready(self) -> bool:
        models = self.ollama_models()
        if not models:
            return False
        want = self.ollama_model if ":" in self.ollama_model else self.ollama_model + ":latest"
        return any(m == want or m.split(":")[0] == self.ollama_model for m in models)

    def order(self):
        if self.provider == "ollama":
            return ["ollama"]
        if self.provider == "openrouter":
            return ["openrouter"] if self._quota_ok(consume=False) else []
        out = []
        if self.ollama_ready():
            out.append("ollama")
        if self.openrouter_key and self._quota_ok(consume=False):
            out.append("openrouter")
        return out

    def _quota_ok(self, consume: bool) -> bool:
        return self.quota_key is None or limiter.check(self.quota_key, consume=consume)

    def status(self):
        models = self.ollama_models()
        return {
            "provider": self.provider,
            "ollama": {"url": self.ollama_url, "running": models is not None, "model": self.ollama_model, "model_installed": self.ollama_ready(), "models": models or []},
            "openrouter": {"configured": bool(self.openrouter_key), "model": self.openrouter_model,
                           **({"remaining_this_hour": limiter.remaining(self.quota_key)} if self.quota_key else {})},
            "public": settings.public,
            "active": (self.order() or [None])[0],
        }

    def label(self):
        p = (self.order() or [None])[0]
        return {"ollama": f"Qwen · {self.ollama_model} (local)", "openrouter": f"Qwen · {self.openrouter_model}"}.get(p, "rule-based engine")

    # ---------- calls ----------
    def chat(self, messages, temperature: float = 0.3, max_tokens: int = 2048, want_json: bool = True, timeout: float | None = None) -> str:
        """messages: [{'role': 'user'|'assistant'|'system', 'text': str, 'images': [base64 jpeg]}]"""
        providers = self.order()
        if not providers:
            if self.openrouter_key and not self._quota_ok(consume=False):
                raise AIUnavailable("The free AI allowance for this hour is used up — DIMORA continues with its rule-based engine. "
                                    "Add your own OpenRouter key in Settings to keep using Qwen.")
            raise AIUnavailable("No AI provider: start Ollama with the Qwen model, or set an OpenRouter API key.")
        errors = []
        for p in providers:
            if p == "openrouter" and not self._quota_ok(consume=True):
                errors.append("openrouter: AI allowance used up")
                continue
            try:
                fn = self._ollama if p == "ollama" else self._openrouter
                text = _THINK.sub("", fn(messages, temperature, max_tokens, want_json, timeout or settings.ai_timeout)).strip()
                if not text:
                    raise AIError("Empty reply")
                self.used = f"{p}:{self.ollama_model if p == 'ollama' else self.openrouter_model}"
                return text
            except AIError as e:
                errors.append(f"{p}: {e}")
        raise AIError("; ".join(errors))

    def ask_json(self, prompt: str, images=None, **kw):
        return extract_json(self.chat([{"role": "user", "text": prompt, "images": images or []}], **kw))

    def _ollama(self, messages, temperature, max_tokens, want_json, timeout):
        body = {
            "model": self.ollama_model, "stream": False, "think": False,
            "messages": [{"role": m["role"], "content": m.get("text", ""), **({"images": m["images"]} if m.get("images") else {})} for m in messages],
            "options": {"temperature": temperature, "num_predict": max_tokens, "top_p": 0.8, "top_k": 20},
        }
        if want_json:
            body["format"] = "json"
        for attempt in range(2):
            try:
                r = requests.post(self.ollama_url + "/api/chat", json=body, timeout=timeout)
            except requests.RequestException as e:
                raise AIError(f"Ollama not reachable ({e.__class__.__name__})") from e
            if r.status_code == 400 and "think" in r.text and attempt == 0:
                body.pop("think", None)  # older Ollama / non-thinking model
                continue
            if not r.ok:
                raise AIError(f"Ollama HTTP {r.status_code}: {r.text[:200]}")
            return (r.json().get("message") or {}).get("content", "")
        raise AIError("Ollama rejected the request")

    def _openrouter(self, messages, temperature, max_tokens, want_json, timeout):
        def content(m):
            if not m.get("images"):
                return m.get("text", "")
            return [{"type": "text", "text": m.get("text", "")}] + [{"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + b}} for b in m["images"]]

        body = {"model": self.openrouter_model, "temperature": temperature, "max_tokens": max_tokens,
                "messages": [{"role": m["role"], "content": content(m)} for m in messages],
                "reasoning": {"enabled": False}}
        if want_json:
            body["response_format"] = {"type": "json_object"}
        headers = {"Authorization": f"Bearer {self.openrouter_key}", "HTTP-Referer": "https://github.com/dimora", "X-Title": "DIMORA"}
        for attempt in range(3):
            try:
                r = requests.post(settings.openrouter_url + "/chat/completions", json=body, headers=headers, timeout=timeout)
            except requests.RequestException as e:
                raise AIError(f"OpenRouter not reachable ({e.__class__.__name__})") from e
            if r.status_code == 400 and attempt < 2:  # drop optional params some providers reject
                if "response_format" in body:
                    body.pop("response_format")
                    continue
                if "reasoning" in body:
                    body.pop("reasoning")
                    continue
            if not r.ok:
                try:
                    msg = r.json().get("error", {}).get("message", r.text[:200])
                except ValueError:
                    msg = r.text[:200]
                hint = {401: "the API key was rejected — check OPENROUTER_API_KEY", 402: "the OpenRouter account is out of credits",
                        403: "this key isn't allowed to use that model", 404: f"model {self.openrouter_model} not found",
                        429: "rate-limited by OpenRouter — try again in a moment"}.get(r.status_code)
                raise AIError(f"OpenRouter HTTP {r.status_code}: {hint or msg}")
            j = r.json()
            return ((j.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
        raise AIError("OpenRouter rejected the request")


def client_from_request(headers, body=None, visitor=None) -> AIClient:
    """Per-request overrides from the frontend's AI settings (headers win over .env).

    On a public site a visitor must not be able to make the server call an arbitrary URL, so the
    Ollama URL override is ignored there (the server's own OLLAMA_URL still applies)."""
    body = body or {}
    return AIClient(
        provider=headers.get("X-AI-Provider") or body.get("ai_provider"),
        openrouter_key=headers.get("X-OpenRouter-Key") or None,
        ollama_model=headers.get("X-Ollama-Model") or None,
        openrouter_model=headers.get("X-OpenRouter-Model") or None,
        ollama_url=None if settings.public else (headers.get("X-Ollama-Url") or None),
        visitor=visitor,
    )
