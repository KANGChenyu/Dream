from pathlib import Path

import pytest


def test_build_knowledge_records_from_directory(tmp_path: Path):
    from app.rag.services.index_service import build_knowledge_records

    source_dir = tmp_path / "zhougong"
    source_dir.mkdir()
    (source_dir / "symbols.md").write_text("# 迷路\n\n迷路常与方向感有关。", encoding="utf-8")

    records = build_knowledge_records(tmp_path)

    assert len(records) == 1
    assert records[0].source_title == "迷路"
    assert records[0].source_type == "zhougong"
    assert "方向感" in records[0].content


def test_retrieve_knowledge_prefers_matching_content():
    from app.rag.retrievers.knowledge_retriever import KnowledgeRecord, retrieve_knowledge

    records = [
        KnowledgeRecord(
            source_title="Water",
            source_type="symbolism",
            content="Water can relate to emotion and flow.",
            source_path="water.md",
        ),
        KnowledgeRecord(
            source_title="Lost",
            source_type="zhougong",
            content="Getting lost can relate to unclear direction and difficult choices.",
            source_path="lost.md",
        ),
    ]

    evidence = retrieve_knowledge("I got lost and could not find the road", records, top_k=1)

    assert evidence[0]["source_title"] == "Lost"
    assert evidence[0]["source_type"] == "zhougong"
    assert "unclear direction" in evidence[0]["snippet"]


def test_build_knowledge_models_adds_embeddings(tmp_path: Path):
    from app.rag.embeddings.provider import LocalHashEmbeddingProvider
    from app.rag.services.index_service import build_knowledge_models

    source_dir = tmp_path / "psychology"
    source_dir.mkdir()
    (source_dir / "reflection.md").write_text("# 反思\n\n梦境分析适合作为自我反思工具。", encoding="utf-8")

    documents = build_knowledge_models(
        tmp_path,
        embedding_provider=LocalHashEmbeddingProvider(dimensions=8),
    )

    assert len(documents) == 1
    assert documents[0].title == "反思"
    assert documents[0].source_type == "psychology"
    assert len(documents[0].chunks) == 1
    assert len(documents[0].chunks[0].embedding) == 8


def test_evidence_from_knowledge_chunks_uses_document_metadata():
    from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
    from app.rag.retrievers.knowledge_retriever import evidence_from_knowledge_chunks

    document = KnowledgeDocument(title="迷路", source_type="zhougong", source_path="lost.md")
    chunk = KnowledgeChunk(chunk_index=0, content="迷路常与方向感不明有关。", document=document)

    evidence = evidence_from_knowledge_chunks("迷路", [chunk], top_k=1)

    assert evidence[0]["source_title"] == "迷路"
    assert evidence[0]["source_type"] == "zhougong"
    assert evidence[0]["source_path"] == "lost.md"


class FakeAsyncSession:
    def __init__(self):
        self.executed = []
        self.added = []
        self.flushed = False

    async def execute(self, statement):
        self.executed.append(statement)

    def add(self, item):
        self.added.append(item)

    async def flush(self):
        self.flushed = True


class FakeScalarResult:
    def __init__(self, items):
        self.items = items

    def all(self):
        return self.items


class FakeExecuteResult:
    def __init__(self, items):
        self.items = items

    def scalars(self):
        return FakeScalarResult(self.items)


class FakeKnowledgeQuerySession:
    def __init__(self, chunks):
        self.chunks = chunks

    async def execute(self, statement):
        self.statement = statement
        return FakeExecuteResult(self.chunks)


@pytest.mark.asyncio
async def test_index_knowledge_directory_persists_documents(tmp_path: Path):
    from app.rag.embeddings.provider import LocalHashEmbeddingProvider
    from app.rag.services.index_service import index_knowledge_directory

    source_dir = tmp_path / "symbolism"
    source_dir.mkdir()
    (source_dir / "water.md").write_text("# Water\n\nWater can relate to emotion.", encoding="utf-8")
    db = FakeAsyncSession()

    chunk_count = await index_knowledge_directory(
        db,
        tmp_path,
        embedding_provider=LocalHashEmbeddingProvider(dimensions=8),
    )

    assert chunk_count == 1
    assert len(db.executed) == 1
    assert len(db.added) == 1
    assert db.added[0].title == "Water"
    assert db.flushed is True


@pytest.mark.asyncio
async def test_retrieve_knowledge_from_db_returns_evidence():
    from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
    from app.rag.retrievers.knowledge_retriever import retrieve_knowledge_from_db

    document = KnowledgeDocument(title="Water", source_type="symbolism", source_path="water.md")
    chunk = KnowledgeChunk(chunk_index=0, content="Water can relate to emotion and flow.", document=document)
    db = FakeKnowledgeQuerySession([chunk])

    evidence = await retrieve_knowledge_from_db(db, "emotion water", top_k=1)

    assert evidence[0]["source_title"] == "Water"
    assert evidence[0]["source_type"] == "symbolism"


@pytest.mark.asyncio
async def test_retrieve_knowledge_from_db_eager_loads_documents():
    from app.rag.retrievers.knowledge_retriever import retrieve_knowledge_from_db

    db = FakeKnowledgeQuerySession([])

    await retrieve_knowledge_from_db(db, "water", top_k=1)

    assert db.statement._with_options
