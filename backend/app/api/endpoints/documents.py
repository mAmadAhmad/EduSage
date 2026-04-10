# app/api/endpoints/documents.py
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from langchain_community.document_loaders import PyPDFLoader
import weaviate.classes as wvc
from app.services import vector_service, auth_service
from app.core.config import settings
from app.api import schemas
from typing import List

router = APIRouter()

# --- Start: Ingest Endpoint ---
@router.post("/ingest/", summary="Ingest a PDF document securely into a user tenant")
async def ingest_document(file: UploadFile = File(...), current_user: schemas.User = Depends(auth_service.get_current_user)):
    """
    Ingests a PDF file:
    1. Loads the PDF content.
    2. Splits the text into manageable chunks.
    3. Generates embeddings.
    4. Stores the chunks and their embeddings in Weaviate.
    """
    if not vector_service.weaviate_client:
        raise HTTPException(status_code=503,
                            detail="Weaviate database not initialized.")

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are supported.")

    tenant_id = f"user_{current_user.id}"
    temp_file_path = f"/tmp/{file.filename}"

    try:
        collection = vector_service.weaviate_client.collections.get(settings.WEAVIATE_COLLECTION)
        # Ensure tenant exists and connect to user's isolated partition
        try:
            collection.tenants.create(tenants=[wvc.tenant.Tenant(name=tenant_id)])
        except Exception:
            pass

        tenant_collection = collection.with_tenant(tenant_id)
        # Delete older chunks of same file to save memory
        file_name = file.filename
        tenant_collection.data.delete_many(
            where=wvc.query.Filter.by_property("source").equal(file_name)
        )
        print(f"Deleted existing chunks for '{file_name}' in tenant '{tenant_id}'.")

        # Process the PDF
        os.makedirs(os.path.dirname(temp_file_path), exist_ok=True)
        with open(temp_file_path, "wb") as buffer:
            buffer.write(await file.read())

        loader = PyPDFLoader(temp_file_path)
        docs = loader.load_and_split(text_splitter=vector_service.text_splitter)

        # Generating data objects to insert into weaviate
        objects_to_insert = []

        for index, doc in enumerate(docs):
            vector = vector_service.embedding_model.embed_query(doc.page_content)

            data_obj = wvc.data.DataObject(
                properties={
                    "content": doc.page_content,
                    "source": file_name,
                    "page": doc.metadata.get("page", 0),
                    "chunk_index": index
                },
                vector=vector
            )
            objects_to_insert.append(data_obj)

        # Insertion to weaviate
        if objects_to_insert:
            response = tenant_collection.data.insert_many(objects_to_insert)
            if response.has_errors:
                print(f"Insertion errors: {response.errors}")
                raise Exception("Failed to insert some chunks into weaviate.")

        os.remove(temp_file_path)
        return {"status": "success", "filename": file.filename, "total_chunks_found": len(objects_to_insert)}

    except Exception as exc:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        print(f"Error during ingestion: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

# --- End: Ingest Endpoint ---

# --- Start: Query Endpoint ---
@router.post("/query/", response_model=schemas.QueryResponse, summary="Query the knowledge base")
async def query_documents(request: schemas.QueryRequest):
    """
    Performs Hybrid Search (BM25 + Vector)
    """
    try:
        objects = await vector_service.perform_hybrid_search(request.query, request.top_k, alpha=0.5)

        if not objects:
            return {"results": []}

        results = [schemas.Source(
            content=obj.properties.get("content", ""),
            source_file=obj.properties.get("source", "unknown"),
            page=obj.properties.get("page", 0)
        )
            for obj in objects
        ]
        return {"results": results}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"An error occurred during query: {exc}")

# --- End: Query Endpoint ---

