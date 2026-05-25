"""create current schema

Revision ID: 20260525_0001
Revises:
Create Date: 2026-05-25
"""

from alembic import op
from sqlalchemy import text

from app.core.database import Base
from app.models import *  # noqa: F403,F401

revision = "20260525_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
