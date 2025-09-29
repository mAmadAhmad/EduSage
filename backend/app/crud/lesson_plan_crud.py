# app/crud/lesson_plan_crud.py
from sqlalchemy.orm import Session
from app.models import lesson_plan_models
from app.api import schemas


def create_lesson_plan(db: Session, lesson_plan: schemas.LessonPlanCreate) -> lesson_plan_models.LessonPlan:
    db_lesson_plan = lesson_plan_models.LessonPlan(
        lesson_title=lesson_plan.lesson_title,
        learning_objectives=lesson_plan.learning_objectives,
        key_concepts=lesson_plan.key_concepts,
        review_questions=[q.model_dump() for q in lesson_plan.review_questions]
    )
    db.add(db_lesson_plan)
    db.commit()
    db.refresh(db_lesson_plan)

    for slide_data in lesson_plan.slides:
        db_slide = lesson_plan_models.Slide(
            lesson_plan_id=db_lesson_plan.id,
            **slide_data.model_dump()
        )
        db.add(db_slide)

    db.commit()
    db.refresh(db_lesson_plan)
    return db_lesson_plan


def get_lesson_plan(db: Session, lesson_plan_id: int):
    return db.query(lesson_plan_models.LessonPlan).filter(lesson_plan_models.LessonPlan.id == lesson_plan_id).first()