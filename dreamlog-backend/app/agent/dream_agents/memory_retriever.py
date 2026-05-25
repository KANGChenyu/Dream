from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.core.base import BaseAgent
from app.agent.core.context import RunContext
from app.agent.core.types import AgentResult
from app.agent.tools.dream_tools import get_user_dream, list_recent_user_dreams
from app.rag.retrievers.memory_retriever import build_private_evidence


class MemoryRetrieverAgent(BaseAgent):
    name = "MemoryRetrieverAgent"

    def __init__(self, db: AsyncSession):
        self.db = db

    async def run(self, context: RunContext) -> AgentResult:
        if context.target_dream_id is None:
            return AgentResult(status="failed", error_message="target_dream_id is required")

        selected = await get_user_dream(self.db, context.user_id, context.target_dream_id)
        if selected is None:
            return AgentResult(status="failed", error_message="Dream not found")

        recent = list(await list_recent_user_dreams(self.db, context.user_id))
        dreams = [selected, *[dream for dream in recent if dream.id != selected.id]]
        evidence = await build_private_evidence(context.user_id, selected.id, dreams)

        context.selected_dream = evidence[0] if evidence else None
        context.private_evidence = evidence
        return AgentResult(status="succeeded", output={"private_evidence": evidence})