# --- Start: RAG Query Endpoint ---
@router.post("/rag_query/", response_model=schemas.RAGQueryResponse, summary="Query with RAG using LLM")
async def rag_query(request: schemas.QueryRequest):
    rag_chain = vector_service.get_rag_chain()
    if not rag_chain or vector_service.weaviate_client:
        raise HTTPException(status_code=503, detail="RAG chain or weaviate client is not initialized.")

    try:
        # Filtering logic
        weaviate_filter = None

        if request.page_start is not None and request.page_end is not None:
            weaviate_filter = wvc.query.Filter.by_property("page").greater_or_equal(
                request.page_start
            ) & wvc.query.Filter.by_property("page").less_or_equal(
                request.page_end
            )

        objects = await vector_service.perform_hybrid_search(request.query, request.top_k, alpha=0.5, filters=weaviate_filter)

        if not objects:
            return schemas.RAGQueryResponse(answer="No relevant information found in documents", sources=[])

        # 2. Format context and invoke the RAG chain
        retrieved_texts = [obj.properties.get("text", "") for obj in objects]
        context = "\n\n---\n\n".join(retrieved_texts)
        answer = await vector_service.rag_chain.ainvoke({
            "context": context,
            "question": request.query
        })

        # 3. Format sources
        sources = [
            schemas.Source(
                content=obj.properties.get("text", ""),
                source_file=obj.properties.get("source", "Unknown"),
                page=obj.properties.get("page", 0)
            )
            for obj in objects
        ]

        return schemas.RAGQueryResponse(answer=answer, sources=sources)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

# --- End: RAG Query Endpoint ---

# --- Start: Quiz Generation Endpoint ---
@router.post("/quiz/generate/", response_model=schemas.GenerateQuizResponse, summary="Generate Quiz from a document")
async def generate_quiz(request: schemas.QuizGenerationRequest):
    quiz_chain = vector_service.get_quiz_chain()
    if not quiz_chain:
        raise HTTPException(status_code=503, detail="Quiz generation chain is not initialized.")

    try:
        context = ""

        if request.text_content:
            print("Using raw text content for generation.")
            context = request.text_content

        elif request.source_document:
            print(f"Generating quiz for document: {request.source_document}")

            filters = wvc.query.Filter.by_property("source").equal(request.source_document)

            if request.page_start is not None and request.page_end is not None:
                page_filter = wvc.query.Filter.by_property("page").greater_or_equal(
                    request.page_start
                ) & wvc.query.Filter.by_property("page").less_or_equal(
                    request.page_end
                )

                filters = filters & page_filter

            collection = vector_service.weaviate_client.collections.get(settings.WEAVIATE_COLLECTION)

            response = collection.query.fetch_objects(
                limit=50,
                filters=filters
            )

            if not response.objects:
                raise HTTPException(status_code=404, detail=f"Document '{request.source_document}' not found or has no content.")

            context = "\n\n--\n\n".join([obj.properties['content'] for obj in response.objects])

        else:
            raise HTTPException(status_code=400, detail="Either source_document or text_content must be provided.")

        # 2. invoke the chain with all required inputs
        quiz_json = await vector_service.quiz_generation_chain.ainvoke({
            "num_mcq": request.num_mcq,
            "num_short_answer": request.num_short_answer,
            "difficulty": request.difficulty,
            "context": context,
            "custom_instructions": request.custom_instructions or "None"
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

# --- NEW: List Documents Endpoint ---
@router.get("/list", response_model=List[str], summary="List all available documents")
def list_documents():
    if not vector_service.weaviate_client:
        raise HTTPException(status_code=503, detail="Weaviate client not available.")

    try:
        collection = vector_service.weaviate_client.collections.get(settings.WEAVIATE_COLLECTION)

        # Fetching just the 'source' property for up to 1000 chunks
        response = collection.query.fetch_objects(
            limit=1000,
            return_properties=["source"]
        )

        sources = set()
        for obj in response.objects:
            src = obj.properties.get("source")
            # Filter out temporary text files so they don't clutter the UI
            if src and not src.startswith("temp_text_"):
                sources.add(src)

        return list(sources)
    except Exception as e:
        print(f"Error listing docs: {e}")
        return []
