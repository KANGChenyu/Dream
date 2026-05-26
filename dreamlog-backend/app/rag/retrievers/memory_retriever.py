from typing import Any, Iterable


async def build_private_evidence(
    user_id: int,
    selected_dream_id: int | None,
    dreams: Iterable[Any],
) -> list[dict]:
    evidence: list[dict] = []
    for dream in dreams:
        if dream.user_id != user_id:
            continue
        if selected_dream_id is not None and dream.id != selected_dream_id:
            relation = "recent_user_dream"
        else:
            relation = "selected_dream"
        evidence.append(
            {
                "dream_id": dream.id,
                "date": dream.dream_date.isoformat(),
                "title": dream.title,
                "summary": dream.content[:180],
                "mood": dream.mood,
                "relation": relation,
            }
        )
    return evidence
