"""Public-site mode: AI quota per visitor and no visitor-supplied server-side URLs."""
from dimora_core.ai import client as aic
from dimora_core.config import settings
from dimora_core.dsa.ratelimit import SlidingWindowLimiter


def test_sliding_window_per_visitor_and_site():
    t = [0.0]
    lim = SlidingWindowLimiter(per_hour=2, per_day=3, clock=lambda: t[0])
    assert lim.check("a") and lim.check("a")
    assert not lim.check("a")                 # visitor a used both calls this hour
    assert lim.check("b")                     # b has its own window …
    assert not lim.check("c")                 # … but the site cap (3/day) is now reached
    t[0] = 3600
    assert not lim.check("a")                 # hour passed, site cap still holds
    t[0] = 86400
    assert lim.check("a") and lim.remaining("a") == 1


def test_peek_does_not_consume():
    lim = SlidingWindowLimiter(per_hour=1, per_day=0)
    assert lim.check("x", consume=False) and lim.check("x", consume=False)
    assert lim.check("x") and not lim.check("x", consume=False)


def test_public_mode_meters_server_key_only(monkeypatch):
    monkeypatch.setattr(settings, "public", True)
    monkeypatch.setattr(settings, "openrouter_key", "server-key")
    monkeypatch.setattr(aic, "limiter", SlidingWindowLimiter(per_hour=1, per_day=0))
    monkeypatch.setattr(aic.AIClient, "_openrouter", lambda self, *a: '{"ok": 1}')
    hdr = {"X-AI-Provider": "openrouter", "X-Ollama-Url": "http://169.254.169.254"}
    ai = aic.client_from_request(hdr, visitor="1.2.3.4")
    assert ai.ollama_url == settings.ollama_url.rstrip("/")   # visitor URL ignored
    assert ai.ask_json("hi") == {"ok": 1}
    again = aic.client_from_request(hdr, visitor="1.2.3.4")
    assert again.order() == []
    try:
        again.ask_json("hi")
        raise AssertionError("expected AIUnavailable")
    except aic.AIUnavailable as e:
        assert "allowance" in str(e)
    own = aic.client_from_request({**hdr, "X-OpenRouter-Key": "visitor-key"}, visitor="1.2.3.4")
    assert own.quota_key is None and own.ask_json("hi") == {"ok": 1}   # their own key: not metered
