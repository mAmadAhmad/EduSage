# app/api/endpoints/documents.py
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from langchain_community.document_loaders import PyPDFLoader
import weaviate.classes as wvc
from app.services import vector_service
from app.core.config import settings
from app.api import schemas

router = APIRouter()

# --- Start: Ingest Endpoint ---
@router.post("/ingest/", summary="Ingest a PDF document")
async def ingest_document(file: UploadFile = File(...)):
    """
    Ingests a PDF file:
    1. Loads the PDF content.
    2. Splits the text into manageable chunks.
    3. Generates embeddings for each chunk.
    4. Stores the chunks and their embeddings in Weaviate.
    """
    if not vector_service.weaviate_client or not vector_service.vector_store:
        raise HTTPException(status_code=503,
                            detail="Weaviate database or vector store not initialized. Check server logs.")

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are supported.")

    temp_file_path = ""  # Initialize to ensure it's always defined
    try:
        try:
            # Overwrite if file chunks already exist
            file_name = file.filename

            # Get the collection object
            my_collection = vector_service.weaviate_client.collections.get(settings.WEAVIATE_COLLECTION)

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
        docs = loader.load_and_split(text_splitter=vector_service.text_splitter)

        # --- START: NEW METADATA SANITIZATION LOGIC ---
        # Clean the metadata of each document before further processing.
        # This prevents schema validation errors with Weaviate.
        for doc in docs:
            # Preserve the essential 'page' metadata if it exists
            page_number = doc.metadata.get("page", 0)
            # Overwrite the metadata with a clean dictionary that
            # only contains fields defined in our Weaviate schema.
            doc.metadata = {
                "source": file.filename,
                "page": page_number}

        # --- END: NEW METADATA SANITIZATION LOGIC ---

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
            await vector_service.vector_store.aadd_documents(unique_docs)

        # Clean up the temporary file
        os.remove(temp_file_path)

        return {"status": "success", "filename": file.filename, "total_chunks_found": len(docs),
                "unique_chunks_ingested": len(unique_docs)}
    except Exception as exc:
        # Also clean up the file in case of an error
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        print(f"Error during ingestion: {exc}")  # Log the full error for debugging
        raise HTTPException(status_code=500, detail=f"An error occurred during ingestion: {exc}")

# --- End: Ingest Endpoint ---

# --- Start: Query Endpoint ---
@router.post("/query/", response_model=schemas.QueryResponse, summary="Query the knowledge base")
async def query_documents(request: schemas.QueryRequest):
    """
    Performs similarity search in Weaviate to find relevant document chunks
    """
    if not vector_service.vector_store:
        raise HTTPException(status_code=503, detail="Vector store not initialized.")

    try:
        # Perform the similarity search
        retrieved_docs = await vector_service.vector_store.asimilarity_search(
            query=request.query,
            k=request.top_k
        )

        if not retrieved_docs:
            return {"results": []}

        # Format the results for response
        results = [
            schemas.Source(
                content=doc.page_content,
                source_file=doc.metadata.get("source", "Unknown"),
                page=doc.metadata.get("page", 0)
            )
            for doc in retrieved_docs
        ]
        return {"results": results}
    except Exception as exc:
        print(f"Error during query: {exc}")  # Log the error for debugging
        raise HTTPException(status_code=500, detail=f"An error occurred during query: {exc}")

# --- End: Query Endpoint ---

# --- Start: RAG Query Endpoint ---
@router.post("/rag_query/", response_model=schemas.RAGQueryResponse, summary="Query with RAG using Gemini")
async def rag_query(request: schemas.QueryRequest):
    rag_chain = vector_service.get_rag_chain()
    if not rag_chain:
        raise HTTPException(status_code=503, detail="RAG chain is not initialized.")

    try:
        # 1. Retrieve relevant documents
        retrieved_docs = await vector_service.vector_store.asimilarity_search(
            query=request.query, k=request.top_k
        )

        if not retrieved_docs:
            return schemas.RAGQueryResponse(answer="No relevant information found in documents.", sources=[])

        # 2. Format context and invoke the RAG chain
        context = "\n\n---\n\n".join([doc.page_content for doc in retrieved_docs])
        answer = await vector_service.rag_chain.ainvoke({
            "context": context,
            "question": request.query
        })

        # 3. Format sources with keyword arguments (THE FIX IS HERE)
        sources = [
            schemas.Source(
                content=doc.page_content,
                source_file=doc.metadata.get("source", "Unknown"),
                page=doc.metadata.get("page", 0)
            )
            for doc in retrieved_docs
        ]

        return schemas.RAGQueryResponse(answer=answer, sources=sources)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

# --- End: RAG Query Endpoint ---

# --- Start: Quiz Generation Endpoint ---
@router.post("/quiz/generate/", response_model=schemas.GenerateQuiz, summary="Generate Quiz from a document")
async def generate_quiz(request: schemas.QuizGenerationRequest):
    quiz_chain = vector_service.get_quiz_chain()
    if not quiz_chain:
        raise HTTPException(status_code=503, detail="Quiz generation chain is not initialized.")

    try:
        print(f"Generating quiz for document: {request.source_document}")

        # 1. Retrieve context. For now, we'll retrieve chunks based on the whole document.
        # A more advanced version could filter by page numbers.
        collection = vector_service.weaviate_client.collections.get(settings.WEAVIATE_COLLECTION)

        response = collection.query.fetch_objects(
            limit=30,
            filters=wvc.query.Filter.by_property("source").equal(request.source_document)
        )

        if not response.objects:
            raise HTTPException(status_code=404, detail=f"Document '{request.source_document}' not found or has no content.")

        context = "\n\n--\n\n".join([obj.properties['content'] for obj in response.objects])

        # 2. invoke the chain with all required inputs
        quiz_json = await vector_service.quiz_generation_chain.ainvoke({
            "num_questions": request.num_questions,
            "difficulty": request.difficulty,
            "question_type": request.question_type,
            "context": context
        })

        return quiz_json
    except Exception as exc:
        print(f"Error during quiz generation: {exc}")
        raise HTTPException(status_code=500, detail=f"An error occurred during quiz generation: {str(exc)}")

# --- End: Quiz Generation Endpoint ---

# --- Start: Database Wipe Endpoint ---
@router.post("/wipe_collection_data/", summary="Delete all the objects in the Weaviate collection")
async def wipe_collection_data():

    if not vector_service.weaviate_client:
        raise HTTPException(status_code=503, detail="Weaviate client not available.")

    try:
        if vector_service.weaviate_client.collections.exists(settings.WEAVIATE_COLLECTION):
            collection = vector_service.weaviate_client.collections.get(settings.WEAVIATE_COLLECTION)
            collection.data.delete_many(
                where=wvc.query.Filter.by_property("source").like("*")
            )
            return {"status": f"All data has been wiped from collection {settings.WEAVIATE_COLLECTION}."}
        else:
            return {"status": f"Collection {settings.WEAVIATE_COLLECTION} does not exist. Nothing to wipe."}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

# --- End: Database Wipe Endpoint ---



