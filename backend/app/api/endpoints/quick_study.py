from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import schemas
from app.db.dependencies import get_db
from app.services.auth_service import get_current_user
from app.services import vector_service
from app.models import quick_study_model
from app.core.config import settings
import weaviate.classes as wvc
from typing import List, Dict, Any

router = APIRouter()


@router.post("/start", response_model=schemas.QuickStudyResponse, summary="Generate and start a Quick Study session")
async def start_quick_study(
        request: schemas.QuickStudyCreate,
        db: Session = Depends(get_db),
        current_user: schemas.User = Depends(get_current_user)
):
    context = ""
    if request.text_content:
        context = request.text_content
    elif request.source_document:
        # 1. Reuse existing RAG logic to fetch context
        filters = wvc.query.Filter.by_property("source").equal(request.source_document)
        collection = vector_service.weaviate_client.collections.get(settings.WEAVIATE_COLLECTION)
        response = collection.query.fetch_objects(limit=40, filters=filters)

        if not response.objects:
            raise HTTPException(status_code=404, detail="Document not found")

        context = "\n\n".join([obj.properties['content'] for obj in response.objects])
    else:
        raise HTTPException(status_code=400, detail="No input provided.")

    # 2. Generate Quiz JSON
    quiz_chain = vector_service.get_quiz_chain()
    quiz_json = await quiz_chain.ainvoke({
        "num_mcq": request.num_mcq,
        "num_short_answer": request.num_short_answer,
        "difficulty": "Normal",
        "context": context,
        "custom_instructions": "Create a self-study quiz. Keep questions concise."
    })

    # 3. Store in the optimized table
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
    # 1. Fetch Session
    db_session = db.query(quick_study_model.QuickStudySession).filter(
        quick_study_model.QuickStudySession.id == session_id,
        quick_study_model.QuickStudySession.user_id == current_user.id
    ).first()

    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # --- NEW: Re-fetch Context for Grading ---
    # We use the stored filename to get the same context used for generation
    filters = wvc.query.Filter.by_property("source").equal(db_session.source_document)
    collection = vector_service.weaviate_client.collections.get(settings.WEAVIATE_COLLECTION)
    response = collection.query.fetch_objects(limit=40, filters=filters)

    # If file was deleted, we fallback to empty context (LLM uses general knowledge)
    reference_context = ""
    if response.objects:
        reference_context = "\n\n".join([obj.properties['content'] for obj in response.objects])
    # -----------------------------------------

    # 2. Prepare Submission Context
    submission_text = ""
    for q in db_session.quiz_data:
        qid = q['id']
        # Convert key to int to ensure matching
        user_ans = submission.answers.get(qid, "No Answer")
        # Explicitly label the ID so the LLM sees it
        submission_text += f"ID: {qid}\nQuestion: {q['question_text']}\nCorrect Answer: {q['correct_answer']}\nStudent Answer: {user_ans}\n---\n"

    # 3. Call AI with Context
    grading_chain = vector_service.get_grading_chain()

    ai_response = await grading_chain.ainvoke({
        "grading_criteria": "Be strict but helpful. Point out exactly why an answer is wrong.",
        "submission_context": submission_text,
        "reference_context": reference_context or "No reference text provided. Use general knowledge."
    })

    # 4. Save Report
    db_session.report_data = ai_response['graded_answers']

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