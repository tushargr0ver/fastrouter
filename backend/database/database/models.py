from datetime import datetime, timezone
from uuid import uuid4
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str
    is_admin: bool = Field(default=False)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class APIKey(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    name: str
    key_prefix: str
    key_hash: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_used_at: datetime | None = None


class LLMModel(SQLModel, table=True):
    __tablename__ = "llmmodel"
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True)
    provider: str
    display_name: str
    input_price_per_1k_tokens: float
    output_price_per_1k_tokens: float
    is_active: bool = Field(default=True)
    context_window: int = Field(default=128000)
    description: str = Field(default="")


class CreditWallet(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    balance: float = Field(default=0.0)
    total_purchased: float = Field(default=0.0)
    total_used: float = Field(default=0.0)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UsageLog(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    api_key_id: int = Field(foreign_key="apikey.id")
    user_id: int = Field(foreign_key="user.id")
    model_name: str
    provider: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost: float
    request_id: str = Field(default_factory=lambda: str(uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = Field(default="success")
    error_message: str | None = None
