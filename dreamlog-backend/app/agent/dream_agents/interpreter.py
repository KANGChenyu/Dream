from app.agent.core.base import BaseAgent
from app.agent.core.context import RunContext
from app.agent.core.types import AgentResult
from app.services.ai import get_interpreter


class InterpreterAgent(BaseAgent):
    name = "InterpreterAgent"

    def __init__(self, interpreter=None):
        self.interpreter = interpreter

    async def run(self, context: RunContext) -> AgentResult:
        if self.interpreter is not None:
            try:
                return await self._run_with_interpreter(context, self.interpreter)
            except Exception as exc:
                output = self._fallback_output(context)
                output["provider"] = "fallback"
                output["fallback_reason"] = str(exc)
                context.intermediate["interpretation"] = output
                return AgentResult(status="succeeded", output=output)

        output = self._fallback_output(context)
        context.intermediate["interpretation"] = output
        return AgentResult(status="succeeded", output=output)

    def _fallback_output(self, context: RunContext) -> dict:
        dream_summary = (context.selected_dream or {}).get("summary") or "this dream"
        return {
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
            "provider": "fallback",
            "model": "template",
        }

    async def _run_with_interpreter(self, context: RunContext, interpreter) -> AgentResult:
        selected = context.selected_dream or {}
        dream_content = self._build_augmented_content(context)
        result = await interpreter.interpret(
            dream_content=dream_content,
            mood=selected.get("mood"),
            clarity=selected.get("clarity"),
        )
        output = {
            "title": result.title or "Dream Agent Deep Analysis",
            "summary": result.summary,
            "psychology": result.psychology,
            "symbolism": result.symbolism,
            "cultural": result.cultural,
            "knowledge_evidence": context.public_evidence,
            "personal_patterns": context.private_evidence,
            "advice": [result.advice] if isinstance(result.advice, str) and result.advice else [],
            "follow_up_questions": [
                "Which part of this interpretation feels closest to your waking life?",
                "Would you like to compare this with another recent dream?",
            ],
            "keywords": result.keywords,
            "provider": result.provider,
            "model": result.model,
        }
        context.intermediate["interpretation"] = output
        return AgentResult(status="succeeded", output=output)

    def _build_augmented_content(self, context: RunContext) -> str:
        selected = context.selected_dream or {}
        knowledge = "\n".join(
            f"- {item.get('source_title', 'Knowledge')}: {item.get('snippet', '')}"
            for item in context.public_evidence
        )
        memories = "\n".join(
            f"- Dream {item.get('dream_id', '')}: {item.get('summary', '')}"
            for item in context.private_evidence
        )
        return "\n\n".join(
            [
                f"User goal: {context.goal}",
                f"Selected dream: {selected.get('summary', '')}",
                f"Public knowledge evidence:\n{knowledge}",
                f"Private dream memory:\n{memories}",
            ]
        )


class ProviderInterpreterAgent(InterpreterAgent):
    def __init__(self):
        self.provider_error: str | None = None
        try:
            interpreter = get_interpreter()
        except Exception as exc:
            interpreter = None
            self.provider_error = str(exc)
        super().__init__(interpreter=interpreter)

    async def run(self, context: RunContext) -> AgentResult:
        result = await super().run(context)
        if self.provider_error and result.output.get("provider") == "fallback":
            result.output["fallback_reason"] = self.provider_error
        return result
