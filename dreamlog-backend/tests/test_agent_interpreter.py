import pytest


@pytest.mark.asyncio
async def test_interpreter_returns_required_sections():
    from app.agent.core.context import RunContext
    from app.agent.dream_agents.interpreter import InterpreterAgent

    context = RunContext(user_id=1, goal="深度分析", target_dream_id=1)
    context.selected_dream = {"summary": "我在陌生城市里迷路", "mood": "anxious"}
    context.public_evidence = [{"source_title": "常见梦境象征", "snippet": "迷路常与方向感有关"}]
    context.private_evidence = [{"dream_id": 1, "summary": "我在陌生城市里迷路"}]

    result = await InterpreterAgent().run(context)

    assert result.status == "succeeded"
    assert set(result.output) >= {
        "title",
        "summary",
        "psychology",
        "symbolism",
        "knowledge_evidence",
        "personal_patterns",
        "advice",
        "follow_up_questions",
    }
