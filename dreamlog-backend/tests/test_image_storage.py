import pytest
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_persist_generated_image_writes_file_and_returns_public_path(tmp_path):
    from app.api.v1.dreams import _persist_generated_image

    image_url = await _persist_generated_image(
        dream_id=42,
        image_data=b"fake-png-bytes",
        storage_dir=tmp_path,
    )

    saved_files = list(tmp_path.glob("dream-42-*.png"))
    assert len(saved_files) == 1
    assert saved_files[0].read_bytes() == b"fake-png-bytes"
    assert image_url.startswith("/generated-images/dream-42-")
    assert len(image_url) < 500


@pytest.mark.asyncio
async def test_generate_dream_image_turns_provider_config_error_into_400(monkeypatch):
    from app.api.v1 import dreams

    def raise_config_error():
        raise ValueError("不支持的绘图服务: chatgpt")

    class FakeScalarResult:
        def scalar_one_or_none(self):
            return type(
                "Dream",
                (),
                {
                    "id": 42,
                    "user_id": 7,
                    "content": "A luminous river in a quiet dream.",
                    "mood": "calm",
                },
            )()

    class FakeDb:
        async def execute(self, query):
            return FakeScalarResult()

    monkeypatch.setattr(dreams, "get_image_generator", raise_config_error)

    with pytest.raises(HTTPException) as exc:
        await dreams.generate_dream_image(
            dream_id=42,
            req=type("Request", (), {"style": "surreal_dreamlike"})(),
            db=FakeDb(),
            user=type("User", (), {"id": 7})(),
        )

    assert exc.value.status_code == 400
    assert "chatgpt" in exc.value.detail
