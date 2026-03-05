import os
import logging
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import FastAPI, Depends, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import update
from sqlmodel import Session, select

from database import (
    create_db_and_tables,
    get_session,
    User,
    APIKey,
    LLMModel,
    CreditWallet,
    UsageLog,
)

try:
    from passlib.context import CryptContext
    from jose import jwt, JWTError
except ImportError:
    raise

from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from google import genai
from google.genai import types as genai_types

logger = logging.getLogger(__name__)

SECRET_KEY = os.environ.get("SECRET_KEY", "fastrouter-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI(title="Fast Router", description="Unified AI API Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic request/response models
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str


class UserLogin(BaseModel):
    email: str
    password: str


class APIKeyCreate(BaseModel):
    name: str


class ModelCreate(BaseModel):
    name: str
    provider: str
    display_name: str
    input_price_per_1k_tokens: float
    output_price_per_1k_tokens: float
    context_window: int = 128000
    description: str = ""


class CreditAdd(BaseModel):
    amount: float
    user_id: int | None = None


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode({**data, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def get_current_user(
    authorization: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ")
    # If it looks like a fast-router API key, reject for user auth
    if token.startswith("fr-"):
        raise HTTPException(status_code=401, detail="Use JWT for user auth endpoints")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = session.get(User, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def resolve_api_key(
    x_api_key: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> tuple[APIKey, User]:
    raw_key = None
    if x_api_key:
        raw_key = x_api_key
    elif authorization and authorization.startswith("Bearer fr-"):
        raw_key = authorization.removeprefix("Bearer ")
    if not raw_key:
        raise HTTPException(status_code=401, detail="API key required")
    key_hash = hash_api_key(raw_key)
    api_key = session.exec(select(APIKey).where(APIKey.key_hash == key_hash)).first()
    if not api_key or not api_key.is_active:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    user = session.get(User, api_key.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return api_key, user


# ---------------------------------------------------------------------------
# Real LLM provider calls
# ---------------------------------------------------------------------------

async def _call_openai(model: str, messages: list[dict], temperature: float, max_tokens: int) -> dict:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
    client = AsyncOpenAI(api_key=api_key)
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.model_dump()
    except Exception as exc:
        logger.exception("OpenAI API error for model %s", model)
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {exc}") from exc


async def _call_anthropic(model: str, messages: list[dict], temperature: float, max_tokens: int) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
    client = AsyncAnthropic(api_key=api_key)

    system_parts: list[str] = []
    filtered_messages: list[dict] = []
    for m in messages:
        if m.get("role") == "system":
            system_parts.append(m.get("content", ""))
        else:
            filtered_messages.append({"role": m["role"], "content": m.get("content", "")})

    kwargs: dict = dict(
        model=model,
        messages=filtered_messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    if system_parts:
        kwargs["system"] = "\n".join(system_parts)

    try:
        response = await client.messages.create(**kwargs)
    except Exception as exc:
        logger.exception("Anthropic API error for model %s", model)
        raise HTTPException(status_code=502, detail=f"Anthropic API error: {exc}") from exc

    content = ""
    for block in response.content:
        if block.type == "text":
            content += block.text

    input_tokens = response.usage.input_tokens
    output_tokens = response.usage.output_tokens

    return {
        "id": response.id,
        "object": "chat.completion",
        "created": int(datetime.now(timezone.utc).timestamp()),
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": response.stop_reason or "stop",
            }
        ],
        "usage": {
            "prompt_tokens": input_tokens,
            "completion_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
        },
    }


async def _call_google(model: str, messages: list[dict], temperature: float, max_tokens: int) -> dict:
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")
    client = genai.Client(api_key=api_key)

    system_instruction = None
    contents: list[genai_types.Content] = []
    for m in messages:
        if m.get("role") == "system":
            system_instruction = m.get("content", "")
        else:
            role = "user" if m.get("role") == "user" else "model"
            contents.append(
                genai_types.Content(
                    role=role,
                    parts=[genai_types.Part(text=m.get("content", ""))],
                )
            )

    config = genai_types.GenerateContentConfig(
        temperature=temperature,
        max_output_tokens=max_tokens,
    )
    if system_instruction:
        config.system_instruction = system_instruction

    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )
    except Exception as exc:
        logger.exception("Google API error for model %s", model)
        raise HTTPException(status_code=502, detail=f"Google API error: {exc}") from exc

    content = response.text or ""
    input_tokens = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
    output_tokens = getattr(response.usage_metadata, "candidates_token_count", 0) or 0

    return {
        "id": f"chatcmpl-{uuid4().hex[:24]}",
        "object": "chat.completion",
        "created": int(datetime.now(timezone.utc).timestamp()),
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": input_tokens,
            "completion_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
        },
    }


async def call_provider(
    provider: str,
    model: str,
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> dict:
    provider_lower = provider.lower()
    if provider_lower == "openai":
        return await _call_openai(model, messages, temperature, max_tokens)
    elif provider_lower == "anthropic":
        return await _call_anthropic(model, messages, temperature, max_tokens)
    elif provider_lower == "google":
        return await _call_google(model, messages, temperature, max_tokens)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")


# ---------------------------------------------------------------------------
# Startup / seed data
# ---------------------------------------------------------------------------

DEFAULT_MODELS = [
    # OpenAI
    ("gpt-4.1", "openai", "GPT-4.1", 0.002, 0.008, 1047576),
    ("gpt-4.1-mini", "openai", "GPT-4.1 Mini", 0.0004, 0.0016, 1047576),
    ("gpt-4.1-nano", "openai", "GPT-4.1 Nano", 0.0001, 0.0004, 1047576),
    ("gpt-4o", "openai", "GPT-4o", 0.0025, 0.01, 128000),
    ("gpt-4o-mini", "openai", "GPT-4o Mini", 0.00015, 0.0006, 128000),
    ("o4-mini", "openai", "o4-mini", 0.0011, 0.0044, 200000),
    ("o3-mini", "openai", "o3-mini", 0.0011, 0.0044, 200000),
    # Anthropic
    ("claude-sonnet-4-20250514", "anthropic", "Claude Sonnet 4", 0.003, 0.015, 200000),
    ("claude-3-7-sonnet-20250219", "anthropic", "Claude 3.7 Sonnet", 0.003, 0.015, 200000),
    ("claude-3-5-haiku-20241022", "anthropic", "Claude 3.5 Haiku", 0.0008, 0.004, 200000),
    # Google
    ("gemini-2.5-pro", "google", "Gemini 2.5 Pro", 0.00125, 0.01, 1048576),
    ("gemini-2.5-flash", "google", "Gemini 2.5 Flash", 0.00015, 0.0035, 1048576),
    ("gemini-2.0-flash", "google", "Gemini 2.0 Flash", 0.0001, 0.0004, 1048576),
]


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    from database import engine as db_engine
    with Session(db_engine) as session:
        # Seed admin user
        admin = session.exec(select(User).where(User.email == "admin@fastrouter.dev")).first()
        if not admin:
            admin = User(
                email="admin@fastrouter.dev",
                hashed_password=hash_password("admin123"),
                full_name="Admin User",
                is_admin=True,
            )
            session.add(admin)
            session.flush()
            wallet = CreditWallet(user_id=admin.id, balance=1000.0, total_purchased=1000.0)
            session.add(wallet)

        # Seed LLM models
        for name, provider, display_name, in_price, out_price, ctx in DEFAULT_MODELS:
            existing = session.exec(select(LLMModel).where(LLMModel.name == name)).first()
            if not existing:
                session.add(LLMModel(
                    name=name,
                    provider=provider,
                    display_name=display_name,
                    input_price_per_1k_tokens=in_price,
                    output_price_per_1k_tokens=out_price,
                    context_window=ctx,
                ))
        session.commit()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "name": "Fast Router",
        "description": "Unified AI API Gateway",
        "version": "0.1.0",
        "docs": "/docs",
    }


# Auth

@app.post("/auth/register")
def register(body: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == body.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
    )
    session.add(user)
    session.flush()
    wallet = CreditWallet(user_id=user.id)
    session.add(wallet)
    session.commit()
    session.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user_id": user.id, "email": user.email}


@app.post("/auth/login")
def login(body: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == body.email)).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account inactive")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user_id": user.id, "email": user.email}


@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_admin": current_user.is_admin,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
    }


# API Keys

@app.get("/keys")
def list_keys(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    keys = session.exec(select(APIKey).where(APIKey.user_id == current_user.id)).all()
    return [
        {
            "id": k.id,
            "name": k.name,
            "key_prefix": k.key_prefix,
            "is_active": k.is_active,
            "created_at": k.created_at,
            "last_used_at": k.last_used_at,
        }
        for k in keys
    ]


@app.post("/keys", status_code=201)
def create_key(body: APIKeyCreate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    raw_key = "fr-" + secrets.token_urlsafe(32)
    api_key = APIKey(
        user_id=current_user.id,
        name=body.name,
        key_prefix=raw_key[:8],
        key_hash=hash_api_key(raw_key),
    )
    session.add(api_key)
    session.commit()
    session.refresh(api_key)
    return {
        "id": api_key.id,
        "name": api_key.name,
        "key_prefix": api_key.key_prefix,
        "key": raw_key,
        "message": "Store this key securely - it will not be shown again",
    }


@app.delete("/keys/{key_id}", status_code=204)
def delete_key(key_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    api_key = session.get(APIKey, key_id)
    if not api_key or api_key.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="API key not found")
    session.delete(api_key)
    session.commit()


@app.patch("/keys/{key_id}/toggle")
def toggle_key(key_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    api_key = session.get(APIKey, key_id)
    if not api_key or api_key.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="API key not found")
    api_key.is_active = not api_key.is_active
    session.add(api_key)
    session.commit()
    return {"id": api_key.id, "is_active": api_key.is_active}


# Credits

@app.get("/credits")
def get_credits(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    wallet = session.exec(select(CreditWallet).where(CreditWallet.user_id == current_user.id)).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return {
        "balance": wallet.balance,
        "total_purchased": wallet.total_purchased,
        "total_used": wallet.total_used,
        "updated_at": wallet.updated_at,
    }


@app.post("/credits/add")
def add_credits(body: CreditAdd, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    target_user_id = current_user.id
    if body.user_id and body.user_id != current_user.id:
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Only admins can add credits to other users")
        target_user_id = body.user_id
    wallet = session.exec(select(CreditWallet).where(CreditWallet.user_id == target_user_id)).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    wallet.balance += body.amount
    wallet.total_purchased += body.amount
    wallet.updated_at = datetime.now(timezone.utc)
    session.add(wallet)
    session.commit()
    return {"balance": wallet.balance, "added": body.amount}


# Usage

@app.get("/models")
def list_models(session: Session = Depends(get_session)):
    """Public endpoint — list all active LLM models."""
    return session.exec(select(LLMModel).where(LLMModel.is_active == True)).all()


@app.get("/usage")
def get_usage(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    logs = session.exec(
        select(UsageLog).where(UsageLog.user_id == current_user.id).offset(skip).limit(limit)
    ).all()
    return logs


@app.get("/usage/stats")
def get_usage_stats(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    logs = session.exec(select(UsageLog).where(UsageLog.user_id == current_user.id)).all()
    total_tokens = sum(l.total_tokens for l in logs)
    total_cost = sum(l.cost for l in logs)
    by_model: dict = {}
    for log in logs:
        key = log.model_name
        if key not in by_model:
            by_model[key] = {"tokens": 0, "cost": 0.0, "requests": 0}
        by_model[key]["tokens"] += log.total_tokens
        by_model[key]["cost"] += log.cost
        by_model[key]["requests"] += 1
    return {
        "total_requests": len(logs),
        "total_tokens": total_tokens,
        "total_cost": total_cost,
        "by_model": by_model,
    }


# Admin Routes

@app.get("/admin/models")
def admin_list_models(admin: User = Depends(get_admin_user), session: Session = Depends(get_session)):
    return session.exec(select(LLMModel)).all()


@app.post("/admin/models", status_code=201)
def admin_create_model(body: ModelCreate, admin: User = Depends(get_admin_user), session: Session = Depends(get_session)):
    existing = session.exec(select(LLMModel).where(LLMModel.name == body.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Model already exists")
    model = LLMModel(**body.model_dump())
    session.add(model)
    session.commit()
    session.refresh(model)
    return model


@app.put("/admin/models/{model_id}")
def admin_update_model(model_id: int, body: ModelCreate, admin: User = Depends(get_admin_user), session: Session = Depends(get_session)):
    model = session.get(LLMModel, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    for key, value in body.model_dump().items():
        setattr(model, key, value)
    session.add(model)
    session.commit()
    session.refresh(model)
    return model


@app.delete("/admin/models/{model_id}", status_code=204)
def admin_deactivate_model(model_id: int, admin: User = Depends(get_admin_user), session: Session = Depends(get_session)):
    model = session.get(LLMModel, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    model.is_active = False
    session.add(model)
    session.commit()


@app.get("/admin/users")
def admin_list_users(admin: User = Depends(get_admin_user), session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    result = []
    for user in users:
        wallet = session.exec(select(CreditWallet).where(CreditWallet.user_id == user.id)).first()
        result.append({
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_admin": user.is_admin,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "balance": wallet.balance if wallet else 0.0,
        })
    return result


@app.get("/admin/stats")
def admin_stats(admin: User = Depends(get_admin_user), session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    logs = session.exec(select(UsageLog)).all()
    wallets = session.exec(select(CreditWallet)).all()
    api_keys = session.exec(select(APIKey)).all()
    total_revenue = sum(w.total_purchased for w in wallets)
    total_credits_used = sum(w.total_used for w in wallets)
    return {
        "total_users": len(users),
        "total_requests": len(logs),
        "total_tokens": sum(l.total_tokens for l in logs),
        "total_revenue": total_revenue,
        "total_credits_used": total_credits_used,
        "active_users": sum(1 for u in users if u.is_active),
        "active_keys": sum(1 for k in api_keys if k.is_active),
    }


# ---------------------------------------------------------------------------
# Internal endpoints (called by the api service)
# ---------------------------------------------------------------------------

class InternalAuthRequest(BaseModel):
    api_key: str


class InternalAuthResponse(BaseModel):
    user_id: int
    api_key_id: int
    wallet_balance: float


class InternalModelResponse(BaseModel):
    name: str
    provider: str
    display_name: str
    input_price_per_1k_tokens: float
    output_price_per_1k_tokens: float


class InternalLLMCallRequest(BaseModel):
    provider: str
    model: str
    messages: list[dict]
    temperature: float = 0.7
    max_tokens: int = 1024


class InternalUsageRecordRequest(BaseModel):
    user_id: int
    api_key_id: int
    model_name: str
    provider: str
    input_tokens: int
    output_tokens: int
    cost: float


@app.post("/internal/authenticate", response_model=InternalAuthResponse)
def internal_authenticate(body: InternalAuthRequest, session: Session = Depends(get_session)):
    """Validate an API key and return user + wallet info."""
    key_hash = hash_api_key(body.api_key)
    api_key = session.exec(select(APIKey).where(APIKey.key_hash == key_hash)).first()
    if not api_key or not api_key.is_active:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    user = session.get(User, api_key.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    wallet = session.exec(select(CreditWallet).where(CreditWallet.user_id == user.id)).first()
    if not wallet:
        raise HTTPException(status_code=402, detail="No credit wallet found")
    return InternalAuthResponse(
        user_id=user.id,
        api_key_id=api_key.id,
        wallet_balance=wallet.balance,
    )


@app.get("/internal/models/{model_name}", response_model=InternalModelResponse)
def internal_get_model(model_name: str, session: Session = Depends(get_session)):
    """Validate a model name and return its info."""
    llm_model = session.exec(
        select(LLMModel).where(LLMModel.name == model_name, LLMModel.is_active == True)
    ).first()
    if not llm_model:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found or inactive")
    return InternalModelResponse(
        name=llm_model.name,
        provider=llm_model.provider,
        display_name=llm_model.display_name,
        input_price_per_1k_tokens=llm_model.input_price_per_1k_tokens,
        output_price_per_1k_tokens=llm_model.output_price_per_1k_tokens,
    )


@app.post("/internal/llm/call")
async def internal_llm_call(body: InternalLLMCallRequest):
    """Make a call to an LLM provider and return the response."""
    return await call_provider(body.provider, body.model, body.messages, body.temperature, body.max_tokens)


@app.post("/internal/usage/record")
def internal_usage_record(body: InternalUsageRecordRequest, session: Session = Depends(get_session)):
    """Deduct credits and record a usage log entry.

    The credit deduction is performed as a single conditional UPDATE statement so
    that concurrent requests cannot overdraw the balance (i.e. the check and
    deduction are atomic at the database level).
    """
    stmt = (
        update(CreditWallet)
        .where(CreditWallet.user_id == body.user_id, CreditWallet.balance >= body.cost)
        .values(
            balance=CreditWallet.balance - body.cost,
            total_used=CreditWallet.total_used + body.cost,
            updated_at=datetime.now(timezone.utc),
        )
        .execution_options(synchronize_session="fetch")
    )
    result = session.execute(stmt)

    if result.rowcount == 0:
        wallet = session.exec(select(CreditWallet).where(CreditWallet.user_id == body.user_id)).first()
        if not wallet:
            raise HTTPException(status_code=402, detail="Wallet not found")
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient credits. Required: {body.cost:.6f}, Available: {wallet.balance:.6f}",
        )

    api_key = session.get(APIKey, body.api_key_id)
    if api_key:
        api_key.last_used_at = datetime.now(timezone.utc)
        session.add(api_key)

    log = UsageLog(
        api_key_id=body.api_key_id,
        user_id=body.user_id,
        model_name=body.model_name,
        provider=body.provider,
        input_tokens=body.input_tokens,
        output_tokens=body.output_tokens,
        total_tokens=body.input_tokens + body.output_tokens,
        cost=body.cost,
        status="success",
    )
    session.add(log)
    session.commit()

    wallet = session.exec(select(CreditWallet).where(CreditWallet.user_id == body.user_id)).first()
    return {"balance": wallet.balance if wallet else 0.0, "cost_deducted": body.cost}

