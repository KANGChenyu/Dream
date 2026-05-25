from app.agent.core.base import BaseAgent
from app.agent.core.context import RunContext
from app.agent.core.types import AgentResult


class InterpreterAgent(BaseAgent):
    name = "InterpreterAgent"

    async def run(self, context: RunContext) -> AgentResult:
        dream_summary = (context.selected_dream or {}).get("summary") or "this dream"
        output = {
            "title": "Dream Agent Deep Analysis",
            "summary": f"This analysis centers on \"{dream_summary[:40]}\" and combines knowledge evidence with personal dream history.",
            "psychology": "This dream may reflect recent emotion, pressure, uncertainty, or unfinished concerns, but it should not be treated as a diagnosis.",
            "symbolism": "The key images can be used as reflective clues when interpreted alongside the waking mood and recent life context.",
            "knowledge_evidence": context.public_evidence,
            "personal_patterns": context.private_evidence,
            "advice": [
                "Keep recording similar scenes and waking emotions.",
                "Review whether the past week contains repeated people, places, or pressure sources.",
            ],
            "follow_up_questions": [
                "What was the strongest emotion in this dream?",
                "Does anything in recent life feel similar to the dream's central scene?",
            ],
        }
        context.intermediate["interpretation"] = output
        return AgentResult(status="succeeded", output=output)
