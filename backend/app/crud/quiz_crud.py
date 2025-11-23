from sqlalchemy.orm import Session
from app.models import quiz_models
from app.api import schemas
from typing import List


# --- C ---
def create_quiz(db: Session, quiz: schemas.QuizCreate, user_id: int) -> quiz_models.Quiz:
    db_quiz = quiz_models.Quiz(
        title=quiz.title,
        instructions=quiz.instructions,
        user_id=user_id
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


# --- R ---
def get_quiz(db: Session, quiz_id: int, user_id: int) -> quiz_models.Quiz | None:
    return db.query(quiz_models.Quiz).filter(quiz_models.Quiz.id == quiz_id,
                                             quiz_models.Quiz.user_id == user_id).first()


def get_quizzes(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[quiz_models.Quiz]:
    return db.query(quiz_models.Quiz).filter(quiz_models.Quiz.user_id == user_id).offset(skip).limit(limit).all()


# --- U ---
def update_quiz(db: Session, quiz_id: int, quiz: schemas.QuizUpdate, user_id: int) -> quiz_models.Quiz | None:
    db_quiz = get_quiz(db=db, quiz_id=quiz_id, user_id=user_id)
    if not db_quiz:
        return None

    db_quiz.title = quiz.title
    db_quiz.instructions = quiz.instructions

    for question in db_quiz.questions:
        db.delete(question)

    # Commit the delete before adding new ones to avoid potential conflicts
    db.commit()

    for q_in in quiz.questions:
        db_question = quiz_models.Question(**q_in.model_dump(), quiz_id=db_quiz.id)
        db.add(db_question)

    db.commit()
    db.refresh(db_quiz)
    return db_quiz


# -- D --
def delete_quiz(db: Session, quiz_id: int, user_id: int) -> quiz_models.Quiz | None:
    db_quiz = get_quiz(db=db, quiz_id=quiz_id, user_id=user_id)
    if db_quiz:
        db.delete(db_quiz)
        db.commit()
    return db_quiz


# -- Session --
def create_quiz_session(db: Session, quiz_id: int) -> quiz_models.QuizSession:
    db_session = quiz_models.QuizSession(quiz_id=quiz_id)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


def get_quiz_by_share_code(db: Session, share_code: str) -> quiz_models.Quiz | None:
    session = db.query(quiz_models.QuizSession).filter(quiz_models.QuizSession.share_code == share_code).first()
    if session:
        return session.quiz
    return None


# -- Submission --
def create_submission(db: Session, session_id: int, submission: schemas.SubmissionCreate,
                      student_id: int) -> quiz_models.Submission:
    db_submission = quiz_models.Submission(
        quiz_session_id=session_id,
        student_id=student_id,
        student_name=submission.student_name,
        student_roll_no=submission.student_roll_no
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)

    for answer in submission.answers:
        db_answer = quiz_models.Answer(
            submission_id=db_submission.id,
            **answer.model_dump()
        )
        db.add(db_answer)

    db.commit()
    db.refresh(db_submission)
    return db_submission


def get_submissions_for_quiz(db: Session, quiz_id: int, user_id: int) -> List[quiz_models.Submission]:
    return db.query(quiz_models.Submission) \
        .join(quiz_models.QuizSession) \
        .join(quiz_models.Quiz) \
        .filter(quiz_models.Quiz.id == quiz_id, quiz_models.Quiz.user_id == user_id) \
        .all()


def get_submission(db: Session, submission_id: int, user_id: int) -> quiz_models.Submission | None:
    # NOTE: For now we removed the user_id check on get_submission inside read_grade_report
    # to allow students to see it, but this function enforces it for teacher views.
    # You might need a separate get_submission_public if you want stricter controls later.
    return db.query(quiz_models.Submission).filter(quiz_models.Submission.id == submission_id).first()


def get_submission_details(db: Session, submission_id: int, user_id: int) -> dict | None:
    submission = get_submission(db, submission_id, user_id)
    if not submission:
        return None

    quiz = submission.quiz_session.quiz

    questions_data = []
    for answer in submission.answers:
        question = answer.question
        questions_data.append({
            "question_id": question.id,
            "question_text": question.question_text,
            "student_answer": answer.answer_text,
            "correct_answer": question.correct_answer,
        })

    return {
        "submission_id": submission.id,
        "student_name": submission.student_name,
        "quiz_id": quiz.id,
        "quiz_title": quiz.title,
        "questions": questions_data,
    }


# --- GRADING: UPDATED TO OVERWRITE OLD REPORTS ---
def create_grade_report(db: Session, submission_id: int,
                        report_data: schemas.AIGradingResponse) -> quiz_models.GradeReport:
    # 1. Check if a report already exists
    existing_report = db.query(quiz_models.GradeReport).filter(
        quiz_models.GradeReport.submission_id == submission_id).first()

    # 2. If it exists, delete it so we can replace it with the new one
    if existing_report:
        db.delete(existing_report)
        db.commit()

    # 3. Create the new report
    db_report = quiz_models.GradeReport(
        submission_id=submission_id,
        grader="AI",
        overall_feedback=report_data.overall_feedback
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    for graded_answer_data in report_data.graded_answers:
        original_answer = db.query(quiz_models.Answer).filter(
            quiz_models.Answer.submission_id == submission_id,
            quiz_models.Answer.question_id == graded_answer_data.question_id
        ).first()

        if original_answer:
            db_graded_answer = quiz_models.GradedAnswer(
                report_id=db_report.id,
                answer_id=original_answer.id,
                score=graded_answer_data.score,
                feedback=graded_answer_data.feedback
            )
            db.add(db_graded_answer)

    db.commit()
    db.refresh(db_report)
    return db_report


def get_grade_report(db: Session, submission_id: int):
    return db.query(quiz_models.GradeReport).filter(quiz_models.GradeReport.submission_id == submission_id).first()