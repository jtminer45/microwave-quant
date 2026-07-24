import hashlib
import json
import os
import re
import secrets
import sqlite3

DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "users.db"
)

PBKDF2_ITERATIONS = 600_000
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,20}$")


def _get_conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            username_lower TEXT UNIQUE NOT NULL,
            salt TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            portfolio TEXT
        )
    """)
    return conn


def _hash_password(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS).hex()


def validate_username(username: str) -> str | None:
    """Returns an error message, or None if the username is valid."""
    if not username:
        return "Please enter a username."
    if not USERNAME_RE.match(username):
        return "Username must be 3-20 characters — letters, numbers, and underscores only."
    return None


def validate_password(password: str) -> str | None:
    """Returns an error message, or None if the password is valid."""
    if not password or len(password) < 6:
        return "Password must be at least 6 characters."
    return None


def create_user(username: str, password: str) -> tuple[bool, str]:
    """Creates a new account. Returns (success, message)."""
    error = validate_username(username) or validate_password(password)
    if error:
        return False, error

    conn = _get_conn()
    try:
        salt = secrets.token_bytes(16)
        password_hash = _hash_password(password, salt)
        conn.execute(
            "INSERT INTO users (username, username_lower, salt, password_hash, portfolio) "
            "VALUES (?, ?, ?, ?, NULL)",
            (username, username.lower(), salt.hex(), password_hash),
        )
        conn.commit()
        return True, "Account created! You're logged in."
    except sqlite3.IntegrityError:
        return False, "That username is already taken — please choose another."
    finally:
        conn.close()


def verify_user(username: str, password: str) -> tuple[bool, str]:
    """Checks login credentials. Returns (success, message)."""
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT salt, password_hash FROM users WHERE username_lower = ?",
            (username.lower(),),
        ).fetchone()
        if row is None:
            return False, "No account found with that username."
        salt_hex, stored_hash = row
        candidate_hash = _hash_password(password, bytes.fromhex(salt_hex))
        if secrets.compare_digest(candidate_hash, stored_hash):
            return True, "Logged in."
        return False, "Incorrect password."
    finally:
        conn.close()


def save_portfolio(username: str, portfolio_stocks: list) -> None:
    conn = _get_conn()
    try:
        conn.execute(
            "UPDATE users SET portfolio = ? WHERE username_lower = ?",
            (json.dumps(portfolio_stocks), username.lower()),
        )
        conn.commit()
    finally:
        conn.close()


def load_portfolio(username: str) -> list | None:
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT portfolio FROM users WHERE username_lower = ?",
            (username.lower(),),
        ).fetchone()
        if row is None or row[0] is None:
            return None
        return json.loads(row[0])
    finally:
        conn.close()
