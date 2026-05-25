# Dream Agent RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Dream Agent workspace for single-dream deep analysis with persisted runs, public knowledge retrieval, private dream-memory retrieval, structured output, and frontend run visibility.

**Architecture:** Add a bounded Agent layer on top of the existing DreamLog FastAPI backend. The orchestrator records `agent_runs` and `agent_steps`, calls fixed Agent roles in sequence, and exposes run state to a new React `/agent` workspace. RAG starts with curated local knowledge files and user-scoped retrieval from existing dream data.

**Tech Stack:** FastAPI, SQLAlchemy async, PostgreSQL/pgvector, Pydantic, React, TypeScript, Vite, Vitest, pytest.

---

## File Structure

Backend files to create:

- `dreamlog-backend/app/models/agent_run.py`: SQLAlchemy models for conversations, runs, and steps.
- `dreamlog-backend/app/models/knowledge.py`: SQLAlchemy models for public knowledge documents and chunks.
- `dreamlog-backend/app/schemas/agent.py`: Pydantic request/response/event schemas.
- `dreamlog-backend/app/agent/core/types.py`: enums and dataclasses shared by agents.
- `dreamlog-backend/app/agent/core/context.py`: `RunContext` state passed through the workflow.
- `dreamlog-backend/app/agent/core/base.py`: base class for Agent role implementations.
- `dreamlog-backend/app/agent/dream_agents/planner.py`: single-dream intent planning and ambiguity detection.
- `dreamlog-backend/app/agent/dream_agents/knowledge_retriever.py`: public knowledge evidence retrieval.
- `dreamlog-backend/app/agent/dream_agents/memory_retriever.py`: user dream evidence retrieval.
- `dreamlog-backend/app/agent/dream_agents/interpreter.py`: structured report generation.
- `dreamlog-backend/app/agent/dream_agents/critic.py`: quality and safety review.
- `dreamlog-backend/app/agent/orchestrator/service.py`: run creation, step execution, persistence, and event emission.
- `dreamlog-backend/app/agent/tools/dream_tools.py`: reusable dream queries.
- `dreamlog-backend/app/agent/tools/rag_tools.py`: reusable public knowledge queries.
- `dreamlog-backend/app/api/v1/agent.py`: Agent API endpoints.
- `dreamlog-backend/app/rag/loaders/document_loader.py`: Markdown/text/JSON document loading.
- `dreamlog-backend/app/rag/chunking/text_splitter.py`: deterministic text chunking.
- `dreamlog-backend/app/rag/embeddings/provider.py`: embedding abstraction with deterministic local fallback.
- `dreamlog-backend/app/rag/services/index_service.py`: index curated knowledge files into DB.
- `dreamlog-backend/app/rag/retrievers/knowledge_retriever.py`: knowledge chunk search.
- `dreamlog-backend/app/rag/retrievers/memory_retriever.py`: private memory search from dream tables.
- `dreamlog-backend/tests/test_agent_models.py`: model and enum tests.
- `dreamlog-backend/tests/test_agent_planner.py`: planning behavior tests.
- `dreamlog-backend/tests/test_agent_memory_scope.py`: user isolation tests.
- `dreamlog-backend/tests/test_rag_chunking.py`: loader/splitter tests.
- `dreamlog-backend/tests/test_agent_api.py`: API access and run creation tests.

Backend files to modify:

- `dreamlog-backend/app/models/__init__.py`: export new models.
- `dreamlog-backend/app/main.py`: register Agent API router.
- `dreamlog-backend/requirements.txt`: add any missing lightweight dependencies only if code requires them.

Frontend files to create:

- `dreamlog-frontend/src/agent/types.ts`: Agent frontend types.
- `dreamlog-frontend/src/agent/api.ts`: create-run, get-run, and event helpers.
- `dreamlog-frontend/src/agent/AgentPage.tsx`: main workspace.
- `dreamlog-frontend/src/agent/RunDetailPage.tsx`: run replay/details page.
- `dreamlog-frontend/src/agent/components/DreamSelector.tsx`: select a target dream.
- `dreamlog-frontend/src/agent/components/AgentChat.tsx`: goal input and response area.
- `dreamlog-frontend/src/agent/components/RunTimeline.tsx`: step timeline.
- `dreamlog-frontend/src/agent/components/EvidencePanel.tsx`: public/private evidence.
- `dreamlog-frontend/src/agent/components/FinalAnswerCard.tsx`: structured report display.

Frontend files to modify:

- `dreamlog-frontend/src/App.tsx`: add `/agent` and `/agent/runs/:id` routes.
- `dreamlog-frontend/src/api/client.ts`: add SSE helper or expose token/base URL needed by `src/agent/api.ts`.
- `dreamlog-frontend/src/api/types.ts`: share `DreamResponse` in Agent UI.
- `dreamlog-frontend/src/styles.css`: add Agent workspace layout.

Knowledge seed files to create:

- `docs/knowledge/zhougong/basic-symbols.md`
- `docs/knowledge/symbolism/common-dream-symbols.md`
- `docs/knowledge/psychology/reflection-notes.md`

---

### Task 1: Persist Agent Runs And Knowledge Chunks

**Files:**
- Create: `dreamlog-backend/app/models/agent_run.py`
- Create: `dreamlog-backend/app/models/knowledge.py`
- Modify: `dreamlog-backend/app/models/__init__.py`
- Test: `dreamlog-backend/tests/test_agent_models.py`

- [ ] **Step 1: Write model tests**

Create `dreamlog-backend/tests/test_agent_models.py`:

```python
def test_agent_run_model_table_names():
    from app.models.agent_run import AgentConversation, AgentRun, AgentStep

    assert AgentConversation.__tablename__ == "agent_conversations"
    assert AgentRun.__tablename__ == "agent_runs"
    assert AgentStep.__tablename__ == "agent_steps"


def test_knowledge_model_table_names():
    from app.models.knowledge import KnowledgeChunk, KnowledgeDocument

    assert KnowledgeDocument.__tablename__ == "knowledge_documents"
    assert KnowledgeChunk.__tablename__ == "knowledge_chunks"
```

- [ ] **Step 2: Run model tests to verify they fail**

Run:

```powershell
cd dreamlog-backend
pytest tests/test_agent_models.py -q
```

