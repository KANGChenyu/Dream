from pathlib import Path


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
