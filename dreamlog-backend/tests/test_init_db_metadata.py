def test_init_db_imports_agent_and_knowledge_tables():
    import scripts.init_db  # noqa: F401
    from app.core.database import Base

    assert "agent_runs" in Base.metadata.tables
    assert "agent_steps" in Base.metadata.tables
    assert "agent_conversations" in Base.metadata.tables
    assert "knowledge_documents" in Base.metadata.tables
    assert "knowledge_chunks" in Base.metadata.tables
