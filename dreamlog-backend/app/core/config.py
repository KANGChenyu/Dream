"""
DreamLog 核心配置
从环境变量加载所有配置项，支持 .env 文件
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    # ===== 应用 =====
    app_name: str = "DreamLog"
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "change-me"
    api_v1_prefix: str = "/api/v1"

    # ===== 数据库 =====
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "dreamlog"
    postgres_password: str = "dreamlog123"
    postgres_db: str = "dreamlog"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ===== Redis =====
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0

    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    # ===== JWT =====
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 10080  # 7 天

    # ===== AI 服务 =====
    ai_interpreter_provider: str = "claude"  # claude / openai / deepseek
    claude_api_key: Optional[str] = None
    claude_model: str = "claude-sonnet-4-20250514"

    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o"

    ai_image_provider: str = "dalle"  # dalle / stable_diffusion
    dalle_api_key: Optional[str] = None

    sd_api_url: str = "http://localhost:7860"
    sd_model: str = "dreamshaper_8"

    # ===== 对象存储 =====
    oss_provider: str = "aliyun"
    oss_access_key: Optional[str] = None
    oss_secret_key: Optional[str] = None
    oss_bucket: str = "dreamlog"
    oss_endpoint: str = "https://oss-cn-hangzhou.aliyuncs.com"
    oss_cdn_domain: str = ""

    # ===== 微信 =====
    wechat_app_id: Optional[str] = None
    wechat_app_secret: Optional[str] = None

    # ===== 短信 =====
    sms_provider: str = "aliyun"
    sms_access_key: Optional[str] = None
    sms_secret_key: Optional[str] = None
    sms_sign_name: str = "DreamLog"
    sms_template_code: str = ""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


@lru_cache()
def get_settings() -> Settings:
    """单例模式获取配置"""
    return Settings()
