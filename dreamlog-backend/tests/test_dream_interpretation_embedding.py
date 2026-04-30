from datetime import date, datetime, timezone
from types import SimpleNamespace

import pytest


@pytest.mark.asyncio
async def test_interpret_dream_generates_embedding_for_matching(monkeypatch):
    from app.api.v1 import dreams
    from app.services.ai.base import InterpretResult

    dream = SimpleNamespace(
        id=42,
        user_id=7,
        content="I dreamed of a glowing door above a moonlit lake.",
        title=None,
        dream_date=date(2026, 4, 29),
        mood="calm",
        clarity=5,
        is_lucid=False,
        is_public=False,
        is_anonymous=True,
        image_url=None,
        image_style=None,
        share_card_url=None,
        like_count=0,
        comment_count=0,
        view_count=0,
        interpretation=None,
        tags=[],
        embedding=None,
        created_at=datetime(2026, 4, 29, tzinfo=timezone.utc),
    )

    class FakeScalarResult:
        def scalar_one_or_none(self):
            return dream

    class FakeDb:
        def __init__(self):
            self.added = []

        async def execute(self, query):
            return FakeScalarResult()

        def add(self, model):
            self.added.append(model)
            if model.__class__.__name__ == "DreamInterpretation":
                dream.interpretation = model
            if model.__class__.__name__ == "DreamTag":
                dream.tags.append(model)

        async def flush(self):
            return None

        async def refresh(self, model):
            return None

    class FakeInterpreter:
        async def interpret(self, dream_content, mood=None, clarity=None):
            return InterpretResult(
                psychology="The dream is processing a threshold.",
                symbolism="The door suggests choice and transition.",
                cultural="Moonlit water often carries reflection.",
                summary="A new passage is appearing.",
                advice="Write down one small step.",
                keywords=["door", "moon", "water"],
                title="Moonlit Door",
                provider="fake",
                model="fake-model",
            )

        async def generate_embedding(self, dream_content):
            return [0.01] * 1536

    monkeypatch.setattr(dreams, "get_interpreter", lambda: FakeInterpreter())

    response = await dreams.interpret_dream(
        dream_id=42,
        db=FakeDb(),
        user=SimpleNamespace(id=7),
    )

    assert dream.embedding == [0.01] * 1536
    assert response.title == "Moonlit Door"
