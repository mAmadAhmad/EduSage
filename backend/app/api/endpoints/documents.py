# app/api/endpoints/documents.py
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from langchain_community.document_loaders import PyPDFLoader
import weaviate.classes as wvc
from weaviate.classes.tenants import Tenant
from app.services import vector_service, auth_service
from app.services.rag import generation, ingestion
from app.core.config import settings
from app.api import schemas
from typing import List
router = APIRouter()

# --- Start: Ingest Endpoint ---
@router.post("/ingest/", summary="Ingest a PDF document securely into a user tenant")
async def ingest_document(file: UploadFile = File(...), current_user: schemas.User = Depends(auth_service.get_current_user)):

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
            if tenant_id not in collection.tenants.get():
                collection.tenants.create(tenants=[Tenant(name=tenant_id)])
        except Exception as e:
            print(f"  [Notice] Tenant setup: {e}")

        tenant_collection = collection.with_tenant(tenant_id)
        # Delete older chunks of same file to save memory
        file_name = file.filename
        try:
            tenant_collection.data.delete_many(
                where=wvc.query.Filter.by_property("source").equal(file_name)
            )
            print(f"Deleted existing chunks for '{file_name}' in tenant '{tenant_id}'.")
        except Exception as e:
            print(f"  [Notice] Delete old chunks: {e}")

        # Process the PDF
        os.makedirs(os.path.dirname(temp_file_path), exist_ok=True)
        with open(temp_file_path, "wb") as buffer:
            buffer.write(await file.read())

        # call to ingestion function
        chunks_inserted, toc = await ingestion.process_and_ingest_pdf(
            file_path=temp_file_path,
            file_name=file_name,
            tenant_collection=tenant_collection
        )
        os.remove(temp_file_path)
        return {
            "status": "success",
            "filename": file_name,
            "total_chunks_found": chunks_inserted,
            "table_of_contents": toc
        }

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
async def generate_quiz(request: schemas.QuizGenerationRequest, current_user: schemas.User = Depends(auth_service.get_current_user)):
    if not vector_service.get_quiz_chain():
        raise HTTPException(status_code=503, detail="Quiz generation chain is not initialized.")

    # User ID to Weaviate Tenant ID
    tenant_id = f"user_{current_user.id}"

    try:
        quiz_json = await generation.generate_quiz_context_and_invoke(request, tenant_id)

        return quiz_json

    except ValueError as val_err:
        raise HTTPException(status_code=404, detail=str(val_err))
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
def list_documents(current_user: schemas.User = Depends(auth_service.get_current_user)):
    if not vector_service.weaviate_client:
        raise HTTPException(status_code=503, detail="Weaviate client not available.")

    try:
        tenant_id = f"user_{current_user.id}"
        collection = vector_service.weaviate_client.collections.get(settings.WEAVIATE_COLLECTION).with_tenant(tenant_id)

        # Fetching just the 'source' property for up to 1000 chunks
        response = collection.query.fetch_objects(
            limit=1000,
            return_properties=["source"]
        )

        sources = set()
        for obj in response.objects:
            src = obj.properties.get("source")
            if src and not src.startswith("temp_text_"):
                sources.add(src)

        return list(sources)
    except Exception as e:
        print(f"Error listing docs: {e}")
        return []


@router.get("/{filename}/chapters", response_model=List[str], summary="Get unique chapters for a document")
def get_document_chapters(filename: str, current_user: schemas.User = Depends(auth_service.get_current_user)):
    if not vector_service.weaviate_client:
        raise HTTPException(status_code=503, detail="Weaviate client not available.")
    try:
        tenant_id = f"user_{current_user.id}"
        collection = vector_service.weaviate_client.collections.get(settings.WEAVIATE_COLLECTION).with_tenant(tenant_id)

        response = collection.query.fetch_objects(
            filters=wvc.query.Filter.by_property("source").equal(filename),
            return_properties=["chapter"],
            limit=2000
        )

        # Extract unique chapters
        chapters = set()
        for obj in response.objects:
            ch = obj.properties.get("chapter")
            if ch and ch != "Unknown Chapter":
                chapters.add(ch)

        return sorted(list(chapters))
    except Exception as e:
        print(f"Error fetching chapters: {e}")
        return []