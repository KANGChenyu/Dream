"""
社区功能 API
Feed 流 / 点赞 / 评论 / 热门
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, exists
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.dream import Dream, DreamTag
from app.models.community import DreamLike, DreamComment, Notification
from app.schemas.community import (
    CommentCreateRequest, CommentResponse,
    FeedItemResponse, FeedResponse,
)
from app.schemas.dream import DreamResponse

router = APIRouter(prefix="/community", tags=["社区"])


@router.get("/feed", response_model=FeedResponse)
async def get_feed(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    sort: str = Query("latest", pattern=r"^(latest|hot)$"),
    tag: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """获取社区梦境 Feed"""
    query = select(Dream).options(selectinload(Dream.user)).where(Dream.is_public == True)

    # 标签筛选
    if tag:
        query = query.join(DreamTag).where(DreamTag.tag == tag)

    # 排序
    if sort == "hot":
        query = query.order_by(desc(Dream.like_count + Dream.comment_count), desc(Dream.created_at))
    else:
        query = query.order_by(desc(Dream.created_at))

    # 总数
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # 分页
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    dreams = result.scalars().all()

    items = []
    for dream in dreams:
        # 检查当前用户是否已点赞
        is_liked = False
        if user:
            like_exists = await db.execute(
                select(exists().where(
                    DreamLike.dream_id == dream.id,
                    DreamLike.user_id == user.id,
                ))
            )
            is_liked = like_exists.scalar()

        # 获取标签
        tag_result = await db.execute(
            select(DreamTag.tag).where(DreamTag.dream_id == dream.id)
        )
        tags = [row[0] for row in tag_result]

        # 用户信息（匿名处理）
        dream_user = dream.user
        nickname = "匿名梦旅人" if dream.is_anonymous else dream_user.nickname
        avatar = None if dream.is_anonymous else dream_user.avatar_url

        items.append(FeedItemResponse(
            id=dream.id,
            title=dream.title,
            content_preview=dream.content[:100] + ("..." if len(dream.content) > 100 else ""),
            dream_date=str(dream.dream_date),
            mood=dream.mood,
            image_url=dream.image_url,
            user_nickname=nickname,
            user_avatar=avatar,
            like_count=dream.like_count,
            comment_count=dream.comment_count,
            tags=tags,
            is_liked=is_liked,
            created_at=dream.created_at,
        ))

    return FeedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/trending", response_model=FeedResponse)
async def get_trending(
    page_size: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """获取热门梦境"""
    return await get_feed(
        page=1, page_size=page_size, sort="hot",
        tag=None, db=db, user=user,
    )


@router.get("/dreams/{dream_id}", response_model=DreamResponse)
async def get_public_dream(
    dream_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取公开梦境详情"""
    result = await db.execute(
        select(Dream).where(Dream.id == dream_id, Dream.is_public == True)
    )
    dream = result.scalar_one_or_none()
    if not dream:
        raise HTTPException(status_code=404, detail="梦境不存在")
    return DreamResponse.model_validate(dream)


@router.post("/dreams/{dream_id}/like")
async def toggle_like(
    dream_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """点赞/取消点赞"""
    # 检查梦境是否存在且公开
    result = await db.execute(
        select(Dream).where(Dream.id == dream_id, Dream.is_public == True)
    )
    dream = result.scalar_one_or_none()
    if not dream:
        raise HTTPException(status_code=404, detail="梦境不存在")

    # 检查是否已点赞
    like_result = await db.execute(
        select(DreamLike).where(
            DreamLike.dream_id == dream_id,
            DreamLike.user_id == user.id,
        )
    )
    existing_like = like_result.scalar_one_or_none()

    if existing_like:
        # 取消点赞
        await db.delete(existing_like)
        dream.like_count = max(0, dream.like_count - 1)
        return {"liked": False, "like_count": dream.like_count}
    else:
        # 点赞
        like = DreamLike(dream_id=dream_id, user_id=user.id)
        db.add(like)
        dream.like_count += 1

        # 通知梦境作者（不通知自己）
        if dream.user_id != user.id:
            notification = Notification(
                user_id=dream.user_id,
                type="like",
                title="有人喜欢了你的梦境",
                content=f"有人觉得你的梦境很有共鸣",
                related_dream_id=dream_id,
            )
            db.add(notification)

        return {"liked": True, "like_count": dream.like_count}


@router.post("/dreams/{dream_id}/comments", response_model=CommentResponse)
async def create_comment(
    dream_id: int,
    req: CommentCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """发表评论"""
    # 检查梦境
    result = await db.execute(
        select(Dream).where(Dream.id == dream_id, Dream.is_public == True)
    )
    dream = result.scalar_one_or_none()
    if not dream:
        raise HTTPException(status_code=404, detail="梦境不存在")

    # 检查父评论
    if req.parent_id:
        parent = await db.execute(
            select(DreamComment).where(DreamComment.id == req.parent_id)
        )
        if not parent.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="父评论不存在")

    comment = DreamComment(
        dream_id=dream_id,
        user_id=user.id,
        content=req.content,
        parent_id=req.parent_id,
    )
    db.add(comment)
    dream.comment_count += 1

    # 通知
    if dream.user_id != user.id:
        notification = Notification(
            user_id=dream.user_id,
            type="comment",
            title="有人评论了你的梦境",
            content=req.content[:50],
            related_dream_id=dream_id,
        )
        db.add(notification)

    await db.flush()
    await db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        content=comment.content,
        user_nickname=user.nickname,
        user_avatar=user.avatar_url,
        parent_id=comment.parent_id,
        created_at=comment.created_at,
    )


@router.get("/dreams/{dream_id}/comments", response_model=list[CommentResponse])
async def get_comments(
    dream_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """获取梦境评论"""
    query = (
        select(DreamComment)
        .where(DreamComment.dream_id == dream_id, DreamComment.parent_id.is_(None))
        .order_by(desc(DreamComment.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    comments = result.scalars().all()

    return [
        CommentResponse(
            id=c.id,
            content=c.content,
            user_nickname=c.user.nickname if c.user else "匿名",
            user_avatar=c.user.avatar_url if c.user else None,
            parent_id=c.parent_id,
            created_at=c.created_at,
        )
        for c in comments
    ]


@router.get("/tags/popular", response_model=list[dict])
async def get_popular_tags(
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """获取热门梦境标签"""
    result = await db.execute(
        select(DreamTag.tag, func.count(DreamTag.id).label("count"))
        .group_by(DreamTag.tag)
        .order_by(desc("count"))
        .limit(limit)
    )
    return [{"tag": row[0], "count": row[1]} for row in result]
