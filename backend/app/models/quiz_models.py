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
    user_id = Column(Integer, ForeignKey("users.id"))

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


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_session_id = Column(Integer, ForeignKey("quiz_sessions.id"))
    student_name = Column(String)
    student_roll_no = Column(String, nullable=True)
    student_id = Column(Integer, ForeignKey("users.id"))

    quiz_session = relationship("QuizSession")
    answers = relationship("Answer", back_populates="submission", cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    answer_text = Column(Text)

    submission = relationship("Submission", back_populates="answers")
    question = relationship("Question")

# NEW: Add these classes for storing grade reports
class GradeReport(Base):
    __tablename__ = "grade_reports"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"))
    grader = Column(String)  # "Teacher" or "AI"
    overall_score = Column(Integer, nullable=True)
    overall_feedback = Column(Text, nullable=True)

    submission = relationship("Submission")
    graded_answers = relationship("GradedAnswer", back_populates="report", cascade="all, delete-orphan")


class GradedAnswer(Base):
    __tablename__ = "graded_answers"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("grade_reports.id"))
    answer_id = Column(Integer, ForeignKey("answers.id"))
    score = Column(Integer)
    feedback = Column(Text, nullable=True)

    report = relationship("GradeReport", back_populates="graded_answers")
    answer = relationship("Answer")