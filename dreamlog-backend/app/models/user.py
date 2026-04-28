"""
用户模型
"""
from datetime import datetime, timezone

from sqlalchemy import BigInteger, String, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    nickname: Mapped[str] = mapped_column(String(50), nullable=False, default="梦旅人")
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, index=True)
    wechat_openid: Mapped[str | None] = mapped_column(String(100), unique=True, index=True)
    wechat_unionid: Mapped[str | None] = mapped_column(String(100), unique=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=True, comment="社区中是否匿名显示")
    bio: Mapped[str | None] = mapped_column(String(200), comment="个人简介")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_vip: Mapped[bool] = mapped_column(Boolean, default=False)
    vip_expire_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # 关系
    dreams = relationship("Dream", back_populates="user", lazy="selectin")
