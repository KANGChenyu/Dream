"""
梦境相关模型
"""
from datetime import datetime, date, timezone
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    BigInteger, String, Text, Date, DateTime,
    Boolean, SmallInteger, Float, ForeignKey, Index, JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Dream(Base):
    """梦境记录"""
    __tablename__ = "dreams"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="梦境文字描述")
    title: Mapped[str | None] = mapped_column(String(100), comment="AI 生成的梦境标题")
    dream_date: Mapped[date] = mapped_column(Date, nullable=False, comment="做梦日期")
    mood: Mapped[str | None] = mapped_column(String(20), comment="醒来后的情绪：calm/happy/anxious/scared/confused/sad")
    clarity: Mapped[int | None] = mapped_column(SmallInteger, comment="梦境清晰度 1-5")
    is_lucid: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否清醒梦")
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, index=True, comment="是否公开到社区")
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=True, comment="社区中是否匿名")

    # AI 生成内容
    image_url: Mapped[str | None] = mapped_column(String(500), comment="AI 生成的梦境图片")
    image_style: Mapped[str | None] = mapped_column(String(50), comment="绘图风格")
    share_card_url: Mapped[str | None] = mapped_column(String(500), comment="分享卡片图片")

    # 向量嵌入（用于撞梦匹配）
    embedding = mapped_column(Vector(1536), comment="梦境语义向量")

    # 统计
    like_count: Mapped[int] = mapped_column(BigInteger, default=0)
    comment_count: Mapped[int] = mapped_column(BigInteger, default=0)
    view_count: Mapped[int] = mapped_column(BigInteger, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # 关系
    user = relationship("User", back_populates="dreams")
    interpretation = relationship("DreamInterpretation", back_populates="dream", uselist=False, lazy="selectin")
    tags = relationship("DreamTag", back_populates="dream", lazy="selectin")

    __table_args__ = (
        Index("idx_dreams_user_date", "user_id", "dream_date"),
    )


class DreamInterpretation(Base):
    """AI 梦境解读"""
    __tablename__ = "dream_interpretations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    dream_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("dreams.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    psychology: Mapped[str | None] = mapped_column(Text, comment="心理学解读")
    symbolism: Mapped[str | None] = mapped_column(Text, comment="象征意义解读")
    cultural: Mapped[str | None] = mapped_column(Text, comment="文化角度解读")
    summary: Mapped[str | None] = mapped_column(String(300), comment="一句话诗意总结")
    advice: Mapped[str | None] = mapped_column(Text, comment="梦境建议")
    keywords: Mapped[dict | None] = mapped_column(JSON, comment="关键词标签列表")

    # 解读来源
    provider: Mapped[str | None] = mapped_column(String(20), comment="AI 供应商: claude/openai")
    model: Mapped[str | None] = mapped_column(String(50), comment="使用的模型")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # 关系
    dream = relationship("Dream", back_populates="interpretation")


class DreamTag(Base):
    """梦境标签"""
    __tablename__ = "dream_tags"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    dream_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("dreams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tag: Mapped[str] = mapped_column(String(30), nullable=False, index=True)

    dream = relationship("Dream", back_populates="tags")
