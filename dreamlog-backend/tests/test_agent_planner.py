import pytest


@pytest.mark.asyncio
async def test_planner_uses_selected_dream_id():
    from app.agent.core.context import RunContext
    from app.agent.dream_agents.planner import PlannerAgent

    context = RunContext(user_id=1, goal="深度分析这条梦", target_dream_id=42)
    result = await PlannerAgent().run(context)

    assert result.status == "succeeded"
    assert result.output["intent"] == "single_dream_deep_analysis"
    assert result.output["target_dream_id"] == 42
    assert [step["agent_name"] for step in result.output["plan"]] == [
        "KnowledgeRetrieverAgent",
        "MemoryRetrieverAgent",
        "InterpreterAgent",
        "CriticAgent",
    ]


@pytest.mark.asyncio
async def test_planner_waits_when_no_dream_is_selected():
    from app.agent.core.context import RunContext
    from app.agent.dream_agents.planner import PlannerAgent

    context = RunContext(user_id=1, goal="分析昨天那条梦")
    result = await PlannerAgent().run(context)

    assert result.status == "waiting_for_user"
    assert "dream_candidates_needed" in result.output["reason"]
