"""Accounts and cloud projects over the REST API."""


def _signup(client, email="asha@example.com", pw="secret-pass-1", name="Asha"):
    r = client.post("/api/auth/signup", json={"email": email, "password": pw, "name": name})
    assert r.status_code == 200, r.get_json()
    return r.get_json()


def _auth(tok):
    return {"Authorization": f"Bearer {tok}"}


def _project(pid="p_abc123", name="My Villa"):
    return {"id": pid, "name": name, "updated": 1700000000000, "floors": [{"id": "f1", "name": "Ground Floor", "level": 0, "rooms": [], "doors": [], "windows": []}]}


def test_signup_login_me_logout(client):
    j = _signup(client)
    assert j["user"]["email"] == "asha@example.com" and j["token"]
    assert client.get("/api/auth/me", headers=_auth(j["token"])).get_json()["user"]["name"] == "Asha"
    # duplicate email, bad password, bad email
    assert client.post("/api/auth/signup", json={"email": "ASHA@example.com", "password": "secret-pass-1"}).status_code == 400
    assert client.post("/api/auth/signup", json={"email": "x@example.com", "password": "short"}).status_code == 400
    assert client.post("/api/auth/signup", json={"email": "not-an-email", "password": "secret-pass-1"}).status_code == 400
    assert client.post("/api/auth/login", json={"email": "asha@example.com", "password": "nope-nope"}).status_code == 401
    t2 = client.post("/api/auth/login", json={"email": "Asha@Example.com", "password": "secret-pass-1"}).get_json()["token"]
    client.post("/api/auth/logout", headers=_auth(t2))
    assert client.get("/api/auth/me", headers=_auth(t2)).status_code == 401
    assert client.get("/api/auth/me").status_code == 401


def test_prefs_and_password_change(client):
    j = _signup(client)
    u = client.patch("/api/auth/me", json={"name": "Asha K", "prefs": {"answers": {"done": True}}}, headers=_auth(j["token"])).get_json()["user"]
    assert u["name"] == "Asha K" and u["prefs"]["answers"]["done"] is True
    assert client.post("/api/auth/password", json={"old": "wrong-old-pw", "new": "another-pass-2"}, headers=_auth(j["token"])).status_code == 401
    new_tok = client.post("/api/auth/password", json={"old": "secret-pass-1", "new": "another-pass-2"}, headers=_auth(j["token"])).get_json()["token"]
    assert client.get("/api/auth/me", headers=_auth(j["token"])).status_code == 401  # old sessions are signed out
    assert client.get("/api/auth/me", headers=_auth(new_tok)).status_code == 200


def test_projects_are_private_and_round_trip(client):
    a = _signup(client)["token"]
    b = _signup(client, "ben@example.com")["token"]
    r = client.put("/api/projects/p_abc123", json={"project": _project(), "summary": {"rooms": 0, "cost": 1, "theme": "Japandi", "evil": "x"}}, headers=_auth(a))
    assert r.status_code == 200
    lst = client.get("/api/projects", headers=_auth(a)).get_json()["projects"]
    assert len(lst) == 1 and lst[0]["name"] == "My Villa" and "evil" not in lst[0]
    assert client.get("/api/projects/p_abc123", headers=_auth(a)).get_json()["project"]["floors"][0]["name"] == "Ground Floor"
    # another user can't see or delete it
    assert client.get("/api/projects", headers=_auth(b)).get_json()["projects"] == []
    assert client.get("/api/projects/p_abc123", headers=_auth(b)).status_code == 400
    client.delete("/api/projects/p_abc123", headers=_auth(b))
    assert len(client.get("/api/projects", headers=_auth(a)).get_json()["projects"]) == 1
    # update, then delete
    client.put("/api/projects/p_abc123", json={"project": _project(name="Villa v2")}, headers=_auth(a))
    assert client.get("/api/projects", headers=_auth(a)).get_json()["projects"][0]["name"] == "Villa v2"
    assert client.put("/api/projects/bad id!", json={"project": _project()}, headers=_auth(a)).status_code in (400, 404)
    assert client.put("/api/projects/p_x", json={"project": {"no": "floors"}}, headers=_auth(a)).status_code == 400
    client.delete("/api/projects/p_abc123", headers=_auth(a))
    assert client.get("/api/projects", headers=_auth(a)).get_json()["projects"] == []


def test_delete_account_needs_password(client):
    t = _signup(client)["token"]
    client.put("/api/projects/p_1", json={"project": _project("p_1")}, headers=_auth(t))
    assert client.delete("/api/auth/me", json={"password": "wrong-password"}, headers=_auth(t)).status_code == 401
    assert client.delete("/api/auth/me", json={"password": "secret-pass-1"}, headers=_auth(t)).status_code == 200
    assert client.post("/api/auth/login", json={"email": "asha@example.com", "password": "secret-pass-1"}).status_code == 401


def test_passwords_are_hashed(client, tmp_path):
    _signup(client)
    import sqlite3
    rows = sqlite3.connect(str(tmp_path / "db.sqlite")).execute("SELECT pw_hash FROM users").fetchall()
    assert rows and "secret-pass-1" not in rows[0][0] and rows[0][0].startswith(("scrypt", "pbkdf2"))
