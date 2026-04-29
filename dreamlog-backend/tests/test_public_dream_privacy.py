from datetime import date, datetime, timezone
from types import SimpleNamespace

from app.api.v1.community import _to_public_dream_response


def test_public_dream_response_hides_interpretation():
    dream = SimpleNamespace(
        id=1,
        content="I dreamed of a quiet library.",
        title="Quiet library",
        dream_date=date(2026, 4, 29),
        mood="calm",
        clarity=4,
        is_lucid=False,
        is_public=True,
        is_anonymous=True,
        image_url=None,
        image_style=None,
        share_card_url=None,
        like_count=2,
        comment_count=1,
        view_count=8,
        interpretation=SimpleNamespace(
            psychology="private psychology",
            symbolism="private symbolism",
            cultural="private cultural note",
            summary="private summary",
            advice="private advice",
            keywords=["private"],
        ),
        tags=[],
        created_at=datetime(2026, 4, 29, tzinfo=timezone.utc),
    )

    response = _to_public_dream_response(dream)

    assert response.interpretation is None
