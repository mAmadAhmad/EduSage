from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import weaviate.classes as wvc
from app.api import schemas
from app.db.dependencies import get_db
from app.services import vector_service
from app.core.config import settings
from app.crud import lesson_plan_crud
# Import the security dependency
from app.services.auth_service import get_current_user

router = APIRouter()


@router.post("/generate-lesson", response_model=schemas.LessonPlan, summary="Generate and save a Lesson Plan")
async def generate_lesson_plan(request: schemas.LessonPlanRequest,
                               current_user: schemas.User = Depends(get_current_user)):
    chain = vector_service.get_lesson_plan_chain()
    if not chain:
        raise HTTPException(status_code=503, detail="Lesson Plan chain is not initialized.")
    try:
        print(f"Generating lesson plan for document: {request.source_document}")

        filters = wvc.query.Filter.by_property("source").equal(request.source_document)

        if request.page_start is not None and request.page_end is not None:
            page_filter = wvc.query.Filter.by_property("page").greater_or_equal(
                request.page_start
            ) & wvc.query.Filter.by_property("page").less_or_equal(
                request.page_end
            )
            filters = filters & page_filter

        collection = vector_service.weaviate_client.collections.get(settings.WEAVIATE_COLLECTION)

        response = collection.query.fetch_objects(
            limit=50,
            filters=filters
        )

        if not response.objects:
            raise HTTPException(status_code=404,
                                detail=f"Document {request.source_document} not found or has no content.")

        context = "\n\n--\n\n".join([obj.properties['content'] for obj in response.objects])
        lesson_plan_data = await chain.ainvoke({"instructions": request.instructions, "context": context})
        lesson_plan_to_create = schemas.LessonPlanCreate(**lesson_plan_data)

        # Pass the user ID when saving the lesson plan
        db_lesson_plan = lesson_plan_crud.create_lesson_plan(db=next(get_db()), lesson_plan=lesson_plan_to_create,
                                                             user_id=current_user.id)
        return db_lesson_plan

    except Exception as exc:
        print(f"Error during lesson plan generation: {exc}")
        raise HTTPException(status_code=500, detail=f"An error occurred during lesson plan generation: {str(exc)}")


@router.get("/lesson-plans/{lesson_plan_id}", response_model=schemas.LessonPlan, summary="Get a single Lesson Plan")
def read_lesson_plan(lesson_plan_id: int, db: Session = Depends(get_db),
                     current_user: schemas.User = Depends(get_current_user)):
    db_lesson_plan = lesson_plan_crud.get_lesson_plan(db, lesson_plan_id=lesson_plan_id, user_id=current_user.id)
    if db_lesson_plan is None:
        raise HTTPException(status_code=404, detail="Lesson Plan not found")
    return db_lesson_plan


@router.put("/lesson-plans/{lesson_plan_id}", response_model=schemas.LessonPlan, summary="Update a Lesson Plan")
def update_lesson_plan(lesson_plan_id: int, lesson_plan: schemas.LessonPlanUpdate, db: Session = Depends(get_db),
                       current_user: schemas.User = Depends(get_current_user)):
    db_lesson_plan = lesson_plan_crud.update_lesson_plan(db, lesson_plan_id=lesson_plan_id, lesson_plan=lesson_plan,
                                                         user_id=current_user.id)
    if db_lesson_plan is None:
        raise HTTPException(status_code=404, detail="Lesson Plan not found")
    return db_lesson_plan


@router.get("/lesson-plans/", response_model=List[schemas.LessonPlanInfo], summary="Get a list of all Lesson Plans")
def read_lesson_plans(db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    lesson_plans = lesson_plan_crud.get_lesson_plans(db, user_id=current_user.id)
    return lesson_plans


@router.delete("/lesson-plans/{lesson_plan_id}", summary="Delete a Lesson Plan")
def delete_lesson_plan(lesson_plan_id: int, db: Session = Depends(get_db),
                       current_user: schemas.User = Depends(get_current_user)):
    db_lesson_plan = lesson_plan_crud.delete_lesson_plan(db, lesson_plan_id=lesson_plan_id, user_id=current_user.id)
    if db_lesson_plan is None:
        raise HTTPException(status_code=404, detail="Lesson Plan not found")
    return {"detail": "Successfully deleted lesson plan"}