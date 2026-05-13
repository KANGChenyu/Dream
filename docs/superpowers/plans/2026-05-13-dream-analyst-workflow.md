# DreamAnalystWorkflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现手动触发的 DreamAnalystWorkflow，让用户可以在梦境详情页生成、查看、重试和重新生成一份基于用户梦境记忆 RAG 的深度分析报告。

**Architecture:** 后端新增 `agent_reports` 持久化模型、梦境记忆检索工具、工作流服务、Celery 任务和 API 路由。前端在现有梦境详情页接入最新报告查询、创建报告、轮询状态和报告展示面板。第一版保留多 agent 角色边界，但由一个受控工作流统一执行。

**Tech Stack:** FastAPI, SQLAlchemy async, PostgreSQL/pgvector, Celery, Pydantic v2, React, TypeScript, Vitest, pytest.

---

## File Structure

后端新增或修改：

- Create: `dreamlog-backend/app/models/agent_report.py`
- Modify: `dreamlog-backend/app/models/__init__.py`
- Create: `dreamlog-backend/app/schemas/agent_report.py`
- Create: `dreamlog-backend/app/services/agents/__init__.py`
- Create: `dreamlog-backend/app/services/agents/dream_memory.py`
- Create: `dreamlog-backend/app/services/agents/dream_analyst.py`
- Create: `dreamlog-backend/app/tasks/agent_tasks.py`
- Create: `dreamlog-backend/app/api/v1/agent_reports.py`
- Modify: `dreamlog-backend/app/main.py`
- Test: `dreamlog-backend/tests/test_agent_report_api.py`
- Test: `dreamlog-backend/tests/test_dream_memory.py`
- Test: `dreamlog-backend/tests/test_dream_analyst_workflow.py`

前端新增或修改：

- Modify: `dreamlog-frontend/src/api/types.ts`
- Create: `dreamlog-frontend/src/dreams/DreamAgentReportPanel.tsx`
- Modify: `dreamlog-frontend/src/dreams/DreamDetailPage.tsx`
- Modify: `dreamlog-frontend/src/dreams/DreamDetailPage.test.tsx`
- Modify: `dreamlog-frontend/src/styles.css`

数据库说明：

- 当前仓库的 `dreamlog-backend/alembic/` 没有完整 `env.py`，本计划不补 Alembic 环境。
- `AgentReport` 会加入 SQLAlchemy metadata，因此本地开发环境可继续通过现有 `init_db()` 创建表。
- 如果生产环境需要迁移脚本，应先补 Alembic 初始化，再为 `agent_reports` 生成迁移；这不放入本次 MVP。

---

### Task 1: 后端 AgentReport 模型和 Schema

**Files:**
- Create: `dreamlog-backend/app/models/agent_report.py`
- Modify: `dreamlog-backend/app/models/__init__.py`
- Create: `dreamlog-backend/app/schemas/agent_report.py`
- Test: `dreamlog-backend/tests/test_agent_report_api.py`

- [ ] **Step 1: 写模型导入失败测试**

Create `dreamlog-backend/tests/test_agent_report_api.py`:

```python
def test_agent_report_model_exports_required_fields():
    from app.models import AgentReport

    columns = AgentReport.__table__.columns

    assert "user_id" in columns
    assert "dream_id" in columns
    assert "report_type" in columns
    assert "status" in columns
    assert "input_snapshot" in columns
    assert "result" in columns
    assert "error_message" in columns
    assert "provider" in columns
    assert "model" in columns
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd dreamlog-backend
pytest tests/test_agent_report_api.py::test_agent_report_model_exports_required_fields -q
```

Expected: FAIL with import error for `AgentReport`.

- [ ] **Step 3: 新增 AgentReport 模型**

Create `dreamlog-backend/app/models/agent_report.py`:

```python
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AgentReport(Base):
    __tablename__ = "agent_reports"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    dream_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("dreams.id", ondelete="CASCADE"), nullable=True, index=True)
    report_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)
    input_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    result: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    error_message: Mapped[str | None] = mapped_column(Text)
    provider: Mapped[str | None] = mapped_column(String(50))
    model: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User")
    dream = relationship("Dream")

    __table_args__ = (
        Index("idx_agent_reports_user_dream_type", "user_id", "dream_id", "report_type"),
        Index("idx_agent_reports_dream_type_status_created", "dream_id", "report_type", "status", "created_at"),
    )
```

- [ ] **Step 4: 导出模型**

Modify `dreamlog-backend/app/models/__init__.py`:

```python
from app.models.agent_report import AgentReport
from app.models.user import User
from app.models.dream import Dream, DreamInterpretation, DreamTag
from app.models.community import DreamLike, DreamComment, DreamMatch, Notification

__all__ = [
    "User",
    "Dream",
    "DreamInterpretation",
    "DreamTag",
    "DreamLike",
    "DreamComment",
    "DreamMatch",
    "Notification",
    "AgentReport",
]
```

- [ ] **Step 5: 新增 schema**

Create `dreamlog-backend/app/schemas/agent_report.py`:

