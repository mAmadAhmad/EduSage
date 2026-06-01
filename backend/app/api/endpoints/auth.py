from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.api import schemas
from app.crud import user_crud
from app.services import auth_service
from app.db.dependencies import get_db
from app.core.config import settings
from app.core.limiter import limiter

router = APIRouter()

@router.post("/signup", response_model=schemas.User)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = user_crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return user_crud.create_user(db=db, user=user)

@router.post("/login")
@limiter.limit("5/minute")
def login(response: Response, request: Request, db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = user_crud.get_user_by_username(db, username=form_data.username)
    if not user or not auth_service.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    response.set_cookie(
        key=auth_service.COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=False,  # Note: Set to True in Production with HTTPS
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    return {"message": "Login successful"}

@router.post("/logout", summary="Invalidate user session")
def logout(response: Response):
    response.set_cookie(
        key="edusage_auth_token",
        value="",
        expires="Thu, 01 Jan 1970 00:00:00 GMT",
        max_age=0,
        path="/",
        httponly=True,
        samesite="lax"
    )
    return {"message": "Successfully logged out."}