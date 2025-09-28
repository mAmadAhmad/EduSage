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

    ai_response_dict = grading_chain.invoke({
        "grading_criteria": request.grading_criteria,
        "submission_context": submission_context
    })

    # Convert the dictionary back into a Pydantic model for validation and use
    ai_response = schemas.AIGradingResponse(**ai_response_dict)

    # Save the report to the database
    quiz_crud.create_grade_report(db=db, submission_id=submission_id, report_data=ai_response)

    # Return the AI response to the frontend for immediate display
    return ai_response

@router.get("/{submission_id}/report", response_model=schemas.GradeReportResponse, summary="Get the grade report for a submission")
def read_grade_report(submission_id: int, db: Session = Depends(get_db)):
    db_submission = quiz_crud.get_submission(db, submission_id=submission_id)
    if not db_submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    # For now, we fetch the first AI-generated report.
    # In the future, we could handle multiple reports (e.g., teacher-edited).
    db_report = quiz_crud.get_grade_report(db, submission_id=submission_id)
    if not db_report:
        raise HTTPException(status_code=404, detail="Grade report not yet abailable for this submission.")

    # Combine all the data into the response schema
    graded_answers_data = []
    for graded_answer in db_report.graded_answers:
        graded_answers_data.append({
            "question_text": graded_answer.answer.question.question_text,
            "student_answer": graded_answer.answer.answer_text,
            "correct_answer": graded_answer.answer.question.correct_answer,
            "score": graded_answer.score,
            "feedback": graded_answer.feedback,
        })

    return {
        "student_name": db_submission.student_name,
        "quiz_title": db_submission.quiz_session.quiz.title,
        "overall_score": db_report.overall_score,
        "overall_feedback": db_report.overall_feedback,
        "graded_answers": graded_answers_data
    }