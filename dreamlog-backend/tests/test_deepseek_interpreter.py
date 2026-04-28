import pytest


def test_deepseek_prompt_uses_product_document_prompt():
    from app.services.ai.deepseek_interpreter import build_deepseek_messages

    messages = build_deepseek_messages(
        dream_content="我梦见月亮照在水面上。",
        mood="calm",
        clarity=5,
    )

    combined = "\n".join(message["content"] for message in messages)

    assert "专业的梦境分析师" in combined
    assert "荣格心理学" in combined
    assert "周公解梦" in combined
    assert "心理学解读" in combined
    assert "象征意义" in combined
    assert "文化视角" in combined
    assert "关键词标签" in combined
    assert "json" in combined.lower()


@pytest.mark.asyncio
async def test_deepseek_interpreter_requires_api_key(monkeypatch):
    from app.services.ai.deepseek_interpreter import DeepSeekInterpreter

    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)

    interpreter = DeepSeekInterpreter(api_key="")

    with pytest.raises(RuntimeError, match="DEEPSEEK_API_KEY"):
        await interpreter.interpret("我梦见一片月光下的湖。")
