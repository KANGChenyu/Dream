"""
DreamLog — AI 梦境日志与解析社区
FastAPI 应用入口
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.api.v1.auth import router as auth_router
from app.api.v1.dreams import router as dreams_router
from app.api.v1.community import router as community_router

settings = get_settings()
Path(settings.generated_image_dir).mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动/关闭时执行"""
    # 启动时
    print(f"🌙 DreamLog 启动中... 环境: {settings.app_env}")
    yield
    # 关闭时
    print("🌙 DreamLog 已关闭")


app = FastAPI(
    title="DreamLog API",
    description="AI 梦境日志与解析社区",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Next.js 开发
        "http://127.0.0.1:3000",      # Next.js 开发
        "http://localhost:5173",      # Vite 开发
        "http://127.0.0.1:5173",      # Vite 开发
        "https://dreamlog.app",       # 生产域名
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(dreams_router, prefix=settings.api_v1_prefix)
app.include_router(community_router, prefix=settings.api_v1_prefix)
app.mount(
    settings.generated_image_url_prefix,
    StaticFiles(directory=settings.generated_image_dir),
    name="generated-images",
)


@app.get("/")
async def root():
    return {
        "name": "DreamLog API",
        "version": "0.1.0",
        "message": "每一个梦，都是心灵深处的回响",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
