"""
AI 服务抽象接口
所有 AI 供应商实现这些基类，业务层只依赖接口
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class InterpretResult:
    """梦境解读结果"""
    psychology: str          # 心理学解读
    symbolism: str           # 象征意义
    cultural: str            # 文化角度
    summary: str             # 一句话诗意总结
    advice: str              # 梦境建议
    keywords: list[str]      # 关键词标签
    title: str = ""          # AI 生成的梦境标题
    provider: str = ""       # 供应商
    model: str = ""          # 模型名


@dataclass
class ImageResult:
    """图片生成结果"""
    image_url: str           # 图片 URL（上传 OSS 后的地址）
    image_data: bytes = b""  # 原始图片二进制（上传前）
    provider: str = ""
    model: str = ""
    style: str = ""


class BaseDreamInterpreter(ABC):
    """梦境解读抽象接口"""

    @abstractmethod
    async def interpret(
        self,
        dream_content: str,
        mood: Optional[str] = None,
        clarity: Optional[int] = None,
    ) -> InterpretResult:
        """
        解读梦境
        :param dream_content: 梦境描述文字
        :param mood: 醒来后的情绪
        :param clarity: 清晰度 1-5
        :return: 解读结果
        """
        ...

    @abstractmethod
    async def generate_embedding(self, dream_content: str) -> list[float]:
        """
        生成梦境文本的向量嵌入（用于撞梦匹配）
        :param dream_content: 梦境描述
        :return: 1536 维向量
        """
        ...


class BaseDreamImageGenerator(ABC):
    """梦境绘图抽象接口"""

    @abstractmethod
    async def generate(
        self,
        dream_content: str,
        mood: Optional[str] = None,
        style: str = "surreal_dreamlike",
    ) -> ImageResult:
        """
        根据梦境描述生成画面
        :param dream_content: 梦境描述
        :param mood: 情绪（影响色调）
        :param style: 绘图风格
        :return: 图片结果
        """
        ...

    def get_available_styles(self) -> list[dict]:
        """获取支持的绘图风格列表"""
        return [
            {"id": "surreal_dreamlike", "name": "超现实梦幻", "description": "柔和光影，朦胧飘逸"},
            {"id": "watercolor", "name": "水彩画风", "description": "淡雅通透，色彩交融"},
            {"id": "cyberpunk", "name": "赛博朋克", "description": "霓虹灯光，未来都市"},
            {"id": "chinese_ink", "name": "国风水墨", "description": "写意泼墨，东方意境"},
            {"id": "oil_painting", "name": "油画质感", "description": "厚重笔触，经典光影"},
            {"id": "anime", "name": "动漫风格", "description": "日系唯美，细腻线条"},
        ]