Expected: FAIL because `app.models.agent_run` and `app.models.knowledge` do not exist.

- [ ] **Step 3: Add Agent persistence models**

Create `dreamlog-backend/app/models/agent_run.py`:

```python
from datetime import datetime, timezone

from sqlalchemy import BigInteger, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AgentConversation(Base):
    __tablename__ = "agent_conversations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    runs = relationship("AgentRun", back_populates="conversation")


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("agent_conversations.id", ondelete="SET NULL"), index=True
    )
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    goal: Mapped[str] = mapped_column(Text, nullable=False)
    intent: Mapped[str] = mapped_column(String(80), default="single_dream_deep_analysis", nullable=False)
    target_dream_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("dreams.id"), index=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False, index=True)
    final_output: Mapped[dict | None] = mapped_column(JSON)
    error_message: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    conversation = relationship("AgentConversation", back_populates="runs")
    steps = relationship("AgentStep", back_populates="run", lazy="selectin", cascade="all, delete-orphan")


class AgentStep(Base):
    __tablename__ = "agent_steps"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    step_index: Mapped[int] = mapped_column(nullable=False)
    agent_name: Mapped[str] = mapped_column(String(80), nullable=False)
    step_type: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False, index=True)
    input_payload: Mapped[dict | None] = mapped_column(JSON)
    output_payload: Mapped[dict | None] = mapped_column(JSON)
    error_message: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    run = relationship("AgentRun", back_populates="steps")
```

- [ ] **Step 4: Add knowledge models**

Create `dreamlog-backend/app/models/knowledge.py`:

```python
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import BigInteger, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    source_path: Mapped[str | None] = mapped_column(String(500))
    source_url: Mapped[str | None] = mapped_column(String(500))
    doc_metadata: Mapped[dict | None] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chunk_index: Mapped[int] = mapped_column(nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding = mapped_column(Vector(1536))
    chunk_metadata: Mapped[dict | None] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    document = relationship("KnowledgeDocument", back_populates="chunks")
```

- [ ] **Step 5: Export models**

Modify `dreamlog-backend/app/models/__init__.py`:

```python
from app.models.user import User
from app.models.dream import Dream, DreamInterpretation, DreamTag
from app.models.community import DreamLike, DreamComment, DreamMatch, Notification
from app.models.agent_run import AgentConversation, AgentRun, AgentStep
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk

__all__ = [
    "User",
    "Dream",
    "DreamInterpretation",
    "DreamTag",
    "DreamLike",
    "DreamComment",
    "DreamMatch",
    "Notification",
    "AgentConversation",
    "AgentRun",
    "AgentStep",
    "KnowledgeDocument",
    "KnowledgeChunk",
]
```

- [ ] **Step 6: Run model tests**

Run:

```powershell
cd dreamlog-backend
pytest tests/test_agent_models.py -q
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add dreamlog-backend/app/models/agent_run.py dreamlog-backend/app/models/knowledge.py dreamlog-backend/app/models/__init__.py dreamlog-backend/tests/test_agent_models.py
git commit -m "feat: add agent run and knowledge models"
```

---

### Task 2: Add Agent Core Types And Planner

**Files:**
- Create: `dreamlog-backend/app/agent/core/types.py`
- Create: `dreamlog-backend/app/agent/core/context.py`
- Create: `dreamlog-backend/app/agent/core/base.py`
- Create: `dreamlog-backend/app/agent/dream_agents/planner.py`
- Test: `dreamlog-backend/tests/test_agent_planner.py`

- [ ] **Step 1: Write planner tests**

Create `dreamlog-backend/tests/test_agent_planner.py`:

```python
import pytest


@pytest.mark.asyncio
async def test_planner_uses_selected_dream_id():
    from app.agent.core.context import RunContext
    from app.agent.dream_agents.planner import PlannerAgent

    context = RunContext(user_id=1, goal="深度分析这条梦", target_dream_id=42)
    result = await PlannerAgent().run(context)

    assert result.status == "succeeded"
    assert result.output["intent"] == "single_dream_deep_analysis"
    assert result.output["target_dream_id"] == 42
    assert [step["agent_name"] for step in result.output["plan"]] == [
        "KnowledgeRetrieverAgent",
        "MemoryRetrieverAgent",
        "InterpreterAgent",
        "CriticAgent",
    ]


@pytest.mark.asyncio
async def test_planner_waits_when_no_dream_is_selected():
    from app.agent.core.context import RunContext
    from app.agent.dream_agents.planner import PlannerAgent

    context = RunContext(user_id=1, goal="分析昨天那条梦")
    result = await PlannerAgent().run(context)

    assert result.status == "waiting_for_user"
    assert "dream_candidates_needed" in result.output["reason"]
```

- [ ] **Step 2: Run planner tests to verify they fail**

Run:

```powershell
cd dreamlog-backend
pytest tests/test_agent_planner.py -q
```

Expected: FAIL because Agent core files do not exist.

- [ ] **Step 3: Add core types**

Create `dreamlog-backend/app/agent/core/types.py`:

```python
from dataclasses import dataclass, field
from typing import Any, Literal

AgentStatus = Literal["succeeded", "failed", "waiting_for_user"]


@dataclass
class AgentResult:
    status: AgentStatus
    output: dict[str, Any] = field(default_factory=dict)
    error_message: str | None = None
```

- [ ] **Step 4: Add run context**

Create `dreamlog-backend/app/agent/core/context.py`:

```python
from dataclasses import dataclass, field
from typing import Any


@dataclass
class RunContext:
    user_id: int
    goal: str
    target_dream_id: int | None = None
    conversation_id: int | None = None
    run_id: int | None = None
    selected_dream: dict[str, Any] | None = None
    public_evidence: list[dict[str, Any]] = field(default_factory=list)
    private_evidence: list[dict[str, Any]] = field(default_factory=list)
    intermediate: dict[str, Any] = field(default_factory=dict)
```

- [ ] **Step 5: Add base agent**

Create `dreamlog-backend/app/agent/core/base.py`:

```python
from abc import ABC, abstractmethod

from app.agent.core.context import RunContext
from app.agent.core.types import AgentResult


class BaseAgent(ABC):
    name: str

    @abstractmethod
    async def run(self, context: RunContext) -> AgentResult:
        raise NotImplementedError
```

