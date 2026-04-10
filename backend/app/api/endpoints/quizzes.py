from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import schemas
from app.crud import quiz_crud
from app.db.dependencies import get_db
from app.models import quiz_models
from app.services.auth_service import get_current_user

router = APIRouter()


@router.post("/", response_model=schemas.Quiz, summary="Create a new Quiz for the current user")
def create_quiz(quiz: schemas.QuizCreate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    # Pass the user's ID to the creation function
    return quiz_crud.create_quiz(db=db, quiz=quiz, user_id=current_user.id)

@router.get("/", response_model=List[schemas.Quiz], summary="List all Quizzes for the current user")
def read_quizzes(db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    # Fetch quizzes scoped to the current user
    return quiz_crud.get_quizzes(db=db, user_id=current_user.id)

@router.get("/{quiz_id}", response_model=schemas.Quiz, summary="Get a single quiz by ID")
def read_quiz(quiz_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    # Fetch a single quiz, ensuring it belongs to the current user
    db_quiz = quiz_crud.get_quiz(db, quiz_id=quiz_id, user_id=current_user.id)
    if db_quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return db_quiz

@router.put("/{quiz_id}", response_model=schemas.Quiz, summary="Update a Quiz")
def update_quiz(quiz_id: int, quiz: schemas.QuizUpdate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    # Update a quiz, ensuring it belongs to the current user
    db_quiz = quiz_crud.update_quiz(db=db, quiz_id=quiz_id, quiz=quiz, user_id=current_user.id)
    if db_quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return db_quiz

@router.delete("/{quiz_id}", summary="Delete a Quiz")
def delete_quiz(quiz_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    # Delete a quiz, ensuring it belongs to the current user
    db_quiz = quiz_crud.delete_quiz(db=db, quiz_id=quiz_id, user_id=current_user.id)
    if db_quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return {"detail": f"Successfully deleted quiz with id {quiz_id}"}

@router.post("/{quiz_id}/share", summary="Create a shareable session for a Quiz")
def share_quiz(quiz_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    # Ensure the user owns the quiz they are trying to share
    db_quiz = quiz_crud.get_quiz(db, quiz_id=quiz_id, user_id=current_user.id)
    if db_quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    session = quiz_crud.create_quiz_session(db=db, quiz_id=quiz_id)
    return {"share_code": session.share_code}


@router.get("/{quiz_id}/submissions", response_model=List[schemas.SubmissionListResponse],
            summary="Get all submissions")
def read_submissions_for_quiz(quiz_id: int, db: Session = Depends(get_db),
                              current_user: schemas.User = Depends(get_current_user)):
    submissions = quiz_crud.get_submissions_for_quiz(db, quiz_id=quiz_id, user_id=current_user.id)

    result = []
    for sub in submissions:
        # Check if a grade report exists for this submission
        is_graded = db.query(quiz_models.GradeReport).filter(
            quiz_models.GradeReport.submission_id == sub.id).first() is not None

        result.append({
            "id": sub.id,
            "student_name": sub.student_name,
            "student_roll_no": sub.student_roll_no,
            "answer_count": len(sub.answers),
            "is_graded": is_graded
        })
    return result