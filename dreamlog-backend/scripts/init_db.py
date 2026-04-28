import asyncio

from sqlalchemy import text

from app.core.database import Base, engine
from app.models import community, dream, user  # noqa: F401


async def main() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)


if __name__ == "__main__":
    asyncio.run(main())
