from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.api import schemas
from app.crud import user_crud
from app.db.dependencies import get_db
from .security import verify_password

# Define the standard cookie name
COOKIE_NAME = "edusage_auth_token"

# OAuth2PasswordBearer is needed for Swagger UI to work, but we primarily rely on cookies
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


# --- THE CORE SECURITY DEPENDENCY ---
def get_current_user(request: Request, db: Session = Depends(get_db)) -> schemas.User:
    """
    Retrieves the JWT from the HTTP-only cookie and validates the user.
    This is the single source of truth for authentication.
    """
    token = request.cookies.get(COOKIE_NAME)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = user_crud.get_user_by_username(db, username=token_data.username)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user