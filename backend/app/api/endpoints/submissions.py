# app/api/endpoints/submissions.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import schemas
from app.crud import quiz_crud
from app.api.endpoints.quizzes import get_db
from app.services import vector_service

router = APIRouter()

@router.get("/{submission_id}", response_model=schemas.SubmissionDetail, summary="Get details for a single submission for grading")
def read_submission_details(submission_id: int, db: Session = Depends(get_db)):
    db_submission_details = quiz_crud.get_submission_details(db, submission_id=submission_id)
    if db_submission_details is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return db_submission_details

@router.post("/{submission_id}/grade", response_model=schemas.AIGradingResponse, summary="Grade a submission with AI")
def grade_submission_with_ai(submission_id: int, request: schemas.AIGradingRequest, db: Session = Depends(get_db)):
    details = quiz_crud.get_submission_details(db, submission_id=submission_id)
    if not details:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Format the submission into a simple string for the LLM context
    submission_context = ""
    for q in details["questions"]:
        submission_context += f"Question ID: {q['question_id']}\n"
        submission_context += f"Question: {q['question_text']}\n"
        submission_context += f"Correct Answer: {q['correct_answer']}\n"
        submission_context += f"Student's Answer: {q['student_answer']}\n---\n"

    grading_chain = vector_service.get_grading_chain()

    ai_response = grading_chain.invoke({
        "grading_criteria": request.grading_criteria,
        "submission_context": submission_context
    })

    # In the final version, we would save this ai_response to our GradeReport table.
    # For now, we return it directly.
    return ai_response