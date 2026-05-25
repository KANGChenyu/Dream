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


class FakeInterpretResult:
    title = "迷路之城"
    summary = "你正在寻找方向。"
    psychology = "这可能和近期选择压力有关。"
    symbolism = "迷路象征方向感暂时不清。"
    cultural = "传统解释会把道路视为人生路径。"
    advice = "记录醒来后的情绪。"
    keywords = ["迷路", "城市"]
    provider = "fake"
    model = "fake-model"


class FakeInterpreter:
    def __init__(self):
        self.calls = []

    async def interpret(self, dream_content: str, mood=None, clarity=None):
        self.calls.append({"dream_content": dream_content, "mood": mood, "clarity": clarity})
        return FakeInterpretResult()

    async def generate_embedding(self, dream_content: str):
        return []


class FailingInterpreter:
    async def interpret(self, dream_content: str, mood=None, clarity=None):
        raise RuntimeError("missing api key")

    async def generate_embedding(self, dream_content: str):
        return []


@pytest.mark.asyncio
async def test_interpreter_agent_calls_ai_provider_with_rag_context():
    from app.agent.core.context import RunContext
    from app.agent.dream_agents.interpreter import InterpreterAgent

    fake = FakeInterpreter()
    context = RunContext(user_id=1, goal="结合知识库分析", target_dream_id=1)
    context.selected_dream = {
        "summary": "我在陌生城市里迷路",
        "mood": "anxious",
        "clarity": 4,
    }
    context.public_evidence = [{"source_title": "迷路", "snippet": "迷路常与方向感有关"}]
    context.private_evidence = [{"dream_id": 2, "summary": "我之前也梦到找不到路"}]

    result = await InterpreterAgent(interpreter=fake).run(context)

    assert result.status == "succeeded"
    assert result.output["title"] == "迷路之城"
    assert result.output["provider"] == "fake"
    assert "迷路常与方向感有关" in fake.calls[0]["dream_content"]
    assert "我之前也梦到找不到路" in fake.calls[0]["dream_content"]
    assert fake.calls[0]["mood"] == "anxious"
    assert fake.calls[0]["clarity"] == 4


@pytest.mark.asyncio
async def test_interpreter_agent_falls_back_when_provider_fails():
    from app.agent.core.context import RunContext
    from app.agent.dream_agents.interpreter import InterpreterAgent

    context = RunContext(user_id=1, goal="深度分析", target_dream_id=1)
    context.selected_dream = {"summary": "我在陌生城市里迷路", "mood": "anxious"}

    result = await InterpreterAgent(interpreter=FailingInterpreter()).run(context)

    assert result.status == "succeeded"
    assert result.output["provider"] == "fallback"
    assert "missing api key" in result.output["fallback_reason"]


def test_provider_interpreter_agent_falls_back_if_factory_fails(monkeypatch):
    from app.agent.dream_agents import interpreter as module

    monkeypatch.setattr(module, "get_interpreter", lambda: (_ for _ in ()).throw(RuntimeError("bad config")))

    agent = module.ProviderInterpreterAgent()

    assert agent.interpreter is None
    assert agent.provider_error == "bad config"
