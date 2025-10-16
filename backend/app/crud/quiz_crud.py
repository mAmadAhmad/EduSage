# app/crud/quiz_crud.py
from sqlalchemy.orm import Session
from app.models import quiz_models
from app.api import schemas
from typing import List

# UPDATED: Now requires a user_id to assign ownership
def create_quiz(db: Session, quiz: schemas.QuizCreate, user_id: int) -> quiz_models.Quiz:
    """Creates a new quiz owned by the specified user."""
    db_quiz = quiz_models.Quiz(
        title=quiz.title,
        instructions=quiz.instructions,
        user_id=user_id  # Assign ownership
    )
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)
    for q_in in quiz.questions:
        db_question = quiz_models.Question(**q_in.model_dump(), quiz_id=db_quiz.id)
        db.add(db_question)
    db.commit()
    db.refresh(db_quiz)
    return db_quiz

# UPDATED: Now requires a user_id to ensure a user can only access their own quiz
def get_quiz(db: Session, quiz_id: int, user_id: int) -> quiz_models.Quiz | None:
    """Retrieves a single quiz by its ID, scoped to the current user."""
    return db.query(quiz_models.Quiz).filter(quiz_models.Quiz.id == quiz_id, quiz_models.Quiz.user_id == user_id).first()

# UPDATED: Now requires a user_id to filter the list
def get_quizzes(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[quiz_models.Quiz]:
    """Retrieves a list of all quizzes owned by a user."""
    return db.query(quiz_models.Quiz).filter(quiz_models.Quiz.user_id == user_id).offset(skip).limit(limit).all()

# UPDATED: Now requires a user_id to ensure a user can only update their own quiz
def update_quiz(db: Session, quiz_id: int, quiz: schemas.QuizUpdate, user_id: int) -> quiz_models.Quiz | None:
    db_quiz = get_quiz(db=db, quiz_id=quiz_id, user_id=user_id) # Security check happens here
    if not db_quiz:
        return None
    db_quiz.title = quiz.title
    db_quiz.instructions = quiz.instructions
    for question in db_quiz.questions:
        db.delete(question)
    for q_in in quiz.questions:
        db_question = quiz_models.Question(**q_in.model_dump(), quiz_id=db_quiz.id)
        db.add(db_question)
    db.commit()
    db.refresh(db_quiz)
    return db_quiz

# UPDATED: Now requires a user_id to ensure a user can only delete their own quiz
def delete_quiz(db: Session, quiz_id: int, user_id: int) -> quiz_models.Quiz | None:
    db_quiz = get_quiz(db=db, quiz_id=quiz_id, user_id=user_id) # Security check happens here
    if db_quiz:
        db.delete(db_quiz)
        db.commit()
    return db_quiz

# No user context needed for these public/student-facing functions
def create_quiz_session(db: Session, quiz_id: int) -> quiz_models.QuizSession:
    db_session = quiz_models.QuizSession(quiz_id=quiz_id)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_quiz_by_share_code(db: Session, share_code: str) -> quiz_models.Quiz | None:
    session = db.query(quiz_models.QuizSession).filter(quiz_models.QuizSession.share_code == share_code).first()
    return session.quiz if session else None

# UPDATED: Now requires a student_id to link the submission to a user account
def create_submission(db: Session, session_id: int, submission: schemas.SubmissionCreate, student_id: int) -> quiz_models.Submission:
    db_submission = quiz_models.Submission(
        quiz_session_id=session_id,
        student_id=student_id,  # Link submission to the student user
        student_name=submission.student_name,
        student_roll_no=submission.student_roll_no
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)
    for answer in submission.answers:
        db_answer = quiz_models.Answer(**answer.model_dump(), submission_id=db_submission.id)
        db.add(db_answer)
    db.commit()
    db.refresh(db_submission)
    return db_submission

# UPDATED: Requires user_id to ensure a teacher can only see submissions for their own quizzes
def get_submissions_for_quiz(db: Session, quiz_id: int, user_id: int) -> List[quiz_models.Submission]:
    """Retrieves all submissions for a quiz owned by the user."""
    return db.query(quiz_models.Submission)\
        .join(quiz_models.QuizSession)\
        .join(quiz_models.Quiz)\
        .filter(quiz_models.Quiz.id == quiz_id, quiz_models.Quiz.user_id == user_id)\
        .all()

# UPDATED: Requires user_id to ensure a teacher can only see a submission for their own quiz
def get_submission(db: Session, submission_id: int, user_id: int) -> quiz_models.Submission | None:
    """Retrieves a single submission, ensuring it belongs to a quiz owned by the user."""
    return db.query(quiz_models.Submission)\
        .join(quiz_models.QuizSession)\
        .join(quiz_models.Quiz)\
        .filter(quiz_models.Submission.id == submission_id, quiz_models.Quiz.user_id == user_id)\
        .first()

# The logic inside this function implicitly handles security because it calls get_submission, which is now secure.
def get_submission_details(db: Session, submission_id: int, user_id: int) -> dict | None:
    submission = get_submission(db, submission_id, user_id) # Security check happens here
    if not submission:
        return None
    # ... (rest of the function is the same)
    quiz = submission.quiz_session.quiz
    questions_data = [{"question_id": a.question.id, "question_text": a.question.question_text, "student_answer": a.answer_text, "correct_answer": a.question.correct_answer} for a in submission.answers]
    return {"submission_id": submission.id, "student_name": submission.student_name, "quiz_id": quiz.id, "quiz_title": quiz.title, "questions": questions_data}

# These functions are called by secure endpoints, so they don't need direct user_id checks.
def create_grade_report(db: Session, submission_id: int, report_data: schemas.AIGradingResponse) -> quiz_models.GradeReport:
    # ... (function content is the same)
    db_report = quiz_models.GradeReport(submission_id=submission_id, grader="AI", overall_feedback=report_data.overall_feedback)
    db.add(db_report)
    db.commit(); db.refresh(db_report)
    for graded_answer_data in report_data.graded_answers:
        original_answer = db.query(quiz_models.Answer).filter(quiz_models.Answer.submission_id == submission_id, quiz_models.Answer.question_id == graded_answer_data.question_id).first()
        if original_answer:
            db_graded_answer = quiz_models.GradedAnswer(report_id=db_report.id, answer_id=original_answer.id, score=graded_answer_data.score, feedback=graded_answer_data.feedback)
            db.add(db_graded_answer)
    db.commit(); db.refresh(db_report)
    return db_report

def get_grade_report(db: Session, submission_id: int):
    # ... (function content is the same)
    return db.query(quiz_models.GradeReport).filter(quiz_models.GradeReport.submission_id == submission_id).first()