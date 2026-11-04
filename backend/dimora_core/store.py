"""Accounts and cloud-saved projects.

Storage is SQLite by default (a file next to the backend — fine on your own PC or a server with a disk).
Set DATABASE_URL=postgres://… to use PostgreSQL instead (e.g. a free Neon or Supabase database), which
is what you want on hosts whose disk is wiped on every restart, such as Render's free plan.

Passwords are stored only as salted hashes (werkzeug: scrypt/pbkdf2). Sessions are random 256-bit
tokens; only their SHA-256 is stored, so a leaked database can't be used to log in.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from pathlib import Path

from werkzeug.security import check_password_hash, generate_password_hash

SESSION_DAYS = 30
MAX_PROJECTS = 200
EMAIL = re.compile(r"^[^@\s]{1,64}@[^@\s]+\.[a-z]{2,}$", re.I)

SCHEMA = [
    """CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL DEFAULT '',
        pw_hash TEXT NOT NULL, prefs TEXT NOT NULL DEFAULT '{}', created REAL NOT NULL)""",
    """CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, created REAL NOT NULL, expires REAL NOT NULL)""",
    """CREATE TABLE IF NOT EXISTS projects (
        id TEXT NOT NULL, user_id TEXT NOT NULL, name TEXT NOT NULL, data TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '{}', updated REAL NOT NULL, PRIMARY KEY (user_id, id))""",
    "CREATE INDEX IF NOT EXISTS projects_user ON projects (user_id, updated)",
]


class StoreError(ValueError):
    """Bad input (→ 400)."""


class AuthError(PermissionError):
    """Not signed in / wrong password (→ 401)."""


class _DB:
    """Tiny adapter so the same SQL ('?' placeholders) runs on SQLite and PostgreSQL."""

    def __init__(self, url: str | None, path: str):
        self.pg = bool(url and url.startswith(("postgres://", "postgresql://")))
        self.lock = threading.Lock()
        if self.pg:
            import psycopg  # noqa: PLC0415 — only needed when DATABASE_URL is Postgres
            self.conn = psycopg.connect(url, autocommit=True)
        else:
            Path(path).parent.mkdir(parents=True, exist_ok=True)
            self.conn = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
            self.conn.execute("PRAGMA journal_mode=WAL")
            self.conn.execute("PRAGMA foreign_keys=ON")
        for stmt in SCHEMA:
            self.run(stmt)

    def run(self, sql: str, args=()):
        if self.pg:
            sql = sql.replace("?", "%s")
        with self.lock:
            if self.pg:
                try:
                    with self.conn.cursor() as cur:
                        cur.execute(sql, args)
                        return cur.fetchall() if cur.description else []
                except Exception:
                    if self.conn.closed:  # dropped connection (idle timeout): reconnect once
                        import psycopg  # noqa: PLC0415
                        self.conn = psycopg.connect(self.url, autocommit=True)
                    raise
            cur = self.conn.execute(sql, args)
            return cur.fetchall()


class Store:
    def __init__(self, url: str | None = None, path: str | None = None):
        url = url if url is not None else os.getenv("DATABASE_URL", "")
        path = path or os.getenv("DIMORA_DB_PATH") or str(Path(__file__).resolve().parent.parent / "data" / "dimora.db")
        self.db = _DB(url or None, path)
        self.db.url = url
        self.kind = "postgres" if self.db.pg else "sqlite"

    # ---------- users & sessions ----------
    @staticmethod
    def _hash_token(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def _new_session(self, user_id: str) -> str:
        token = secrets.token_urlsafe(32)
        now = time.time()
        self.db.run("INSERT INTO sessions (token_hash, user_id, created, expires) VALUES (?, ?, ?, ?)",
                    (self._hash_token(token), user_id, now, now + SESSION_DAYS * 86400))
        return token

    def _user_row(self, row):
        uid, email, name, prefs, created = row
        try:
            prefs = json.loads(prefs or "{}")
        except ValueError:
            prefs = {}
        return {"id": uid, "email": email, "name": name, "prefs": prefs, "created": created}

    def signup(self, email: str, password: str, name: str = ""):
        email = (email or "").strip().lower()
        name = (name or "").strip()[:60]
        if not EMAIL.match(email):
            raise StoreError("Please enter a valid email address.")
        if len(password or "") < 8:
            raise StoreError("Use a password of at least 8 characters.")
        if len(password) > 200:
            raise StoreError("That password is too long.")
        if self.db.run("SELECT 1 FROM users WHERE email = ?", (email,)):
            raise StoreError("An account with this email already exists — sign in instead.")
        uid = "u_" + secrets.token_hex(8)
        self.db.run("INSERT INTO users (id, email, name, pw_hash, prefs, created) VALUES (?, ?, ?, ?, ?, ?)",
                    (uid, email, name, generate_password_hash(password), "{}", time.time()))
        return self.user(uid), self._new_session(uid)

    def login(self, email: str, password: str):
        email = (email or "").strip().lower()
        rows = self.db.run("SELECT id, pw_hash FROM users WHERE email = ?", (email,))
        if not rows or not check_password_hash(rows[0][1], password or ""):
            raise AuthError("Wrong email or password.")
        return self.user(rows[0][0]), self._new_session(rows[0][0])

    def user(self, uid: str):
        rows = self.db.run("SELECT id, email, name, prefs, created FROM users WHERE id = ?", (uid,))
        if not rows:
            raise AuthError("Account not found.")
        return self._user_row(rows[0])

    def user_for_token(self, token: str | None):
        if not token:
            raise AuthError("Please sign in.")
        rows = self.db.run("SELECT user_id, expires FROM sessions WHERE token_hash = ?", (self._hash_token(token),))
        if not rows or rows[0][1] < time.time():
            raise AuthError("Your session has expired — please sign in again.")
        return self.user(rows[0][0])

    def logout(self, token: str | None):
        if token:
            self.db.run("DELETE FROM sessions WHERE token_hash = ?", (self._hash_token(token),))

    def update_user(self, uid: str, name=None, prefs=None):
        if name is not None:
            self.db.run("UPDATE users SET name = ? WHERE id = ?", (str(name).strip()[:60], uid))
        if prefs is not None:
            if not isinstance(prefs, dict):
                raise StoreError("prefs must be an object")
            blob = json.dumps(prefs)
            if len(blob) > 20000:
                raise StoreError("Preferences are too large.")
            self.db.run("UPDATE users SET prefs = ? WHERE id = ?", (blob, uid))
        return self.user(uid)

    def change_password(self, uid: str, old: str, new: str):
        rows = self.db.run("SELECT pw_hash FROM users WHERE id = ?", (uid,))
        if not rows or not check_password_hash(rows[0][0], old or ""):
            raise AuthError("Your current password is wrong.")
        if len(new or "") < 8:
            raise StoreError("Use a new password of at least 8 characters.")
        self.db.run("UPDATE users SET pw_hash = ? WHERE id = ?", (generate_password_hash(new), uid))
        self.db.run("DELETE FROM sessions WHERE user_id = ?", (uid,))  # sign out everywhere else
        return self._new_session(uid)

    def delete_user(self, uid: str):
        for t in ("projects", "sessions"):
            self.db.run(f"DELETE FROM {t} WHERE user_id = ?", (uid,))
        self.db.run("DELETE FROM users WHERE id = ?", (uid,))

    def purge_sessions(self):
        self.db.run("DELETE FROM sessions WHERE expires < ?", (time.time(),))

    # ---------- projects ----------
    def list_projects(self, uid: str):
        rows = self.db.run("SELECT id, name, summary, updated FROM projects WHERE user_id = ? ORDER BY updated DESC", (uid,))
        out = []
        for pid, name, summary, updated in rows:
            try:
                s = json.loads(summary or "{}")
            except ValueError:
                s = {}
            out.append({**s, "id": pid, "name": name, "updated": updated})
        return out

    def get_project(self, uid: str, pid: str):
        rows = self.db.run("SELECT data FROM projects WHERE user_id = ? AND id = ?", (uid, pid))
        if not rows:
            raise StoreError("Project not found.")
        return json.loads(rows[0][0])

    def put_project(self, uid: str, pid: str, data: dict, summary: dict | None = None):
        if not re.fullmatch(r"[A-Za-z0-9_\-]{1,64}", pid or ""):
            raise StoreError("Bad project id.")
        if not isinstance(data, dict) or not isinstance(data.get("floors"), list):
            raise StoreError("Project data must be a DIMORA project.")
        name = str(data.get("name") or "My Home")[:80]
        summary = {k: v for k, v in (summary or {}).items() if k in ("thumb", "rooms", "cost", "theme", "floors")}
        if isinstance(summary.get("thumb"), str) and len(summary["thumb"]) > 120_000:
            summary.pop("thumb")
        blob = json.dumps(data, separators=(",", ":"))
        if len(blob) > 12_000_000:
            raise StoreError("This project is too large to save (over 12 MB).")
        updated = float(data.get("updated") or time.time() * 1000)
        exists = self.db.run("SELECT 1 FROM projects WHERE user_id = ? AND id = ?", (uid, pid))
        if exists:
            self.db.run("UPDATE projects SET name = ?, data = ?, summary = ?, updated = ? WHERE user_id = ? AND id = ?",
                        (name, blob, json.dumps(summary), updated, uid, pid))
        else:
            n = self.db.run("SELECT COUNT(*) FROM projects WHERE user_id = ?", (uid,))[0][0]
            if n >= MAX_PROJECTS:
                raise StoreError(f"You can keep up to {MAX_PROJECTS} projects — delete some first.")
            self.db.run("INSERT INTO projects (id, user_id, name, data, summary, updated) VALUES (?, ?, ?, ?, ?, ?)",
                        (pid, uid, name, blob, json.dumps(summary), updated))
        return {"id": pid, "name": name, "updated": updated}

    def delete_project(self, uid: str, pid: str):
        self.db.run("DELETE FROM projects WHERE user_id = ? AND id = ?", (uid, pid))
