# DreamAnalystWorkflow Design

## Goal

Upgrade DreamLog from a single-call AI dream interpretation product into the first version of an agent-capable dream analysis system.

The first agent capability will be a manually triggered `DreamAnalystWorkflow`: when a user opens a dream detail page and clicks "Deep analysis", the backend gathers the current dream, related historical dreams, recent dream trends, and existing AI interpretation, then generates and saves a structured personal report.

This is a controlled workflow agent rather than an open chat agent. It gives the product a real agent core first: goal-directed execution, tool-backed context gathering, user memory retrieval, structured output, persistence, and recoverable task state.

## Non-Goals

The first version will not include:

- A conversational chat UI.
- Automatic weekly or monthly reports.
- External psychology or dream-symbol knowledge-base RAG.
- Community dream retrieval.
- Multi-agent orchestration.
- Fully autonomous planning loops.

These can be added after the first workflow is stable.

## Product Behavior

The dream detail page will expose a manual "Deep analysis" entry point.

When the user clicks it:

1. The backend verifies that the target dream belongs to the current user.
2. The backend creates an `agent_report` record with `pending` status.
3. A Celery task runs the analysis workflow.
4. The frontend polls the report status.
5. When completed, the frontend shows the saved report.
6. If the workflow fails, the report moves to `failed` and the frontend offers retry.

The user-facing report uses a mixed format:

- A warm summary at the top.
- Structured analysis sections below it.

The report should feel like a personal dream advisor, while still being concrete and inspectable.

## Agent Boundary

Existing AI interpretation is a single-dream AI call:

```text
current dream -> model -> interpretation
```

`DreamAnalystWorkflow` is a goal-driven workflow:

```text
current dream
+ existing interpretation
+ similar historical dreams
+ recent 7/30 day dream trends
-> assembled dream memory context
-> model
-> saved agent report
```

The important agent behaviors in this first version are:

- It has a specific goal: generate a personal deep-analysis report.
- It uses product tools to gather context before calling the model.
- It uses user dream memory RAG.
- It writes a persistent result.
- It exposes task state and failure state.

## Data Model

Add a new `agent_reports` table instead of reusing `dream_interpretations`.

`dream_interpretations` represents normal single-dream AI interpretation. `agent_reports` represents agent-generated outputs that can support more report types later, such as weekly reports, dream sequence detection, or chat-grounding summaries.

Suggested fields:

```text
id
user_id
dream_id nullable
report_type
status
input_snapshot
result
error_message nullable
provider nullable
model nullable
created_at
updated_at
```

Initial `report_type`:

```text
dream_deep_analysis
```

Initial statuses:

```text
pending
running
completed
failed
```

`input_snapshot` stores the selected context used for generation. This makes reports auditable and stable even if the underlying dream records change later.

`result` stores the validated structured output.

## Report Shape

The generated report result must contain:

```text
title
gentle_summary
current_themes
historical_connections
recurring_symbols
mood_trends
suggestions
evidence_notes
```

Field intent:

- `title`: a short dream-analysis title.
- `gentle_summary`: a warm top-level explanation for direct reading.
- `current_themes`: themes found in the current dream.
- `historical_connections`: links to similar or related past dreams.
- `recurring_symbols`: repeated images, places, people, actions, or feelings.
- `mood_trends`: recent emotional pattern from 7/30 day dream history.
- `suggestions`: gentle reflections or journaling prompts.
- `evidence_notes`: what context the analysis relied on, without exposing internal implementation details.

The frontend should not display technical terms such as RAG, embedding, vector search, or agent workflow.

## User Dream RAG

The first version uses only the current user's own dream history.

It does not retrieve:

- Other users' public dreams.
- Community dreams.
- External psychology documents.
- External dream dictionaries.

Context sources:

1. Current dream

```text
content
dream_date
mood
clarity
is_lucid
title
tags
existing interpretation if present
```

2. Similar historical dreams

Use the current dream embedding to retrieve up to 5 similar dreams from the same user, excluding the current dream.

Return only compact context:

```text
dream_id
dream_date
title or content summary
mood
tags
similarity
```

If the current dream has no embedding, the workflow falls back to recent dreams and records that limitation in `input_snapshot`.

3. Recent dream trends

Retrieve recent dreams for two windows:

```text
last 7 days
last 30 days
```

Summarize:

- Mood distribution.
- Frequent tags.
- Repeated themes or symbols when available.
- Dream count.

The workflow can compute simple counts deterministically before asking the model to produce prose.

## Backend API

Add these endpoints:

```text
POST /api/v1/dreams/{dream_id}/agent-reports/deep-analysis
GET /api/v1/agent-reports/{report_id}
GET /api/v1/dreams/{dream_id}/agent-reports/deep-analysis/latest
```