- [ ] **Step 6: Add planner agent**

Create `dreamlog-backend/app/agent/dream_agents/planner.py`:

```python
from app.agent.core.base import BaseAgent
from app.agent.core.context import RunContext
from app.agent.core.types import AgentResult


class PlannerAgent(BaseAgent):
    name = "PlannerAgent"

    async def run(self, context: RunContext) -> AgentResult:
        if context.target_dream_id is None:
            return AgentResult(
                status="waiting_for_user",
                output={
                    "reason": "dream_candidates_needed",
                    "message": "Please choose which dream to analyze.",
                },
            )

        plan = [
            {"agent_name": "KnowledgeRetrieverAgent", "step_type": "public_knowledge_retrieval"},
            {"agent_name": "MemoryRetrieverAgent", "step_type": "private_memory_retrieval"},
            {"agent_name": "InterpreterAgent", "step_type": "structured_interpretation"},
            {"agent_name": "CriticAgent", "step_type": "quality_review"},
        ]

        return AgentResult(
            status="succeeded",
            output={
                "intent": "single_dream_deep_analysis",
                "target_dream_id": context.target_dream_id,
                "plan": plan,
            },
        )
```

- [ ] **Step 7: Run planner tests**

Run:

```powershell
cd dreamlog-backend
pytest tests/test_agent_planner.py -q
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add dreamlog-backend/app/agent dreamlog-backend/tests/test_agent_planner.py
git commit -m "feat: add dream agent planner"
```

---

### Task 3: Add RAG Loading, Chunking, And Seed Knowledge

**Files:**
- Create: `dreamlog-backend/app/rag/loaders/document_loader.py`
- Create: `dreamlog-backend/app/rag/chunking/text_splitter.py`
- Create: `dreamlog-backend/app/rag/embeddings/provider.py`
- Create: `docs/knowledge/zhougong/basic-symbols.md`
- Create: `docs/knowledge/symbolism/common-dream-symbols.md`
- Create: `docs/knowledge/psychology/reflection-notes.md`
- Test: `dreamlog-backend/tests/test_rag_chunking.py`

- [ ] **Step 1: Write RAG utility tests**

Create `dreamlog-backend/tests/test_rag_chunking.py`:

```python
from pathlib import Path


def test_split_text_creates_overlapping_chunks():
    from app.rag.chunking.text_splitter import split_text

    chunks = split_text("abcdef" * 80, chunk_size=120, overlap=20)

    assert len(chunks) > 1
    assert chunks[0].content
    assert chunks[0].chunk_index == 0
    assert chunks[1].chunk_index == 1


def test_loader_reads_markdown_file(tmp_path: Path):
    from app.rag.loaders.document_loader import load_document

    source = tmp_path / "dream.md"
    source.write_text("# 迷路\n\n迷路常与方向感有关。", encoding="utf-8")

    doc = load_document(source, source_type="symbolism")

    assert doc.title == "迷路"
    assert doc.source_type == "symbolism"
    assert "方向感" in doc.content


def test_local_embedding_provider_is_deterministic():
    from app.rag.embeddings.provider import LocalHashEmbeddingProvider

    provider = LocalHashEmbeddingProvider(dimensions=8)

    assert provider.embed("迷路") == provider.embed("迷路")
    assert len(provider.embed("迷路")) == 8
```

- [ ] **Step 2: Run RAG tests to verify they fail**

Run:

```powershell
cd dreamlog-backend
pytest tests/test_rag_chunking.py -q
```

Expected: FAIL because RAG utility modules do not exist.

- [ ] **Step 3: Implement text splitter**

Create `dreamlog-backend/app/rag/chunking/text_splitter.py`:

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class TextChunk:
    chunk_index: int
    content: str


def split_text(text: str, chunk_size: int = 800, overlap: int = 120) -> list[TextChunk]:
    cleaned = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    if not cleaned:
        return []

    chunks: list[TextChunk] = []
    start = 0
    while start < len(cleaned):
        end = min(start + chunk_size, len(cleaned))
        chunks.append(TextChunk(chunk_index=len(chunks), content=cleaned[start:end]))
        if end == len(cleaned):
            break
        start = max(end - overlap, start + 1)
    return chunks
```

- [ ] **Step 4: Implement document loader**

Create `dreamlog-backend/app/rag/loaders/document_loader.py`:

```python
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class LoadedDocument:
    title: str
    source_type: str
    source_path: str
    content: str


def load_document(path: Path, source_type: str) -> LoadedDocument:
    content = path.read_text(encoding="utf-8")
    title = path.stem

    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            title = stripped.lstrip("#").strip() or title
            break

    return LoadedDocument(
        title=title,
        source_type=source_type,
        source_path=str(path),
        content=content,
    )
```

- [ ] **Step 5: Implement deterministic embedding fallback**

Create `dreamlog-backend/app/rag/embeddings/provider.py`:

```python
import hashlib
import math


class LocalHashEmbeddingProvider:
    def __init__(self, dimensions: int = 1536):
        self.dimensions = dimensions

    def embed(self, text: str) -> list[float]:
        values = [0.0] * self.dimensions
        for token in text.lower().split():
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimensions
            values[index] += 1.0

        norm = math.sqrt(sum(value * value for value in values))
        if norm == 0:
            return values
        return [value / norm for value in values]
```

- [ ] **Step 6: Add small curated knowledge files**

Create `docs/knowledge/zhougong/basic-symbols.md`:

```markdown
# 周公解梦常见意象

掉牙常被传统解梦文本解释为变化、失去、家庭牵挂或对身体状态的担心。使用时应避免把传统解释当作确定结论。

迷路常被解释为方向感不明、选择困难或对未来路径的担忧。它适合与现实处境一起温和分析。
```

Create `docs/knowledge/symbolism/common-dream-symbols.md`:

```markdown
# 常见梦境象征

水常与情绪、流动、潜意识和变化有关。清澈的水、汹涌的水、深水和洪水可以代表不同强度的情绪体验。

飞行常与自由、控制感、逃离压力或视角提升有关。需要结合梦中的情绪判断它偏向轻松还是紧张。
```

Create `docs/knowledge/psychology/reflection-notes.md`:

```markdown
# 梦境心理反思笔记

