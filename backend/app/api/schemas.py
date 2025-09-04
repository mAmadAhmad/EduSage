# app/api/schemas.py
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class QueryRequest(BaseModel):
    query: str
    top_k: int = 3

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

# Schema for quiz generation
class QuizGenerationRequest(BaseModel):
    source_document: str # The filename
    num_questions: int = 5
    question_type: str = "MCQ"
    difficulty: str = "Normal"

class Question(BaseModel):
    question_text: str
    question_type: str
    options: Optional[List[str]] = None
    correct_answer: str
    source_citation: Optional[Dict[str, Any]] = None # To hold source file and page

class GenerateQuiz(BaseModel):
    title: str
    questions: List[Question]


