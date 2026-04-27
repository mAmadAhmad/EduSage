import asyncio
import csv
from io import StringIO
from fastapi.responses import StreamingResponse
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import weaviate.classes as wvc
from app.api import schemas
from app.crud import quiz_crud
from app.db.dependencies import get_db
from app.services import vector_service, grading_service
from app.services.auth_service import get_current_user
from app.models import quiz_models
from app.core.config import settings
from app.services.rag import retrieval
from app.services.vector_service import perform_hybrid_search

router = APIRouter()


@router.get("/{submission_id}", response_model=schemas.SubmissionDetail,
            summary="Get details for a single submission for grading")
def read_submission_details(submission_id: int, db: Session = Depends(get_db),
                            current_user: schemas.User = Depends(get_current_user)):
    db_submission_details = quiz_crud.get_submission_details(db, submission_id=submission_id, user_id=current_user.id)
    if db_submission_details is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return db_submission_details


@router.post("/{submission_id}/grade", summary="Draft AI Grades Does NOT save to DB")
async def grade_submission_with_ai(
        submission_id: int,
        request: schemas.AIGradingRequest,
        db: Session = Depends(get_db),
        current_user: schemas.User = Depends(get_current_user)
):
    submission = db.query(quiz_models.Submission).filter(quiz_models.Submission.id == submission_id).first()
    if not submission or submission.quiz_session.quiz.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    tenant_id = f"user_{current_user.id}"

    # Drafting Loop
    draft_answers = []
    subjective_tasks = []
    subjective_map = []
    question_context = {}

    for answer in submission.answers:
        question = answer.question
        user_ans = answer.answer_text or "No Answer"

        if question.question_type == "MCQ":
            is_correct = user_ans.strip().lower() == question.correct_answer.strip().lower()
            draft_answers.append({
                "id": answer.id,
                "question_id": question.id,
                "question_text": question.question_text,
                "student_answer": user_ans,
                "correct_answer": question.correct_answer,
                "score": 10.0 if is_correct else 0.0,
                "feedback": "Correct!" if is_correct else f"Incorrect. Correct answer: {question.correct_answer}",
                "breakdown": None,
                "keywords": None,
                "reference_evidence": None
            })
        else:
            reference_context = ''
            source_doc = question.source_citation.get('source_file') if question.source_citation else None
            if source_doc:
                filters = wvc.query.Filter.by_property('source').equal(source_doc)
                search_query = f'{question.question_text} {question.correct_answer}'

                retrieved_chunks = await retrieval.perform_hybrid_search(
                    query=search_query,
                    tenant_id=tenant_id,
                    top_k=3,
                    filters=filters,
                )
                reference_context = "\n\n".join(retrieved_chunks)

            question_context[answer.id] = reference_context

            task = grading_service.calculate_hybrid_grade(
                question_text=question.question_text, correct_answer=question.correct_answer,
                student_answer=user_ans, reference_context=reference_context
            )
            subjective_tasks.append(task)
            subjective_map.append((answer, question))

    if subjective_tasks:
        ai_results = await asyncio.gather(*subjective_tasks)
        for (answer, question), result in zip(subjective_map, ai_results):
            draft_answers.append({
                "id": answer.id,
                "question_id": question.id,
                "question_text": question.question_text,
                "student_answer": answer.answer_text or "No Answer",
                "correct_answer": question.correct_answer,
                "score": result['final_score'],
                "feedback": result['feedback'],
                "breakdown": result['breakdown'],
                "keywords": result['keywords'],
                "reference_evidence": question_context.get(answer.id, "No reference found.")
            })

    # Return DRAFT data
    return {
        "student_name": submission.student_name,
        "quiz_title": submission.quiz_session.quiz.title,
        "overall_score": sum([a['score'] for a in draft_answers]),
        "overall_feedback": "AI Draft generated. Please review and save.",
        "graded_answers": draft_answers
    }

