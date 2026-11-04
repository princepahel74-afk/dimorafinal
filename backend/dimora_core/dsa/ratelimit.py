"""Sliding-window rate limiter (hash map of deques) — protects the server's AI key on a public site.

Each visitor (by IP) gets `per_hour` AI calls in any rolling 60-minute window, and the whole site gets
`per_day` calls in any rolling 24 hours. A deque per key keeps timestamps in arrival order, so expiring
old hits is popleft() from the front: O(1) amortised per call, O(active keys) memory.
"""
from __future__ import annotations

import threading
import time
from collections import deque

_GLOBAL = "*"


class SlidingWindowLimiter:
    def __init__(self, per_hour: int, per_day: int, clock=time.monotonic, max_keys: int = 50_000):
        self.per_hour, self.per_day = per_hour, per_day
        self.clock, self.max_keys = clock, max_keys
        self.hits: dict[str, deque] = {}
        self.lock = threading.Lock()

    def _window(self, key: str, span: float, now: float) -> deque:
        q = self.hits.setdefault(key, deque())
        while q and now - q[0] >= span:
            q.popleft()
        return q

    def _gc(self, now: float):
        """Drop visitors with no hits in the last hour once the table grows large."""
        if len(self.hits) <= self.max_keys:
            return
        for k in [k for k, q in self.hits.items() if k != _GLOBAL and (not q or now - q[-1] >= 3600)]:
            del self.hits[k]

    def check(self, key: str, consume: bool = True) -> bool:
        """True if `key` may make another call now (and records it when consume=True)."""
        if self.per_hour <= 0 and self.per_day <= 0:
            return True
        with self.lock:
            now = self.clock()
            mine = self._window(key, 3600, now)
            site = self._window(_GLOBAL, 86400, now)
            if (self.per_hour > 0 and len(mine) >= self.per_hour) or (self.per_day > 0 and len(site) >= self.per_day):
                return False
            if consume:
                mine.append(now)
                site.append(now)
                self._gc(now)
            return True

    def remaining(self, key: str) -> int | None:
        if self.per_hour <= 0:
            return None
        with self.lock:
            return max(0, self.per_hour - len(self._window(key, 3600, self.clock())))
