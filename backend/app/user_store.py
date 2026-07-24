"""Thin re-export of src/auth.py — it has zero Streamlit dependency (only
hashlib/json/os/re/secrets/sqlite3), so the backend reuses it directly as the
single source of truth for user accounts and portfolio persistence, instead
of duplicating the password-hashing and SQLite logic.

Named `user_store` (not `auth`) purely to avoid this file shadowing the
`src/auth` module it imports.

In production, set USERS_DB_PATH to a Render persistent-disk path so the
user database survives redeploys (see render.yaml) — the bundled `data/`
folder in the repo holds read-only historical CSVs and must not double as
the mount point for writable user data. Locally, with USERS_DB_PATH unset,
this intentionally falls back to the same data/users.db the Streamlit app
uses, so an account created in one works in the other during local dev.
"""
import os
import sys

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_SRC_PATH = os.path.join(_REPO_ROOT, "src")
if _SRC_PATH not in sys.path:
    sys.path.insert(0, _SRC_PATH)

import auth as _auth_module  # noqa: E402

_custom_db_path = os.environ.get("USERS_DB_PATH")
if _custom_db_path:
    _auth_module.DB_PATH = _custom_db_path

DB_PATH = _auth_module.DB_PATH
create_user = _auth_module.create_user
verify_user = _auth_module.verify_user
save_portfolio = _auth_module.save_portfolio
load_portfolio = _auth_module.load_portfolio
validate_username = _auth_module.validate_username
validate_password = _auth_module.validate_password

__all__ = [
    "DB_PATH",
    "create_user",
    "load_portfolio",
    "save_portfolio",
    "validate_password",
    "validate_username",
    "verify_user",
]