@router.get("/{submission_id}/report", response_model=schemas.GradeReportResponse, summary="Get the grade report")
def read_grade_report(submission_id: int, db: Session = Depends(get_db)):
    db_submission = db.query(quiz_models.Submission).filter(quiz_models.Submission.id == submission_id).first()
    if not db_submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    db_report = db.query(quiz_models.GradeReport).filter(quiz_models.GradeReport.submission_id == submission_id).first()
    if not db_report:
        raise HTTPException(status_code=404, detail="Grade report not found.")

    graded_answers_data = []
    for ga in db_report.graded_answers:
        graded_answers_data.append({
            "id": ga.id,
            "question_id": ga.answer.question_id,
            "question_text": ga.answer.question.question_text,
            "student_answer": ga.answer.answer_text,
            "correct_answer": ga.answer.question.correct_answer,
            "score": ga.score,
            "feedback": ga.feedback,
            "breakdown": ga.breakdown,
            "keywords": ga.keywords
        })

    return {
        "student_name": db_submission.student_name,
        "quiz_title": db_submission.quiz_session.quiz.title,
        "overall_score": db_report.overall_score,
        "overall_feedback": db_report.overall_feedback,
        "graded_answers": graded_answers_data
    }


#  endpoint to save manual edits
@router.put("/{submission_id}/grades", summary="Save or Update Final Grades")
def update_submission_grades(
        submission_id: int,
        updates: schemas.BatchGradeUpdate,
        db: Session = Depends(get_db),
        current_user: schemas.User = Depends(get_current_user)
):
    submission = db.query(quiz_models.Submission).filter(quiz_models.Submission.id == submission_id).first()
    if not submission or submission.quiz_session.quiz.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Look for existing report
    report = db.query(quiz_models.GradeReport).filter(quiz_models.GradeReport.submission_id == submission_id).first()

    # IF NOT EXISTS: Create a brand new report (First time saving)
    if not report:
        report = quiz_models.GradeReport(
            submission_id=submission_id, grader="Teacher (AI Assisted)",
            overall_score=0, overall_feedback="Graded successfully."
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        # Create all GradedAnswer rows
        for update in updates.updates:
            new_ga = quiz_models.GradedAnswer(
                report_id=report.id,
                answer_id=update.graded_answer_id,
                # Here, graded_answer_id from frontend actually maps to answer.id initially
                score=update.score,
                feedback=update.feedback
            )
            db.add(new_ga)
    else:
        # IF EXISTS: Update existing rows
        for update in updates.updates:
            # We map based on answer_id to be safe
            ga = db.query(quiz_models.GradedAnswer).filter(
                quiz_models.GradedAnswer.report_id == report.id,
                quiz_models.GradedAnswer.answer_id == update.graded_answer_id
            ).first()

            if ga:
                ga.score = update.score
                if update.feedback: ga.feedback = update.feedback
            else:
                # Fallback if somehow missing
                new_ga = quiz_models.GradedAnswer(report_id=report.id, answer_id=update.graded_answer_id,
                                                  score=update.score, feedback=update.feedback)
                db.add(new_ga)

    db.commit()

    # Recalculate Overall Score
    total = sum([ga.score for ga in report.graded_answers])
    report.overall_score = total
    db.commit()

    return {"status": "success", "new_total": total}


# --- NEW: CSV Export for Teachers ---
@router.get("/quiz/{quiz_id}/export", summary="Export quiz results as CSV")
def export_quiz_results(quiz_id: int, db: Session = Depends(get_db),
                        current_user: schemas.User = Depends(get_current_user)):
    # 1. Verify Ownership
    quiz = quiz_crud.get_quiz(db, quiz_id, current_user.id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # 2. Fetch all Submissions for this quiz
    submissions = quiz_crud.get_submissions_for_quiz(db, quiz_id, current_user.id)

    # 3. Create CSV in memory
    output = StringIO()
    writer = csv.writer(output)

    # Write Header Row
    writer.writerow(["Student Name", "Roll No", "Submission ID", "Overall Score", "Feedback", "Status"])

    # Write Data Rows
    for sub in submissions:
        report = db.query(quiz_models.GradeReport).filter(quiz_models.GradeReport.submission_id == sub.id).first()

        score = report.overall_score if report else "N/A"
        feedback = report.overall_feedback if report else "Pending Grading"
        status = "Graded" if report else "Submitted"

        writer.writerow([
            sub.student_name,
            sub.student_roll_no,
            sub.id,
            score,
            feedback,
            status
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=quiz_{quiz_id}_results.csv"}
    )