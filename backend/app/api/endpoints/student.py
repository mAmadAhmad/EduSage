from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.limiter import limiter
from sqlalchemy.orm import Session

from app.api import schemas
from app.crud import quiz_crud
from app.db.dependencies import get_db
from app.models import quiz_models
from app.services.auth_service import get_current_user, get_current_user_optional

router = APIRouter()


@router.get("/my-submissions", response_model=List[schemas.MySubmissionSummary],
            summary="Get history of quizzes taken by logged-in user")
def get_my_submissions(db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    submissions = db.query(quiz_models.Submission).filter(
        quiz_models.Submission.user_id == current_user.id
    ).order_by(quiz_models.Submission.id.desc()).all()

    results = []
    for sub in submissions:
        report = db.query(quiz_models.GradeReport).filter(
            quiz_models.GradeReport.submission_id == sub.id
        ).first()

        quiz_title = "Deleted Quiz"
        quiz_id = 0

        if sub.quiz_session and sub.quiz_session.quiz:
            quiz_title = sub.quiz_session.quiz.title
            quiz_id = sub.quiz_session.quiz_id

        results.append({
            "submission_id": sub.id,
            "student_name": sub.student_name,
            "quiz_id": quiz_id,
            "quiz_title": quiz_title,
            "score": report.overall_score if report else None,
            "status": "Graded" if report else "Pending"
        })

    return results


@router.get("/{share_code}", response_model=schemas.PublicQuiz, summary="Fetch a quiz for a student to take")
def get_quiz_for_student(share_code: str, db: Session = Depends(get_db)):
    db_quiz = quiz_crud.get_quiz_by_share_code(db, share_code=share_code.upper())
    if db_quiz is None:
        raise HTTPException(status_code=404, detail="Quiz with this code not found or is no longer accepting submissions.")
    return db_quiz


@router.post("/{share_code}/submit", response_model=schemas.Submission, summary="Submit a student's answers for a quiz")
@limiter.limit("5/minute")
def submit_quiz(request: Request, share_code: str, submission: schemas.SubmissionCreate, db: Session = Depends(get_db),
                current_user: Optional[schemas.User] = Depends(get_current_user_optional)):
    session_obj = db.query(quiz_models.QuizSession).filter(
        quiz_models.QuizSession.share_code == share_code.upper()
    ).first()

    if not session_obj:
        raise HTTPException(status_code=404, detail="Quiz session not found.")

    user_id = current_user.id if current_user else None

    try:
        return quiz_crud.create_submission(
            db=db,
            session_id=session_obj.id,
            submission=submission,
            user_id=user_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))