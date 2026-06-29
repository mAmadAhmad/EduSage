from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.services.email_service import send_verification_email
from datetime import datetime, timezone

from app.api import schemas
from app.crud import user_crud
from app.services import auth_service
from app.db.dependencies import get_db
from app.core.config import settings
from app.core.limiter import limiter

router = APIRouter()

@router.post("/signup", response_model=schemas.User, status_code=201)
def signup(user: schemas.UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_user = user_crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = user_crud.create_user(db=db, user=user)

    # Send email in the background so the API responds instantly
    background_tasks.add_task(
        send_verification_email,
        to_email=new_user.email,
        code=new_user.verification_code,
        user_name=new_user.full_name
    )

    return new_user

@router.post("/login")
@limiter.limit("5/minute")
def login(response: Response, request: Request, db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = user_crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth_service.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in."
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    response.set_cookie(
        key=auth_service.COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=False,  # Set to True in Production with HTTPS
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    return {"message": "Login successful"}


@router.post("/verify-otp")
def verify_otp(payload: schemas.OTPVerify, db: Session = Depends(get_db)):
    user = user_crud.get_user_by_email(db, email=payload.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        return {"message": "User is already verified"}

    if user.verification_code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    now = datetime.now(timezone.utc)

    if user.verification_code_expires.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(status_code=400, detail="Verification code has expired")

    user.is_verified = True
    user.verification_code = None
    user.verification_code_expires = None
    db.commit()

    return {"message": "Email verified successfully. You can now log in."}

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

