# DreamLog — AI 梦境日志与解析社区

## 一、产品概述

**产品名称**：DreamLog（梦境志）

**一句话定位**：用 AI 记录、可视化和解读你的梦，在社区中发现"撞梦"的人。

**核心价值**：
- 记录梦境 → AI 智能解读（心理学 + 文化角度）
- 梦境描述 → AI 生成梦境画面（视觉冲击力）
- 社区分享 → 发现"撞梦"、互动讨论

**目标用户**：18-35 岁，对心理学、自我探索、新奇体验感兴趣的年轻人。

---

## 二、功能规划

### Phase 1：MVP（第 1-2 周）

| 功能模块 | 描述 | 优先级 |
|---------|------|--------|
| 梦境记录 | 文字输入梦境描述（支持语音转文字） | P0 |
| AI 解读 | 基于梦境内容生成心理学/文化解读报告 | P0 |
| AI 绘梦 | 根据梦境描述生成 1 张梦境画面 | P0 |
| 梦境卡片 | 生成可分享的精美梦境卡片（画面 + 解读摘要） | P0 |
| 社区广场 | 查看其他人分享的梦境，点赞 | P1 |
| 撞梦匹配 | AI 分析梦境相似度，发现"撞梦"的人 | P1 |
| 用户系统 | 微信登录（小程序）/ 手机号登录（Web） | P0 |

### Phase 2：增长期（第 3-4 周）

| 功能模块 | 描述 |
|---------|------|
| 语音记录 | 语音输入，AI 自动转文字并优化描述 |
| 梦境日历 | 日历视图查看历史梦境 |
| 梦境标签 | 自动提取梦境关键词标签 |
| 评论互动 | 对他人梦境评论、回复 |
| 梦境统计 | 个人梦境数据分析（高频元素、情绪趋势） |

### Phase 3：成熟期（第 5-8 周）

| 功能模块 | 描述 |
|---------|------|
| 梦境连续剧 | 自动检测连续多晚相关联的梦，生成"剧情线" |
| 梦境地图 | 全站热门梦境元素的可视化地图 |
| 专业解读 | 引入心理咨询师提供付费深度解读 |
| 会员体系 | 高级 AI 绘梦风格、无限解读次数等 |
| 梦境周报 | 每周 AI 生成个人梦境分析报告 |

---

## 三、技术架构

### 整体架构

```
┌─────────────────────────────────────────────┐
│              客户端层 (Client)                │
│  ┌──────────────┐  ┌──────────────────────┐  │
│  │  微信小程序   │  │   Web（Next.js）      │  │
│  │  (Taro/uni)  │  │   PC + H5 自适应      │  │
│  └──────┬───────┘  └──────────┬───────────┘  │
│         │                     │              │
│         └──────────┬──────────┘              │
│                    ▼                         │
│  ┌─────────────────────────────────────────┐ │
│  │         API Gateway (Nginx)             │ │
│  └────────────────┬────────────────────────┘ │
└───────────────────┼──────────────────────────┘
                    ▼
┌─────────────────────────────────────────────┐
│              服务端层 (Backend)               │
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │用户服务   │ │梦境服务   │ │ AI 服务    │  │
│  │(Auth)    │ │(CRUD)    │ │(解读/绘图) │  │
│  └────┬─────┘ └────┬─────┘ └─────┬──────┘  │
│       │            │             │          │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │社区服务   │ │推荐服务   │ │ 通知服务   │  │
│  │(Feed)    │ │(撞梦匹配) │ │(消息推送)  │  │
│  └──────────┘ └──────────┘ └────────────┘  │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│              数据层 (Data)                    │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │PostgreSQL│ │  Redis   │ │  OSS/S3    │  │
│  │(主数据库) │ │(缓存/队列)│ │(图片存储)  │  │
│  └──────────┘ └──────────┘ └────────────┘  │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│            第三方服务 (External)              │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │Claude API│ │ DALL·E / │ │ 微信开放   │  │
│  │(梦境解读) │ │ SD API   │ │ 平台      │  │
│  │          │ │(梦境绘图) │ │           │  │
│  └──────────┘ └──────────┘ └────────────┘  │
└─────────────────────────────────────────────┘
```

### 技术选型

