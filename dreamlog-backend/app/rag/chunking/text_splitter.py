from dataclasses import dataclass


@dataclass(frozen=True)
class TextChunk:
    chunk_index: int
    content: str


def split_text(text: str, chunk_size: int = 800, overlap: int = 120) -> list[TextChunk]:
    cleaned = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    if not cleaned:
        return []

    chunks: list[TextChunk] = []
    start = 0
    while start < len(cleaned):
        end = min(start + chunk_size, len(cleaned))
        chunks.append(TextChunk(chunk_index=len(chunks), content=cleaned[start:end]))
        if end == len(cleaned):
            break
        start = max(end - overlap, start + 1)
    return chunks
