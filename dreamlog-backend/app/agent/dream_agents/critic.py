from app.agent.core.base import BaseAgent
from app.agent.core.context import RunContext
from app.agent.core.types import AgentResult


class CriticAgent(BaseAgent):
    name = "CriticAgent"

    async def run(self, context: RunContext) -> AgentResult:
        output = context.intermediate.get("interpretation")
        if not output:
            return AgentResult(status="failed", error_message="No interpretation to review")
        output["safety_note"] = "This content is for self-reflection and is not a medical or psychological diagnosis."
        return AgentResult(status="succeeded", output=output)
