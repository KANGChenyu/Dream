import re
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import KnowledgeChunk


@dataclass(frozen=True)
class KnowledgeRecord:
    source_title: str
    source_type: str
    content: str
    source_path: str


def _tokens(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    cjk_chars = re.findall(r"[\u4e00-\u9fff]", text)
    return set(words + cjk_chars)


def retrieve_knowledge(query: str, records: list[KnowledgeRecord], top_k: int = 5) -> list[dict]:
    query_tokens = _tokens(query)
    scored: list[tuple[int, KnowledgeRecord]] = []

    for record in records:
        haystack = f"{record.source_title} {record.content}"
        score = len(query_tokens & _tokens(haystack))
        if score > 0:
            scored.append((score, record))

    scored.sort(key=lambda item: item[0], reverse=True)

    return [
        {
            "source_title": record.source_title,
            "source_type": record.source_type,
            "snippet": record.content[:240],
            "relevance": f"keyword_score:{score}",
            "source_path": record.source_path,
        }
        for score, record in scored[:top_k]
    ]


def evidence_from_knowledge_chunks(query: str, chunks: list, top_k: int = 5) -> list[dict]:
    records = [
        KnowledgeRecord(
            source_title=chunk.document.title,
            source_type=chunk.document.source_type,
            content=chunk.content,
            source_path=chunk.document.source_path or "",
        )
        for chunk in chunks
        if getattr(chunk, "document", None) is not None
    ]
    return retrieve_knowledge(query, records, top_k=top_k)


async def retrieve_knowledge_from_db(db: AsyncSession, query: str, top_k: int = 5) -> list[dict]:
    result = await db.execute(select(KnowledgeChunk).limit(200))
    chunks = list(result.scalars().all())
    return evidence_from_knowledge_chunks(query, chunks, top_k=top_k)