梦境分析更适合被视为自我反思工具，而不是诊断工具。回答应使用可能、也许、可以理解为等措辞。

重复梦境可以提示用户关注近期反复出现的情绪、关系、场景或未完成事项，但不能直接推出确定心理疾病。
```

- [ ] **Step 7: Run RAG tests**

Run:

```powershell
cd dreamlog-backend
pytest tests/test_rag_chunking.py -q
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add dreamlog-backend/app/rag docs/knowledge dreamlog-backend/tests/test_rag_chunking.py
git commit -m "feat: add dream knowledge rag utilities"
```

---

### Task 4: Add User-Scoped Dream Memory Retrieval

**Files:**
- Create: `dreamlog-backend/app/agent/tools/dream_tools.py`
- Create: `dreamlog-backend/app/rag/retrievers/memory_retriever.py`
- Create: `dreamlog-backend/app/agent/dream_agents/memory_retriever.py`
- Test: `dreamlog-backend/tests/test_agent_memory_scope.py`

- [ ] **Step 1: Write memory scope test**

Create `dreamlog-backend/tests/test_agent_memory_scope.py`:

```python
from datetime import date

import pytest


class FakeDream:
    def __init__(self, dream_id: int, user_id: int, content: str):
        self.id = dream_id
        self.user_id = user_id
        self.content = content
        self.title = None
        self.dream_date = date(2026, 5, 25)
        self.mood = "anxious"
        self.tags = []


@pytest.mark.asyncio
async def test_memory_retriever_filters_to_current_user():
    from app.rag.retrievers.memory_retriever import build_private_evidence

    dreams = [
        FakeDream(1, 10, "我在森林里迷路"),
        FakeDream(2, 99, "另一个用户梦到掉牙"),
    ]

    evidence = await build_private_evidence(user_id=10, selected_dream_id=1, dreams=dreams)

    assert [item["dream_id"] for item in evidence] == [1]
```

- [ ] **Step 2: Run memory test to verify it fails**

Run:

```powershell
cd dreamlog-backend
pytest tests/test_agent_memory_scope.py -q
```

Expected: FAIL because `memory_retriever` does not exist.

- [ ] **Step 3: Add dream tools**

Create `dreamlog-backend/app/agent/tools/dream_tools.py`:

```python
from datetime import date, timedelta
from typing import Sequence

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dream import Dream


async def get_user_dream(db: AsyncSession, user_id: int, dream_id: int) -> Dream | None:
    result = await db.execute(select(Dream).where(Dream.id == dream_id, Dream.user_id == user_id))
    return result.scalar_one_or_none()


async def list_recent_user_dreams(
    db: AsyncSession,
    user_id: int,
    days: int = 30,
    limit: int = 20,
) -> Sequence[Dream]:
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(Dream)
        .where(Dream.user_id == user_id, Dream.dream_date >= since)
        .order_by(desc(Dream.dream_date), desc(Dream.created_at))
        .limit(limit)
    )
    return result.scalars().all()
```

- [ ] **Step 4: Add private memory evidence builder**

Create `dreamlog-backend/app/rag/retrievers/memory_retriever.py`:

```python
from typing import Iterable, Any


async def build_private_evidence(
    user_id: int,
    selected_dream_id: int | None,
    dreams: Iterable[Any],
) -> list[dict]:
    evidence: list[dict] = []
    for dream in dreams:
        if dream.user_id != user_id:
            continue
        if selected_dream_id is not None and dream.id != selected_dream_id:
            relation = "recent_user_dream"
        else:
            relation = "selected_dream"
        evidence.append(
            {
                "dream_id": dream.id,
                "date": dream.dream_date.isoformat(),
                "title": dream.title,
                "summary": dream.content[:180],
                "mood": dream.mood,
                "relation": relation,
            }
        )
    return evidence
```

- [ ] **Step 5: Add MemoryRetrieverAgent**

Create `dreamlog-backend/app/agent/dream_agents/memory_retriever.py`:

```python
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.core.base import BaseAgent
from app.agent.core.context import RunContext
from app.agent.core.types import AgentResult
from app.agent.tools.dream_tools import get_user_dream, list_recent_user_dreams
from app.rag.retrievers.memory_retriever import build_private_evidence


class MemoryRetrieverAgent(BaseAgent):
    name = "MemoryRetrieverAgent"

    def __init__(self, db: AsyncSession):
        self.db = db

    async def run(self, context: RunContext) -> AgentResult:
        if context.target_dream_id is None:
            return AgentResult(status="failed", error_message="target_dream_id is required")

        selected = await get_user_dream(self.db, context.user_id, context.target_dream_id)
        if selected is None:
            return AgentResult(status="failed", error_message="Dream not found")

        recent = list(await list_recent_user_dreams(self.db, context.user_id))
        dreams = [selected, *[dream for dream in recent if dream.id != selected.id]]
        evidence = await build_private_evidence(context.user_id, selected.id, dreams)

        context.selected_dream = evidence[0] if evidence else None
        context.private_evidence = evidence
        return AgentResult(status="succeeded", output={"private_evidence": evidence})
```

- [ ] **Step 6: Run memory test**

Run:

```powershell
cd dreamlog-backend
pytest tests/test_agent_memory_scope.py -q
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add dreamlog-backend/app/agent/tools/dream_tools.py dreamlog-backend/app/rag/retrievers/memory_retriever.py dreamlog-backend/app/agent/dream_agents/memory_retriever.py dreamlog-backend/tests/test_agent_memory_scope.py
git commit -m "feat: add private dream memory retrieval"
```

---

### Task 5: Add Orchestrator And Agent API Skeleton

**Files:**
- Create: `dreamlog-backend/app/schemas/agent.py`
- Create: `dreamlog-backend/app/agent/orchestrator/service.py`
- Create: `dreamlog-backend/app/api/v1/agent.py`
- Modify: `dreamlog-backend/app/main.py`
- Test: `dreamlog-backend/tests/test_agent_api.py`

- [ ] **Step 1: Write API schema smoke test**

Create `dreamlog-backend/tests/test_agent_api.py`:

```python
def test_agent_create_run_request_schema():
    from app.schemas.agent import AgentRunCreateRequest

    req = AgentRunCreateRequest(goal="分析这条梦", dream_id=1)

    assert req.goal == "分析这条梦"
    assert req.dream_id == 1
