import re
from dataclasses import dataclass


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
