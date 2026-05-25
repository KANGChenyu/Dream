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