```

- [ ] **Step 2: Run API test to verify it fails**

Run:

```powershell
cd dreamlog-backend
pytest tests/test_agent_api.py -q
```

Expected: FAIL because `app.schemas.agent` does not exist.

- [ ] **Step 3: Add Agent schemas**

Create `dreamlog-backend/app/schemas/agent.py`:

```python
from pydantic import BaseModel, Field


class AgentRunCreateRequest(BaseModel):
    goal: str = Field(min_length=1, max_length=2000)
    dream_id: int | None = None
    conversation_id: int | None = None


class AgentStepResponse(BaseModel):
    id: int
    step_index: int
    agent_name: str
    step_type: str
    status: str
    input_payload: dict | None
    output_payload: dict | None
    error_message: str | None

    model_config = {"from_attributes": True}


class AgentRunResponse(BaseModel):
    id: int
    conversation_id: int | None
    goal: str
    intent: str
    target_dream_id: int | None
    status: str
    final_output: dict | None
    error_message: str | None
    steps: list[AgentStepResponse] = []

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Add minimal orchestrator**

Create `dreamlog-backend/app/agent/orchestrator/service.py`:

```python
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.core.context import RunContext
from app.agent.dream_agents.planner import PlannerAgent
from app.models.agent_run import AgentRun, AgentStep


class AgentOrchestrator:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_run(
        self,
        user_id: int,
        goal: str,
        dream_id: int | None,
        conversation_id: int | None = None,
    ) -> AgentRun:
        run = AgentRun(
            user_id=user_id,
            goal=goal,
            target_dream_id=dream_id,
            conversation_id=conversation_id,
            status="running",
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(run)
        await self.db.flush()

        context = RunContext(
            user_id=user_id,
            goal=goal,
            target_dream_id=dream_id,
            conversation_id=conversation_id,
            run_id=run.id,
        )
        planner_result = await PlannerAgent().run(context)
        self.db.add(
            AgentStep(
                run_id=run.id,
                step_index=0,
                agent_name="PlannerAgent",
                step_type="planning",
                status=planner_result.status,
                input_payload={"goal": goal, "dream_id": dream_id},
                output_payload=planner_result.output,
                error_message=planner_result.error_message,
                started_at=run.started_at,
                finished_at=datetime.now(timezone.utc),
            )
        )

        if planner_result.status == "waiting_for_user":
            run.status = "waiting_for_user"
        elif planner_result.status == "failed":
            run.status = "failed"
            run.error_message = planner_result.error_message
        else:
            run.status = "succeeded"
            run.final_output = {"plan": planner_result.output}
        run.finished_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(run)
        return run
```

- [ ] **Step 5: Add Agent API router**

Create `dreamlog-backend/app/api/v1/agent.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.orchestrator.service import AgentOrchestrator
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.agent_run import AgentRun
from app.models.user import User
from app.schemas.agent import AgentRunCreateRequest, AgentRunResponse

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/runs", response_model=AgentRunResponse, status_code=201)
async def create_agent_run(
    req: AgentRunCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    run = await AgentOrchestrator(db).create_run(
        user_id=user.id,
        goal=req.goal,
        dream_id=req.dream_id,
        conversation_id=req.conversation_id,
    )
    return AgentRunResponse.model_validate(run)


@router.get("/runs/{run_id}", response_model=AgentRunResponse)
async def get_agent_run(
    run_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(AgentRun).where(AgentRun.id == run_id, AgentRun.user_id == user.id))
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Agent run not found")
    return AgentRunResponse.model_validate(run)
```

- [ ] **Step 6: Register router**

Modify `dreamlog-backend/app/main.py`:

```python
from app.api.v1.agent import router as agent_router

app.include_router(agent_router, prefix=settings.api_v1_prefix)
```

- [ ] **Step 7: Run API smoke test**

Run:

```powershell
cd dreamlog-backend
pytest tests/test_agent_api.py -q
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add dreamlog-backend/app/schemas/agent.py dreamlog-backend/app/agent/orchestrator/service.py dreamlog-backend/app/api/v1/agent.py dreamlog-backend/app/main.py dreamlog-backend/tests/test_agent_api.py
git commit -m "feat: add agent run api skeleton"
```

---

### Task 6: Add Interpreter, Critic, And Final Output Shape

**Files:**
- Create: `dreamlog-backend/app/agent/dream_agents/knowledge_retriever.py`
- Create: `dreamlog-backend/app/agent/dream_agents/interpreter.py`
- Create: `dreamlog-backend/app/agent/dream_agents/critic.py`
- Modify: `dreamlog-backend/app/agent/orchestrator/service.py`
- Test: `dreamlog-backend/tests/test_agent_interpreter.py`

- [ ] **Step 1: Write final output shape test**

Create `dreamlog-backend/tests/test_agent_interpreter.py`:

```python
import pytest


@pytest.mark.asyncio
async def test_interpreter_returns_required_sections():
    from app.agent.core.context import RunContext
    from app.agent.dream_agents.interpreter import InterpreterAgent

    context = RunContext(user_id=1, goal="深度分析", target_dream_id=1)
    context.selected_dream = {"summary": "我在陌生城市里迷路", "mood": "anxious"}
    context.public_evidence = [{"source_title": "常见梦境象征", "snippet": "迷路常与方向感有关"}]
    context.private_evidence = [{"dream_id": 1, "summary": "我在陌生城市里迷路"}]

    result = await InterpreterAgent().run(context)

    assert result.status == "succeeded"
    assert set(result.output) >= {
        "title",
        "summary",
        "psychology",
        "symbolism",
        "knowledge_evidence",
        "personal_patterns",
        "advice",
        "follow_up_questions",
    }
```

- [ ] **Step 2: Run final output test to verify it fails**

Run:

```powershell
cd dreamlog-backend
pytest tests/test_agent_interpreter.py -q
```

Expected: FAIL because `InterpreterAgent` does not exist.

- [ ] **Step 3: Add knowledge retriever stub**

Create `dreamlog-backend/app/agent/dream_agents/knowledge_retriever.py`:

