# app/api/endpoints/quizzes.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import schemas
from app.crud import quiz_crud
from app.db.session import SessionLocal

router = APIRouter()

# Dependency to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.Quiz, summary="Create a new Quiz")
def create_quiz(quiz: schemas.QuizCreate, db: Session = Depends(get_db)):
    """
    Create a new quiz with its questions.
    This can be used to save a manually created quiz or a teacher-validated,
    AI-generated quiz.
    """
    return quiz_crud.create_quiz(db=db, quiz=quiz)

@router.get("/", response_model=List[schemas.Quiz], summary="List all Quizzes")
def read_quizzes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Retrieve a list of all quizzes.
    """
    quizzes = quiz_crud.get_quizzes(db, skip=skip, limit=limit)
    return quizzes

@router.get("/{quiz_id}", response_model=schemas.Quiz, summary="Get a single quiz by ID")
def read_quiz(quiz_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a specific quiz by its unique ID, including all its questions.
    """
    db_quiz = quiz_crud.get_quiz(db, quiz_id=quiz_id)
    if db_quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return db_quiz

@router.put("/{quiz_id}", response_model=schemas.Quiz, summary="Update a Quiz")
def update_quiz(quiz_id: int, quiz: schemas.QuizUpdate, db: Session = Depends(get_db)):
    """
    Update a quiz's title, instructions, and its entire set of questions.
    """
    db_quiz = quiz_crud.update_quiz(db=db, quiz_id=quiz_id, quiz=quiz)
    if db_quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return db_quiz

@router.delete("/{quiz_id}", summary="Delete a Quiz")
def delete_quiz(quiz_id: int, db: Session = Depends(get_db)):
    """
    Delete a quiz and all of its associated questions.
    """
    db_quiz = quiz_crud.delete_quiz(db=db, quiz_id=quiz_id)
    if db_quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return {"detail": f"Successfully deleted quiz with id {quiz_id}"}


@router.post("/{quiz_id}/share", summary="Create a shareable session for a Quiz")
def share_quiz(quiz_id: int, db: Session = Depends(get_db)):
    db_quiz = quiz_crud.get_quiz(db, quiz_id=quiz_id)
    if db_quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")

    session = quiz_crud.create_quiz_session(db=db, quiz_id=quiz_id)
    return {"share_code": session.share_code}