`POST /api/v1/dreams/{dream_id}/agent-reports/deep-analysis`

- Requires authentication.
- Verifies the dream belongs to the current user.
- Creates an `agent_report` with `pending` status.
- Dispatches a Celery task.
- Returns the created report id and status.
- Allows regeneration by creating a new report.

`GET /api/v1/agent-reports/{report_id}`

- Requires authentication.
- Verifies the report belongs to the current user.
- Returns status, result, and error message when applicable.

`GET /api/v1/dreams/{dream_id}/agent-reports/deep-analysis/latest`

- Requires authentication.
- Verifies dream ownership.
- Returns the latest completed deep-analysis report for that dream if one exists.

## Backend Components

Add:

```text
app/models/agent_report.py
app/schemas/agent_report.py
app/services/agents/dream_analyst.py
app/services/agents/dream_memory.py
app/tasks/agent_tasks.py
app/api/v1/agent_reports.py
```

Responsibilities:

- `AgentReport` model: persistence and ownership.
- Agent report schemas: API request/response validation.
- `dream_memory.py`: user dream retrieval and deterministic trend summaries.
- `dream_analyst.py`: workflow orchestration and prompt construction.
- `agent_tasks.py`: Celery task wrapper and status transitions.
- `agent_reports.py`: authenticated API endpoints.

The API layer should stay thin. It should not assemble prompts or implement retrieval logic.

## Workflow

Task flow:

```text
report.status = running
load report
load current dream
load existing interpretation
load similar historical dreams
load 7/30 day recent dreams
build input_snapshot
call model with strict JSON instruction
validate result
save result
report.status = completed
```

Failure flow:

```text
catch exception
report.status = failed
report.error_message = safe user-facing error
save technical detail only in logs
```

The task should not leave a report in `running` forever after a handled failure.

## Prompt Contract

The first version should use strict JSON output.

Prompt intent:

```text
You are DreamLog's personal dream analysis agent.
Use the current dream, similar historical dreams, and recent dream trend context.
Generate a warm but structured report.
Return only JSON.
```

Required JSON fields:

```text
title
gentle_summary
current_themes
historical_connections
recurring_symbols
mood_trends
suggestions
evidence_notes
```

The backend validates the returned JSON before saving. Invalid JSON should mark the report as failed rather than returning malformed data to the frontend.

## Frontend Experience

The first version lives inside the existing dream detail page.

States:

```text
not_generated -> show "Deep analysis"
pending/running -> show analysis in progress
completed -> show report and "Regenerate"
failed -> show failure message and "Retry"
```

Report layout:

```text
title
gentle summary
current themes
historical connections
recurring symbols
mood trends
suggestions
evidence notes
```

The frontend should default to showing the latest completed report when the page loads.

Regeneration creates a new report. Historical reports can remain stored, while the UI shows the latest completed one.

## Error Handling

Expected cases:

- Dream not found or not owned by user: return 404.
- Report not found or not owned by user: return 404.
- Model unavailable: report becomes `failed`.
- Invalid model JSON: report becomes `failed`.
- Missing embedding: continue with recent-dream fallback.
- No historical dreams: still generate a current-dream-focused report and note limited history.

## Testing

Backend tests:

- A user cannot create a report for another user's dream.
- Creating a report returns a `pending` report.
- Successful task execution stores a completed report with required result fields.
- Failed task execution stores `failed` and a safe error message.
- Latest endpoint returns the latest completed report.
- Similar dream retrieval only includes the current user's dreams.
- Similar dream retrieval excludes the current dream.
- Missing embedding falls back to recent dream context.

Frontend tests:

- Dream detail page shows the deep-analysis entry point when no report exists.
- Pending/running reports show progress state.
- Completed reports render all sections.
- Failed reports show retry.
- Regenerate creates a new report request.

## Implementation Order

Recommended sequence:

1. Add backend model and schemas.
2. Add dream memory retrieval helpers.
3. Add workflow orchestration service.
4. Add Celery task.
5. Add API endpoints.
6. Add backend tests.
7. Add frontend API client types and methods.
8. Add report panel to dream detail page.
9. Add frontend tests.

## Acceptance Criteria

The design is complete when:

- A user can manually request a deep analysis for one of their dreams.
- The system creates and tracks an agent report.
- The workflow retrieves current dream context, same-user similar dreams, and recent dream trends.
- The AI output is saved as a structured mixed-format report.
- The dream detail page displays completed reports.
- The user can retry after failure.
- The user can regenerate a new report.
- No other user's dreams are included in the report context.