```python
from app.agent.core.base import BaseAgent
from app.agent.core.context import RunContext
from app.agent.core.types import AgentResult


class KnowledgeRetrieverAgent(BaseAgent):
    name = "KnowledgeRetrieverAgent"

    async def run(self, context: RunContext) -> AgentResult:
        evidence = [
            {
                "source_title": "梦境心理反思笔记",
                "source_type": "psychology",
                "snippet": "梦境分析更适合被视为自我反思工具，而不是诊断工具。",
                "relevance": "safety_baseline",
            }
        ]
        context.public_evidence = evidence
        return AgentResult(status="succeeded", output={"public_evidence": evidence})
```

- [ ] **Step 4: Add interpreter**

Create `dreamlog-backend/app/agent/dream_agents/interpreter.py`:

```python
from app.agent.core.base import BaseAgent
from app.agent.core.context import RunContext
from app.agent.core.types import AgentResult


class InterpreterAgent(BaseAgent):
    name = "InterpreterAgent"

    async def run(self, context: RunContext) -> AgentResult:
        dream_summary = (context.selected_dream or {}).get("summary") or "这条梦境"
        output = {
            "title": "梦境深度分析",
            "summary": f"这份分析围绕「{dream_summary[:40]}」展开，结合知识依据和你的历史记录做温和解读。",
            "psychology": "这个梦可能反映了近期情绪、选择压力或未完成感，但不应被视为心理诊断。",
            "symbolism": "梦中的关键意象可以作为自我观察线索，需要结合醒后的情绪和近期经历理解。",
            "knowledge_evidence": context.public_evidence,
            "personal_patterns": context.private_evidence,
            "advice": ["继续记录相似场景和醒后情绪。", "可以回看最近一周是否有重复人物、地点或压力来源。"],
            "follow_up_questions": ["这个梦里最强烈的情绪是什么？", "最近现实中是否也有类似的迷茫或压力？"],
        }
        context.intermediate["interpretation"] = output
        return AgentResult(status="succeeded", output=output)
```

- [ ] **Step 5: Add critic**

Create `dreamlog-backend/app/agent/dream_agents/critic.py`:

```python
from app.agent.core.base import BaseAgent
from app.agent.core.context import RunContext
from app.agent.core.types import AgentResult


class CriticAgent(BaseAgent):
    name = "CriticAgent"

    async def run(self, context: RunContext) -> AgentResult:
        output = context.intermediate.get("interpretation")
        if not output:
            return AgentResult(status="failed", error_message="No interpretation to review")
        output["safety_note"] = "以上内容用于自我反思，不构成医学或心理诊断。"
        return AgentResult(status="succeeded", output=output)
```

- [ ] **Step 6: Expand orchestrator to call all agents**

Modify `dreamlog-backend/app/agent/orchestrator/service.py` so successful planner output runs these agents in order:

```python
from app.agent.dream_agents.knowledge_retriever import KnowledgeRetrieverAgent
from app.agent.dream_agents.memory_retriever import MemoryRetrieverAgent
from app.agent.dream_agents.interpreter import InterpreterAgent
from app.agent.dream_agents.critic import CriticAgent
```

After planner succeeds, instantiate:

```python
agents = [
    KnowledgeRetrieverAgent(),
    MemoryRetrieverAgent(self.db),
    InterpreterAgent(),
    CriticAgent(),
]
```

For each agent:

```python
result = await agent.run(context)
```

Persist one `AgentStep` per agent. If any agent fails, mark `run.status = "failed"` and store `error_message`. If all succeed, set `run.status = "succeeded"` and `run.final_output` to the CriticAgent output.

- [ ] **Step 7: Run interpreter test**

Run:

```powershell
cd dreamlog-backend
pytest tests/test_agent_interpreter.py tests/test_agent_planner.py -q
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add dreamlog-backend/app/agent/dream_agents dreamlog-backend/app/agent/orchestrator/service.py dreamlog-backend/tests/test_agent_interpreter.py
git commit -m "feat: add dream agent interpretation flow"
```

---

### Task 7: Build Frontend Agent Workspace

**Files:**
- Create: `dreamlog-frontend/src/agent/types.ts`
- Create: `dreamlog-frontend/src/agent/api.ts`
- Create: `dreamlog-frontend/src/agent/AgentPage.tsx`
- Create: `dreamlog-frontend/src/agent/components/DreamSelector.tsx`
- Create: `dreamlog-frontend/src/agent/components/AgentChat.tsx`
- Create: `dreamlog-frontend/src/agent/components/RunTimeline.tsx`
- Create: `dreamlog-frontend/src/agent/components/EvidencePanel.tsx`
- Create: `dreamlog-frontend/src/agent/components/FinalAnswerCard.tsx`
- Modify: `dreamlog-frontend/src/App.tsx`
- Modify: `dreamlog-frontend/src/styles.css`
- Test: `dreamlog-frontend/src/agent/AgentPage.test.tsx`

- [ ] **Step 1: Write frontend render test**

Create `dreamlog-frontend/src/agent/AgentPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentPage } from "./AgentPage";

describe("AgentPage", () => {
  it("renders the Dream Agent workspace", () => {
    render(<AgentPage />);

    expect(screen.getByRole("heading", { name: /Dream Agent/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start analysis/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run frontend test to verify it fails**

Run:

```powershell
cd dreamlog-frontend
npm test -- AgentPage.test.tsx
```

Expected: FAIL because `AgentPage` does not exist.

- [ ] **Step 3: Add Agent frontend types**

Create `dreamlog-frontend/src/agent/types.ts`:

```ts
export interface AgentStep {
  id: number;
  step_index: number;
  agent_name: string;
  step_type: string;
  status: string;
  input_payload: Record<string, unknown> | null;
  output_payload: Record<string, unknown> | null;
  error_message: string | null;
}

export interface AgentRun {
  id: number;
  conversation_id: number | null;
  goal: string;
  intent: string;
  target_dream_id: number | null;
  status: string;
  final_output: Record<string, unknown> | null;
  error_message: string | null;
  steps: AgentStep[];
}
```

- [ ] **Step 4: Add Agent API helper**

Create `dreamlog-frontend/src/agent/api.ts`:

```ts
import { api } from "../api/client";
import type { AgentRun } from "./types";

export function createAgentRun(goal: string, dreamId: number | null) {
  return api.post<AgentRun>("/agent/runs", {
    goal,
    dream_id: dreamId
  });
}

