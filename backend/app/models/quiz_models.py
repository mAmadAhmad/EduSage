# app/models/quiz_models.py
import secrets
from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    instructions = Column(Text, nullable=True)
    # In the future, this would be a ForeignKey to a User model
    teacher_id = Column(Integer, default=1) # Placeholder teacher ID

    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    question_text = Column(Text, nullable=False)
    question_type = Column(String, default="MCQ")
    options = Column(JSON, nullable=True) # For MCQs
    source_citation = Column(JSON, nullable=True)
    correct_answer = Column(Text, nullable=False)

    quiz = relationship("Quiz", back_populates="questions")

class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    share_code = Column(String, unique=True, index=True, default=lambda: secrets.token_urlsafe(4).upper())

    quiz = relationship("Quiz")