from app.agent.core.base import BaseAgent
from app.agent.core.context import RunContext
from app.agent.core.types import AgentResult


class PlannerAgent(BaseAgent):
    name = "PlannerAgent"

    async def run(self, context: RunContext) -> AgentResult:
        if context.target_dream_id is None:
            return AgentResult(
                status="waiting_for_user",
                output={
                    "reason": "dream_candidates_needed",
                    "message": "Please choose which dream to analyze.",
                },
            )

        plan = [
            {"agent_name": "KnowledgeRetrieverAgent", "step_type": "public_knowledge_retrieval"},
            {"agent_name": "MemoryRetrieverAgent", "step_type": "private_memory_retrieval"},
            {"agent_name": "InterpreterAgent", "step_type": "structured_interpretation"},
            {"agent_name": "CriticAgent", "step_type": "quality_review"},
        ]

        return AgentResult(
            status="succeeded",
            output={
                "intent": "single_dream_deep_analysis",
                "target_dream_id": context.target_dream_id,
                "plan": plan,
            },
        )
