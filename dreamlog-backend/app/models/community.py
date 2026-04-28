"""
社区互动模型：点赞、评论、撞梦匹配
"""
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger, String, Text, Float, DateTime,
    ForeignKey, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DreamLike(Base):
    """梦境点赞"""
    __tablename__ = "dream_likes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    dream_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("dreams.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        UniqueConstraint("dream_id", "user_id", name="uq_dream_like"),
    )


class DreamComment(Base):
    """梦境评论"""
    __tablename__ = "dream_comments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    dream_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("dreams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(String(500), nullable=False)
    parent_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("dream_comments.id", ondelete="CASCADE")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # 关系
    user = relationship("User", lazy="selectin")
    replies = relationship("DreamComment", lazy="selectin")


class DreamMatch(Base):
    """撞梦匹配记录"""
    __tablename__ = "dream_matches"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    dream_a_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("dreams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    dream_b_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("dreams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    similarity: Mapped[float] = mapped_column(Float, nullable=False, comment="相似度 0-1")
    match_reason: Mapped[str | None] = mapped_column(String(200), comment="AI 生成的匹配原因")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # 关系
    dream_a = relationship("Dream", foreign_keys=[dream_a_id], lazy="selectin")
    dream_b = relationship("Dream", foreign_keys=[dream_b_id], lazy="selectin")


class Notification(Base):
    """用户通知"""
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="like/comment/match/system"
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[str | None] = mapped_column(String(300))
    related_dream_id: Mapped[int | None] = mapped_column(BigInteger)
    is_read: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
