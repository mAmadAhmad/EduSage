# app/api/schemas.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

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
    source_document: Optional[str] = None
    text_content: Optional[str] = None
    difficulty: str = "Normal"
    num_mcq: int = 3
    num_short_answer: int = 2
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    custom_instructions: Optional[str] = None

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
    answer: str
    sources: List[Source]


# --- NEW: Public Schemas for Student Quiz-Taking ---
# This version of a question EXCLUDES the correct_answer
class PublicQuestion(BaseModel):
    id: int
    question_text: str
    question_type: str
    options: Optional[List[str]] = None

    model_config = ConfigDict(from_attributes=True)

# This is the quiz object that will be sent to the student
class PublicQuiz(QuizBase):
    id: int
    questions: List[PublicQuestion]

    model_config = ConfigDict(from_attributes=True)


# --- NEW: Schemas for Student Submissions ---
class AnswerCreate(BaseModel):
    question_id: int
    answer_text: str

class Answer(AnswerCreate):
    id: int
    submission_id: int
    model_config = ConfigDict(from_attributes=True)

class SubmissionCreate(BaseModel):
    student_name: str
    student_roll_no: Optional[str] = None
    answers: List[AnswerCreate]


class Submission(SubmissionCreate):
    id: int
    quiz_session_id: int
    answers: List[Answer]

    model_config = ConfigDict(from_attributes=True)


# --- Schemas for the Grading View ---
class GradedQuestion(BaseModel):
    question_id: int
    question_text: str
    student_answer: str
    correct_answer: str

    model_config = ConfigDict(from_attributes=True)


class SubmissionDetail(BaseModel):
    submission_id: int
    student_name: str
    quiz_id: int
    quiz_title: str
    questions: List[GradedQuestion]

    model_config = ConfigDict(from_attributes=True)

# --- Schemas for AI Grading ---
class AIGradingRequest(BaseModel):
    grading_criteria: str = "Be a fair and helpful grader. Provide a score from 0 to 10 for each answer and brief feedback."

class GradedAnswerResponse(BaseModel):
    question_id: int
    score: float
    feedback: str

class AIGradingResponse(BaseModel):
    overall_feedback: str
    graded_answers: List[GradedAnswerResponse]

# --- Schemas for Student Grade Report ---
class GradedAnswerReport(BaseModel):
    id: int
    question_id: int
    question_text: str
    student_answer: str
    correct_answer: str
    score: float
    feedback: str

    breakdown: Optional[Dict[str, Any]] = None
    keywords: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

class GradeReportResponse(BaseModel):
    student_name: str
    quiz_title: str
    overall_score: Optional[float] = None
    overall_feedback: Optional[str] = None
    graded_answers: List[GradedAnswerReport]

    model_config = ConfigDict(from_attributes=True)

class GradeUpdateItem(BaseModel):
    graded_answer_id: int
    score: float
    feedback: Optional[str] = None

class BatchGradeUpdate(BaseModel):
    updates: List[GradeUpdateItem]

# --- Schemas for User Authentication ---
class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# --- Quick Study Schemas ---
class QuickStudyCreate(BaseModel):
    source_document: Optional[str] = None
    text_content: Optional[str] = None
    num_mcq: int
    num_short_answer: int

class QuickStudySubmit(BaseModel):
    answers: Dict[int, str]

class QuickStudyResponse(BaseModel):
    id: int
    source_document: str
    quiz_data: List[Dict[str, Any]]
    report_data: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- NEW: Lightweight schema for Student Dashboard List ---
class MySubmissionSummary(BaseModel):
    submission_id: int
    quiz_title: str
    student_name: str
    score: Optional[float] = None
    status: str

    model_config = ConfigDict(from_attributes=True)

class SubmissionListResponse(BaseModel):
    id: int
    student_name: str
    student_roll_no: Optional[str] = None
    answer_count: int
    is_graded: bool

    model_config = ConfigDict(from_attributes=True)