| 层级 | 技术 | 说明 |
|-----|------|------|
| **小程序端** | uni-app (Vue 3) | 一套代码多端运行，快速开发 |
| **Web 端** | Next.js 14 (React) | SSR 利于 SEO，社区内容被搜索引擎收录 |
| **后端框架** | Python FastAPI | 异步高性能，你熟悉 Python，开发效率高 |
| **数据库** | PostgreSQL + pgvector | 主数据存储 + 向量检索（撞梦匹配） |
| **缓存** | Redis | 热门梦境缓存、排行榜、限流 |
| **AI 解读** | Claude API | 高质量文本理解和生成 |
| **AI 绘图** | Stable Diffusion API / DALL·E 3 | 根据梦境描述生成画面 |
| **对象存储** | 阿里云 OSS / AWS S3 | 存储 AI 生成的梦境图片 |
| **部署** | Docker + 阿里云 ECS | 简单可控，MVP 阶段足够 |
| **消息队列** | Redis Stream / Celery | AI 任务异步处理 |

---

## 四、数据库设计

### 核心表结构

```sql
-- 用户表
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    nickname      VARCHAR(50) NOT NULL,
    avatar_url    VARCHAR(500),
    phone         VARCHAR(20) UNIQUE,
    wechat_openid VARCHAR(100) UNIQUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 梦境记录表
CREATE TABLE dreams (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id),
    content       TEXT NOT NULL,                    -- 梦境文字描述
    dream_date    DATE NOT NULL,                    -- 做梦日期
    mood          VARCHAR(20),                      -- 醒来后的情绪
    clarity       SMALLINT CHECK (clarity BETWEEN 1 AND 5),  -- 梦境清晰度
    is_lucid      BOOLEAN DEFAULT FALSE,            -- 是否清醒梦
    is_public     BOOLEAN DEFAULT FALSE,            -- 是否公开到社区
    image_url     VARCHAR(500),                     -- AI 生成的梦境图片
    embedding     vector(1536),                     -- 梦境语义向量（用于撞梦匹配）
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- AI 解读表
CREATE TABLE dream_interpretations (
    id            BIGSERIAL PRIMARY KEY,
    dream_id      BIGINT NOT NULL REFERENCES dreams(id),
    psychology    TEXT,                             -- 心理学解读
    symbolism     TEXT,                             -- 象征意义解读
    cultural      TEXT,                             -- 文化角度解读
    summary       VARCHAR(200),                     -- 一句话总结
    keywords      JSONB,                            -- 关键词标签
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 社区互动表
CREATE TABLE dream_likes (
    id            BIGSERIAL PRIMARY KEY,
    dream_id      BIGINT NOT NULL REFERENCES dreams(id),
    user_id       BIGINT NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dream_id, user_id)
);

CREATE TABLE dream_comments (
    id            BIGSERIAL PRIMARY KEY,
    dream_id      BIGINT NOT NULL REFERENCES dreams(id),
    user_id       BIGINT NOT NULL REFERENCES users(id),
    content       VARCHAR(500) NOT NULL,
    parent_id     BIGINT REFERENCES dream_comments(id),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 撞梦记录表
CREATE TABLE dream_matches (
    id            BIGSERIAL PRIMARY KEY,
    dream_a_id    BIGINT NOT NULL REFERENCES dreams(id),
    dream_b_id    BIGINT NOT NULL REFERENCES dreams(id),
    similarity    FLOAT NOT NULL,                   -- 相似度分数
    match_reason  VARCHAR(200),                     -- 匹配原因描述
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_dreams_user_id ON dreams(user_id);
CREATE INDEX idx_dreams_dream_date ON dreams(dream_date);
CREATE INDEX idx_dreams_is_public ON dreams(is_public);
CREATE INDEX idx_dreams_embedding ON dreams USING ivfflat (embedding vector_cosine_ops);
```

---

## 五、核心 API 设计

```
POST   /api/v1/auth/login/wechat        微信登录
POST   /api/v1/auth/login/phone          手机号登录

POST   /api/v1/dreams                     创建梦境记录
GET    /api/v1/dreams                     获取我的梦境列表
GET    /api/v1/dreams/:id                 获取梦境详情
DELETE /api/v1/dreams/:id                 删除梦境

POST   /api/v1/dreams/:id/interpret       触发 AI 解读
GET    /api/v1/dreams/:id/interpretation  获取解读结果

POST   /api/v1/dreams/:id/generate-image  触发 AI 绘梦
GET    /api/v1/dreams/:id/share-card      获取分享卡片

GET    /api/v1/community/feed             社区梦境流
GET    /api/v1/community/trending         热门梦境
POST   /api/v1/dreams/:id/like            点赞
POST   /api/v1/dreams/:id/comments        评论

GET    /api/v1/dreams/:id/matches         获取撞梦结果
GET    /api/v1/community/dream-map        梦境热点地图数据
```