```python
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


AgentReportStatus = Literal["pending", "running", "completed", "failed"]
AgentReportType = Literal["dream_deep_analysis"]


class AgentReportResult(BaseModel):
    title: str = Field(..., min_length=1)
    gentle_summary: str = Field(..., min_length=1)
    current_themes: list[str] = Field(default_factory=list)
    historical_connections: list[str] = Field(default_factory=list)
    recurring_symbols: list[str] = Field(default_factory=list)
    mood_trends: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    evidence_notes: list[str] = Field(default_factory=list)


class AgentReportCreateResponse(BaseModel):
    id: int
    status: AgentReportStatus
    report_type: AgentReportType

    model_config = {"from_attributes": True}


class AgentReportResponse(BaseModel):
    id: int
    user_id: int
    dream_id: int | None
    report_type: AgentReportType
    status: AgentReportStatus
    input_snapshot: dict[str, Any] | None
    result: AgentReportResult | None
    error_message: str | None
    provider: str | None
    model: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 6: 运行测试确认通过**

Run:

```bash
cd dreamlog-backend
pytest tests/test_agent_report_api.py::test_agent_report_model_exports_required_fields -q
```

Expected: PASS.

- [ ] **Step 7: 提交**

```bash
git add dreamlog-backend/app/models/agent_report.py dreamlog-backend/app/models/__init__.py dreamlog-backend/app/schemas/agent_report.py dreamlog-backend/tests/test_agent_report_api.py
git commit -m "feat: add agent report model and schemas"
```

---

### Task 2: 用户梦境记忆检索工具

**Files:**
- Create: `dreamlog-backend/app/services/agents/__init__.py`
- Create: `dreamlog-backend/app/services/agents/dream_memory.py`
- Test: `dreamlog-backend/tests/test_dream_memory.py`

- [ ] **Step 1: 写趋势摘要测试**

Create `dreamlog-backend/tests/test_dream_memory.py`:

```python
from datetime import date
from types import SimpleNamespace


def test_summarize_recent_dreams_counts_moods_and_tags():
    from app.services.agents.dream_memory import summarize_recent_dreams

    dreams = [
        SimpleNamespace(mood="calm", tags=[SimpleNamespace(tag="海"), SimpleNamespace(tag="门")]),
        SimpleNamespace(mood="calm", tags=[SimpleNamespace(tag="海")]),
        SimpleNamespace(mood="anxious", tags=[SimpleNamespace(tag="学校")]),
    ]

    summary = summarize_recent_dreams(dreams)

    assert summary == {
        "dream_count": 3,
        "mood_distribution": {"calm": 2, "anxious": 1},
        "frequent_tags": [{"tag": "海", "count": 2}, {"tag": "门", "count": 1}, {"tag": "学校", "count": 1}],
    }
```

- [ ] **Step 2: 写内容摘要测试**

Append to `dreamlog-backend/tests/test_dream_memory.py`:

```python
def test_build_current_dream_snapshot_keeps_compact_fields():
    from app.services.agents.dream_memory import build_current_dream_snapshot

    dream = SimpleNamespace(
        id=9,
        title="发光的门",
        content="我梦见一扇门在海边慢慢打开，门后是安静的星空。",
        dream_date=date(2026, 5, 1),
        mood="calm",
        clarity=4,
        is_lucid=False,
        tags=[SimpleNamespace(tag="门"), SimpleNamespace(tag="海")],
        interpretation=None,
    )

    snapshot = build_current_dream_snapshot(dream)

    assert snapshot["dream_id"] == 9
    assert snapshot["title"] == "发光的门"
    assert snapshot["mood"] == "calm"
    assert snapshot["tags"] == ["门", "海"]
    assert snapshot["existing_interpretation"] is None
```

- [ ] **Step 3: 运行测试确认失败**

Run:

```bash
cd dreamlog-backend
pytest tests/test_dream_memory.py -q
```

Expected: FAIL because `app.services.agents.dream_memory` does not exist.

- [ ] **Step 4: 新增 agents 包**

Create `dreamlog-backend/app/services/agents/__init__.py`:

```python
"""Agent workflow services for DreamLog."""
```

- [ ] **Step 5: 新增 dream_memory 工具**

Create `dreamlog-backend/app/services/agents/dream_memory.py`:

```python
from collections import Counter
from datetime import date, timedelta
from typing import Any, Iterable

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.dream import Dream


def _tag_values(dream: Any) -> list[str]:
    return [item.tag for item in getattr(dream, "tags", []) if getattr(item, "tag", "")]


def _content_summary(content: str, limit: int = 120) -> str:
    normalized = " ".join(content.split())
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[:limit].rstrip()}..."


def build_current_dream_snapshot(dream: Dream) -> dict[str, Any]:
    interpretation = getattr(dream, "interpretation", None)
    existing_interpretation = None
    if interpretation:
        existing_interpretation = {
            "summary": interpretation.summary,
            "psychology": interpretation.psychology,
            "symbolism": interpretation.symbolism,
            "cultural": interpretation.cultural,
            "advice": interpretation.advice,
            "keywords": interpretation.keywords or [],
        }

    return {
        "dream_id": dream.id,
        "title": dream.title,
        "content": dream.content,
        "dream_date": dream.dream_date.isoformat(),
        "mood": dream.mood,
        "clarity": dream.clarity,
        "is_lucid": dream.is_lucid,
        "tags": _tag_values(dream),
        "existing_interpretation": existing_interpretation,
    }


def summarize_recent_dreams(dreams: Iterable[Dream]) -> dict[str, Any]:
    dream_list = list(dreams)
    mood_counts = Counter(dream.mood for dream in dream_list if dream.mood)
    tag_counts = Counter(tag for dream in dream_list for tag in _tag_values(dream))

    return {
        "dream_count": len(dream_list),
        "mood_distribution": dict(mood_counts),
        "frequent_tags": [
            {"tag": tag, "count": count}
            for tag, count in tag_counts.most_common(8)
        ],
    }


