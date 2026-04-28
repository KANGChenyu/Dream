"""
用户相关 Schema
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ===== 请求 =====

class WechatLoginRequest(BaseModel):
    code: str = Field(..., description="微信小程序 login code")


class PhoneLoginRequest(BaseModel):
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$", description="手机号")
    code: str = Field(..., min_length=4, max_length=6, description="验证码")


class SendSmsRequest(BaseModel):
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$")


class UserUpdateRequest(BaseModel):
    nickname: Optional[str] = Field(None, max_length=50)
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=200)
    is_anonymous: Optional[bool] = None


# ===== 响应 =====

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    nickname: str
    avatar_url: Optional[str]
    bio: Optional[str]
    is_anonymous: bool
    is_vip: bool
    created_at: datetime

    model_config = {"from_attributes": True}
