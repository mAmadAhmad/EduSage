# app/services/vector_service.py
# from langchain.chains.summarize.refine_prompts import prompt_template
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
import weaviate
from weaviate.classes.config import Property, DataType, Configure
from langchain_weaviate import WeaviateVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.core.config import settings

# Global variables for the service components
weaviate_client = None
embedding_model = None
text_splitter = None
vector_store = None
llm = None  # We'll initialize the LLM once and share it.
rag_chain = None
quiz_generation_chain = None


def init_vector_service():
    """Initializes the base components that are always needed."""
    global weaviate_client, embedding_model, text_splitter, vector_store, llm
    print("Initializing base vector service components...")

    # Load embedding model
    embedding_model = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL)

    # Configure text splitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.TEXT_CHUNK_SIZE,
        chunk_overlap=settings.TEXT_CHUNK_OVERLAP
    )

    # Connect to Weaviate and initialize vector store
    weaviate_client = weaviate.connect_to_local()
    print("Successfully connected to Weaviate.")

    # Ensure the collection exists
    if not weaviate_client.collections.exists(settings.WEAVIATE_COLLECTION):
        weaviate_client.collections.create(
            name=settings.WEAVIATE_COLLECTION,
            properties=[
                Property(name="content", data_type=DataType.TEXT),
                Property(name="source", data_type=DataType.TEXT),
                Property(name="page", data_type=DataType.INT),
            ],
            vectorizer_config=Configure.Vectorizer.none(),
        )
        print(f"Collection '{settings.WEAVIATE_COLLECTION}' created.")

    vector_store = WeaviateVectorStore(
        client=weaviate_client,
        index_name=settings.WEAVIATE_COLLECTION,
        text_key="content",
        embedding=embedding_model,
    )
    print("Vector Service Initialized.")

    # Initialize llm once to be shared by all chains
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=settings.GOOGLE_API_KEY)

    print("Base components initialized.")

def get_rag_chain():
    """Returns the singleton RAG chain, initializing it if necessary."""
    global rag_chain
    if rag_chain is None:
        print("Initializing RAG chain for the first time...")
        prompt_template_str = """
                You are an expert educational assistant. Based ONLY on the following context, provide a clear and concise answer to the question. If the information is not in the context, say that you cannot find the answer in the provided documents.
                Context: {context}
                Question: {question}
                Answer:
                """
        prompt = ChatPromptTemplate.from_template(prompt_template_str)
        rag_chain = prompt | llm | StrOutputParser()
        print("RAG chain initialized.")
    return rag_chain

def get_quiz_chain():
    """Returns the singleton Quiz Generation chain, initializing it if necessary."""
    global quiz_generation_chain
    if quiz_generation_chain is None:
        print("Initializing Quiz Generation chain for the first time...")
        quiz_prompt_template = """
                You are an expert educator and quiz creator. Your task is to generate a quiz based ONLY on the provided context.
                Do not use any external knowledge.
            
                Follow these instructions precisely:
                1.  Generate exactly {num_mcq} Multiple Choice Questions (MCQ).
                2.  Generate exactly {num_short_answer} Short Answer questions.
                3.  The quiz difficulty should be {difficulty}.
                4.  For MCQs, provide 4 options, with one being the correct answer.
                5.  For Short Answer questions, the "options" field should be null.
                5.  Base every question and its correct answer strictly on the provided context.
                6.  Return the output as a single, valid JSON object following this exact structure:
                    {{
                      "title": "Quiz on the provided context",
                      "questions": [
                        {{
                          "question_text": "The text of the first question",
                          "options": ["Option A", "Option B", "Option C", "Option D"],
                          "correct_answer": "The correct option text"
                        }},
                        ...
                      ]
                    }}    
                    ---
                    ADDITIONAL INSTRUCTIONS FROM THE TEACHER:
                    {custom_instructions}
                    ---    
                    
                    Context:
                    ---
                    {context}
                    ---
                    """
        prompt = ChatPromptTemplate.from_template(quiz_prompt_template)
        quiz_generation_chain = prompt | llm | JsonOutputParser()
        print("Quiz Generation Chain initialized.")
    return quiz_generation_chain

def close_vector_service():                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
    """Closes the Weaviate client connection."""
    global weaviate_client
    if weaviate_client:
        weaviate_client.close()
        print("Weaviate connection closed.")