def build_similar_dream_snapshot(dream: Dream, similarity: float | None = None) -> dict[str, Any]:
    return {
        "dream_id": dream.id,
        "dream_date": dream.dream_date.isoformat(),
        "title": dream.title,
        "content_summary": _content_summary(dream.content),
        "mood": dream.mood,
        "tags": _tag_values(dream),
        "similarity": similarity,
    }


async def get_recent_user_dreams(
    db: AsyncSession,
    user_id: int,
    *,
    days: int,
    exclude_dream_id: int | None = None,
) -> list[Dream]:
    start_date = date.today() - timedelta(days=days)
    query = (
        select(Dream)
        .options(selectinload(Dream.tags), selectinload(Dream.interpretation))
        .where(Dream.user_id == user_id, Dream.dream_date >= start_date)
        .order_by(desc(Dream.dream_date), desc(Dream.created_at))
    )
    if exclude_dream_id is not None:
        query = query.where(Dream.id != exclude_dream_id)

    result = await db.execute(query)
    return list(result.scalars().all())


async def get_similar_user_dreams(
    db: AsyncSession,
    dream: Dream,
    *,
    limit: int = 5,
) -> tuple[list[dict[str, Any]], str | None]:
    if dream.embedding is None:
        return [], "missing_embedding"

    query = (
        select(Dream, Dream.embedding.cosine_distance(dream.embedding).label("distance"))
        .options(selectinload(Dream.tags))
        .where(
            Dream.user_id == dream.user_id,
            Dream.id != dream.id,
            Dream.embedding.isnot(None),
        )
        .order_by("distance")
        .limit(limit)
    )
    result = await db.execute(query)

    snapshots = []
    for row in result:
        similar_dream = row[0]
        distance = row[1]
        similarity = None if distance is None else round(1 - distance, 3)
        snapshots.append(build_similar_dream_snapshot(similar_dream, similarity))

    return snapshots, None
```

- [ ] **Step 6: 运行测试确认通过**

Run:

```bash
cd dreamlog-backend
pytest tests/test_dream_memory.py -q
```

Expected: PASS.

- [ ] **Step 7: 提交**

```bash
git add dreamlog-backend/app/services/agents/__init__.py dreamlog-backend/app/services/agents/dream_memory.py dreamlog-backend/tests/test_dream_memory.py
git commit -m "feat: add dream memory helpers"
```

---

### Task 3: DreamAnalystWorkflow 服务

**Files:**
- Create: `dreamlog-backend/app/services/agents/dream_analyst.py`
- Test: `dreamlog-backend/tests/test_dream_analyst_workflow.py`

- [ ] **Step 1: 写结果校验测试**

Create `dreamlog-backend/tests/test_dream_analyst_workflow.py`:

```python
import pytest


def test_validate_agent_report_result_requires_all_fields():
    from app.services.agents.dream_analyst import validate_agent_report_result

    result = validate_agent_report_result({
        "title": "海边的门",
        "gentle_summary": "这个梦像是在提醒你靠近一个新的出口。",
        "current_themes": ["边界", "选择"],
        "historical_connections": [],
        "recurring_symbols": ["海", "门"],
        "mood_trends": ["最近的梦境更偏平静"],
        "suggestions": ["醒来后记录门后的画面"],
        "evidence_notes": ["参考了当前梦境和最近 30 天梦境"],
    })

    assert result["title"] == "海边的门"
    assert result["recurring_symbols"] == ["海", "门"]


def test_validate_agent_report_result_rejects_missing_field():
    from app.services.agents.dream_analyst import validate_agent_report_result

    with pytest.raises(ValueError, match="gentle_summary"):
        validate_agent_report_result({"title": "海边的门"})
```

- [ ] **Step 2: 写 prompt 构造测试**

Append to `dreamlog-backend/tests/test_dream_analyst_workflow.py`:

```python
def test_build_prompt_mentions_multi_agent_roles_without_exposing_to_frontend():
    from app.services.agents.dream_analyst import build_agent_prompt

    prompt = build_agent_prompt({
        "current_dream": {"content": "我梦见海边有一扇门。"},
        "similar_dreams": [],
        "recent_7_days": {"dream_count": 0},
        "recent_30_days": {"dream_count": 1},
        "limitations": [],
    })

    assert "DreamMemoryAgent" in prompt
    assert "DreamReportWriterAgent" in prompt
    assert "只返回 JSON" in prompt
    assert "gentle_summary" in prompt
```

- [ ] **Step 3: 运行测试确认失败**

Run:

```bash
cd dreamlog-backend
pytest tests/test_dream_analyst_workflow.py -q
```

Expected: FAIL because `dream_analyst.py` does not exist.

- [ ] **Step 4: 新增 workflow 服务**

Create `dreamlog-backend/app/services/agents/dream_analyst.py`:

```python
import json
from typing import Any

import httpx
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.agent_report import AgentReport
from app.models.dream import Dream
from app.schemas.agent_report import AgentReportResult
from app.services.agents.dream_memory import (
    build_current_dream_snapshot,
    get_recent_user_dreams,
    get_similar_user_dreams,
    summarize_recent_dreams,
)

settings = get_settings()