---

## 六、AI Prompt 设计

### 梦境解读 Prompt（Claude API）

```
你是一位专业的梦境分析师，同时精通荣格心理学、弗洛伊德释梦理论和东西方梦境文化。

用户描述了一个梦境，请从以下三个角度进行解读：

1. **心理学解读**：从潜意识、情绪、近期生活压力等角度分析
2. **象征意义**：梦中出现的事物/人物/场景的象征含义
3. **文化视角**：东方（周公解梦等）或西方文化中对类似梦境的传统解读

要求：
- 语气温暖、有趣，不要过于学术化
- 每个角度 2-3 句话
- 最后给一句有诗意的总结
- 提取 3-5 个关键词标签

用户的梦境描述：
{dream_content}

醒来后的情绪：{mood}
梦境清晰度：{clarity}/5
```

### AI 绘梦 Prompt（图像生成）

```
基于以下梦境描述，生成一幅超现实主义风格的梦境画面：

梦境：{dream_content}

要求：
- 风格：超现实主义 + 柔和梦幻光影
- 色调：根据梦境情绪选择（温暖/冷淡/神秘）
- 构图：突出梦境中最核心的场景元素
- 氛围：朦胧、飘逸、有梦的质感
```

---

## 七、开发计划（不限时间，按质量交付）

### Phase 1：基础搭建（第 1-2 周）

**目标**：搭好技术地基，跑通核心链路

| 任务 | 详情 | 预估时间 |
|------|------|---------|
| 后端项目初始化 | FastAPI 脚手架、目录规范、Docker Compose 环境（PostgreSQL + Redis + pgvector） | 2 天 |
| 数据库设计与建表 | 所有核心表、索引、迁移脚本（Alembic） | 1 天 |
| 用户系统 | 微信小程序登录 + 手机号验证码登录 + JWT 鉴权中间件 | 3 天 |
| 小程序项目初始化 | uni-app (Vue 3) 脚手架、路由、请求封装、UI 组件库选型 | 2 天 |
| 登录页 + 引导页 | 小程序端登录流程 + 首次使用引导 | 2 天 |
| **里程碑** | ✅ 用户可以注册登录，前后端跑通 | |

### Phase 2：梦境记录与 AI 解读（第 3-4 周）

**目标**：核心体验闭环——记梦 → AI 解读 → AI 绘梦

| 任务 | 详情 | 预估时间 |
|------|------|---------|
| 梦境 CRUD API | 创建/查询/删除梦境，列表分页 | 2 天 |
| 梦境记录页面 | 文字输入 + 情绪选择 + 清晰度打分 + 日期选择 UI | 3 天 |
| AI 解读服务 | 对接 Claude API，Prompt 调优，异步任务处理（Celery + Redis） | 3 天 |
| AI 绘梦服务 | 对接 Stable Diffusion / DALL·E API，图片生成 + OSS 上传 | 3 天 |
| 梦境详情页 | 展示梦境内容 + AI 解读（心理学/象征/文化）+ AI 生成画面 | 3 天 |
| AI 效果调优 | 反复测试不同类型梦境的解读质量和绘图效果，优化 Prompt | 3 天 |
| **里程碑** | ✅ 用户可以记录梦境，获得 AI 解读和梦境画面 | |

### Phase 3：分享与传播（第 5-6 周）

**目标**：让用户的梦境能被分享出去

| 任务 | 详情 | 预估时间 |
|------|------|---------|
| 梦境卡片生成 | 后端 Canvas/Pillow 生成精美分享卡片（画面 + 解读摘要 + 二维码） | 3 天 |
| 分享功能 | 小程序分享到微信好友/朋友圈 + 生成海报图片 | 2 天 |
| 我的梦境列表 | 时间线/日历两种视图 + 搜索 | 3 天 |
| 梦境标签系统 | AI 自动提取关键词标签 + 标签筛选 | 2 天 |
| 视觉打磨 | 整体 UI 风格定稿，动画过渡，加载状态优化 | 3 天 |
| **里程碑** | ✅ 完整的个人梦境管理体验 + 社交传播能力 | |

