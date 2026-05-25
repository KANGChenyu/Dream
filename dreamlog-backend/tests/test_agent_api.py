def test_agent_create_run_request_schema():
    from app.schemas.agent import AgentRunCreateRequest

    req = AgentRunCreateRequest(goal="分析这条梦", dream_id=1)

    assert req.goal == "分析这条梦"
    assert req.dream_id == 1
