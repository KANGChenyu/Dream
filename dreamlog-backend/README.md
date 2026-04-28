# DreamLog Backend

AI 梦境日志与解析社区 — 后端服务

## 技术栈

- **框架**: FastAPI (Python 3.11+)
- **数据库**: PostgreSQL 16 + pgvector
- **缓存**: Redis 7
- **任务队列**: Celery + Redis
- **AI 解读**: Claude API（可切换）
- **AI 绘图**: Stable Diffusion / DALL·E（可切换）
- **对象存储**: 阿里云 OSS / AWS S3

## 快速启动

```bash
# 1. 启动依赖服务
docker-compose up -d

# 2. 安装 Python 依赖
pip install -r requirements.txt

# 3. 初始化数据库
alembic upgrade head

# 4. 启动开发服务器
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 5. 启动 Celery Worker（AI 异步任务）
celery -A app.tasks.worker worker --loglevel=info
```

## 项目结构

```
dreamlog-backend/
├── app/
│   ├── main.py              # FastAPI 入口
│   ├── api/v1/              # API 路由
│   │   ├── auth.py          # 认证相关
│   │   ├── dreams.py        # 梦境 CRUD + AI
│   │   └── community.py     # 社区功能
│   ├── core/                # 核心配置
│   │   ├── config.py        # 环境变量配置
│   │   ├── database.py      # 数据库连接
│   │   ├── security.py      # JWT 鉴权
│   │   └── deps.py          # 依赖注入
│   ├── models/              # SQLAlchemy 模型
│   │   ├── user.py
│   │   ├── dream.py
│   │   └── community.py
│   ├── schemas/             # Pydantic 请求/响应模型
│   │   ├── user.py
│   │   ├── dream.py
│   │   └── community.py
│   ├── services/            # 业务逻辑层
│   │   ├── ai/              # AI 服务抽象层
│   │   │   ├── base.py      # 抽象接口
│   │   │   ├── interpreter.py   # 解读服务工厂
│   │   │   ├── image_gen.py     # 绘图服务工厂
│   │   │   ├── claude_interpreter.py
│   │   │   └── dalle_generator.py
│   │   ├── dream_service.py
│   │   └── community_service.py
│   ├── tasks/               # Celery 异步任务
│   │   ├── worker.py
│   │   └── ai_tasks.py
│   └── utils/               # 工具函数
│       ├── oss.py           # 对象存储
│       └── share_card.py    # 分享卡片生成
├── alembic/                 # 数据库迁移
├── tests/                   # 测试
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```
