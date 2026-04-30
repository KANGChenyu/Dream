from datetime import date, datetime, timezone
from types import SimpleNamespace

import pytest


@pytest.mark.asyncio
async def test_create_dream_persists_title_and_tags():
    from app.api.v1.dreams import create_dream
    from app.schemas.dream import DreamCreateRequest

    class FakeDb:
        def __init__(self):
            self.dream = None

        def add(self, model):
            if model.__class__.__name__ == "Dream":
                model.id = 99
                model.like_count = 0
                model.comment_count = 0
                model.view_count = 0
                model.image_url = None
                model.image_style = None
                model.share_card_url = None
                model.interpretation = None
                model.tags = []
                model.created_at = datetime(2026, 4, 30, tzinfo=timezone.utc)
                self.dream = model
            if model.__class__.__name__ == "DreamTag":
                self.dream.tags.append(model)

        async def flush(self):
            return None

        async def refresh(self, model):
            return None

    response = await create_dream(
        req=DreamCreateRequest(
            title="月光之门",
            content="我梦见月亮落在水面上，一扇发光的门慢慢打开。",
            dream_date=date(2026, 4, 30),
            mood="calm",
            clarity=5,
            is_lucid=False,
            is_public=True,
            is_anonymous=True,
            tags=["月亮", "门", "月亮"],
        ),
        db=FakeDb(),
        user=SimpleNamespace(id=7),
    )

    assert response.title == "月光之门"
    assert [tag.tag for tag in response.tags] == ["月亮", "门"]
