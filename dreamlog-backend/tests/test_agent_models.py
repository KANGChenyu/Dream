def test_agent_run_model_table_names():
    from app.models.agent_run import AgentConversation, AgentRun, AgentStep

    assert AgentConversation.__tablename__ == "agent_conversations"
    assert AgentRun.__tablename__ == "agent_runs"
    assert AgentStep.__tablename__ == "agent_steps"


def test_knowledge_model_table_names():
    from app.models.knowledge import KnowledgeChunk, KnowledgeDocument

    assert KnowledgeDocument.__tablename__ == "knowledge_documents"
    assert KnowledgeChunk.__tablename__ == "knowledge_chunks"
