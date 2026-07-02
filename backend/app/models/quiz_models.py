import string
import random
import secrets
from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

def generate_access_pin():
    """Generates a 5-character secure alphanumeric PIN."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    instructions = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    time_limit_minutes = Column(Integer, nullable=True)

    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    question_text = Column(Text, nullable=False)
    question_type = Column(String, default="MCQ")
    options = Column(JSON, nullable=True)
    source_citation = Column(JSON, nullable=True)
    correct_answer = Column(Text, nullable=False)
    keywords = Column(JSON, nullable=True)

    quiz = relationship("Quiz", back_populates="questions")

class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    share_code = Column(String, unique=True, index=True, default=lambda: secrets.token_urlsafe(4).upper())
    time_limit_minutes = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)

    quiz = relationship("Quiz")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_session_id = Column(Integer, ForeignKey("quiz_sessions.id"))
    student_name = Column(String)
    student_roll_no = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    access_pin = Column(String, default=generate_access_pin, nullable=False)

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

class GradeReport(Base):
    __tablename__ = "grade_reports"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"))
    grader = Column(String)
    overall_score = Column(Float, nullable=True)
    overall_feedback = Column(Text, nullable=True)

    submission = relationship("Submission")
    graded_answers = relationship("GradedAnswer", back_populates="report", cascade="all, delete-orphan")

class GradedAnswer(Base):
    __tablename__ = "graded_answers"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("grade_reports.id"))
    answer_id = Column(Integer, ForeignKey("answers.id"))

    score = Column(Float)
    feedback = Column(Text, nullable=True)
    breakdown = Column(JSON, nullable=True)
    keywords = Column(JSON, nullable=True)

    report = relationship("GradeReport", back_populates="graded_answers")
    answer = relationship("Answer")