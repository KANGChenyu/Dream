from app.agent.core.base import BaseAgent
from app.agent.core.context import RunContext
from app.agent.core.types import AgentResult


class KnowledgeRetrieverAgent(BaseAgent):
    name = "KnowledgeRetrieverAgent"

    async def run(self, context: RunContext) -> AgentResult:
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
