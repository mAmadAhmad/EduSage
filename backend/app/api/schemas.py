# app/api/schemas.py
from pydantic import BaseModel
from typing import List

class QueryRequest(BaseModel):
    query: str
    top_k: int = 3

class Source(BaseModel):
    content: str
    source_file: str
    page: int

class QueryResponse(BaseModel):
    results: List[Source]

# New schema for RAG response
class RAGQueryResponse(BaseModel):
    answer : str
    sources : List[Source]