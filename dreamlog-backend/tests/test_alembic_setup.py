from pathlib import Path


def test_alembic_setup_files_exist():
    backend_root = Path(__file__).resolve().parents[1]

    assert (backend_root / "alembic.ini").exists()
    assert (backend_root / "alembic" / "env.py").exists()
    assert (backend_root / "alembic" / "versions" / "20260525_0001_create_current_schema.py").exists()


def test_initial_migration_imports_metadata_create_all():
    backend_root = Path(__file__).resolve().parents[1]
    migration = backend_root / "alembic" / "versions" / "20260525_0001_create_current_schema.py"

    content = migration.read_text(encoding="utf-8")

    assert "Base.metadata.create_all" in content
    assert "CREATE EXTENSION IF NOT EXISTS vector" in content
