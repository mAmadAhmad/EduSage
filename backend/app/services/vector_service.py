# app/services/vector_service.py
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


def init_vector_service():
    """Initializes all components needed for the vector service."""
    global weaviate_client, embedding_model, text_splitter, vector_store

    print("Initializing Vector Service...")

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


def close_vector_service():
    """Closes the Weaviate client connection."""
    global weaviate_client
    if weaviate_client:
        weaviate_client.close()
        print("Weaviate connection closed.")