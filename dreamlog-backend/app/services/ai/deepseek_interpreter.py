import json
from typing import Optional

import httpx

from app.core.config import get_settings
from app.services.ai.base import BaseDreamInterpreter, InterpretResult

settings = get_settings()

PRODUCT_INTERPRET_PROMPT = """你是一位专业的梦境分析师，同时精通荣格心理学、弗洛伊德释梦理论和东西方梦境文化。

用户描述了一个梦境，请从以下角度进行解读，并严格按 JSON 格式返回结果：

1. 心理学解读：从潜意识、情绪、近期生活压力等角度分析
2. 象征意义：梦中出现的事物/人物/场景的象征含义
3. 文化视角：东方（周公解梦等）或西方文化中对类似梦境的传统解读

{{
  "title": "为这个梦起一个富有诗意的标题（12字以内）",
  "psychology": "从潜意识、情绪、近期生活压力等角度分析（2-3句话）",
  "symbolism": "梦中出现的事物/人物/场景的象征含义（2-3句话）",
  "cultural": "东方（周公解梦等）或西方文化中对类似梦境的传统解读（2-3句话）",
  "summary": "一句有诗意的总结（不超过30字）",
  "advice": "基于梦境给出温暖的生活建议（2-3句话）",
  "keywords": ["关键词", "关键词", "关键词"]
}}

要求：
- 语气温暖、有趣，不要过于学术化
- 每个角度 2-3 句话
- 最后给一句有诗意的总结
- 提取 3-5 个关键词标签
- 只返回 JSON，不要有其他文字

用户的梦境描述：
{dream_content}

醒来后的情绪：{mood}
梦境清晰度：{clarity}/5"""


def build_deepseek_messages(
    dream_content: str,
    mood: Optional[str] = None,
    clarity: Optional[int] = None,
) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": "你是 DreamLog 的 AI 梦境解读助手，只输出合法 JSON。",
        },
        {
            "role": "user",
            "content": PRODUCT_INTERPRET_PROMPT.format(
                dream_content=dream_content,
                mood=mood or "未提供",
                clarity=clarity or "未提供",
            ),
        },
    ]


class DeepSeekInterpreter(BaseDreamInterpreter):
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.api_key = api_key if api_key is not None else settings.deepseek_api_key
        self.base_url = (base_url or settings.deepseek_base_url).rstrip("/")
        self.model = model or settings.deepseek_model

    async def interpret(
        self,
        dream_content: str,
        mood: Optional[str] = None,
        clarity: Optional[int] = None,
    ) -> InterpretResult:
        if not self.api_key or self.api_key.startswith("your-"):
            raise RuntimeError("请先在 .env 中配置 DEEPSEEK_API_KEY，再生成 AI 解读。")

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": build_deepseek_messages(dream_content, mood, clarity),
                    "response_format": {"type": "json_object"},
                    "temperature": 0.7,
                    "max_tokens": 1500,
                },
            )
            response.raise_for_status()

        payload = response.json()
        text = payload["choices"][0]["message"]["content"].strip()
        data = json.loads(text)
        keywords = data.get("keywords", [])
        if not isinstance(keywords, list):
            keywords = []

        return InterpretResult(
            title=str(data.get("title", ""))[:100],
            psychology=str(data["psychology"]),
            symbolism=str(data["symbolism"]),
            cultural=str(data["cultural"]),
            summary=str(data["summary"]),
            advice=str(data.get("advice", "")),
            keywords=[str(item)[:30] for item in keywords[:5]],
            provider="deepseek",
            model=self.model,
        )

    async def generate_embedding(self, dream_content: str) -> list[float]:
        return []
