from abc import ABC, abstractmethod

from app.agent.core.context import RunContext
from app.agent.core.types import AgentResult


class BaseAgent(ABC):
    name: str

    @abstractmethod
    async def run(self, context: RunContext) -> AgentResult:
        raise NotImplementedError
