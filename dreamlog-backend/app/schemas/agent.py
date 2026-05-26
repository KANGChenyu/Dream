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
