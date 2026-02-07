from fastapi import APIRouter, Depends, HTTPException
import asyncio
import weaviate.classes as wvc
from sqlalchemy.orm import Session
from app.api import schemas
from app.db.dependencies import get_db
from app.services.auth_service import get_current_user
from app.services import vector_service, grading_service
from app.models import quick_study_model
from app.core.config import settings

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

    # 2. Re-fetch Context (Only needed for Subjective questions)
    filters = wvc.query.Filter.by_property("source").equal(db_session.source_document)
    collection = vector_service.weaviate_client.collections.get(settings.WEAVIATE_COLLECTION)
    response = collection.query.fetch_objects(limit=40, filters=filters)

    reference_context = ""
    if response.objects:
        reference_context = "\n\n".join([obj.properties['content'] for obj in response.objects])

    # 3. Grading Logic Loop
    graded_results = []

    # collecting subjective tasks to run them in batch
    subjective_tasks = []
    subjective_indices = [] # keep track of order
    for i, q in enumerate(db_session.quiz_data):
       qid = q['id']
       q_type = q.get('question_type', 'Short Answer')
       usr_ans = submission.answers.get(str(qid)) or submission.answers.get(qid) or "No Answer"

       # --- PATH A: MCQ (Instant Local Check) ---
       if q_type == "MCQ":
           correct_ans = q['correct_answer']
           is_correct = usr_ans.strip() == correct_ans.strip()
           result = {
               "question_id": qid,
               "score": 10 if is_correct else 0,
               "feedback": "Correct!" if is_correct else f"Incorrect!, The correct answer is {correct_ans}",
               "breakdown": None
           }
           graded_results.append(result)
       # --- PATH B: SUBJECTIVE (Hybrid AI Check) ---
       else:
           task = grading_service.calculate_hybrid_grade(
               question_text=q['question_text'],
               correct_answer=q['correct_answer'],
               student_answer=usr_ans,
               reference_context=reference_context
           )
           subjective_tasks.append(task)
           subjective_indices.append(qid)

    # 4. Execute Subjective Grading in Parallel (Fast!)
    if subjective_tasks:
        ai_grades = await asyncio.gather(*subjective_tasks)

        # Merge back into results
        for qid, grade in zip(subjective_indices, ai_grades):
            result={
                "question_id": qid,
                "score": grade['final_score'],
                "feedback": grade['feedback'],
                "breakdown": grade['breakdown'],
                "keywords": grade['keywords']
            }
            graded_results.append(result)

    # 5. Save Report
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