def validate_agent_report_result(data: dict[str, Any]) -> dict[str, Any]:
    try:
        return AgentReportResult.model_validate(data).model_dump()
    except ValidationError as exc:
        first_error = exc.errors()[0]
        field = ".".join(str(part) for part in first_error.get("loc", []))
        raise ValueError(f"Invalid agent report result: {field}") from exc


def _extract_json(text: str) -> dict[str, Any]:
    content = text.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    parsed = json.loads(content)
    if not isinstance(parsed, dict):
        raise ValueError("Invalid agent report result: root")
    return parsed


def build_agent_prompt(input_snapshot: dict[str, Any]) -> str:
    context = json.dumps(input_snapshot, ensure_ascii=False, indent=2)
    return f"""你是 DreamLog 的个人梦境分析 Agent。

内部角色边界：
- DreamAnalystCoordinator：控制分析流程，汇总所有上下文。
- DreamMemoryAgent：理解用户历史梦境、相似梦境和近期趋势。
- DreamInterpretationAgent：分析当前梦境与历史梦境之间的心理、象征和情绪联系。
- DreamReportWriterAgent：写出温柔、结构清晰、适合用户阅读的报告。
- DreamSafetyAgent：避免过度诊断，不给出医疗化结论。

请基于以下上下文生成深度分析报告。

上下文：
{context}

只返回 JSON，不要输出 Markdown，不要解释字段。
JSON 必须包含以下字段：
title
gentle_summary
current_themes
historical_connections
recurring_symbols
mood_trends
suggestions
evidence_notes
"""


async def build_input_snapshot(db: AsyncSession, dream: Dream) -> dict[str, Any]:
    similar_dreams, similar_limitation = await get_similar_user_dreams(db, dream, limit=5)
    recent_7 = await get_recent_user_dreams(db, dream.user_id, days=7, exclude_dream_id=dream.id)
    recent_30 = await get_recent_user_dreams(db, dream.user_id, days=30, exclude_dream_id=dream.id)
    limitations = []
    if similar_limitation:
        limitations.append(similar_limitation)

    return {
        "current_dream": build_current_dream_snapshot(dream),
        "similar_dreams": similar_dreams,
        "recent_7_days": summarize_recent_dreams(recent_7),
        "recent_30_days": summarize_recent_dreams(recent_30),
        "limitations": limitations,
    }


