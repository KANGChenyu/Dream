from dataclasses import dataclass, field
from typing import Any, Literal

AgentStatus = Literal["succeeded", "failed", "waiting_for_user"]


@dataclass
class AgentResult:
    status: AgentStatus
    output: dict[str, Any] = field(default_factory=dict)
    error_message: str | None = None
