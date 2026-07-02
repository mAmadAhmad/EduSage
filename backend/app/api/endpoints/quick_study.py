from fastapi import APIRouter, Depends, HTTPException
import asyncio
import weaviate.classes as wvc
from sqlalchemy.orm import Session

from app.api import schemas
from app.db.dependencies import get_db
from app.services.auth_service import get_current_user
from app.services import vector_service, grading_service
from app.models import quick_study_model
from app.services.rag import retrieval

router = APIRouter()

@router.post("/start", response_model=schemas.QuickStudyResponse, summary="Generate and start a Quick Study session")
async def start_quick_study(
        request: schemas.QuickStudyCreate,
        db: Session = Depends(get_db),
        current_user: schemas.User = Depends(get_current_user)
):
    context = ""
    tenant_id = f"user_{current_user.id}"

    if request.text_content:
        context = request.text_content
    elif request.source_document:
        # Build the unified Weaviate filter object
        filters = wvc.query.Filter.by_property("source").equal(request.source_document)

        valid_chapters = []
        if request.chapter:
            # Handle both list (new schema) and string (fallback) dynamically
            if isinstance(request.chapter, list):
                valid_chapters = [c for c in request.chapter if c.lower() != "string"]
            elif isinstance(request.chapter, str) and request.chapter.lower() != "string":
                valid_chapters = [request.chapter]

        if valid_chapters:
            filters = filters & wvc.query.Filter.by_property("chapter").contains_any(valid_chapters)

        # Pass the constructed filters object to the updated retrieval function
        context_chunks = await retrieval.get_even_document_sample(
            tenant_id=tenant_id,
            target_chunks=15,
            filters=filters
        )
        if not context_chunks:
            raise HTTPException(status_code=404, detail="Document not found or is empty.")
        context = "\n\n".join(context_chunks)
    else:
        raise HTTPException(status_code=400, detail="No input provided.")

    quiz_chain = vector_service.get_quiz_chain()
    quiz_json = await quiz_chain.ainvoke({
        "num_mcq": request.num_mcq,
        "num_short_answer": request.num_short_answer,
        "difficulty": "Normal",
        "context": context,
        "custom_instructions": "Create a self-study quiz. Keep questions concise."
    })

    questions_with_ids = []
    for idx, q in enumerate(quiz_json['questions']):
        q['id'] = idx
        questions_with_ids.append(q)

    db_session = quick_study_model.QuickStudySession(
        user_id=current_user.id,
        source_document=request.source_document or "Raw Text Input",
        quiz_data=questions_with_ids
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    return db_session


@router.post("/{session_id}/submit", response_model=schemas.QuickStudyResponse, summary="Submit and Grade Quick Study")
async def submit_quick_study(
        session_id: int,
        submission: schemas.QuickStudySubmit,
        db: Session = Depends(get_db),
        current_user: schemas.User = Depends(get_current_user)
):
    db_session = db.query(quick_study_model.QuickStudySession).filter(
        quick_study_model.QuickStudySession.id == session_id,
        quick_study_model.QuickStudySession.user_id == current_user.id
    ).first()

    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    tenant_id = f"user_{current_user.id}"
    graded_results = []
    subjective_tasks = []
    subjective_indices = []

    for i, q in enumerate(db_session.quiz_data):
        qid = q['id']
        q_type = q.get('question_type', 'Short Answer')
        usr_ans = submission.answers.get(str(qid)) or submission.answers.get(qid) or "No Answer"

        if q_type == "MCQ":
            correct_ans = q['correct_answer']
            is_correct = usr_ans.strip().lower() == correct_ans.strip().lower()
            graded_results.append({
                "question_id": qid,
                "score": 10 if is_correct else 0,
                "feedback": "Correct!" if is_correct else f"Incorrect. The correct answer is {correct_ans}",
                "breakdown": None
            })
        else:
            reference_context = ""
            if db_session.source_document != "Raw Text Input":
                filters = wvc.query.Filter.by_property("source").equal(db_session.source_document)
                search_query = f"{q['question_text']} {q['correct_answer']}"

                retrieved_chunks = await retrieval.perform_hybrid_search(
                    query=search_query,
                    tenant_id=tenant_id,
                    top_k=3,
                    filters=filters
                )
                reference_context = "\n\n".join(retrieved_chunks)

            task = grading_service.calculate_hybrid_grade(
                question_text=q['question_text'],
                correct_answer=q['correct_answer'],
                student_answer=usr_ans,
                reference_context=reference_context
            )
            subjective_tasks.append(task)
            subjective_indices.append(qid)

    if subjective_tasks:
        ai_grades = await asyncio.gather(*subjective_tasks)

        for qid, grade in zip(subjective_indices, ai_grades):
            graded_results.append({
                "question_id": qid,
                "score": grade['final_score'],
                "feedback": grade['feedback'],
                "breakdown": grade['breakdown'],
                "keywords": grade['keywords']
            })

    graded_results.sort(key=lambda x: x['question_id'])
    db_session.report_data = graded_results

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(db_session, "report_data")

    db.commit()
    db.refresh(db_session)

    return db_session


@router.get("/{session_id}", response_model=schemas.QuickStudyResponse)
def get_quick_study(session_id: int, db: Session = Depends(get_db),
                    current_user: schemas.User = Depends(get_current_user)):
    db_session = db.query(quick_study_model.QuickStudySession).filter(
        quick_study_model.QuickStudySession.id == session_id,
        quick_study_model.QuickStudySession.user_id == current_user.id
    ).first()

    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    return db_session