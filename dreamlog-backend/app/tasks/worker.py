"""
Celery Worker 配置
处理 AI 解读、绘图等耗时任务
"""
from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "dreamlog",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 分钟超时
    worker_max_tasks_per_child=100,
)

# 自动发现任务
celery_app.autodiscover_tasks(["app.tasks"])
