# Dream Agent RAG Design

## Goal

Upgrade DreamLog into a vertical Agent application: a dedicated Dream Agent workspace that performs single-dream deep analysis through multi-agent orchestration, public knowledge RAG, private dream-memory retrieval, streaming execution visibility, and structured report output.

The first deliverable focuses on one strong demo path: the user opens the Dream Agent page, selects or naturally references one existing dream, asks for deep analysis, watches the run steps and evidence sources stream in, and receives a structured report that can be followed up conversationally.

## Non-Goals

The first version will not implement every future Agent capability.

- No general-purpose Agent platform unrelated to DreamLog.
- No full MCP ecosystem or plugin marketplace.
- No visual DAG editor.
- No multi-user community RAG.
- No automatic weekly reports.
- No payment, membership, or professional consultant workflow.
- No knowledge-base management dashboard in the first pass.

These can be added after the single-dream deep-analysis path is stable.

## Product Shape

The existing DreamLog product remains intact: users can still record dreams, view archive pages, inspect dream details, generate interpretations, create images, and use matching/community features as they mature.

The new experience is a dedicated `Dream Agent` workspace.

The workspace has three areas:

- Left panel: conversation history, dream selector, and quick tasks.
- Center panel: chat-like interaction, structured report, and follow-up messages.
- Right panel: run timeline on top and evidence sources below.

The user can specify the target dream in two ways:

- Select an existing dream from a dropdown or list.
- Use natural language, such as "analyze yesterday's dream" or "analyze the dream about getting lost."

If natural-language selection is ambiguous, the Agent should return candidate dreams and ask the user to choose, rather than guessing silently.

## First Demo Flow

```text
User opens /agent
User selects a dream or describes which dream to analyze
User asks for deep analysis
Backend creates an agent_run
PlannerAgent creates an execution plan
KnowledgeRetrieverAgent searches public dream knowledge
MemoryRetrieverAgent searches the user's private dream history
InterpreterAgent creates the structured analysis
CriticAgent checks quality, safety, and completeness
Orchestrator persists final output
Frontend streams steps and evidence through SSE
User sees a structured report and can ask follow-up questions
```

## Agent Roles

### PlannerAgent

PlannerAgent converts the user request into a controlled execution plan. In the first version, it only supports the `single_dream_deep_analysis` intent.

Responsibilities:

- Resolve whether the request references a dream.
- Decide whether dream selection is complete or ambiguous.
- Produce ordered steps for knowledge retrieval, memory retrieval, interpretation, and critique.
- Store the plan as the first run step.

### KnowledgeRetrieverAgent

KnowledgeRetrieverAgent searches public dream knowledge.

First-version knowledge sources:

- Zhougong dream interpretation notes.
- Common dream-symbol dictionary.
- Short psychology and symbolism notes curated for DreamLog.

Responsibilities:

- Build a retrieval query from the dream content and user goal.
- Retrieve top-k public knowledge chunks.
- Return compact evidence records with source title, source type, matched text, and relevance score.

### MemoryRetrieverAgent

MemoryRetrieverAgent searches the current user's private dream history.

Responsibilities:

- Retrieve the selected dream.
- Retrieve recent dreams from configurable windows, starting with 7 and 30 days.
- Retrieve semantically similar dreams when embeddings are available.
- Return compact evidence records with dream id, title or summary, date, mood, tags, and relevance reason.

Memory must be user-scoped. One user's dreams must never be used as another user's private evidence.

### InterpreterAgent

InterpreterAgent generates the main analysis.

Inputs:

- User goal.
- Selected dream.
- Public knowledge evidence.
- Private memory evidence.
- Existing ordinary interpretation if present.

Output must be structured JSON, not free text.

### CriticAgent

CriticAgent reviews the InterpreterAgent output.

Responsibilities:

- Check whether the answer addresses the user goal.
- Check whether the output is too vague.
- Check whether cited evidence is actually represented in the answer.
- Remove or soften medical, diagnostic, or overly certain mental-health claims.
- Mark the result as accepted or request one revision.

The first version should allow at most one revision pass to keep execution predictable.

## Orchestration

The first version uses a controlled heavy workflow, not an open-ended autonomous loop.

Execution order:

```text
PlannerAgent
-> KnowledgeRetrieverAgent
-> MemoryRetrieverAgent
-> InterpreterAgent
-> CriticAgent
-> Final aggregation
```

This is deliberately heavier than a single AI call, but still bounded enough to finish reliably.

Parallel retrieval can be introduced later:

```text
PlannerAgent
-> KnowledgeRetrieverAgent + MemoryRetrieverAgent in parallel
-> InterpreterAgent
-> CriticAgent
```

## RAG Design

The project should use two retrieval layers.

### Public Knowledge RAG

Public knowledge is shared by all users.

Storage:

- `knowledge_documents`: one row per source document.
- `knowledge_chunks`: chunk text, source metadata, embedding, tags, and source type.

Initial document location:

```text
docs/knowledge/zhougong/
docs/knowledge/symbolism/
docs/knowledge/psychology/
```

Supported first-version formats:

- Markdown.
- Plain text.
- JSON if already structured.

Retrieval:

- Use vector retrieval through PostgreSQL/pgvector when embeddings are available.
- Fall back to keyword search if embeddings are missing.
- Return evidence as compact snippets, not entire documents.

### Private Memory RAG

Private memory is scoped per user.

Storage:

- `memory_chunks`: derived from user dreams, interpretations, tags, and future summaries.

The first implementation can start without pre-indexing all history. It may compute private memory evidence from existing `dreams`, `dream_interpretations`, and `dream_tags` tables, then add durable `memory_chunks` once the first flow is stable.

Retrieval:

- Exact selected dream.
- Recent dreams from 7-day and 30-day windows.
- Similar dreams through existing embeddings if available.
- Tag and mood overlap when embeddings are missing.

## Data Model

Add these tables for Agent execution:

```text
agent_conversations
agent_runs
agent_steps
```

### agent_conversations

Fields:

```text
id
user_id
title
created_at
updated_at
```

Purpose:

- Groups multiple Agent runs into one chat-like thread.

### agent_runs

Fields:

```text
id
conversation_id nullable
user_id
goal
intent
target_dream_id nullable
status
final_output
error_message nullable
created_at
updated_at
started_at nullable
finished_at nullable
```

Status values:

```text
pending
running
waiting_for_user
succeeded
failed
cancelled
```

### agent_steps

Fields:

```text
id
run_id
step_index
agent_name
step_type
status
input_payload
output_payload
error_message nullable
started_at nullable
finished_at nullable
created_at
updated_at
```

Status values:

```text
pending
running
succeeded
failed
skipped
```

Add these tables for public RAG:

```text
knowledge_documents
knowledge_chunks
```

### knowledge_documents

Fields:

```text
id
title
source_type
source_path nullable
source_url nullable
metadata
created_at
updated_at
```

### knowledge_chunks

Fields:

```text
id
document_id
chunk_index
content
embedding nullable
metadata
created_at
updated_at
```

Optional later table:

```text
memory_chunks
```

It can be added in Phase 2 if Phase 1 computes private memory directly from existing dream tables.

## Backend API

Add:

```text
POST /api/v1/agent/runs
GET /api/v1/agent/runs/{run_id}
GET /api/v1/agent/runs/{run_id}/events
GET /api/v1/agent/conversations
GET /api/v1/agent/conversations/{conversation_id}
```

### Create Run

`POST /api/v1/agent/runs`

Request:

```json
{
  "goal": "Please deeply analyze this dream.",
  "dream_id": 123,
  "conversation_id": null
}
```

Behavior:

- Requires authentication.
- Creates an `agent_run`.
- Starts execution.
- Returns run id and initial status.

For first implementation, execution can be synchronous enough to stream immediately through SSE, as long as step state is persisted. If the existing Celery setup is reliable, long runs can be moved to a background worker.

### Run Events

`GET /api/v1/agent/runs/{run_id}/events`

Event types:

```text
run_started
step_started
evidence_found
step_finished
step_failed
final_output
run_failed
```

The frontend uses these events to update the right-side timeline and evidence panel.

## Backend Modules

Add:

```text
app/agent/core/base.py
app/agent/core/context.py
app/agent/core/types.py
app/agent/orchestrator/service.py
app/agent/dream_agents/planner.py
app/agent/dream_agents/knowledge_retriever.py
app/agent/dream_agents/memory_retriever.py
app/agent/dream_agents/interpreter.py
app/agent/dream_agents/critic.py
app/agent/tools/dream_tools.py
app/agent/tools/rag_tools.py
app/agent/schemas/agent.py
app/api/v1/agent.py
app/models/agent_run.py
app/models/knowledge.py
```

Add RAG support:

```text
app/rag/loaders/document_loader.py
app/rag/chunking/text_splitter.py
app/rag/embeddings/provider.py
app/rag/retrievers/knowledge_retriever.py
app/rag/retrievers/memory_retriever.py
app/rag/services/index_service.py
```

