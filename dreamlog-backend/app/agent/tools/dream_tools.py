from datetime import date, timedelta
from typing import Sequence

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dream import Dream


async def get_user_dream(db: AsyncSession, user_id: int, dream_id: int) -> Dream | None:
    result = await db.execute(select(Dream).where(Dream.id == dream_id, Dream.user_id == user_id))
    return result.scalar_one_or_none()


async def list_recent_user_dreams(
    db: AsyncSession,
    user_id: int,
    days: int = 30,
    limit: int = 20,
) -> Sequence[Dream]:
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(Dream)
        .where(Dream.user_id == user_id, Dream.dream_date >= since)
        .order_by(desc(Dream.dream_date), desc(Dream.created_at))
        .limit(limit)
    )
    return result.scalars().all()
