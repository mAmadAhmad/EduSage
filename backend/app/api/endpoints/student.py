from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import schemas
from app.crud import quiz_crud
from app.db.dependencies import get_db
from app.models import quiz_models
from typing import List
# Import the security dependency
from app.services.auth_service import get_current_user

router = APIRouter()

# --- NEW: Fetch history for logged-in user ---
@router.get("/my-submissions", response_model=List[schemas.MySubmissionSummary],
            summary="Get history of quizzes taken by logged-in user")
def get_my_submissions(db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    # 1. Fetch all submissions for this user
    submissions = db.query(quiz_models.Submission).filter(
        quiz_models.Submission.student_id == current_user.id
    ).order_by(quiz_models.Submission.id.desc()).all()

    results = []
    for sub in submissions:
        # 2. Check if a report exists for each
        report = db.query(quiz_models.GradeReport).filter(
            quiz_models.GradeReport.submission_id == sub.id
        ).first()

        results.append({
            "submission_id": sub.id,
            "student_name": sub.student_name,
            "quiz_id": sub.quiz_session.quiz_id,
            "quiz_title": sub.quiz_session.quiz.title,
            "score": report.overall_score if report else None,
            "status": "Graded" if report else "Pending"
        })

    return results


# This endpoint remains public - anyone with a code can view the quiz questions
@router.get("/{share_code}", response_model=schemas.PublicQuiz, summary="Fetch a quiz for a student to take")
def get_quiz_for_student(share_code: str, db: Session = Depends(get_db)):
    # ... (function is the same)
    db_quiz = quiz_crud.get_quiz_by_share_code(db, share_code=share_code.upper())
    if db_quiz is None:
        raise HTTPException(status_code=404, detail="Quiz with this code not found.")
    return db_quiz

# This endpoint is now protected and links the submission to the student's user ID
@router.post("/{share_code}/submit", response_model=schemas.Submission, summary="Submit a student's answers for a quiz")
def submit_quiz(share_code: str, submission: schemas.SubmissionCreate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    session_obj = db.query(quiz_models.QuizSession).filter(quiz_models.QuizSession.share_code == share_code.upper()).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Quiz session not found.")
    # Pass the student's user ID to the creation function
    return quiz_crud.create_submission(db=db, session_id=session_obj.id, submission=submission, student_id=current_user.id)
