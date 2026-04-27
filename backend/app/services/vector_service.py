from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
import weaviate
import weaviate.classes.config as wvc
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings
from app.services.rag import prompts

weaviate_client = None
embedding_model = None
text_splitter = None
llm_fast = None
llm_complex = None

rag_chain = None
quiz_generation_chain = None

def init_vector_service():
    global weaviate_client, embedding_model, text_splitter, llm_fast, llm_complex

    embedding_model = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL)
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=settings.TEXT_CHUNK_SIZE, chunk_overlap=settings.TEXT_CHUNK_OVERLAP)
    weaviate_client = weaviate.connect_to_local()

    if not weaviate_client.collections.exists(settings.WEAVIATE_COLLECTION):
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

    llm_fast = ChatGroq(temperature=0, model_name="llama-3.1-8b-instant", api_key=settings.GROQ_API_KEY)
    llm_complex = ChatGroq(temperature=0, model_name="llama-3.3-70b-versatile", api_key=settings.GROQ_API_KEY)

def close_vector_service():
    global weaviate_client
    if weaviate_client:
        weaviate_client.close()

def get_rag_chain():
    global rag_chain
    if rag_chain is None:
        prompt = ChatPromptTemplate.from_template(prompts.RAG_PROMPT_TEMPLATE)
        rag_chain = prompt | llm_complex | StrOutputParser()
    return rag_chain

def get_quiz_chain():
    global quiz_generation_chain
    if quiz_generation_chain is None:
        prompt = ChatPromptTemplate.from_template(prompts.QUIZ_GENERATION_PROMPT)
        quiz_generation_chain = prompt | llm_complex | JsonOutputParser()
    return quiz_generation_chain