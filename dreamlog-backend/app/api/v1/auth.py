"""
认证相关 API
微信登录 / 手机号验证码登录
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
import random

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import (
    WechatLoginRequest, PhoneLoginRequest, SendSmsRequest,
    TokenResponse, UserResponse, UserUpdateRequest,
)

router = APIRouter(prefix="/auth", tags=["认证"])
settings = get_settings()

# 临时存储验证码（生产环境用 Redis）
_sms_codes: dict[str, str] = {}


@router.post("/login/wechat", response_model=TokenResponse)
async def login_wechat(req: WechatLoginRequest, db: AsyncSession = Depends(get_db)):
    """微信小程序登录"""
    # 1. 用 code 换 openid
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.weixin.qq.com/sns/jscode2session",
            params={
                "appid": settings.wechat_app_id,
                "secret": settings.wechat_app_secret,
                "js_code": req.code,
                "grant_type": "authorization_code",
            },
        )
    data = resp.json()
    openid = data.get("openid")
    if not openid:
        raise HTTPException(status_code=400, detail="微信登录失败")

    # 2. 查找或创建用户
    result = await db.execute(
        select(User).where(User.wechat_openid == openid)
    )
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            wechat_openid=openid,
            wechat_unionid=data.get("unionid"),
            nickname=f"梦旅人{random.randint(1000, 9999)}",
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

    # 3. 生成 token
    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/sms/send")
async def send_sms(req: SendSmsRequest):
    """发送短信验证码"""
    code = str(random.randint(100000, 999999))
    _sms_codes[req.phone] = code

    # TODO: 对接真实短信 API（阿里云/腾讯云）
    # 开发阶段直接返回验证码
    if settings.app_env == "development":
        return {"message": "验证码已发送", "debug_code": code}

    return {"message": "验证码已发送"}


@router.post("/login/phone", response_model=TokenResponse)
async def login_phone(req: PhoneLoginRequest, db: AsyncSession = Depends(get_db)):
    """手机号验证码登录"""
    # 1. 验证码校验
    expected = _sms_codes.get(req.phone)
    if not expected or expected != req.code:
        raise HTTPException(status_code=400, detail="验证码错误或已过期")
    del _sms_codes[req.phone]

    # 2. 查找或创建用户
    result = await db.execute(
        select(User).where(User.phone == req.phone)
    )
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            phone=req.phone,
            nickname=f"梦旅人{random.randint(1000, 9999)}",
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return UserResponse.model_validate(user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    req: UserUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新个人资料"""
    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)
