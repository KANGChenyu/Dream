from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.core.context import RunContext
from app.agent.dream_agents.critic import CriticAgent
from app.agent.dream_agents.interpreter import InterpreterAgent
from app.agent.dream_agents.knowledge_retriever import KnowledgeRetrieverAgent
from app.agent.dream_agents.memory_retriever import MemoryRetrieverAgent
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
            agents = [
                KnowledgeRetrieverAgent(db=self.db),
                MemoryRetrieverAgent(self.db),
                InterpreterAgent(),
                CriticAgent(),
            ]
            final_output = {"plan": planner_result.output}
            for index, agent in enumerate(agents, start=1):
                step_started_at = datetime.now(timezone.utc)
                result = await agent.run(context)
                self.db.add(
                    AgentStep(
                        run_id=run.id,
                        step_index=index,
                        agent_name=agent.name,
                        step_type=planner_result.output["plan"][index - 1]["step_type"],
                        status=result.status,
                        input_payload={"goal": goal, "dream_id": dream_id},
                        output_payload=result.output,
                        error_message=result.error_message,
                        started_at=step_started_at,
                        finished_at=datetime.now(timezone.utc),
                    )
                )
                if result.status == "failed":
                    run.status = "failed"
                    run.error_message = result.error_message
                    break
                final_output = result.output
            else:
                run.status = "succeeded"
                run.final_output = final_output
        run.finished_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(run)
        return run
