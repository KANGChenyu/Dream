"""
梦境 CRUD + AI 解读/绘图 API
"""
from datetime import date
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.dream import Dream, DreamInterpretation, DreamTag
from app.schemas.dream import (
    DreamCreateRequest, DreamUpdateRequest, DreamResponse,
    DreamListResponse, GenerateImageRequest, DreamMatchResponse,
)
from app.services.ai import get_interpreter, get_image_generator

settings = get_settings()
router = APIRouter(prefix="/dreams", tags=["梦境"])


async def _persist_generated_image(
    dream_id: int,
    image_data: bytes,
    storage_dir: str | Path | None = None,
) -> str:
    if not image_data:
        raise RuntimeError("AI 绘梦服务没有返回可保存的图片。")

    target_dir = Path(storage_dir or settings.generated_image_dir)
    target_dir.mkdir(parents=True, exist_ok=True)

    filename = f"dream-{dream_id}-{uuid4().hex}.png"
    (target_dir / filename).write_bytes(image_data)
    return f"{settings.generated_image_url_prefix}/{filename}"


@router.post("", response_model=DreamResponse, status_code=201)
async def create_dream(
    req: DreamCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """创建梦境记录"""
    dream = Dream(
        user_id=user.id,
        content=req.content,
        dream_date=req.dream_date,
        mood=req.mood,
        clarity=req.clarity,
        is_lucid=req.is_lucid,
        is_public=req.is_public,
        is_anonymous=req.is_anonymous,
    )
    db.add(dream)
    await db.flush()
    await db.refresh(dream)
    return DreamResponse.model_validate(dream)


@router.get("", response_model=DreamListResponse)
async def list_my_dreams(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    mood: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取我的梦境列表"""
    query = select(Dream).where(Dream.user_id == user.id)

    if mood:
        query = query.where(Dream.mood == mood)
    if start_date:
        query = query.where(Dream.dream_date >= start_date)
    if end_date:
        query = query.where(Dream.dream_date <= end_date)

    # 总数
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # 分页
    query = query.order_by(desc(Dream.dream_date), desc(Dream.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    dreams = result.scalars().all()

    return DreamListResponse(
        items=[DreamResponse.model_validate(d) for d in dreams],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{dream_id}", response_model=DreamResponse)
async def get_dream(
    dream_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取梦境详情"""
    result = await db.execute(
        select(Dream).where(Dream.id == dream_id, Dream.user_id == user.id)
    )
    dream = result.scalar_one_or_none()
    if not dream:
        raise HTTPException(status_code=404, detail="梦境不存在")
    return DreamResponse.model_validate(dream)


@router.put("/{dream_id}", response_model=DreamResponse)
async def update_dream(
    dream_id: int,
    req: DreamUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """更新梦境"""
    result = await db.execute(
        select(Dream).where(Dream.id == dream_id, Dream.user_id == user.id)
    )
    dream = result.scalar_one_or_none()
    if not dream:
        raise HTTPException(status_code=404, detail="梦境不存在")

    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dream, key, value)
    await db.flush()
    await db.refresh(dream)
    return DreamResponse.model_validate(dream)


@router.delete("/{dream_id}", status_code=204)
async def delete_dream(
    dream_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """删除梦境"""
    result = await db.execute(
        select(Dream).where(Dream.id == dream_id, Dream.user_id == user.id)
    )
    dream = result.scalar_one_or_none()
    if not dream:
        raise HTTPException(status_code=404, detail="梦境不存在")
    await db.delete(dream)


@router.post("/{dream_id}/interpret", response_model=DreamResponse)
async def interpret_dream(
    dream_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """触发 AI 解读梦境"""
    result = await db.execute(
        select(Dream).where(Dream.id == dream_id, Dream.user_id == user.id)
    )
    dream = result.scalar_one_or_none()
    if not dream:
        raise HTTPException(status_code=404, detail="梦境不存在")

    # 调用 AI 解读
    if dream.interpretation:
        return DreamResponse.model_validate(dream)

    interpreter = get_interpreter()
    try:
        interpret_result = await interpreter.interpret(
            dream_content=dream.content,
            mood=dream.mood,
            clarity=dream.clarity,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="AI 解读服务暂时不可用，请稍后重试。") from exc

    # 保存解读结果
    interpretation = DreamInterpretation(
        dream_id=dream.id,
        psychology=interpret_result.psychology,
        symbolism=interpret_result.symbolism,
        cultural=interpret_result.cultural,
        summary=interpret_result.summary,
        advice=interpret_result.advice,
        keywords=interpret_result.keywords,
        provider=interpret_result.provider,
        model=interpret_result.model,
    )
    db.add(interpretation)

    # 更新梦境标题
    if interpret_result.title:
        dream.title = interpret_result.title

    # 保存标签
    for keyword in interpret_result.keywords:
        tag = DreamTag(dream_id=dream.id, tag=keyword)
        db.add(tag)

    await db.flush()
    await db.refresh(dream)
    return DreamResponse.model_validate(dream)


@router.post("/{dream_id}/generate-image", response_model=DreamResponse)
async def generate_dream_image(
    dream_id: int,
    req: GenerateImageRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """AI 绘梦 — 根据梦境描述生成图片"""
    result = await db.execute(
        select(Dream).where(Dream.id == dream_id, Dream.user_id == user.id)
    )
    dream = result.scalar_one_or_none()
    if not dream:
        raise HTTPException(status_code=404, detail="梦境不存在")

    try:
        generator = get_image_generator()
        image_result = await generator.generate(
            dream_content=dream.content,
            mood=dream.mood,
            style=req.style,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="AI 绘梦服务暂时不可用，请稍后重试。") from exc

    # TODO: replace local persistence with OSS and keep this endpoint contract.
    dream.image_url = await _persist_generated_image(
        dream_id=dream.id,
        image_data=image_result.image_data,
    )
    dream.image_style = image_result.style

    await db.flush()
    await db.refresh(dream)
    return DreamResponse.model_validate(dream)


@router.get("/{dream_id}/matches", response_model=list[DreamMatchResponse])
async def get_dream_matches(
    dream_id: int,
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取撞梦匹配结果"""
    result = await db.execute(
        select(Dream).where(Dream.id == dream_id, Dream.user_id == user.id)
    )
    dream = result.scalar_one_or_none()
    if not dream:
        raise HTTPException(status_code=404, detail="梦境不存在")

    if dream.embedding is None:
        raise HTTPException(status_code=400, detail="梦境尚未生成向量，请先触发 AI 解读")

    # pgvector 相似度检索
    similar_query = (
        select(
            Dream,
            Dream.embedding.cosine_distance(dream.embedding).label("distance"),
        )
        .where(
            Dream.id != dream.id,
            Dream.is_public == True,
            Dream.embedding.isnot(None),
        )
        .order_by("distance")
        .limit(limit)
    )
    results = await db.execute(similar_query)

    matches = []
    for row in results:
        similar_dream = row[0]
        distance = row[1]
        similarity = 1 - distance  # cosine_distance → similarity
        if similarity > 0.7:  # 只返回相似度较高的
            matches.append(DreamMatchResponse(
                dream=DreamResponse.model_validate(similar_dream),
                similarity=round(similarity, 3),
                match_reason=None,  # TODO: AI 生成匹配原因
            ))

    return matches


async def _generate_embedding(dream_id: int, content: str, db: AsyncSession):
    """后台任务：生成梦境向量嵌入"""
    try:
        interpreter = get_interpreter()
        embedding = await interpreter.generate_embedding(content)

        result = await db.execute(select(Dream).where(Dream.id == dream_id))
        dream = result.scalar_one_or_none()
        if dream:
            dream.embedding = embedding
            await db.commit()
    except Exception as e:
        print(f"生成向量嵌入失败: {e}")
