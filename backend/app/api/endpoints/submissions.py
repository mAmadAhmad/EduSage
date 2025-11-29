# app/api/endpoints/submissions.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import schemas
from app.crud import quiz_crud
from app.db.dependencies import get_db
from app.services import vector_service
# Import the security dependency
from app.services.auth_service import get_current_user

router = APIRouter()


@router.get("/{submission_id}", response_model=schemas.SubmissionDetail,
            summary="Get details for a single submission for grading")
def read_submission_details(submission_id: int, db: Session = Depends(get_db),
                            current_user: schemas.User = Depends(get_current_user)):
    # Fetch details ensuring the user owns the quiz
    db_submission_details = quiz_crud.get_submission_details(db, submission_id=submission_id, user_id=current_user.id)
    if db_submission_details is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return db_submission_details


@router.post("/{submission_id}/grade", response_model=schemas.AIGradingResponse, summary="Grade a submission with AI")
def grade_submission_with_ai(submission_id: int, request: schemas.AIGradingRequest, db: Session = Depends(get_db),
                             current_user: schemas.User = Depends(get_current_user)):
    # 1. Fetch the submission data
    details = quiz_crud.get_submission_details(db, submission_id=submission_id, user_id=current_user.id)
    if not details:
        raise HTTPException(status_code=404, detail="Submission not found")

    # 2. Format the submission into a text string for the LLM
    # --- THIS WAS THE MISSING LOGIC ---
    submission_context = ""
    for q in details["questions"]:
        submission_context += f"Question ID: {q['question_id']}\n"
        submission_context += f"Question: {q['question_text']}\n"
        submission_context += f"Correct Answer: {q['correct_answer']}\n"
        submission_context += f"Student's Answer: {q['student_answer']}\n---\n"
    # ----------------------------------

    # 3. Send to LLM
    grading_chain = vector_service.get_grading_chain()

    ai_response_dict = grading_chain.invoke({
        "grading_criteria": request.grading_criteria,
        "submission_context": submission_context,
        "reference_context": "No specific document context provided. Grade based on the Correct Answer given."
    })

    ai_response = schemas.AIGradingResponse(**ai_response_dict)

    # 4. Save the report
    quiz_crud.create_grade_report(db=db, submission_id=submission_id, report_data=ai_response)

    return ai_response


@router.get("/{submission_id}/report", response_model=schemas.GradeReportResponse,
            summary="Get the grade report for a submission")
def read_grade_report(submission_id: int, db: Session = Depends(get_db)):
    # Note: This endpoint is currently open (no user_id check) so students can view their reports.
    # In a production app, you might validate the student's session here.

    # 1. Get the basic submission info
    # We use a simpler query here that doesn't enforce teacher ownership,
    # so the student can see it (assuming they have the link).
    db_submission = db.query(quiz_crud.quiz_models.Submission).filter(
        quiz_crud.quiz_models.Submission.id == submission_id).first()

    if not db_submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # 2. Check if report exists
    db_report = quiz_crud.get_grade_report(db, submission_id=submission_id)

    if db_report is None:
        raise HTTPException(status_code=404, detail="Grade report not yet available for this submission.")

    # 3. Format data
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