async def call_agent_model(prompt: str) -> tuple[dict[str, Any], str, str]:
    provider = settings.ai_interpreter_provider.lower()
    if provider == "deepseek":
        if not settings.deepseek_api_key or settings.deepseek_api_key.startswith("your-"):
            raise RuntimeError("请先配置 DEEPSEEK_API_KEY，再生成深度分析。")
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(
                f"{settings.deepseek_base_url.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.deepseek_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.deepseek_model,
                    "messages": [
                        {"role": "system", "content": "你是 DreamLog 的个人梦境分析 Agent，只输出合法 JSON。"},
                        {"role": "user", "content": prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.6,
                    "max_tokens": 1800,
                },
            )
            response.raise_for_status()
        text = response.json()["choices"][0]["message"]["content"]
        return _extract_json(text), "deepseek", settings.deepseek_model

    raise RuntimeError(f"暂不支持该深度分析模型供应商: {provider}")


async def run_dream_analyst_workflow(db: AsyncSession, report_id: int) -> AgentReport:
    result = await db.execute(select(AgentReport).where(AgentReport.id == report_id))
    report = result.scalar_one_or_none()
    if report is None:
        raise ValueError("agent report not found")

    report.status = "running"
    await db.flush()

    dream_result = await db.execute(
        select(Dream)
        .options(selectinload(Dream.tags), selectinload(Dream.interpretation))
        .where(Dream.id == report.dream_id, Dream.user_id == report.user_id)
    )
    dream = dream_result.scalar_one_or_none()
    if dream is None:
        raise ValueError("dream not found")

    snapshot = await build_input_snapshot(db, dream)
    prompt = build_agent_prompt(snapshot)
    raw_result, provider, model = await call_agent_model(prompt)
    validated = validate_agent_report_result(raw_result)

    report.input_snapshot = snapshot
    report.result = validated
    report.provider = provider
    report.model = model
    report.error_message = None
    report.status = "completed"
    await db.flush()
    return report
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
cd dreamlog-backend
pytest tests/test_dream_analyst_workflow.py -q
```

Expected: PASS.

- [ ] **Step 6: 提交**

```bash
git add dreamlog-backend/app/services/agents/dream_analyst.py dreamlog-backend/tests/test_dream_analyst_workflow.py
git commit -m "feat: add dream analyst workflow service"
```

---

### Task 4: Celery 任务和状态失败处理

**Files:**
- Create: `dreamlog-backend/app/tasks/agent_tasks.py`
- Test: `dreamlog-backend/tests/test_dream_analyst_workflow.py`

- [ ] **Step 1: 写安全错误信息测试**

Append to `dreamlog-backend/tests/test_dream_analyst_workflow.py`:

```python
def test_safe_agent_error_message_hides_internal_details():
    from app.tasks.agent_tasks import safe_agent_error_message

    assert safe_agent_error_message(RuntimeError("api key leaked")) == "深度分析暂时生成失败，请稍后重试。"
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd dreamlog-backend
pytest tests/test_dream_analyst_workflow.py::test_safe_agent_error_message_hides_internal_details -q
```

Expected: FAIL because `agent_tasks.py` does not exist.

- [ ] **Step 3: 新增 Celery 任务**

Create `dreamlog-backend/app/tasks/agent_tasks.py`:

```python
import asyncio

from sqlalchemy import select

from app.core.database import async_session
from app.models.agent_report import AgentReport
from app.services.agents.dream_analyst import run_dream_analyst_workflow
from app.tasks.worker import celery_app


def safe_agent_error_message(exc: Exception) -> str:
    return "深度分析暂时生成失败，请稍后重试。"


@celery_app.task(bind=True, max_retries=2, default_retry_delay=20)
def task_generate_dream_analysis_report(self, report_id: int):
    asyncio.run(_generate_dream_analysis_report(report_id))


async def _generate_dream_analysis_report(report_id: int):
    async with async_session() as db:
        try:
            await run_dream_analyst_workflow(db, report_id)
            await db.commit()
        except Exception as exc:
            await db.rollback()
            async with async_session() as error_db:
                result = await error_db.execute(select(AgentReport).where(AgentReport.id == report_id))
                report = result.scalar_one_or_none()
                if report is not None:
                    report.status = "failed"
                    report.error_message = safe_agent_error_message(exc)
                    await error_db.commit()
            raise
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd dreamlog-backend
pytest tests/test_dream_analyst_workflow.py::test_safe_agent_error_message_hides_internal_details -q
```

Expected: PASS.

- [ ] **Step 5: 提交**

```bash
git add dreamlog-backend/app/tasks/agent_tasks.py dreamlog-backend/tests/test_dream_analyst_workflow.py
git commit -m "feat: add dream analyst celery task"
```

---

### Task 5: Agent Report API

**Files:**
- Create: `dreamlog-backend/app/api/v1/agent_reports.py`
- Modify: `dreamlog-backend/app/main.py`
- Test: `dreamlog-backend/tests/test_agent_report_api.py`

- [ ] **Step 1: 写 API 单元测试**

Append to `dreamlog-backend/tests/test_agent_report_api.py`:

```python
import pytest
from types import SimpleNamespace


@pytest.mark.asyncio
async def test_create_deep_analysis_report_rejects_foreign_dream(monkeypatch):
    from fastapi import HTTPException
    from app.api.v1.agent_reports import create_deep_analysis_report

    class FakeResult:
        def scalar_one_or_none(self):
            return None

    class FakeDb:
        async def execute(self, query):
            return FakeResult()

    with pytest.raises(HTTPException) as exc:
        await create_deep_analysis_report(99, db=FakeDb(), user=SimpleNamespace(id=7))

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_create_deep_analysis_report_returns_pending(monkeypatch):
    from app.api.v1.agent_reports import create_deep_analysis_report

    class FakeResult:
        def scalar_one_or_none(self):
            return SimpleNamespace(id=42, user_id=7)

    class FakeDb:
        def __init__(self):
            self.report = None

        async def execute(self, query):
            return FakeResult()

        def add(self, model):
            model.id = 100
            model.report_type = "dream_deep_analysis"
            model.status = "pending"
            self.report = model

        async def flush(self):
            return None

    dispatched = []
    monkeypatch.setattr("app.api.v1.agent_reports.task_generate_dream_analysis_report.delay", lambda report_id: dispatched.append(report_id))

    response = await create_deep_analysis_report(42, db=FakeDb(), user=SimpleNamespace(id=7))

    assert response.id == 100
    assert response.status == "pending"
    assert dispatched == [100]
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd dreamlog-backend
pytest tests/test_agent_report_api.py -q
```

Expected: FAIL because `app.api.v1.agent_reports` does not exist.

- [ ] **Step 3: 新增 API 路由**

Create `dreamlog-backend/app/api/v1/agent_reports.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.agent_report import AgentReport
from app.models.dream import Dream
from app.models.user import User
from app.schemas.agent_report import AgentReportCreateResponse, AgentReportResponse
from app.tasks.agent_tasks import task_generate_dream_analysis_report

router = APIRouter(tags=["agent reports"])

REPORT_TYPE_DEEP_ANALYSIS = "dream_deep_analysis"


@router.post("/dreams/{dream_id}/agent-reports/deep-analysis", response_model=AgentReportCreateResponse, status_code=201)
async def create_deep_analysis_report(
    dream_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Dream).where(Dream.id == dream_id, Dream.user_id == user.id))
    dream = result.scalar_one_or_none()
    if not dream:
        raise HTTPException(status_code=404, detail="梦境不存在")

    report = AgentReport(
        user_id=user.id,
        dream_id=dream.id,
        report_type=REPORT_TYPE_DEEP_ANALYSIS,
        status="pending",
    )
    db.add(report)
    await db.flush()

    task_generate_dream_analysis_report.delay(report.id)
    return AgentReportCreateResponse.model_validate(report)


