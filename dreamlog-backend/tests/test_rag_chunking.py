from pathlib import Path


def test_split_text_creates_overlapping_chunks():
    from app.rag.chunking.text_splitter import split_text

    chunks = split_text("abcdef" * 80, chunk_size=120, overlap=20)

    assert len(chunks) > 1
    assert chunks[0].content
    assert chunks[0].chunk_index == 0
    assert chunks[1].chunk_index == 1


def test_loader_reads_markdown_file(tmp_path: Path):
    from app.rag.loaders.document_loader import load_document

    source = tmp_path / "dream.md"
    source.write_text("# 迷路\n\n迷路常与方向感有关。", encoding="utf-8")

    doc = load_document(source, source_type="symbolism")

    assert doc.title == "迷路"
    assert doc.source_type == "symbolism"
    assert "方向感" in doc.content


def test_local_embedding_provider_is_deterministic():
    from app.rag.embeddings.provider import LocalHashEmbeddingProvider

    provider = LocalHashEmbeddingProvider(dimensions=8)

    assert provider.embed("迷路") == provider.embed("迷路")
    assert len(provider.embed("迷路")) == 8
