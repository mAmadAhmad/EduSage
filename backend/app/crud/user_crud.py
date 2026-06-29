from pip._internal.utils import datetime
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models import user_models
from app.api import schemas
import string
import random

def get_user_by_email(db: Session, email: str):
    return db.query(user_models.User).filter(user_models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    from app.services.auth_service import get_password_hash
    hashed_password = get_password_hash(user.password)

    otp_code = ''.join(random.choices(string.digits, k=6))
    expire_time = datetime.now(timezone.utc) + timedelta(minutes=15)

    db_user = user_models.User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        is_verified=False,
        verification_code=otp_code,
        verification_code_expires=expire_time
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user