@router.get("/agent-reports/{report_id}", response_model=AgentReportResponse)
async def get_agent_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(AgentReport).where(AgentReport.id == report_id, AgentReport.user_id == user.id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    return AgentReportResponse.model_validate(report)


@router.get("/dreams/{dream_id}/agent-reports/deep-analysis/latest", response_model=AgentReportResponse | None)
async def get_latest_deep_analysis_report(
    dream_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    dream_result = await db.execute(select(Dream).where(Dream.id == dream_id, Dream.user_id == user.id))
    dream = dream_result.scalar_one_or_none()
    if not dream:
        raise HTTPException(status_code=404, detail="梦境不存在")

    report_result = await db.execute(
        select(AgentReport)
        .where(
            AgentReport.user_id == user.id,
            AgentReport.dream_id == dream_id,
            AgentReport.report_type == REPORT_TYPE_DEEP_ANALYSIS,
            AgentReport.status == "completed",
        )
        .order_by(desc(AgentReport.created_at))
        .limit(1)
    )
    report = report_result.scalar_one_or_none()
    return None if report is None else AgentReportResponse.model_validate(report)
```

- [ ] **Step 4: 注册路由**

Modify `dreamlog-backend/app/main.py` imports:

```python
from app.api.v1.agent_reports import router as agent_reports_router
```

Add after existing route registration:

```python
app.include_router(agent_reports_router, prefix=settings.api_v1_prefix)
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
cd dreamlog-backend
pytest tests/test_agent_report_api.py -q
```

Expected: PASS.

- [ ] **Step 6: 运行后端相关测试**

Run:

```bash
cd dreamlog-backend
pytest tests/test_agent_report_api.py tests/test_dream_memory.py tests/test_dream_analyst_workflow.py -q
```

Expected: PASS.

- [ ] **Step 7: 提交**

```bash
git add dreamlog-backend/app/api/v1/agent_reports.py dreamlog-backend/app/main.py dreamlog-backend/tests/test_agent_report_api.py
git commit -m "feat: add agent report api"
```

---

### Task 6: 前端类型和报告面板组件

**Files:**
- Modify: `dreamlog-frontend/src/api/types.ts`
- Create: `dreamlog-frontend/src/dreams/DreamAgentReportPanel.tsx`
- Modify: `dreamlog-frontend/src/dreams/DreamDetailPage.test.tsx`

- [ ] **Step 1: 写组件测试**

Append to `dreamlog-frontend/src/dreams/DreamDetailPage.test.tsx`:

```tsx
it("renders a completed deep analysis report panel", async () => {
  const { DreamAgentReportPanel } = await import("./DreamAgentReportPanel");

  render(
    <DreamAgentReportPanel
      error=""
      isCreating={false}
      onCreateReport={vi.fn()}
      onRetry={vi.fn()}
      report={{
        id: 10,
        user_id: 7,
        dream_id: 1,
        report_type: "dream_deep_analysis",
        status: "completed",
        input_snapshot: null,
        result: {
          title: "海边的门",
          gentle_summary: "这个梦像是在提醒你靠近一个新的出口。",
          current_themes: ["边界", "选择"],
          historical_connections: ["和上周的车站梦都有寻找出口的感觉"],
          recurring_symbols: ["海", "门"],
          mood_trends: ["最近的梦境更偏平静"],
          suggestions: ["醒来后记录门后的画面"],
          evidence_notes: ["参考了当前梦境和最近 30 天梦境"]
        },
        error_message: null,
        provider: "deepseek",
        model: "deepseek-v4-flash",
        created_at: "2026-05-13T00:00:00Z",
        updated_at: "2026-05-13T00:00:00Z"
      }}
    />
  );

  expect(screen.getByText("海边的门")).toBeInTheDocument();
  expect(screen.getByText("这个梦像是在提醒你靠近一个新的出口。")).toBeInTheDocument();
  expect(screen.getByText("重复意象")).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd dreamlog-frontend
npm test -- DreamDetailPage.test.tsx
```

Expected: FAIL because `DreamAgentReportPanel` does not exist.

- [ ] **Step 3: 新增前端类型**

Append to `dreamlog-frontend/src/api/types.ts`:

```ts
export type AgentReportStatus = "pending" | "running" | "completed" | "failed";
export type AgentReportType = "dream_deep_analysis";

export interface AgentReportResult {
  title: string;
  gentle_summary: string;
  current_themes: string[];
  historical_connections: string[];
  recurring_symbols: string[];
  mood_trends: string[];
  suggestions: string[];
  evidence_notes: string[];
}

export interface AgentReportResponse {
  id: number;
  user_id: number;
  dream_id: number | null;
  report_type: AgentReportType;
  status: AgentReportStatus;
  input_snapshot: Record<string, unknown> | null;
  result: AgentReportResult | null;
  error_message: string | null;
  provider: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentReportCreateResponse {
  id: number;
  status: AgentReportStatus;
  report_type: AgentReportType;
}
```

- [ ] **Step 4: 新增报告面板**

Create `dreamlog-frontend/src/dreams/DreamAgentReportPanel.tsx`:

```tsx
import { RefreshCcw, Sparkles } from "lucide-react";

import type { AgentReportResponse } from "../api/types";
import { GlassPanel } from "../components/GlassPanel";

interface DreamAgentReportPanelProps {
  report: AgentReportResponse | null;
  isCreating: boolean;
  error: string;
  onCreateReport: () => void;
  onRetry: () => void;
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function DreamAgentReportPanel({ report, isCreating, error, onCreateReport, onRetry }: DreamAgentReportPanelProps) {
  const isWorking = isCreating || report?.status === "pending" || report?.status === "running";
  const completed = report?.status === "completed" && report.result ? report.result : null;
  const failed = report?.status === "failed";

  return (
    <GlassPanel className="dream-agent-report-panel" title="深度分析">
      {!report && !isWorking ? (
        <div className="detail-placeholder-panel">
          <Sparkles aria-hidden="true" className="panel-icon" />
          <p>结合当前梦境、历史相似梦境和近期情绪趋势，生成一份更懂你的个人梦境报告。</p>
          <button className="secondary-action" disabled={isCreating} onClick={onCreateReport} type="button">
            生成深度分析
          </button>
        </div>
      ) : null}

      {isWorking ? (
        <div className="detail-placeholder-panel">
          <Sparkles aria-hidden="true" className="panel-icon" />
          <p>正在整理你的梦境记忆，并生成深度分析...</p>
        </div>
      ) : null}

      {completed ? (
        <div className="dream-agent-report">
          <p className="dream-agent-report__summary">{completed.gentle_summary}</p>
          <h2>{completed.title}</h2>
          <ReportList title="当前主题" items={completed.current_themes} />
          <ReportList title="历史关联" items={completed.historical_connections} />
          <ReportList title="重复意象" items={completed.recurring_symbols} />
          <ReportList title="情绪趋势" items={completed.mood_trends} />
          <ReportList title="可以带走的小建议" items={completed.suggestions} />
          <ReportList title="依据说明" items={completed.evidence_notes} />
          <button className="secondary-action" disabled={isCreating} onClick={onCreateReport} type="button">
            <RefreshCcw aria-hidden="true" size={17} />
            重新分析
          </button>
        </div>
      ) : null}

      {failed ? (
        <div className="detail-placeholder-panel">
          <p className="form-error" role="alert">
            {report.error_message ?? "深度分析暂时生成失败，请稍后重试。"}
          </p>
          <button className="secondary-action" disabled={isCreating} onClick={onRetry} type="button">
            重试
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </GlassPanel>
  );
}
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
cd dreamlog-frontend
npm test -- DreamDetailPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: 提交**

```bash
git add dreamlog-frontend/src/api/types.ts dreamlog-frontend/src/dreams/DreamAgentReportPanel.tsx dreamlog-frontend/src/dreams/DreamDetailPage.test.tsx
git commit -m "feat: add dream agent report panel"
```

---

### Task 7: 梦境详情页接入报告 API 和轮询

**Files:**
- Modify: `dreamlog-frontend/src/dreams/DreamDetailPage.tsx`
- Modify: `dreamlog-frontend/src/dreams/DreamDetailPage.test.tsx`

- [ ] **Step 1: 写详情页加载最新报告测试**

Append to `dreamlog-frontend/src/dreams/DreamDetailPage.test.tsx`:

```tsx
it("loads the latest deep analysis report on private dream detail", async () => {
  vi.mocked(api.get)
    .mockResolvedValueOnce(baseDream)
    .mockResolvedValueOnce({
      id: 10,
      user_id: 7,
      dream_id: 1,
      report_type: "dream_deep_analysis",
      status: "completed",
      input_snapshot: null,
      result: {
        title: "海边的门",
        gentle_summary: "这个梦像是在提醒你靠近一个新的出口。",
        current_themes: ["边界"],
        historical_connections: [],
        recurring_symbols: ["海"],
        mood_trends: [],
        suggestions: [],
        evidence_notes: []
      },
      error_message: null,
      provider: "deepseek",
      model: "deepseek-v4-flash",
      created_at: "2026-05-13T00:00:00Z",
      updated_at: "2026-05-13T00:00:00Z"
    });

  renderDetail();

  expect(await screen.findByText("海边的门")).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith("/dreams/1/agent-reports/deep-analysis/latest");
});
```

- [ ] **Step 2: 写创建报告测试**

Append to `dreamlog-frontend/src/dreams/DreamDetailPage.test.tsx`:

```tsx
it("creates a deep analysis report from the detail page", async () => {
  const user = userEvent.setup();
  vi.mocked(api.get).mockResolvedValueOnce(baseDream).mockResolvedValueOnce(null);
  vi.mocked(api.post).mockResolvedValue({
    id: 11,
    status: "pending",
    report_type: "dream_deep_analysis"
  });

  renderDetail();

  await user.click(await screen.findByRole("button", { name: "生成深度分析" }));

  expect(api.post).toHaveBeenCalledWith("/dreams/1/agent-reports/deep-analysis");
});
```

- [ ] **Step 3: 运行测试确认失败**

Run:

```bash
cd dreamlog-frontend
npm test -- DreamDetailPage.test.tsx
```

Expected: FAIL because `DreamDetailPage` does not load or create agent reports yet.

- [ ] **Step 4: 修改详情页 imports**

Modify `dreamlog-frontend/src/dreams/DreamDetailPage.tsx` imports:

```tsx
import type { AgentReportResponse, CommentResponse, DreamResponse } from "../api/types";
import { DreamAgentReportPanel } from "./DreamAgentReportPanel";
```

- [ ] **Step 5: 新增状态**

Inside `DreamDetailPage` state declarations:

```tsx
const [agentReport, setAgentReport] = useState<AgentReportResponse | null>(null);
const [agentReportError, setAgentReportError] = useState("");
const [isCreatingAgentReport, setIsCreatingAgentReport] = useState(false);
```

- [ ] **Step 6: 加载最新报告**

Add after dream loading effect:

```tsx
useEffect(() => {
  if (!id || isCommunitySource) {
    return;
  }

  let isMounted = true;

  async function loadLatestReport() {
    setAgentReportError("");
    try {
      const response = await api.get<AgentReportResponse | null>(`/dreams/${id}/agent-reports/deep-analysis/latest`);
      if (isMounted) {
        setAgentReport(response);
      }
    } catch (err) {
      if (isMounted) {
        setAgentReportError(err instanceof Error ? err.message : "深度分析报告加载失败，请稍后重试。");
      }
    }
  }

  void loadLatestReport();

  return () => {
    isMounted = false;
  };
}, [id, isCommunitySource]);
```

- [ ] **Step 7: 新增轮询和创建函数**

Add before `return`:

```tsx
const pollAgentReport = async (reportId: number) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await api.get<AgentReportResponse>(`/agent-reports/${reportId}`);
    setAgentReport(response);
    if (response.status === "completed" || response.status === "failed") {
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1800));
  }
};

const handleCreateAgentReport = async () => {
  if (!id) {
    return;
  }

  setIsCreatingAgentReport(true);
  setAgentReportError("");
  try {
    const created = await api.post<{ id: number; status: AgentReportResponse["status"]; report_type: "dream_deep_analysis" }>(
      `/dreams/${id}/agent-reports/deep-analysis`
    );
    setAgentReport({
      id: created.id,
      user_id: 0,
      dream_id: dream.id,
      report_type: created.report_type,
      status: created.status,
      input_snapshot: null,
      result: null,
      error_message: null,
      provider: null,
      model: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    await pollAgentReport(created.id);
  } catch (err) {
    setAgentReportError(err instanceof Error ? err.message : "深度分析生成失败，请稍后重试。");
  } finally {
    setIsCreatingAgentReport(false);
  }
};
```

- [ ] **Step 8: 渲染面板**

In the private dream side panel, add after `GlassPanel title="梦境工具"` and before keywords:

```tsx
<DreamAgentReportPanel
  error={agentReportError}
  isCreating={isCreatingAgentReport}
  onCreateReport={handleCreateAgentReport}
  onRetry={handleCreateAgentReport}
  report={agentReport}
/>
```

- [ ] **Step 9: 运行测试确认通过**

Run:

```bash
cd dreamlog-frontend
npm test -- DreamDetailPage.test.tsx
```

Expected: PASS.

- [ ] **Step 10: 提交**

```bash
git add dreamlog-frontend/src/dreams/DreamDetailPage.tsx dreamlog-frontend/src/dreams/DreamDetailPage.test.tsx
git commit -m "feat: connect deep analysis reports to dream detail"
```

---

### Task 8: 深度分析样式

**Files:**
- Modify: `dreamlog-frontend/src/styles.css`

- [ ] **Step 1: 添加报告样式**

Append near existing `.interpretation-panel` styles in `dreamlog-frontend/src/styles.css`:

```css
.dream-agent-report-panel .secondary-action {
  display: inline-flex;
  width: fit-content;
  min-width: 150px;
  gap: 8px;
  align-items: center;
  justify-content: center;
  margin-top: 0;
}

.dream-agent-report {
  display: grid;
  gap: 16px;
}

.dream-agent-report h2 {
  margin: 0;
  color: var(--dream-text);
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.35rem, 2.5vw, 2rem);
  line-height: 1.2;
}

.dream-agent-report__summary {
  margin: 0;
  border: 1px solid rgba(214, 204, 255, 0.2);
  border-radius: 18px;
  padding: 14px;
  color: var(--dream-text);
  line-height: 1.75;
  background:
    radial-gradient(circle at 12% 0%, rgba(143, 231, 255, 0.12), transparent 10rem),
    rgba(255, 255, 255, 0.07);
}

.dream-agent-report section {
  display: grid;
  gap: 8px;
  border-top: 1px solid rgba(214, 204, 255, 0.14);
  padding-top: 12px;
}

.dream-agent-report h3 {
  margin: 0;
  color: var(--dream-soft);
  font-size: 0.92rem;
}

.dream-agent-report ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
}

.dream-agent-report li {
  color: var(--dream-muted);
  line-height: 1.65;
  overflow-wrap: anywhere;
}
```

- [ ] **Step 2: 运行前端测试**

Run:

```bash
cd dreamlog-frontend
npm test -- DreamDetailPage.test.tsx
```

Expected: PASS.

- [ ] **Step 3: 运行前端 build**

Run:

```bash
cd dreamlog-frontend
npm run build
```

Expected: PASS.

- [ ] **Step 4: 提交**

```bash
git add dreamlog-frontend/src/styles.css
git commit -m "style: add dream agent report panel styles"
```

---

### Task 9: 全量验证和收尾

**Files:**
- Review only unless previous tasks surfaced failures.

- [ ] **Step 1: 运行后端目标测试**

Run:

```bash
cd dreamlog-backend
pytest tests/test_agent_report_api.py tests/test_dream_memory.py tests/test_dream_analyst_workflow.py -q
```

Expected: PASS.

- [ ] **Step 2: 运行后端现有 AI/梦境相关测试**

Run:

```bash
cd dreamlog-backend
pytest tests/test_create_dream_metadata.py tests/test_dream_interpretation_embedding.py tests/test_dream_matching_threshold.py -q
```

Expected: PASS.

- [ ] **Step 3: 运行前端详情页测试**

Run:

```bash
cd dreamlog-frontend
npm test -- DreamDetailPage.test.tsx
```

Expected: PASS.

- [ ] **Step 4: 运行前端 build**

Run:

```bash
cd dreamlog-frontend
npm run build
```

Expected: PASS.

- [ ] **Step 5: 检查 git 状态**

Run:

```bash
git status --short
```

Expected: no uncommitted changes, unless the executor intentionally left manual verification notes.
