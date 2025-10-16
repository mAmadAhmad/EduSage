# app/models/lesson_plan_models.py
from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from .quiz_models import Base  # Reuse the Base from our quiz models


class LessonPlan(Base):
    __tablename__ = "lesson_plans"

    id = Column(Integer, primary_key=True, index=True)
    lesson_title = Column(String)
    learning_objectives = Column(JSON)
    key_concepts = Column(JSON)
    review_questions = Column(JSON, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))

    slides = relationship("Slide", back_populates="lesson_plan", cascade="all, delete-orphan")
    # We can also link the review questions if we store them separately


class Slide(Base):
    __tablename__ = "slides"

    id = Column(Integer, primary_key=True, index=True)
    lesson_plan_id = Column(Integer, ForeignKey("lesson_plans.id"))
    title = Column(String)
    bullet_points = Column(JSON)
    speaker_notes = Column(Text)

    lesson_plan = relationship("LessonPlan", back_populates="slides")