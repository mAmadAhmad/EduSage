from sqlalchemy.orm import Session
from app.models import user_models
from app.api import schemas

def get_user_by_username(db: Session, username: str):
    return db.query(user_models.User).filter(user_models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    from app.services.auth_service import get_password_hash
    hashed_password = get_password_hash(user.password)
    db_user = user_models.User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user