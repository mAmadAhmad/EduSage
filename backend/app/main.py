import os, warnings, logging

from tenacity import retry_unless_exception_type

warnings.filterwarnings("ignore", category=UserWarning, module="google.protobuf")
logging.getLogger("uvicorn").setLevel(logging.WARNING)
from pydantic import BaseModel
from typing import List
import weaviate.classes as wvc
from fastapi import FastAPI, UploadFile, File, HTTPException
from langchain_weaviate import WeaviateVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
import weaviate
from weaviate.classes.config import Property, DataType, Configure


# --- Basic App Setup ---
app = FastAPI(
    title="EduSage API",
    description="API for ingesting documents and powering the EduSage assistant.",
)

# --- Weaviate & Model Configuration ---
weaviate_client = None
try:
    # Connect to the local Weaviate instance running in Docker using the v4 client's helper
    weaviate_client = weaviate.connect_to_local(
        additional_config=wvc.init.AdditionalConfig(
            timeout=wvc.init.Timeout(init=60)
        )
    )
    print("Successfully connected to Weaviate.")

    # Define the schema for our collection if it doesn't exist
    collection_name = "EduSageChunk"
    if not weaviate_client.collections.exists(collection_name):
        print(f"Creating Weaviate collection: {collection_name}")
        weaviate_client.collections.create(
            name=collection_name,
            properties=[
                Property(name="content", data_type=DataType.TEXT),
                Property(name="source", data_type=DataType.TEXT),  # For file name
            ],
            # We are providing our own embeddings, so no internal vectorizer
            vectorizer_config=Configure.Vectorizer.none(),
        )
        print(f"Collection '{collection_name}' created successfully.")
    else:
        print(f"Collection '{collection_name}' already exists.")

except Exception as e:
    print(f"Error connecting to Weaviate or creating schema: {e}")
    weaviate_client = None  # Ensure client is None if connection fails

# Load the embedding model
# This model runs local machine (CPU) and is quite efficient.
embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Configure the text splitter
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)

# LangChain vector store using the Weaviate client
# Now using WeaviateVectorStore from langchain_weaviate
if weaviate_client:
    vector_store = WeaviateVectorStore(
        client=weaviate_client,
        index_name="EduSageChunk",
        text_key="content",
        embedding=embedding_model,
    )
else:
    vector_store = None  # Handle case where client connection failed

# --- Pydantic Models for API Data Validation ---
class QueryRequest(BaseModel):
    query: str
    top_k: int = 3 # Add a parameter to control number of results

class Source(BaseModel):
    content: str
    source_file: str
    page: int

class QueryResponse(BaseModel):
    results: List[Source]

# --- API Endpoints ---

# --- Ingest Endpoint ---
@app.post("/ingest/", summary="Ingest a PDF document")
async def ingest_document(file: UploadFile = File(...)):
    """
    Ingests a PDF file:
    1. Loads the PDF content.
    2. Splits the text into manageable chunks.
    3. Generates embeddings for each chunk.
    4. Stores the chunks and their embeddings in Weaviate.
    """
    if not weaviate_client or not vector_store:
        raise HTTPException(status_code=503,
                            detail="Weaviate database or vector store not initialized. Check server logs.")

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are supported.")

    temp_file_path = ""  # Initialize to ensure it's always defined
    try:
        try:
            # Overwrite if file chunks already exist
            global collection_name
            file_name = file.filename

            # Get the collection object
            my_collection = weaviate_client.collections.get(collection_name)

            # Delete any existing objects from this source file
            my_collection.data.delete_many(
                where=wvc.query.Filter.by_property("source").equal(file_name)
            )
            print(f"Deleted existing chunks for '{file_name}'.")

        except Exception as exc:
            print(f"Error while deleting: {exc}")

        # Save temp file to be used by PyPDFLoader
        temp_file_path = f"/tmp/{file.filename}"
        # Ensure the /tmp directory exists (important for Docker/Linux environments)
        os.makedirs(os.path.dirname(temp_file_path), exist_ok=True)

        with open(temp_file_path, "wb") as buffer:
            buffer.write(await file.read())

        loader = PyPDFLoader(temp_file_path)
        docs = loader.load_and_split(text_splitter=text_splitter)

        # --- Deduplication logic ---
        unique_docs = []
        seen_content = set()
        for doc in docs:
            # Check if we've already processed a chunk with this exact content
            if doc.page_content not in seen_content:
                seen_content.add(doc.page_content)
                # Add metadata to the unique chunk
                doc.metadata["source"] = file.filename
                unique_docs.append(doc)
                # LangChain's Weaviate integration maps Document.page_content to text_key
                # and Document.metadata to other properties in Weaviate.

        # Ingest only the unique documents into Weaviate
        # Using the async version of add_documents for FastAPI's async endpoint
        if unique_docs:
            await vector_store.aadd_documents(unique_docs)

        # Clean up the temporary file
        os.remove(temp_file_path)

        return {"status": "success", "filename": file.filename, "total_chunks_found": len(docs), "unique_chunks_ingested": len(unique_docs)}
    except Exception as exc:
        # Also clean up the file in case of an error
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        print(f"Error during ingestion: {exc}")  # Log the full error for debugging
        raise HTTPException(status_code=500, detail=f"An error occurred during ingestion: {exc}")

# --- Query Endpoint ---
@app.post("/query/", response_model=QueryResponse, summary="Query the knowledge base")
async def query_documents(request: QueryRequest):
    """
    Performs similarity search in Weaviate to find relevant document chunks
    """
    if not vector_store:
        raise HTTPException(status_code=503, detail="Vector store not initialized.")

    try:
        # Perform the similarity search
        retrieved_docs = await vector_store.asimilarity_search(
            query=request.query,
            k=request.top_k
        )

        if not retrieved_docs:
            return {"results": []}

        # Format the results for response
        results = [
            Source(
                content=doc.page_content,
                source_file=doc.metadata.get("source", "Unknown"),
                page=doc.metadata.get("page", 0)
            )
            for doc in retrieved_docs
        ]
        return {"results": results}
    except Exception as exc:
        print(f"Error during query: {exc}") # Log the error for debugging
        raise HTTPException(status_code=500, detail=f"An error occurred during query: {exc}")

# --- Database Reset Endpoint ---
@app.post("/delete-collection/", summary="Delete a Weaviate collection")
async def reset_collection():
    global collection_name

    if not weaviate_client:
        raise HTTPException(status_code=503, detail="Weaviate client not available.")

    try:
        if weaviate_client.collections.exists(collection_name):
            weaviate_client.collections.delete(collection_name)
            print(f"Collection '{collection_name}' deleted.")

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))