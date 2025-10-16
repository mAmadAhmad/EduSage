# app/crud/lesson_plan_crud.py
from sqlalchemy.orm import Session
from app.models import lesson_plan_models
from app.api import schemas
from typing import List

# UPDATED: Now requires a user_id to assign ownership
def create_lesson_plan(db: Session, lesson_plan: schemas.LessonPlanCreate, user_id: int) -> lesson_plan_models.LessonPlan:
    db_lesson_plan = lesson_plan_models.LessonPlan(
        lesson_title=lesson_plan.lesson_title,
        learning_objectives=lesson_plan.learning_objectives,
        key_concepts=lesson_plan.key_concepts,
        review_questions=[q.model_dump() for q in lesson_plan.review_questions],
        user_id=user_id  # Assign ownership
    )
    db.add(db_lesson_plan)
    db.commit()
    db.refresh(db_lesson_plan)
    for slide_data in lesson_plan.slides:
        db_slide = lesson_plan_models.Slide(lesson_plan_id=db_lesson_plan.id, **slide_data.model_dump())
        db.add(db_slide)
    db.commit()
    db.refresh(db_lesson_plan)
    return db_lesson_plan

# UPDATED: Now requires a user_id to ensure a user can only access their own lesson plan
def get_lesson_plan(db: Session, lesson_plan_id: int, user_id: int):
    return db.query(lesson_plan_models.LessonPlan).filter(lesson_plan_models.LessonPlan.id == lesson_plan_id, lesson_plan_models.LessonPlan.user_id == user_id).first()

# UPDATED: Now requires a user_id to ensure a user can only update their own lesson plan
def update_lesson_plan(db: Session, lesson_plan_id: int, lesson_plan: schemas.LessonPlanUpdate, user_id: int):
    db_lesson_plan = get_lesson_plan(db, lesson_plan_id=lesson_plan_id, user_id=user_id) # Security check
    if not db_lesson_plan:
        return None
    db_lesson_plan.lesson_title = lesson_plan.lesson_title
    db_lesson_plan.learning_objectives = lesson_plan.learning_objectives
    db_lesson_plan.key_concepts = lesson_plan.key_concepts
    db_lesson_plan.review_questions = [q.model_dump() for q in lesson_plan.review_questions]
    for slide in db_lesson_plan.slides:
        db.delete(slide)
    for slide_data in lesson_plan.slides:
        db_slide = lesson_plan_models.Slide(lesson_plan_id=db_lesson_plan.id, **slide_data.model_dump())
        db.add(db_slide)
    db.commit()
    db.refresh(db_lesson_plan)
    return db_lesson_plan

# UPDATED: Now requires a user_id to filter the list
def get_lesson_plans(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[lesson_plan_models.LessonPlan]:
    return db.query(lesson_plan_models.LessonPlan).filter(lesson_plan_models.LessonPlan.user_id == user_id).offset(skip).limit(limit).all()

# UPDATED: Now requires a user_id to ensure a user can only delete their own lesson plan
def delete_lesson_plan(db: Session, lesson_plan_id: int, user_id: int):
    db_lesson_plan = get_lesson_plan(db, lesson_plan_id=lesson_plan_id, user_id=user_id) # Security check
    if db_lesson_plan:
        db.delete(db_lesson_plan)
        db.commit()
    return db_lesson_plan