export function getAgentRun(runId: number) {
  return api.get<AgentRun>(`/agent/runs/${runId}`);
}
```

- [ ] **Step 5: Add presentational components**

Create `dreamlog-frontend/src/agent/components/RunTimeline.tsx`:

```tsx
import type { AgentStep } from "../types";

export function RunTimeline({ steps }: { steps: AgentStep[] }) {
  return (
    <section aria-label="Run timeline" className="agent-panel">
      <h2>Run timeline</h2>
      {steps.length === 0 ? <p>No steps yet.</p> : null}
      <ol className="agent-timeline">
        {steps.map((step) => (
          <li key={step.id}>
            <strong>{step.agent_name}</strong>
            <span>{step.step_type}</span>
            <small>{step.status}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

Create `dreamlog-frontend/src/agent/components/EvidencePanel.tsx`:

```tsx
import type { AgentRun } from "../types";

function getEvidence(run: AgentRun | null, key: string) {
  const output = run?.final_output;
  const value = output?.[key];
  return Array.isArray(value) ? value : [];
}

export function EvidencePanel({ run }: { run: AgentRun | null }) {
  const knowledge = getEvidence(run, "knowledge_evidence");
  const personal = getEvidence(run, "personal_patterns");

  return (
    <section aria-label="Evidence" className="agent-panel">
      <h2>Evidence</h2>
      <h3>Knowledge</h3>
      {knowledge.length === 0 ? <p>No knowledge evidence yet.</p> : null}
      {knowledge.map((item, index) => (
        <article key={`knowledge-${index}`}>
          <strong>{String(item.source_title ?? "Knowledge source")}</strong>
          <p>{String(item.snippet ?? "")}</p>
        </article>
      ))}
      <h3>Personal patterns</h3>
      {personal.length === 0 ? <p>No personal patterns yet.</p> : null}
      {personal.map((item, index) => (
        <article key={`personal-${index}`}>
          <strong>{String(item.pattern ?? item.summary ?? "Dream memory")}</strong>
          <p>{String(item.reason ?? "")}</p>
        </article>
      ))}
    </section>
  );
}
```

Create `dreamlog-frontend/src/agent/components/FinalAnswerCard.tsx`:

```tsx
import type { AgentRun } from "../types";

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export function FinalAnswerCard({ run }: { run: AgentRun }) {
  const output = run.final_output ?? {};
  const title = String(output.title ?? "Dream Agent report");
  const advice = asStringList(output.advice);
  const followUps = asStringList(output.follow_up_questions);

  return (
    <article className="agent-final-card">
      <h2>{title}</h2>
      {output.summary ? <p>{String(output.summary)}</p> : null}
      {output.psychology ? <section><h3>Psychology</h3><p>{String(output.psychology)}</p></section> : null}
      {output.symbolism ? <section><h3>Symbolism</h3><p>{String(output.symbolism)}</p></section> : null}
      {advice.length > 0 ? (
        <section>
          <h3>Advice</h3>
          <ul>{advice.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      ) : null}
      {followUps.length > 0 ? (
        <section>
          <h3>Follow-up questions</h3>
          <ul>{followUps.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      ) : null}
    </article>
  );
}
```

Create `dreamlog-frontend/src/agent/components/DreamSelector.tsx`:

```tsx
export function DreamSelector({
  dreamId,
  onDreamIdChange
}: {
  dreamId: string;
  onDreamIdChange: (value: string) => void;
}) {
  return (
    <label>
      Dream ID
      <input
        inputMode="numeric"
        value={dreamId}
        onChange={(event) => onDreamIdChange(event.target.value)}
      />
    </label>
  );
}
```

Create `dreamlog-frontend/src/agent/components/AgentChat.tsx`:

```tsx
export function AgentChat({
  goal,
  onGoalChange,
  onSubmit,
  isSubmitting
}: {
  goal: string;
  onGoalChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <section className="agent-chat-box">
      <textarea value={goal} onChange={(event) => onGoalChange(event.target.value)} />
      <button type="button" onClick={onSubmit} disabled={isSubmitting}>
        Start analysis
      </button>
    </section>
  );
}
```

- [ ] **Step 6: Add AgentPage**

Create `dreamlog-frontend/src/agent/AgentPage.tsx`:

```tsx
import { useState } from "react";
import { createAgentRun } from "./api";
import type { AgentRun } from "./types";
import { RunTimeline } from "./components/RunTimeline";
import { EvidencePanel } from "./components/EvidencePanel";
import { FinalAnswerCard } from "./components/FinalAnswerCard";

export function AgentPage() {
  const [goal, setGoal] = useState("Please deeply analyze this dream.");
  const [dreamId, setDreamId] = useState("");
  const [run, setRun] = useState<AgentRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    try {
      const nextRun = await createAgentRun(goal, dreamId ? Number(dreamId) : null);
      setRun(nextRun);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Agent run.");
    }
  }

  return (
    <main className="agent-workspace">
      <aside className="agent-sidebar">
        <h1>Dream Agent</h1>
        <label>
          Dream ID
          <input value={dreamId} onChange={(event) => setDreamId(event.target.value)} />
        </label>
      </aside>
      <section className="agent-chat-panel">
        <textarea value={goal} onChange={(event) => setGoal(event.target.value)} />
        <button type="button" onClick={handleSubmit}>Start analysis</button>
        {error ? <p role="alert">{error}</p> : null}
        {run ? <FinalAnswerCard run={run} /> : null}
      </section>
      <aside className="agent-evidence-panel">
        <RunTimeline steps={run?.steps ?? []} />
        <EvidencePanel run={run} />
      </aside>
    </main>
  );
}
```

- [ ] **Step 7: Add route**

Modify `dreamlog-frontend/src/App.tsx`:

```tsx
import { AgentPage } from "./agent/AgentPage";

<Route
  element={
    <ProtectedRoute>
      <AgentPage />
    </ProtectedRoute>
  }
  path="/agent"
/>
```

- [ ] **Step 8: Add Agent CSS**

Modify `dreamlog-frontend/src/styles.css` with a responsive three-column workspace:

```css
.agent-workspace {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr) minmax(260px, 360px);
  gap: 16px;
  min-height: 100vh;
  padding: 24px;
}

.agent-sidebar,
.agent-chat-panel,
.agent-evidence-panel {
  min-width: 0;
}

@media (max-width: 960px) {
  .agent-workspace {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 9: Run frontend tests**

Run:

```powershell
cd dreamlog-frontend
npm test -- AgentPage.test.tsx
```

Expected: PASS.

- [ ] **Step 10: Commit**

```powershell
git add dreamlog-frontend/src/agent dreamlog-frontend/src/App.tsx dreamlog-frontend/src/styles.css
git commit -m "feat: add dream agent workspace"
```

---

### Task 8: Add SSE Events And Run Detail Page

**Files:**
- Modify: `dreamlog-backend/app/api/v1/agent.py`
- Modify: `dreamlog-frontend/src/agent/api.ts`
- Create: `dreamlog-frontend/src/agent/RunDetailPage.tsx`
- Modify: `dreamlog-frontend/src/App.tsx`
- Test: `dreamlog-frontend/src/agent/RunDetailPage.test.tsx`

- [ ] **Step 1: Add backend SSE endpoint**

Modify `dreamlog-backend/app/api/v1/agent.py`:

```python
import json
from fastapi.responses import StreamingResponse


@router.get("/runs/{run_id}/events")
async def stream_agent_run_events(
    run_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(AgentRun).where(AgentRun.id == run_id, AgentRun.user_id == user.id))
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Agent run not found")

    async def event_stream():
        yield f"event: run_snapshot\ndata: {json.dumps(AgentRunResponse.model_validate(run).model_dump(), default=str)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

- [ ] **Step 2: Add frontend event helper**

Modify `dreamlog-frontend/src/agent/api.ts`:

```ts
import { apiBaseUrl } from "../api/client";

export function createRunEventSource(runId: number) {
  return new EventSource(`${apiBaseUrl}/agent/runs/${runId}/events`);
}
```

If authenticated EventSource headers are required, use a token query parameter only for local development or replace with a fetch streaming implementation. Prefer fetch streaming if production security is in scope.

- [ ] **Step 3: Add RunDetailPage**

Create `dreamlog-frontend/src/agent/RunDetailPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAgentRun } from "./api";
import type { AgentRun } from "./types";
import { RunTimeline } from "./components/RunTimeline";
import { EvidencePanel } from "./components/EvidencePanel";
import { FinalAnswerCard } from "./components/FinalAnswerCard";

export function RunDetailPage() {
  const { id } = useParams();
  const [run, setRun] = useState<AgentRun | null>(null);

  useEffect(() => {
    if (!id) return;
    void getAgentRun(Number(id)).then(setRun);
  }, [id]);

  return (
    <main className="agent-run-detail">
      <RunTimeline steps={run?.steps ?? []} />
      <EvidencePanel run={run} />
      {run ? <FinalAnswerCard run={run} /> : null}
    </main>
  );
}
```

- [ ] **Step 4: Add route**

Modify `dreamlog-frontend/src/App.tsx`:

```tsx
import { RunDetailPage } from "./agent/RunDetailPage";

<Route
  element={
    <ProtectedRoute>
      <RunDetailPage />
    </ProtectedRoute>
  }
  path="/agent/runs/:id"
/>
```

- [ ] **Step 5: Add run detail test**

Create `dreamlog-frontend/src/agent/RunDetailPage.test.tsx`:

```tsx
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RunDetailPage } from "./RunDetailPage";

vi.mock("./api", () => ({
  getAgentRun: () => Promise.resolve({
    id: 1,
    conversation_id: null,
    goal: "analysis",
    intent: "single_dream_deep_analysis",
    target_dream_id: 1,
    status: "succeeded",
    final_output: { title: "Dream report", summary: "A report" },
    error_message: null,
    steps: []
  })
}));

describe("RunDetailPage", () => {
  it("loads a run by route id", async () => {
    render(
      <MemoryRouter initialEntries={["/agent/runs/1"]}>
        <Routes>
          <Route path="/agent/runs/:id" element={<RunDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Dream report")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run tests**

Run:

```powershell
cd dreamlog-frontend
npm test -- RunDetailPage.test.tsx AgentPage.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add dreamlog-backend/app/api/v1/agent.py dreamlog-frontend/src/agent dreamlog-frontend/src/App.tsx
git commit -m "feat: add agent run detail and event stream"
```

---

### Task 9: Verify Integrated Build

**Files:**
- No new files expected.

- [ ] **Step 1: Run backend focused tests**

Run:

```powershell
cd dreamlog-backend
pytest tests/test_agent_models.py tests/test_agent_planner.py tests/test_agent_memory_scope.py tests/test_rag_chunking.py tests/test_agent_api.py tests/test_agent_interpreter.py -q
```

Expected: PASS.

- [ ] **Step 2: Run frontend focused tests**

Run:

```powershell
cd dreamlog-frontend
npm test -- AgentPage.test.tsx RunDetailPage.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run frontend build**

Run:

```powershell
cd dreamlog-frontend
npm run build
```

Expected: PASS and Vite emits production assets.

- [ ] **Step 4: Run backend import smoke test**

Run:

```powershell
cd dreamlog-backend
python -c "from app.main import app; print(app.title)"
```

Expected: prints `DreamLog API`.

- [ ] **Step 5: Commit verification fixes if needed**

If verification revealed small fixes, commit them:

```powershell
git add dreamlog-backend dreamlog-frontend
git commit -m "fix: stabilize dream agent rag integration"
```

If no fixes are needed, do not create an empty commit.

---

## Plan Self-Review

Spec coverage:

- Dedicated Dream Agent workspace: Task 7.
- Multi-agent orchestration: Tasks 2, 5, and 6.
- Public knowledge RAG: Task 3 and later KnowledgeRetrieverAgent work.
- Private user memory retrieval: Task 4.
- Run/step persistence: Task 1 and Task 5.
- Structured output: Task 6 and Task 7.
- SSE and run detail: Task 8.
- Testing and verification: Each task includes tests, with integrated verification in Task 9.

Known deliberate simplifications:

- Public knowledge retrieval starts with deterministic curated files and a local embedding fallback.
- The first backend API skeleton may complete quickly while later tasks replace stub output with richer retrieval and interpretation.
- Event streaming starts as a run snapshot stream, then can grow into live step events once execution moves to background workers.
