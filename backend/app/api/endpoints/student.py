# app/api/endpoints/student.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import schemas
from app.crud import quiz_crud
from app.api.endpoints.quizzes import get_db
from app.models import quiz_models

router = APIRouter()

@router.get("/{share_code}", response_model=schemas.PublicQuiz, summary="Fetch a quiz for a student to take")
def get_quiz_for_student(share_code: str, db: Session = Depends(get_db)):
    db_quiz = quiz_crud.get_quiz_by_share_code(db, share_code=share_code.upper())
    if db_quiz is None:
        raise HTTPException(status_code=404, detail="Quiz with this code not found.")
    return db_quiz


@router.post("/{share_code}/submit", response_model=schemas.Submission, summary="Submit a student's answers for a quiz")
def submit_quiz(share_code: str, submission: schemas.SubmissionCreate, db: Session = Depends(get_db)):
    # First, find the quiz session associated with the share code
    session_obj = db.query(quiz_models.QuizSession).filter(
        quiz_models.QuizSession.share_code == share_code.upper()).first()

    if not session_obj:
        raise HTTPException(status_code=404, detail="Quiz session not found.")

    # Here, in the future, we could add logic to check if the student has already submitted

    return quiz_crud.create_submission(db=db, session_id=session_obj.id, submission=submission)