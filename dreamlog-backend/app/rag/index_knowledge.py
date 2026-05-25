import argparse
import asyncio
from pathlib import Path

from app.core.database import async_session, init_db
from app.rag.services.index_service import index_knowledge_directory


def default_knowledge_root() -> Path:
    return Path(__file__).resolve().parents[3] / "docs" / "knowledge"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Index DreamLog knowledge documents.")
    parser.add_argument(
        "--root",
        type=Path,
        default=default_knowledge_root(),
        help="Knowledge document root directory.",
    )
    return parser.parse_args(argv)


async def run(root: Path) -> int:
    await init_db()
    async with async_session() as session:
        try:
            count = await index_knowledge_directory(session, root)
            await session.commit()
            return count
        except Exception:
            await session.rollback()
            raise


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    count = asyncio.run(run(args.root))
    print(f"Indexed {count} knowledge chunks from {args.root}")


if __name__ == "__main__":
    main()
