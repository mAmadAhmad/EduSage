# app/crud/quiz_crud.py
from sqlalchemy.orm import Session
from app.models import quiz_models
from app.api import schemas
from typing import List

# --- C ---
def create_quiz(db: Session, quiz: schemas.QuizCreate) -> quiz_models.Quiz:
    """
    Creates a new quiz and all its associated questions in the database.
    """
    # Create the main Quiz object
    db_quiz = quiz_models.Quiz(
        title=quiz.title,
        instructions=quiz.instructions
        # teacher_id will be added later when we have users
    )
    db.add(db_quiz)
    db.commit() # Commit to get the db_quiz.id for the questions
    db.refresh(db_quiz)

    # Now create each Question and link it to the quiz
    for q_in in quiz.questions:
        db_question = quiz_models.Question(
            **q_in.model_dump(),
            quiz_id=db_quiz.id
        )
        db.add(db_question)

    db.commit()
    db.refresh(db_quiz)
    return db_quiz

# --- R ---
def get_quiz(db: Session, quiz_id: int) -> quiz_models.Quiz | None:
    """
    Retrieves a single quiz by its ID.
    """
    return db.query(quiz_models.Quiz).filter(quiz_models.Quiz.id == quiz_id).first()

def get_quizzes(db: Session, skip: int = 0, limit: int = 100) -> List[quiz_models.Quiz]:
    """
    Retrieves a list of all quizzes with pagination.
    """
    return db.query(quiz_models.Quiz).offset(skip).limit(limit).all()

# --- U ---
def update_quiz(db: Session, quiz_id: int, quiz: schemas.QuizUpdate) -> quiz_models.Quiz | None:
    """
    Updates a quiz and its questions.
    This implementation deletes all old questions and replaces them with the new set.
    """
    db_quiz = get_quiz(db=db, quiz_id=quiz_id)
    if not db_quiz:
        return None

    # Update the quiz's own fields
    db_quiz.title = quiz.title
    db_quiz.instructions = quiz.instructions

    # Delete existing questions
    for question in db_quiz.questions:
        db.delete(question)
    db.commit()

    # Create and add the new questions
    for q_in in quiz.questions:
        db_question = quiz_models.Question(
            **q_in.model_dump(),
            quiz_id=db_quiz.id
        )
        db.add(db_question)

    db.commit()
    db.refresh(db_quiz)
    return db_quiz

# -- D --
def delete_quiz(db: Session, quiz_id: int) -> quiz_models.Quiz | None:
    """
    Deletes a quiz from the database.
    """
    db_quiz = get_quiz(db=db, quiz_id=quiz_id)
    if db_quiz:
        db.delete(db_quiz)
        db.commit()
    return db_quiz

def create_quiz_session(db: Session, quiz_id: int) -> quiz_models.QuizSession:
    db_session = quiz_models.QuizSession(quiz_id=quiz_id)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session