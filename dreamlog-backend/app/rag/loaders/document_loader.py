from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class LoadedDocument:
    title: str
    source_type: str
    source_path: str
    content: str


def load_document(path: Path, source_type: str) -> LoadedDocument:
    content = path.read_text(encoding="utf-8")
    title = path.stem

    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            title = stripped.lstrip("#").strip() or title
            break

    return LoadedDocument(
        title=title,
        source_type=source_type,
        source_path=str(path),
        content=content,
    )
