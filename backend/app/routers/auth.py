from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from .. import user_store
from ..core.jwt_utils import create_token, get_current_username

router = APIRouter(prefix="/api/auth", tags=["auth"])


class AuthRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    username: str


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(body: AuthRequest):
    ok, message = user_store.create_user(body.username, body.password)
    if not ok:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, message)
    return AuthResponse(token=create_token(body.username), username=body.username)


@router.post("/login", response_model=AuthResponse)
def login(body: AuthRequest):
    ok, message = user_store.verify_user(body.username, body.password)
    if not ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, message)
    return AuthResponse(token=create_token(body.username), username=body.username)


@router.get("/me")
def me(username: str = Depends(get_current_username)):
    return {"username": username}
