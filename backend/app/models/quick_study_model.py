from sqlalchemy import Column, Integer, String, JSON, DATETIME, ForeignKey, func
from .quiz_models import Base

class QuickStudySession(Base):
    __tablename__ = "quick_study_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    source_document = Column(String)
    created_at = Column(DATETIME(timezone=True), server_default=func.now())
    quiz_data = Column(JSON)
    report_data = Column(JSON, nullable=True)