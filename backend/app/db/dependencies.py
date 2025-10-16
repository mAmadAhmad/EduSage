# app/db/dependencies.py
from app.db.session import SessionLocal

# This is the new, central home for our get_db function.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()