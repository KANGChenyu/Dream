"""
梦境相关 Schema
"""
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field


# ===== 请求 =====

class DreamCreateRequest(BaseModel):
    content: str = Field(..., min_length=10, max_length=5000, description="梦境描述")
    dream_date: date = Field(..., description="做梦日期")
    mood: Optional[str] = Field(None, pattern=r"^(calm|happy|anxious|scared|confused|sad)$")
    clarity: Optional[int] = Field(None, ge=1, le=5)
    is_lucid: bool = False
    is_public: bool = False
    is_anonymous: bool = True


class DreamUpdateRequest(BaseModel):
    content: Optional[str] = Field(None, min_length=10, max_length=5000)
    mood: Optional[str] = None
    clarity: Optional[int] = Field(None, ge=1, le=5)
    is_public: Optional[bool] = None
    is_anonymous: Optional[bool] = None


class DreamPublishRequest(BaseModel):
    is_anonymous: bool = False


class GenerateImageRequest(BaseModel):
    style: str = Field(default="surreal_dreamlike", description="绘图风格")


# ===== 响应 =====

class InterpretationResponse(BaseModel):
    psychology: str
    symbolism: str
    cultural: str
    summary: str
    advice: Optional[str]
    keywords: list[str]

    model_config = {"from_attributes": True}


class DreamTagResponse(BaseModel):
    tag: str

    model_config = {"from_attributes": True}


class DreamResponse(BaseModel):
    id: int
    content: str
    title: Optional[str]
    dream_date: date
    mood: Optional[str]
    clarity: Optional[int]
    is_lucid: bool
    is_public: bool
    is_anonymous: bool
    image_url: Optional[str]
    image_style: Optional[str]
    share_card_url: Optional[str]
    like_count: int
    comment_count: int
    view_count: int
    interpretation: Optional[InterpretationResponse]
    tags: list[DreamTagResponse]
    created_at: datetime

    model_config = {"from_attributes": True}


class DreamListResponse(BaseModel):
    items: list[DreamResponse]
    total: int
    page: int
    page_size: int


class DreamMatchResponse(BaseModel):
    dream: DreamResponse
    similarity: float
    match_reason: Optional[str]

    model_config = {"from_attributes": True}
