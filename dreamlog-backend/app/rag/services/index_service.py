from pathlib import Path

from app.rag.chunking.text_splitter import split_text
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
