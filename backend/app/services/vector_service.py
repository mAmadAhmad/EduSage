# app/services/vector_service.py
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
import weaviate
import weaviate.classes.config as wvc
from langchain_weaviate import WeaviateVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings
from app.services import vector_service

# Global variables
weaviate_client = None
embedding_model = None
text_splitter = None
vector_store = None

llm_fast = None  # Llama 3.1 8b (Grading, Simple Tasks)
llm_complex = None  # Llama 3.3 70b (Generation, RAG)

rag_chain = None
quiz_generation_chain = None
grading_chain = None
lesson_plan_chain = None


def init_vector_service():
    """Initializes the base components."""
    global weaviate_client, embedding_model, text_splitter, llm_fast, llm_complex
    print("Initializing base vector service components...")

    # 1. Embedding Model
    embedding_model = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL)

    # 2. Text Splitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.TEXT_CHUNK_SIZE,
        chunk_overlap=settings.TEXT_CHUNK_OVERLAP
    )

    # 3. Weaviate Connection
    weaviate_client = weaviate.connect_to_local()
    print("Successfully connected to Weaviate.")

    # Schema creation
    if not weaviate_client.collections.exists(settings.WEAVIATE_COLLECTION):
        print(f"Creating multi-tenant collection: {settings.WEAVIATE_COLLECTION}...")
        weaviate_client.collections.create(
            name=settings.WEAVIATE_COLLECTION,
            properties=[
                wvc.Property(name="content", data_type=wvc.DataType.TEXT, tokenization=wvc.Tokenization.WORD),
                wvc.Property(name="source", data_type=wvc.DataType.TEXT, tokenization=wvc.Tokenization.FIELD),
                wvc.Property(name="page", data_type=wvc.DataType.INT),
                wvc.Property(name="chunk_index", data_type=wvc.DataType.INT),
            ],
            multi_tenancy_config=wvc.Configure.multi_tenancy(enabled=True, auto_tenant_creation=True),
            vectorizer_config=wvc.Configure.Vectorizer.none(),
        )
    print("Vector Service Initialized.")

    # 4. Initialize Groq Models
    # Fast Model: Llama 3.1 8B Instant
    llm_fast = ChatGroq(
        temperature=0,
        model_name="llama-3.1-8b-instant",
        api_key=settings.GROQ_API_KEY
    )

    # Complex Model: Llama 3.3 70B Versatile
    llm_complex = ChatGroq(
        temperature=0,
        model_name="llama-3.3-70b-versatile",
        api_key=settings.GROQ_API_KEY
    )

    print("Groq Models Initialized: Fast (8b) & Complex (70b)")


def close_vector_service():
    """Closes the Weaviate client connection."""
    global weaviate_client
    if weaviate_client:
        weaviate_client.close()
        print("Weaviate connection closed.")


def get_rag_chain():
    """RAG Chain - Uses Complex Model for better context synthesis."""
    global rag_chain
    if rag_chain is None:
        print("Initializing RAG chain...")
        prompt_template_str = """
        You are an expert educational assistant. Based ONLY on the following context, provide a clear and concise answer to the question. 
        If the information is not in the context, say that you cannot find the answer in the provided documents.

        Context: {context}
        Question: {question}
        Answer:
        """
        prompt = ChatPromptTemplate.from_template(prompt_template_str)
        # Using 70b for better reasoning on context
        rag_chain = prompt | llm_complex | StrOutputParser()
        print("RAG chain initialized.")
    return rag_chain


def get_quiz_chain():
    """Quiz Generation chain"""
    global quiz_generation_chain
    if quiz_generation_chain is None:
        print("Initializing Quiz Generation chain...")
        quiz_prompt_template = """
        You are an expert educator and quiz creator. Your task is to generate a quiz based ONLY on the provided context.
        Do not use any external knowledge.

        Follow these instructions precisely:
        1.  Generate exactly {num_mcq} Multiple Choice Questions (MCQ).
        2.  Generate exactly {num_short_answer} Short Answer questions.
        3.  The quiz difficulty should be {difficulty}.
        4.  For MCQs, provide exactly 4 options.
        5.  For Short Answer questions, the "options" field MUST be null.
        6.  Every question, including Short Answer ones, MUST have a "correct_answer" field containing the model answer.
        7.  Base every question and its correct answer strictly on the provided context.
        8.  Return the output as a single, valid JSON object following this exact structure:
            {{
              "title": "Quiz on the provided context",
              "questions": [
                {{
                  "question_text": "Text of the first question...",
                  "question_type": "MCQ", // or "Short Answer"
                  "options": ["Option A", "Option B", "Option C", "Option D"], // or null
                  "correct_answer": "The correct answer text..."
                }}
              ]
            }}        

            ADDITIONAL INSTRUCTIONS FROM THE TEACHER:
            ---
            {custom_instructions}
            ---

            Context:
            ---
            {context}
            ---
        """
        prompt = ChatPromptTemplate.from_template(quiz_prompt_template)
        # Using 70b because it handles complex JSON formatting constraints much better
        quiz_generation_chain = prompt | llm_complex | JsonOutputParser()
        print("Quiz Generation Chain initialized.")
    return quiz_generation_chain


def get_grading_chain():
    """Grading chain"""
    global grading_chain
    if grading_chain is None:
        print("Initializing AI Grading chain...")
        grading_prompt_template = """
            You are an expert AI teaching assistant. Grade the student's submission.

            INPUTS:
            1. Reference Context (Truth source):
            ---
            {reference_context}
            ---

            2. Grading Criteria:
            ---
            {grading_criteria}
            ---

            3. Student Submission:
            ---
            {submission_context}
            ---

            INSTRUCTIONS:
            - Compare the Student's Answer to the Correct Answer AND the Reference Context.
            - Short Answer don't have to be an exact match to Correct Answer, check for Student's logic and find if it is correct given the Correct Answer AND the Reference Context.
            - If the Reference Context is provided, use it to verify facts.
            - If the Reference Context is missing/empty, use your general knowledge.
            - Provide a score (0-10) or if user specifies other criteria follow that, and helpful feedback.
            - CRITICAL: You must return a JSON object with a "graded_answers" list.
            - CRITICAL: Each item in the list MUST include the exact "question_id" from the input.

            JSON STRUCTURE:
            {{
                "overall_feedback": "Summary...",
                "graded_answers": [
                    {{
                        "question_id": <int>, 
                        "score": <int>,
                        "feedback": "Specific feedback..."
                    }}
                ]
            }}
            """
        prompt = ChatPromptTemplate.from_template(grading_prompt_template)
        grading_chain = prompt | llm_fast | JsonOutputParser()
        print("AI Grading chain initialized.")
    return grading_chain


async def perform_hybrid_search(query: str, top_k: int = 3, alpha: float = 0.5, filters=None):
    """
    Hybrid Search function for Weaviate
    alpha=0.0 (Pure Keyword/BM25), alpha=1.0 (Pure Vector), alpha=0.5 (Equal Hybrid)
    """
    if not weaviate_client:
        raise Exception("No weaviate client available")
    collection = vector_service.weaviate_client.collections.get(settings.WEAVIATE_COLLECTION)

    query_vector = embedding_model.embed_query(query)

    response = collection.query.hybrid(
        query=query,
        vector=query_vector,
        limit=top_k,
        alpha=alpha,
        return_properties=["content", "source", "page"],
        filters=filters,
    )

    return response.objects


