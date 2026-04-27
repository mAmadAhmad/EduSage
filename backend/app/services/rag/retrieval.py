import weaviate.classes as wvc
from typing import List
from app.services import vector_service
from app.core.config import settings


async def perform_hybrid_search(query: str, tenant_id: str, top_k: int = 15, filters=None) -> List[str]:
    """
    Hybrid search (BM25 + Vector) with alpha = 0.5 and returns top_k chunks
    """
    if not vector_service.weaviate_client:
        raise Exception("No Weaviate client available")

    collection = vector_service.weaviate_client.collections.get(settings.WEAVIATE_COLLECTION)
    tenant_collection = collection.with_tenant(tenant_id)

    query_vector = vector_service.embedding_model.embed_query(query)

    response = tenant_collection.query.hybrid(
        query=query,
        vector=query_vector,
        limit=top_k,
        alpha=0.5,
        return_properties=["content", "source", "page", "chunk_index"],
        filters=filters,
    )

    return [obj.properties.get("content", "") for obj in response.objects]


async def get_even_document_sample(source_document: str, tenant_id: str, target_chunks: int = 15, chapter: str = None) -> List[str]:
    """
    When the context for quiz is whole document and teacher gave no instructions to query
    """
    if not vector_service.weaviate_client:
        raise Exception("No Weaviate client available")

    collection = vector_service.weaviate_client.collections.get(settings.WEAVIATE_COLLECTION)
    tenant_collection = collection.with_tenant(tenant_id)

    filters = wvc.query.Filter.by_property("source").equal(source_document)
    if chapter:
        filters = filters & wvc.query.Filter.by_property("chapter").equal(chapter)
    # Fetch 1000 chunks max
    response = tenant_collection.query.fetch_objects(
        filters=filters,
        limit=1000,
        return_properties=["content", "chunk_index"]
    )

    if not response.objects:
        return []

    sorted_chunks = sorted(response.objects, key=lambda x: x.properties.get("chunk_index", 0))

    # even sampling
    total_chunks = len(sorted_chunks)
    step = max(1, total_chunks // target_chunks)

    sampled_contents = [
        sorted_chunks[i].properties.get("content", "")
        for i in range(0, total_chunks, step)
    ][:target_chunks]

    return sampled_contents