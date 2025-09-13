# app/api/schemas.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any

# --- QUESTION SCHEMAS ---
class QuestionBase(BaseModel):
    question_text: str
    question_type: str = 'MCQ'
    options: Optional[List[str]] = None
    correct_answer: str
    source_citation: Optional[Dict[str, Any]] = None

class QuestionCreate(QuestionBase):
    pass

class Question(QuestionBase):
    id: int
    quiz_id: int

    model_config = ConfigDict(from_attributes=True)

# --- QUIZ SCHEMAS ---
class QuizBase(BaseModel):
    title: str
    instructions: Optional[str] = None

class QuizCreate(QuizBase):
    questions: List[QuestionCreate] # When creating a quiz, we pass a list of new questions

class Quiz(QuizBase):
    id: int
    teacher_id: int
    questions: List[Question] = []  # The full quiz object will include its questions

    model_config = ConfigDict(from_attributes=True)

# --- AI GENERATION SCHEMAS ---
class QuizGenerationRequest(BaseModel):
    source_document: str # The filename
    num_questions: int = 5
    question_type: str = "MCQ"
    difficulty: str = "Normal"

class GenerateQuizResponse(BaseModel):
    title: str
    questions: List[QuestionCreate]

# --- Schemas for Updating Quizzes ---
class QuestionUpdate(QuestionBase):
    id: Optional[int] = None

class QuizUpdate(QuizBase):
    questions: List[QuestionUpdate]

# --- RAG & QUERY SCHEMAS ---
class QueryRequest(BaseModel):
    query: str
    top_k: int = 3
    page_start: Optional[int] = None
    page_end: Optional[int] = None
class Source(BaseModel):
    content: str
    source_file: str
    page: int

class QueryResponse(BaseModel):
    results: List[Source]

# Schema for RAG response
class RAGQueryResponse(BaseModel):
    answer : str
    sources : List[Source]




