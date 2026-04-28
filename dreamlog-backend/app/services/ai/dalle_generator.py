import base64
from typing import Optional

import httpx
import openai

from app.core.config import get_settings
from app.services.ai.base import BaseDreamImageGenerator, ImageResult

settings = get_settings()

MOOD_PALETTE = {
    "calm": "soft blue and violet palette, quiet and peaceful atmosphere",
    "happy": "warm gold and orange palette, bright and joyful",
    "anxious": "cool gray-blue palette, tense cinematic light",
    "scared": "dark palette, mysterious and suspenseful light",
    "confused": "hazy blended colors, blurred edges and shifting space",
    "sad": "muted blue-gray palette, gentle rainlike mood",
}

STYLE_PROMPTS = {
    "surreal_dreamlike": "surrealist style, soft dreamy lighting, ethereal atmosphere, floating elements, misty and otherworldly",
    "watercolor": "watercolor painting style, translucent washes, soft color blending, delicate brushstrokes, white paper showing through",
    "cyberpunk": "cyberpunk style, neon lights, futuristic city, holographic elements, rain-soaked streets, vibrant purple and teal",
    "chinese_ink": "traditional Chinese ink painting style, splash ink, minimalist, elegant, eastern aesthetic, mountains and water",
    "oil_painting": "oil painting style, thick impasto brushstrokes, dramatic chiaroscuro lighting, rich texture, classical composition",
    "anime": "anime illustration style, soft shading, detailed linework, pastel colors, Studio Ghibli inspired, atmospheric",
}


def _normalize_openai_base_url(base_url: Optional[str]) -> Optional[str]:
    if not base_url:
        return None

    clean_url = base_url.rstrip("/")
    if clean_url.endswith("/v1"):
        return clean_url
    return f"{clean_url}/v1"


class OpenAIImageGenerator(BaseDreamImageGenerator):
    """OpenAI image generation implementation."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
        client: Optional[openai.AsyncOpenAI] = None,
    ):
        self.api_key = api_key or settings.openai_api_key or settings.dalle_api_key
        self.model = model or settings.openai_image_model
        self.base_url = _normalize_openai_base_url(base_url or settings.openai_base_url)
        self.client = client or openai.AsyncOpenAI(
            api_key=self.api_key or "missing-key",
            base_url=self.base_url,
        )

    async def generate(
        self,
        dream_content: str,
        mood: Optional[str] = None,
        style: str = "surreal_dreamlike",
    ) -> ImageResult:
        if not self.api_key or self.api_key.startswith("your-"):
            raise RuntimeError("请先在 .env 中配置 OPENAI_API_KEY，再生成 AI 绘梦。")

        mood_hint = MOOD_PALETTE.get(mood, "mysterious and dreamlike atmosphere")
        style_hint = STYLE_PROMPTS.get(style, STYLE_PROMPTS["surreal_dreamlike"])
        prompt = (
            f"Create an artistic dream scene based on this dream description: {dream_content[:500]}. "
            f"Art style: {style_hint}. "
            f"Color mood: {mood_hint}. "
            "The image should feel like a dream - ethereal, slightly unreal, with a sense of wonder. "
            "No text, no watermarks, no borders."
        )

        response = await self.client.images.generate(
            model=self.model,
            prompt=prompt,
            size="1024x1024",
            n=1,
        )

        image = response.data[0]
        b64_json = getattr(image, "b64_json", None)
        if b64_json:
            image_data = base64.b64decode(b64_json)
            image_url = f"data:image/png;base64,{b64_json}"
        else:
            image_url = getattr(image, "url", None)
            if not image_url:
                raise RuntimeError("AI 绘梦服务没有返回可用图片。")

            async with httpx.AsyncClient() as http_client:
                img_response = await http_client.get(image_url)
                image_data = img_response.content

        return ImageResult(
            image_url=image_url,
            image_data=image_data,
            provider="openai",
            model=self.model,
            style=style,
        )


class DalleGenerator(OpenAIImageGenerator):
    """Legacy DALL-E provider name."""

    def __init__(self):
        super().__init__(
            api_key=settings.dalle_api_key or settings.openai_api_key,
            model="dall-e-3",
        )


class SDGenerator(BaseDreamImageGenerator):
    """Stable Diffusion implementation compatible with A1111 WebUI API."""

    def __init__(self):
        self.api_url = settings.sd_api_url
        self.model = settings.sd_model

    async def generate(
        self,
        dream_content: str,
        mood: Optional[str] = None,
        style: str = "surreal_dreamlike",
    ) -> ImageResult:
        mood_hint = MOOD_PALETTE.get(mood, "mysterious dreamlike")
        style_hint = STYLE_PROMPTS.get(style, STYLE_PROMPTS["surreal_dreamlike"])

        prompt = (
            f"masterpiece, best quality, {style_hint}, "
            f"dream scene, {dream_content[:300]}, "
            f"{mood_hint}, "
            "highly detailed, 8k resolution"
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
            image_url="",
            image_data=image_data,
            provider="stable_diffusion",
            model=self.model,
            style=style,
        )
