"""
DALL·E / Stable Diffusion 梦境绘图实现
"""
from typing import Optional

import openai
import httpx

from app.core.config import get_settings
from app.services.ai.base import BaseDreamImageGenerator, ImageResult

settings = get_settings()

# 情绪到色调的映射
MOOD_PALETTE = {
    "calm": "柔和的蓝紫色调，宁静的氛围",
    "happy": "温暖的金色和橙色调，明亮欢快",
    "anxious": "灰蓝冷色调，带有压迫感的光影",
    "scared": "深暗色调，带有神秘和紧张的光影",
    "confused": "朦胧混沌的色彩，模糊的边界",
    "sad": "冷淡的蓝灰色调，细雨般的氛围",
}

# 风格到提示词的映射
STYLE_PROMPTS = {
    "surreal_dreamlike": "surrealist style, soft dreamy lighting, ethereal atmosphere, floating elements, misty and otherworldly",
    "watercolor": "watercolor painting style, translucent washes, soft color blending, delicate brushstrokes, white paper showing through",
    "cyberpunk": "cyberpunk style, neon lights, futuristic city, holographic elements, rain-soaked streets, vibrant purple and teal",
    "chinese_ink": "traditional Chinese ink painting style, splash ink, minimalist, elegant, eastern aesthetic, mountains and water",
    "oil_painting": "oil painting style, thick impasto brushstrokes, dramatic chiaroscuro lighting, rich texture, classical composition",
    "anime": "anime illustration style, soft shading, detailed linework, pastel colors, Studio Ghibli inspired, atmospheric",
}


class DalleGenerator(BaseDreamImageGenerator):
    """DALL·E 3 实现"""

    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=settings.dalle_api_key or settings.openai_api_key)

    async def generate(
        self,
        dream_content: str,
        mood: Optional[str] = None,
        style: str = "surreal_dreamlike",
    ) -> ImageResult:
        mood_hint = MOOD_PALETTE.get(mood, "mysterious and dreamlike atmosphere")
        style_hint = STYLE_PROMPTS.get(style, STYLE_PROMPTS["surreal_dreamlike"])

        prompt = (
            f"Create an artistic dream scene based on this dream description: {dream_content[:500]}. "
            f"Art style: {style_hint}. "
            f"Color mood: {mood_hint}. "
            f"The image should feel like a dream - ethereal, slightly unreal, with a sense of wonder. "
            f"No text, no watermarks, no borders."
        )

        response = await self.client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )

        image_url = response.data[0].url

        # 下载图片数据（后续上传到 OSS）
        async with httpx.AsyncClient() as http_client:
            img_response = await http_client.get(image_url)
            image_data = img_response.content

        return ImageResult(
            image_url=image_url,
            image_data=image_data,
            provider="dalle",
            model="dall-e-3",
            style=style,
        )


class SDGenerator(BaseDreamImageGenerator):
    """Stable Diffusion API 实现（兼容 A1111 WebUI API）"""

    def __init__(self):
        self.api_url = settings.sd_api_url
        self.model = settings.sd_model

    async def generate(
        self,
        dream_content: str,
        mood: Optional[str] = None,
        style: str = "surreal_dreamlike",
    ) -> ImageResult:
        import base64

        mood_hint = MOOD_PALETTE.get(mood, "mysterious dreamlike")
        style_hint = STYLE_PROMPTS.get(style, STYLE_PROMPTS["surreal_dreamlike"])

        prompt = (
            f"masterpiece, best quality, {style_hint}, "
            f"dream scene, {dream_content[:300]}, "
            f"{mood_hint}, "
            f"highly detailed, 8k resolution"
        )
        negative_prompt = (
            "text, watermark, logo, signature, ugly, deformed, "
            "low quality, blurry, nsfw, nudity"
        )

        payload = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "steps": 30,
            "cfg_scale": 7.5,
            "width": 1024,
            "height": 1024,
            "sampler_name": "DPM++ 2M Karras",
        }

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{self.api_url}/sdapi/v1/txt2img",
                json=payload,
            )
            result = response.json()

        image_data = base64.b64decode(result["images"][0])

        return ImageResult(
            image_url="",  # 需要上传 OSS 后填充
            image_data=image_data,
            provider="stable_diffusion",
            model=self.model,
            style=style,
        )
