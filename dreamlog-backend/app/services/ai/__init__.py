from app.core.config import get_settings
from app.services.ai.base import BaseDreamImageGenerator, BaseDreamInterpreter

settings = get_settings()


def get_interpreter() -> BaseDreamInterpreter:
    provider = settings.ai_interpreter_provider.lower()

    if provider == "deepseek":
        from app.services.ai.deepseek_interpreter import DeepSeekInterpreter

        return DeepSeekInterpreter()
    if provider == "claude":
        from app.services.ai.claude_interpreter import ClaudeInterpreter

        return ClaudeInterpreter()
    if provider == "openai":
        raise NotImplementedError("OpenAI interpreter coming soon")

    raise ValueError(f"不支持的解读服务: {provider}")


def get_image_generator() -> BaseDreamImageGenerator:
    provider = settings.ai_image_provider.lower()

    if provider == "dalle":
        from app.services.ai.dalle_generator import DalleGenerator

        return DalleGenerator()
    if provider == "stable_diffusion":
        from app.services.ai.dalle_generator import SDGenerator

        return SDGenerator()

    raise ValueError(f"不支持的绘图服务: {provider}")
