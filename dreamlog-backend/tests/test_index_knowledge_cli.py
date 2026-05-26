from pathlib import Path

import pytest


def test_default_knowledge_root_points_to_repo_docs():
    from app.rag.index_knowledge import default_knowledge_root

    root = default_knowledge_root()

    assert root.name == "knowledge"
    assert root.parent.name == "docs"
    assert (root / "psychology" / "reflection-notes.md").exists()


def test_parse_args_accepts_custom_root(tmp_path: Path):
    from app.rag.index_knowledge import parse_args

    args = parse_args(["--root", str(tmp_path)])

    assert args.root == tmp_path


def test_main_prints_indexed_count(monkeypatch, capsys, tmp_path: Path):
    from app.rag import index_knowledge

    async def fake_run(root: Path):
        assert root == tmp_path
        return 3

    monkeypatch.setattr(index_knowledge, "run", fake_run)

    index_knowledge.main(["--root", str(tmp_path)])

    output = capsys.readouterr().out
    assert "Indexed 3 knowledge chunks" in output
