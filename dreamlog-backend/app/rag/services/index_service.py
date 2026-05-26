from pathlib import Path

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.rag.chunking.text_splitter import split_text
from app.rag.embeddings.provider import LocalHashEmbeddingProvider
from app.rag.loaders.document_loader import load_document
from app.rag.retrievers.knowledge_retriever import KnowledgeRecord


def build_knowledge_records(root: Path, chunk_size: int = 800, overlap: int = 120) -> list[KnowledgeRecord]:
    records: list[KnowledgeRecord] = []
    for path in sorted(root.rglob("*")):
        if path.suffix.lower() not in {".md", ".txt"}:
            continue
        source_type = path.parent.name
        document = load_document(path, source_type=source_type)
        for chunk in split_text(document.content, chunk_size=chunk_size, overlap=overlap):
            records.append(
                KnowledgeRecord(
                    source_title=document.title,
                    source_type=document.source_type,
                    content=chunk.content,
                    source_path=document.source_path,
                )
            )
    return records


def build_knowledge_models(
    root: Path,
    embedding_provider: LocalHashEmbeddingProvider | None = None,
    chunk_size: int = 800,
    overlap: int = 120,
) -> list[KnowledgeDocument]:
    provider = embedding_provider or LocalHashEmbeddingProvider()
    documents: list[KnowledgeDocument] = []

    for path in sorted(root.rglob("*")):
        if path.suffix.lower() not in {".md", ".txt"}:
            continue
        source_type = path.parent.name
        loaded = load_document(path, source_type=source_type)
        document = KnowledgeDocument(
            title=loaded.title,
            source_type=loaded.source_type,
            source_path=loaded.source_path,
            doc_metadata={"source": "local_docs"},
        )
        for chunk in split_text(loaded.content, chunk_size=chunk_size, overlap=overlap):
            document.chunks.append(
                KnowledgeChunk(
                    chunk_index=chunk.chunk_index,
                    content=chunk.content,
                    embedding=provider.embed(chunk.content),
                    chunk_metadata={"source_path": loaded.source_path},
                )
            )
        documents.append(document)

    return documents


async def index_knowledge_directory(
    db: AsyncSession,
    root: Path,
    embedding_provider: LocalHashEmbeddingProvider | None = None,
) -> int:
    documents = build_knowledge_models(root, embedding_provider=embedding_provider)
    await db.execute(delete(KnowledgeDocument).where(KnowledgeDocument.source_path.is_not(None)))
    for document in documents:
        db.add(document)
    await db.flush()
    return sum(len(document.chunks) for document in documents)
