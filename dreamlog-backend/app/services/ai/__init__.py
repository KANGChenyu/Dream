"""
AI 服务工厂
根据配置自动选择 AI 供应商，支持运行时切换和降级
"""
from app.core.config import get_settings
from app.services.ai.base import BaseDreamInterpreter, BaseDreamImageGenerator

settings = get_settings()


def get_interpreter() -> BaseDreamInterpreter:
    """获取梦境解读服务实例"""
    provider = settings.ai_interpreter_provider.lower()

    if provider == "claude":
        from app.services.ai.claude_interpreter import ClaudeInterpreter
        return ClaudeInterpreter()
    elif provider == "openai":
        # TODO: 实现 OpenAI 版本
        raise NotImplementedError("OpenAI interpreter coming soon")
    elif provider == "deepseek":
        # TODO: 实现 DeepSeek 版本
        raise NotImplementedError("DeepSeek interpreter coming soon")
    else:
        raise ValueError(f"不支持的解读服务: {provider}")


def get_image_generator() -> BaseDreamImageGenerator:
    """获取梦境绘图服务实例"""
    provider = settings.ai_image_provider.lower()

    if provider == "dalle":
        from app.services.ai.dalle_generator import DalleGenerator
        return DalleGenerator()
    elif provider == "stable_diffusion":
        from app.services.ai.dalle_generator import SDGenerator
        return SDGenerator()
    else:
        raise ValueError(f"不支持的绘图服务: {provider}")


async def interpret_with_fallback(
    dream_content: str,
    mood: str = None,
    clarity: int = None,
):
    """带降级兜底的解读服务"""
    providers = ["claude", "openai"]
    last_error = None

    for provider_name in providers:
        try:
            if provider_name == "claude":
                from app.services.ai.claude_interpreter import ClaudeInterpreter
                interpreter = ClaudeInterpreter()
            else:
                continue  # 其他实现待添加

            return await interpreter.interpret(dream_content, mood, clarity)
        except Exception as e:
            last_error = e
            continue

    raise last_error
