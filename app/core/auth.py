"""
NeoBerry v2 — core/auth.py
PAM-based authentication with simulation fallback for dev mode.
"""

import os
import logging
from flask_login import UserMixin

log = logging.getLogger("neoberry.auth")

# ── PAM import (optional) ────────────────────────────────────────────────────

try:
    import pam as _pam
    _PAM = _pam.pam()
    _HAS_PAM = True
    log.info("PAM available — real authentication mode")
except Exception:
    _HAS_PAM = False
    log.warning("PAM not available — using dev auth (user: admin / pass: neoberry)")

# In dev mode, accepted credentials (change via env vars)
_DEV_USER = os.environ.get("NEOBERRY_DEV_USER", "admin")
_DEV_PASS = os.environ.get("NEOBERRY_DEV_PASS", "neoberry")


class User(UserMixin):
    def __init__(self, username: str):
        self.id = username


def pam_authenticate(username: str, password: str) -> tuple["User | None", "str | None"]:
    """
    Authenticate a user.
    Returns (User, None) on success, or (None, error_message) on failure.
    """
    if not username:
        return None, "Nom d'utilisateur requis"
    if not password:
        return None, "Mot de passe requis"

    if _HAS_PAM:
        if _PAM.authenticate(username, password, service="login"):
            log.info("PAM auth success: %s", username)
            return User(username), None
        log.warning("PAM auth failed: %s", username)
        return None, "Identifiants invalides"

    # Dev mode fallback
    if username == _DEV_USER and password == _DEV_PASS:
        log.info("[DEV] Auth success: %s", username)
        return User(username), None
    return None, "Identifiants invalides (mode dev : admin / neoberry)"
