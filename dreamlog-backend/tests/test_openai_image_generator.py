import base64

import pytest


class _FakeImages:
    def __init__(self):
        self.calls = []

    async def generate(self, **kwargs):
        self.calls.append(kwargs)
        image_bytes = b"fake-png-bytes"
        b64_json = base64.b64encode(image_bytes).decode("ascii")
        return type(
            "FakeImageResponse",
            (),
            {"data": [type("FakeImage", (), {"b64_json": b64_json, "url": None})()]},
        )()


class _FakeClient:
    def __init__(self):
        self.images = _FakeImages()


@pytest.mark.asyncio
async def test_openai_image_generator_uses_configured_model_and_returns_data_url():
    from app.services.ai.dalle_generator import OpenAIImageGenerator

    client = _FakeClient()
    generator = OpenAIImageGenerator(api_key="test-key", model="gpt-image-1.5", client=client)

    result = await generator.generate(
        dream_content="I walked through a luminous library where pages floated like stars.",
        mood="calm",
        style="surreal_dreamlike",
    )

    assert client.images.calls[0]["model"] == "gpt-image-1.5"
    assert client.images.calls[0]["size"] == "1024x1024"
    assert result.provider == "openai"
    assert result.model == "gpt-image-1.5"
    assert result.image_data == b"fake-png-bytes"
    assert result.image_url.startswith("data:image/png;base64,")


def test_image_generator_factory_supports_openai_provider(monkeypatch):
    from app.services import ai

    monkeypatch.setattr(ai.settings, "ai_image_provider", "openai")
    generator = ai.get_image_generator()

    assert generator.__class__.__name__ == "OpenAIImageGenerator"


def test_image_generator_factory_treats_gpt_image_provider_as_model(monkeypatch):
    from app.services import ai

    monkeypatch.setattr(ai.settings, "ai_image_provider", "gpt-image2")
    generator = ai.get_image_generator()

    assert generator.__class__.__name__ == "OpenAIImageGenerator"
    assert generator.model == "gpt-image2"


def test_image_generator_factory_supports_chatgpt_alias(monkeypatch):
    from app.services import ai

    monkeypatch.setattr(ai.settings, "ai_image_provider", "chatgpt")
    monkeypatch.setattr(ai.settings, "openai_image_model", "gpt-image2")
    generator = ai.get_image_generator()

    assert generator.__class__.__name__ == "OpenAIImageGenerator"
    assert generator.model == "gpt-image2"


def test_openai_image_generator_passes_custom_base_url(monkeypatch):
    from app.services.ai import dalle_generator

    created_clients = []

    class FakeAsyncOpenAI:
        def __init__(self, **kwargs):
            created_clients.append(kwargs)

    monkeypatch.setattr(dalle_generator.openai, "AsyncOpenAI", FakeAsyncOpenAI)

    dalle_generator.OpenAIImageGenerator(
        api_key="test-key",
        model="gpt-image2",
        base_url="https://api.example.com/v1",
    )

    assert created_clients == [
        {
            "api_key": "test-key",
            "base_url": "https://api.example.com/v1",
        }
    ]


def test_openai_image_generator_normalizes_compatible_base_url(monkeypatch):
    from app.services.ai import dalle_generator

    created_clients = []

    class FakeAsyncOpenAI:
        def __init__(self, **kwargs):
            created_clients.append(kwargs)

    monkeypatch.setattr(dalle_generator.openai, "AsyncOpenAI", FakeAsyncOpenAI)

    dalle_generator.OpenAIImageGenerator(
        api_key="test-key",
        model="gpt-image2",
        base_url="https://yunwu.ai",
    )

    assert created_clients[0]["base_url"] == "https://yunwu.ai/v1"
