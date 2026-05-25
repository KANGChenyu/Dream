from pathlib import Path

from app.agent.core.base import BaseAgent
from app.agent.core.context import RunContext
from app.agent.core.types import AgentResult
from app.rag.retrievers.knowledge_retriever import retrieve_knowledge
from app.rag.services.index_service import build_knowledge_records


class KnowledgeRetrieverAgent(BaseAgent):
    name = "KnowledgeRetrieverAgent"

    async def run(self, context: RunContext) -> AgentResult:
        knowledge_root = Path(__file__).resolve().parents[4] / "docs" / "knowledge"
        records = build_knowledge_records(knowledge_root) if knowledge_root.exists() else []
        query = " ".join(
            part
            for part in [
                context.goal,
                (context.selected_dream or {}).get("summary"),
            ]
            if part
        )
        evidence = retrieve_knowledge(query, records, top_k=5)

        if not evidence:
            evidence = [
                {
                    "source_title": "Dream Psychology Reflection Notes",
                    "source_type": "psychology",
                    "snippet": "Dream analysis is best treated as a self-reflection tool, not a diagnostic tool.",
                    "relevance": "safety_baseline",
                }
            ]

        context.public_evidence = evidence
        return AgentResult(status="succeeded", output={"public_evidence": evidence})
