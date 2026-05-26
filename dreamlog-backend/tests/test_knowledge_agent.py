import pytest


@pytest.mark.asyncio
async def test_knowledge_agent_uses_injected_records():
    from app.agent.core.context import RunContext
    from app.agent.dream_agents.knowledge_retriever import KnowledgeRetrieverAgent
    from app.rag.retrievers.knowledge_retriever import KnowledgeRecord

    agent = KnowledgeRetrieverAgent(
        records=[
            KnowledgeRecord(
                source_title="Lost",
                source_type="zhougong",
                content="Getting lost can relate to unclear direction.",
                source_path="lost.md",
            )
        ]
    )

    context = RunContext(user_id=1, goal="I got lost in a city", target_dream_id=1)
    result = await agent.run(context)

    assert result.status == "succeeded"
    assert result.output["public_evidence"][0]["source_title"] == "Lost"


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


class FakeKnowledgeSession:
    def __init__(self, chunks):
        self.chunks = chunks

    async def execute(self, statement):
        self.statement = statement
        return FakeExecuteResult(self.chunks)


@pytest.mark.asyncio
async def test_knowledge_agent_can_use_db_chunks():
    from app.agent.core.context import RunContext
    from app.agent.dream_agents.knowledge_retriever import KnowledgeRetrieverAgent
    from app.models.knowledge import KnowledgeChunk, KnowledgeDocument

    document = KnowledgeDocument(title="Water", source_type="symbolism", source_path="water.md")
    chunk = KnowledgeChunk(chunk_index=0, content="Water can relate to emotion.", document=document)
    agent = KnowledgeRetrieverAgent(db=FakeKnowledgeSession([chunk]))

    context = RunContext(user_id=1, goal="water and emotion", target_dream_id=1)
    result = await agent.run(context)

    assert result.status == "succeeded"
    assert result.output["public_evidence"][0]["source_title"] == "Water"
