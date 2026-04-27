import fitz
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
import weaviate.classes as wvc
from app.core.config import settings
from app.services import vector_service

async def process_and_ingest_pdf(file_path: str, file_name: str, tenant_collection):
    """
    Extracts text, maps it to the PDF's Table of Contents if TOC available, chunks it,
    and inserts it into the user's Weaviate tenant partition.
    """

    doc = fitz.open(file_path)
    toc = doc.get_toc()             # [level, title, page_number] -> [1, "ML", 10]

    # only grabing level 1 and 2 headings
    page_to_chapter = {}
    clean_toc = []
    for item in toc:
        level, title, page = item
        clean_title = str(title).strip()
        if level<=2 and not clean_title.isnumeric() and len(clean_title)>1 and '.pdf' not in clean_title.lower():
            page_to_chapter[page-1] = clean_title  # { 9: "ML"}
            clean_toc.append([level, clean_title, page])

    current_chapter = "Unknown Chapter"
    raw_documents = []

    # Extract Text and add metadata
    for page_num in range(len(doc)):
        if page_num in page_to_chapter:
            current_chapter = page_to_chapter[page_num]

        page_text = doc[page_num].get_text("text")

        if page_text.strip():
            raw_documents.append(
                Document(page_content=page_text,
                         metadata={
                             "page": page_num + 1,
                             "chapter": current_chapter,
                             "source": file_name
                         })
            )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.TEXT_CHUNK_SIZE,
        chunk_overlap=settings.TEXT_CHUNK_OVERLAP,
    )

    chunked_docs = splitter.split_documents(raw_documents)

    # Generating embeddings
    objects_to_insert = []
    for index, chunk in enumerate(chunked_docs):
        vector = vector_service.embedding_model.embed_query(chunk.page_content)

        data_obj = wvc.data.DataObject(
            properties={
                "content": chunk.page_content,
                "source": chunk.metadata["source"],
                "page": chunk.metadata["page"],
                "chunk_index": index,
                "chapter": chunk.metadata["chapter"]
            },
            vector=vector
        )
        objects_to_insert.append(data_obj)
    # Insert into weaviate
    if objects_to_insert:
        response = tenant_collection.data.insert_many(objects_to_insert)
        if response.has_errors:
            print(f"Insertion errors: {response.errors}")
            raise Exception("Failed to insert some chunks into Weaviate.")

    doc.close()

    return len(objects_to_insert), clean_toc
