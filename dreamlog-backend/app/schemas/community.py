"""
社区相关 Schema
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CommentCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    parent_id: Optional[int] = None


class CommentResponse(BaseModel):
    id: int
    content: str
    user_nickname: str
    user_avatar: Optional[str]
    parent_id: Optional[int]
    created_at: datetime


class FeedItemResponse(BaseModel):
    """社区 Feed 单条"""
    id: int
    title: Optional[str]
    content_preview: str  # 截取前 100 字
    dream_date: str
    mood: Optional[str]
    image_url: Optional[str]
    user_nickname: str
    user_avatar: Optional[str]
    like_count: int
    comment_count: int
    tags: list[str]
    is_liked: bool = False  # 当前用户是否已点赞
    created_at: datetime


class FeedResponse(BaseModel):
    items: list[FeedItemResponse]
    total: int
    page: int
    page_size: int
