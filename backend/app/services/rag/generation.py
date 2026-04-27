from app.services import vector_service
from app.services.rag import retrieval
import weaviate.classes as wvc


async def generate_quiz_context_and_invoke(request, tenant_id: str):
    """
    Uses Hybrid Search or Whole Document Sampling to retrieve context.
    Send context to LLM and get the generated quiz back in JSON
    """
    context_chunks = []

    clean_text = request.text_content.strip() if request.text_content else ""

    if clean_text and clean_text.lower() != "string":
        context_chunks = [clean_text]

    elif request.source_document:
        filters = wvc.query.Filter.by_property("source").equal(request.source_document)
        if request.page_start and request.page_end:
            page_filter = wvc.query.Filter.by_property("page").greater_or_equal(request.page_start) & \
                          wvc.query.Filter.by_property("page").less_or_equal(request.page_end)
            filters = filters & page_filter
        if request.chapter and request.chapter.lower() != "string":
            chapter_filter = wvc.query.Filter.by_property("chapter").equal(request.chapter)
            filters = filters & chapter_filter
            print(f'Applying strict chapter filter {request.chapter}')

        if request.whole_document:
            print(f"Mode: Whole Document Sampling for {request.source_document}")
            context_chunks = await retrieval.get_even_document_sample(
                source_document=request.source_document,
                tenant_id=tenant_id,
                target_chunks=15,
                chapter=request.chapter
            )
        else:
            print(f"Mode: Targeted Topic Search for '{request.custom_instructions}'")
            # If they didn't provide instructions but left it on Targeted, default to the title
            search_query = request.custom_instructions if request.custom_instructions else request.source_document

            context_chunks = await retrieval.perform_hybrid_search(
                query=search_query,
                tenant_id=tenant_id,
                top_k=15,
                filters=filters
            )

    if not context_chunks:
        raise ValueError(f"Could not retrieve any context for document '{request.source_document}'.")

    final_context = "\n\n---\n\n".join(context_chunks)

    # Invoke the LLM Quiz Chain
    quiz_chain = vector_service.get_quiz_chain()
    quiz_json = await quiz_chain.ainvoke({
        "num_mcq": request.num_mcq,
        "num_short_answer": request.num_short_answer,
        "difficulty": request.difficulty,
        "context": final_context,
        "custom_instructions": request.custom_instructions or "None"
    })

    return quiz_json