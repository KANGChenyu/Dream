from datetime import date

import pytest


class FakeDream:
    def __init__(self, dream_id: int, user_id: int, content: str):
        self.id = dream_id
        self.user_id = user_id
        self.content = content
        self.title = None
        self.dream_date = date(2026, 5, 25)
        self.mood = "anxious"
        self.tags = []


@pytest.mark.asyncio
async def test_memory_retriever_filters_to_current_user():
    from app.rag.retrievers.memory_retriever import build_private_evidence

    dreams = [
        FakeDream(1, 10, "我在森林里迷路"),
        FakeDream(2, 99, "另一个用户梦到掉牙"),
    ]

    evidence = await build_private_evidence(user_id=10, selected_dream_id=1, dreams=dreams)

    assert [item["dream_id"] for item in evidence] == [1]