## Frontend Modules

Add:

```text
src/agent/AgentPage.tsx
src/agent/RunDetailPage.tsx
src/agent/api.ts
src/agent/types.ts
src/agent/components/AgentChat.tsx
src/agent/components/DreamSelector.tsx
src/agent/components/RunTimeline.tsx
src/agent/components/EvidencePanel.tsx
src/agent/components/FinalAnswerCard.tsx
```

Modify:

```text
src/App.tsx
src/api/client.ts
src/styles.css
```

Routes:

```text
/agent
/agent/runs/:id
```

## Structured Output

Final output must include:

```json
{
  "title": "string",
  "summary": "string",
  "psychology": "string",
  "symbolism": "string",
  "knowledge_evidence": [
    {
      "source_title": "string",
      "source_type": "zhougong | symbolism | psychology",
      "snippet": "string",
      "relevance": "string"
    }
  ],
  "personal_patterns": [
    {
      "dream_id": 123,
      "date": "2026-05-25",
      "pattern": "string",
      "reason": "string"
    }
  ],
  "advice": ["string"],
  "follow_up_questions": ["string"]
}
```

The model may produce Chinese user-facing content, but the JSON keys should stay stable in English for frontend rendering.

## Error Handling

Expected error cases:

- No dream selected and natural-language selection is ambiguous.
- Target dream does not belong to the current user.
- Knowledge base is empty.
- Embedding provider is unavailable.
- Model provider is unavailable.
- SSE connection drops.

Required behavior:

- If public knowledge retrieval fails, continue with private memory and clearly mark public evidence as unavailable.
- If private memory retrieval fails, continue with selected dream and public knowledge.
- If the model fails, mark the run failed and persist the error.
- If SSE drops, the frontend can fetch the run detail endpoint and recover current state.

## Safety

Dream analysis must avoid medical diagnosis and deterministic claims.

The Agent should frame output as reflection, symbolic interpretation, or possible connections, not clinical certainty.

The CriticAgent should soften language like:

```text
This means you have anxiety disorder.
```

Into:

```text
This may reflect recent stress or uncertainty, but it should not be treated as a diagnosis.
```

## Testing

Backend tests:

- Creating an agent run persists run and first step.
- Run access is user-scoped.
- Planner returns `waiting_for_user` when dream selection is ambiguous.
- Knowledge retriever returns chunks from seeded documents.
- Memory retriever never returns another user's dreams.
- Orchestrator persists succeeded and failed states correctly.

Frontend tests:

- Agent page renders dream selector and input.
- Submitting a run calls the create-run API.
- Timeline updates from mocked SSE events.
- Evidence panel renders public and private evidence.
- Final answer card renders structured output.

## Implementation Phases

### Phase 1: Agent Run Skeleton

Deliver:

- Agent data models.
- Create-run and get-run API.
- Basic orchestrator with stubbed agents.
- Frontend Agent page showing a run lifecycle.

Demo:

- User submits a goal and sees a run progress from pending to succeeded.

### Phase 2: Public Knowledge RAG

Deliver:

- Knowledge document loader.
- Text splitter.
- Knowledge tables.
- Basic index command/service.
- KnowledgeRetrieverAgent.

Demo:

- Agent report includes evidence from Zhougong or symbolism notes.

### Phase 3: Private Memory Retrieval

Deliver:

- User-scoped memory retriever.
- Recent dream retrieval.
- Similar dream retrieval when embeddings exist.
- Evidence panel support for historical dreams.

Demo:

- Agent report connects the selected dream to the user's prior dreams.

### Phase 4: Interpreter + Critic

Deliver:

- Structured JSON report generation.
- Critic quality pass.
- Safety language checks.
- Final report card.

Demo:

- User receives a complete deep-analysis report with evidence and follow-up questions.

### Phase 5: Streaming Polish

Deliver:

- SSE event stream.
- Run timeline.
- Evidence updates during execution.
- Run detail page.

Demo:

- User can watch the Agent work step by step and revisit the run later.

## Open Decisions

- Whether Phase 1 execution should be synchronous with SSE or use Celery immediately.
- Which embedding provider should be the default for local development.
- Whether public knowledge seed files should be committed as short curated notes or imported from larger external documents.

The recommended first choice is: synchronous execution for early development, provider abstraction with a deterministic mock embedding fallback, and short curated knowledge files committed under `docs/knowledge/` so the demo works without external data.
