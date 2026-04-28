"""
Claude API 梦境解读实现
"""
import json
from typing import Optional

import anthropic

from app.core.config import get_settings
from app.services.ai.base import BaseDreamInterpreter, InterpretResult

settings = get_settings()

INTERPRET_PROMPT = """你是一位专业的梦境分析师，同时精通荣格心理学、弗洛伊德释梦理论和东西方梦境文化。

用户描述了一个梦境，请从以下角度进行解读，并严格按 JSON 格式返回结果：

{{
  "title": "为这个梦起一个富有诗意的标题（8字以内）",
  "psychology": "从潜意识、情绪、近期生活压力等角度分析（2-3句话）",
  "symbolism": "梦中出现的事物/人物/场景的象征含义（2-3句话）",
  "cultural": "东方（周公解梦等）或西方文化中对类似梦境的传统解读（2-3句话）",
  "summary": "一句有诗意的总结（不超过30字）",
  "advice": "基于梦境给出温暖的生活建议（2-3句话）",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"]
}}

要求：
- 语气温暖、有趣、有诗意，不要过于学术化
- keywords 提取 3-5 个最核心的梦境元素
- 只返回 JSON，不要有其他文字

用户的梦境描述：
{dream_content}

醒来后的情绪：{mood}
梦境清晰度：{clarity}/5"""


class ClaudeInterpreter(BaseDreamInterpreter):
    """Claude API 实现"""

    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.claude_api_key)
        self.model = settings.claude_model

    async def interpret(
        self,
        dream_content: str,
        mood: Optional[str] = None,
        clarity: Optional[int] = None,
    ) -> InterpretResult:
        prompt = INTERPRET_PROMPT.format(
            dream_content=dream_content,
            mood=mood or "未提供",
            clarity=clarity or "未提供",
        )

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )

        # 解析 JSON 响应
        text = response.content[0].text.strip()
        # 处理可能的 markdown 代码块包裹
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        data = json.loads(text)

        return InterpretResult(
            title=data.get("title", ""),
            psychology=data["psychology"],
            symbolism=data["symbolism"],
            cultural=data["cultural"],
            summary=data["summary"],
            advice=data.get("advice", ""),
            keywords=data.get("keywords", []),
            provider="claude",
            model=self.model,
        )

    async def generate_embedding(self, dream_content: str) -> list[float]:
        """
        Claude 不直接提供 embedding API，
        这里使用 Voyager 或回退到 OpenAI embedding
        """
        # 暂时用 OpenAI embedding 作为回退
        import openai
        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=dream_content,
        )
        return response.data[0].embedding
