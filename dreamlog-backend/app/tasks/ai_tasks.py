"""
AI 异步任务
梦境解读、绘图、向量生成等耗时操作
"""
import asyncio
from app.tasks.worker import celery_app


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def task_interpret_dream(self, dream_id: int):
    """异步执行梦境 AI 解读"""
    asyncio.run(_interpret_dream(dream_id))


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def task_generate_image(self, dream_id: int, style: str = "surreal_dreamlike"):
    """异步执行 AI 绘梦"""
    asyncio.run(_generate_image(dream_id, style))


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def task_generate_embedding(self, dream_id: int):
    """异步生成梦境向量嵌入"""
    asyncio.run(_generate_embedding(dream_id))


async def _interpret_dream(dream_id: int):
    from sqlalchemy import select
    from app.core.database import async_session
    from app.models.dream import Dream, DreamInterpretation, DreamTag
    from app.services.ai import get_interpreter

    async with async_session() as db:
        result = await db.execute(select(Dream).where(Dream.id == dream_id))
        dream = result.scalar_one_or_none()
        if not dream:
            return

        interpreter = get_interpreter()
        interpret_result = await interpreter.interpret(
            dream_content=dream.content,
            mood=dream.mood,
            clarity=dream.clarity,
        )

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

        if interpret_result.title:
            dream.title = interpret_result.title

        for keyword in interpret_result.keywords:
            db.add(DreamTag(dream_id=dream.id, tag=keyword))

        await db.commit()


async def _generate_image(dream_id: int, style: str):
    from sqlalchemy import select
    from app.core.database import async_session
    from app.models.dream import Dream
    from app.services.ai import get_image_generator

    async with async_session() as db:
        result = await db.execute(select(Dream).where(Dream.id == dream_id))
        dream = result.scalar_one_or_none()
        if not dream:
            return

        generator = get_image_generator()
        image_result = await generator.generate(
            dream_content=dream.content,
            mood=dream.mood,
            style=style,
        )

        # TODO: 上传 image_data 到 OSS
        dream.image_url = image_result.image_url
        dream.image_style = style
        await db.commit()


async def _generate_embedding(dream_id: int):
    from sqlalchemy import select
    from app.core.database import async_session
    from app.models.dream import Dream
    from app.services.ai import get_interpreter

    async with async_session() as db:
        result = await db.execute(select(Dream).where(Dream.id == dream_id))
        dream = result.scalar_one_or_none()
        if not dream:
            return

        interpreter = get_interpreter()
        embedding = await interpreter.generate_embedding(dream.content)
        dream.embedding = embedding
        await db.commit()
