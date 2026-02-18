import asyncio
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

router = APIRouter()


@router.get("/{submission_id}", response_model=schemas.SubmissionDetail,
            summary="Get details for a single submission for grading")
def read_submission_details(submission_id: int, db: Session = Depends(get_db),
                            current_user: schemas.User = Depends(get_current_user)):
    db_submission_details = quiz_crud.get_submission_details(db, submission_id=submission_id, user_id=current_user.id)
    if db_submission_details is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return db_submission_details


@router.post("/{submission_id}/grade", summary="Grade a submission with Hybrid AI")
async def grade_submission_with_ai(
        submission_id: int,
        request: schemas.AIGradingRequest,
        # We keep this for compatibility, though we rely less on the custom criteria string now
        db: Session = Depends(get_db),
        current_user: schemas.User = Depends(get_current_user)
):
    """
    Upgraded Endpoint: Uses the Hybrid Grading Service (Semantic + Keywords + LLM).
    """
    # 1. Fetch the submission (and verify ownership via teacher_id check in CRUD)
    # We need the raw SQLAlchemy objects to access relationships easily
    submission = db.query(quiz_models.Submission).filter(quiz_models.Submission.id == submission_id).first()

    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Security: Ensure the teacher owns this quiz
    # (Assuming submission -> quiz_session -> quiz -> teacher_id)
    if submission.quiz_session.quiz.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to grade this submission")

    # 2. Context Retrieval Logic
    # We try to find the source document from the first question's citation
    reference_context = ""
    source_doc = None

    # Check the first question for a source citation
    if submission.answers:
        first_q = submission.answers[0].question
        if first_q.source_citation and isinstance(first_q.source_citation, dict):
            source_doc = first_q.source_citation.get("source_file")

    if source_doc:
        try:
            filters = wvc.query.Filter.by_property("source").equal(source_doc)
            collection = vector_service.weaviate_client.collections.get(settings.WEAVIATE_COLLECTION)
            response = collection.query.fetch_objects(limit=40, filters=filters)
            if response.objects:
                reference_context = "\n\n".join([obj.properties['content'] for obj in response.objects])
        except Exception as e:
            print(f"Context retrieval failed: {e}")

    # 3. Grading Loop (Parallel Execution)
    graded_answer_objects = []  # To store for DB

    subjective_tasks = []
    subjective_map = []  # To map results back to the correct answer object

    for answer in submission.answers:
        question = answer.question
        user_ans = answer.answer_text or "No Answer"

        # --- PATH A: MCQ (Deterministic) ---
        if question.question_type == "MCQ":
            is_correct = user_ans.strip().lower() == question.correct_answer.strip().lower()

            graded_obj = quiz_models.GradedAnswer(
                answer_id=answer.id,
                score=10 if is_correct else 0,
                feedback="Correct!" if is_correct else f"Incorrect. Correct answer: {question.correct_answer}",
                breakdown=None,
                keywords=None
            )
            graded_answer_objects.append(graded_obj)

        # --- PATH B: SUBJECTIVE (Hybrid AI) ---
        else:
            task = grading_service.calculate_hybrid_grade(
                question_text=question.question_text,
                correct_answer=question.correct_answer,
                student_answer=user_ans,
                reference_context=reference_context
            )
            subjective_tasks.append(task)
            subjective_map.append(answer.id)

    # 4. Execute Parallel Tasks
    if subjective_tasks:
        ai_results = await asyncio.gather(*subjective_tasks)

        for ans_id, result in zip(subjective_map, ai_results):
            graded_obj = quiz_models.GradedAnswer(
                answer_id=ans_id,
                score=result['final_score'],
                feedback=result['feedback'],
                breakdown=result['breakdown'],
                keywords=result['keywords']
            )
            graded_answer_objects.append(graded_obj)

    # 5. Save to Database
    # Delete existing report if any (Re-grading)
    existing_report = db.query(quiz_models.GradeReport).filter(
        quiz_models.GradeReport.submission_id == submission_id).first()
    if existing_report:
        db.delete(existing_report)
        db.commit()

    # Calculate overall score
    total_score = sum([ga.score for ga in graded_answer_objects])

    new_report = quiz_models.GradeReport(
        submission_id=submission_id,
        grader="AI (Hybrid)",
        overall_score=total_score,
        overall_feedback="Automated Hybrid Grading Completed."
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    # Associate answers with report
    for ga in graded_answer_objects:
        ga.report_id = new_report.id
        db.add(ga)

    db.commit()

    return {"status": "success", "report_id": new_report.id}


@router.get("/{submission_id}/report", response_model=schemas.GradeReportResponse, summary="Get the grade report")
def read_grade_report(submission_id: int, db: Session = Depends(get_db)):
    # ... (Fetch submission and report as before) ...
    db_submission = db.query(quiz_models.Submission).filter(quiz_models.Submission.id == submission_id).first()
    if not db_submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    db_report = db.query(quiz_models.GradeReport).filter(quiz_models.GradeReport.submission_id == submission_id).first()
    if not db_report:
        raise HTTPException(status_code=404, detail="Grade report not found.")

    graded_answers_data = []
    for ga in db_report.graded_answers:
        graded_answers_data.append({
            "id": ga.id,  # <--- Pass the ID
            "question_id": ga.answer.question_id,  # <--- Pass Question ID
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


# 2. ADD this NEW endpoint to save manual edits
@router.put("/{submission_id}/grades", summary="Update grades manually")
def update_submission_grades(
        submission_id: int,
        updates: schemas.BatchGradeUpdate,
        db: Session = Depends(get_db),
        current_user: schemas.User = Depends(get_current_user)
):
    # Security check (ensure teacher owns the quiz)
    submission = db.query(quiz_models.Submission).filter(quiz_models.Submission.id == submission_id).first()
    if not submission or submission.quiz_session.quiz.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    report = db.query(quiz_models.GradeReport).filter(quiz_models.GradeReport.submission_id == submission_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Process updates
    for update in updates.updates:
        # Find the specific graded answer row
        ga = db.query(quiz_models.GradedAnswer).filter(quiz_models.GradedAnswer.id == update.graded_answer_id).first()
        if ga and ga.report_id == report.id:
            ga.score = update.score
            # We allow updating feedback too if we want, but for now just score
            if update.feedback:
                ga.feedback = update.feedback

    db.commit()

    # Recalculate Overall Score
    total = sum([ga.score for ga in report.graded_answers])
    report.overall_score = total
    db.commit()

    return {"status": "success", "new_total": total}