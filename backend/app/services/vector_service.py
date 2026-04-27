# app/services/vector_service.py
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
import weaviate
import weaviate.classes.config as wvc
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings
from app.services import vector_service
from app.services.rag import prompts

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
                wvc.Property(name="chapter", data_type=wvc.DataType.TEXT, tokenization=wvc.Tokenization.FIELD),
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
        prompt = ChatPromptTemplate.from_template(prompts.RAG_PROMPT_TEMPLATE)
        # Using 70b for better reasoning on context
        rag_chain = prompt | llm_complex | StrOutputParser()
        print("RAG chain initialized.")
    return rag_chain


def get_quiz_chain():
    """Quiz Generation chain"""
    global quiz_generation_chain
    if quiz_generation_chain is None:
        print("Initializing Quiz Generation chain...")
        prompt = ChatPromptTemplate.from_template(prompts.QUIZ_GENERATION_PROMPT)
        # Using 70b because it handles complex JSON formatting constraints much better
        quiz_generation_chain = prompt | llm_complex | JsonOutputParser()
        print("Quiz Generation Chain initialized.")
    return quiz_generation_chain

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