### Phase 4：社区功能（第 7-9 周）

**目标**：从工具变成社区

| 任务 | 详情 | 预估时间 |
|------|------|---------|
| 社区 Feed API | 公开梦境流、热门排序、时间排序 | 3 天 |
| 社区广场页 | 瀑布流展示梦境卡片，支持刷新和加载更多 | 3 天 |
| 点赞 + 评论 | 点赞动画，嵌套评论，通知提醒 | 4 天 |
| 撞梦匹配 | pgvector 向量相似度检索 + 匹配原因生成 | 4 天 |
| 撞梦展示 | "和你做了同一个梦的人" 页面，引导关注/互动 | 3 天 |
| 举报与内容审核 | 敏感内容过滤 + 举报功能 + 管理后台 | 3 天 |
| **里程碑** | ✅ 社区可用，用户之间可互动 | |

### Phase 5：Web 端 + 高级功能（第 10-12 周）

**目标**：多端覆盖 + 差异化功能

| 任务 | 详情 | 预估时间 |
|------|------|---------|
| Web 端搭建 | Next.js 14，SSR，PC + H5 自适应 | 5 天 |
| Web 端核心页面 | 首页、记录页、详情页、社区页、个人中心 | 5 天 |
| 语音记梦 | 接入语音识别 API（讯飞/微信同声传译），语音转文字 + AI 润色 | 4 天 |
| 梦境统计 | 个人高频梦境元素、情绪趋势图、做梦频率分析 | 3 天 |
| 梦境连续剧 | AI 检测多晚关联的梦，自动生成"剧情线"叙事 | 3 天 |
| 梦境地图 | 全站热门梦境元素可视化（词云/力导向图） | 3 天 |
| **里程碑** | ✅ Web + 小程序双端上线，功能完整 | |

### Phase 6：商业化 + 增长（第 13-16 周）

**目标**：变现 + 用户增长

| 任务 | 详情 | 预估时间 |
|------|------|---------|
| 会员体系 | 会员等级、权益设计、微信/支付宝支付对接 | 5 天 |
| 高级绘梦风格 | 水彩、赛博朋克、国风、油画等多种 AI 绘图风格（会员专属） | 3 天 |
| 梦境周报 | 每周 AI 生成个人梦境分析报告 + 推送 | 3 天 |
| SEO 优化 | Web 端结构化数据、Sitemap、梦境内容页 SEO | 3 天 |
| 运营工具 | 每日话题、推荐算法、用户留存分析后台 | 5 天 |
| 性能优化 | 接口响应优化、CDN、数据库慢查询排查 | 3 天 |
| 安全审计 | 接口安全、数据加密、隐私合规检查 | 3 天 |
| **里程碑** | ✅ 产品具备商业化能力，可正式推广 | |

---

## 八、成本估算（月度）

| 项目 | 服务 | 预估月费 |
|------|------|---------|
| 服务器 | 阿里云 ECS 2核4G | ¥200 |
| 数据库 | 阿里云 RDS PostgreSQL | ¥150（或自建） |
| AI 解读 | Claude API | ¥200-500（按量） |
| AI 绘图 | SD API / DALL·E 3 | ¥300-800（按量） |
| 对象存储 | OSS | ¥20 |
| 域名 + SSL | | ¥100/年 |
| **合计** | | **约 ¥900-1700/月** |

> MVP 阶段每天 100 个用户使用，月成本约 ¥1000 左右。可控。

---

## 九、变现模式

1. **免费增值**：每天免费记录 1 个梦 + 1 次 AI 解读，会员不限次数
2. **高级绘梦**：多种艺术风格（水彩、赛博朋克、国风等）需会员
3. **梦境报告**：周报/月报深度分析，会员专属
4. **专家解读**：引入心理咨询师，按次付费
5. **会员定价**：¥9.9/月 或 ¥68/年

---

## 十、增长策略

1. **社交裂变**：梦境卡片分享到朋友圈/微博，带产品水印和二维码
2. **话题运营**：每日发起"今日梦境话题"，如"昨晚有人梦到飞行吗？"
3. **撞梦社交**：发现和你做了同一个梦的陌生人，天然好奇心驱动
4. **KOL 合作**：找心理学、玄学、新奇事物类博主体验推广
5. **SEO 内容**：Web 端梦境解读内容被搜索引擎收录，获取长尾流量
