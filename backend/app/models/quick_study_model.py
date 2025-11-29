from sqlalchemy import Column, Integer, String, JSON, DATETIME, ForeignKey, func
from .quiz_models import Base

class QuickStudySession(Base):
    __tablename__ = "quick_study_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    source_document = Column(String)
    created_at = Column(DATETIME(timezone=True), server_default=func.now())

    # We store the entire quiz structure here as JSON
    # Structure: [{question_text, type, options, correct_answer}, ...]
    quiz_data = Column(JSON)

    # We store the user's answers and AI feedback here as JSON
    # Structure: [{question_id, user_answer, is_correct, feedback}, ...]

    report_data = Column(JSON, nullable=True)