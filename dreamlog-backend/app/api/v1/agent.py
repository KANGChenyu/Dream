import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
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
        payload = AgentRunResponse.model_validate(run).model_dump()
        yield f"event: run_snapshot\ndata: {json.dumps(payload, default=str)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
