import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

logger = logging.getLogger(__name__)

PRIMARY_SERVICE_URL = os.environ.get("PRIMARY_SERVICE_URL", "http://localhost:8000")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http_client = httpx.AsyncClient(base_url=PRIMARY_SERVICE_URL, timeout=120.0)
    yield
    await app.state.http_client.aclose()


app = FastAPI(title="FastRouter API", description="LLM API Gateway — thin proxy layer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request/response models
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str
    messages: list[ChatMessage]
    stream: bool = False
    temperature: float = 0.7
    max_tokens: int = 1024


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {"service": "fastrouter-api", "version": "0.1.0"}


@app.post("/v1/chat/completions")
async def chat_completions(
    body: ChatCompletionRequest,
    request: Request,
    x_api_key: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
):
    # Extract raw API key from headers
    raw_key = x_api_key
    if not raw_key and authorization and authorization.startswith("Bearer fr-"):
        raw_key = authorization.removeprefix("Bearer ")
    if not raw_key:
        raise HTTPException(
            status_code=401,
            detail="API key required (X-API-Key header or Bearer fr-...)",
        )

    client: httpx.AsyncClient = request.app.state.http_client

    # 1. Authenticate API key and get user/wallet info
    auth_resp = await client.post("/internal/authenticate", json={"api_key": raw_key})
    if auth_resp.status_code != 200:
        detail = auth_resp.json().get("detail", "Authentication failed")
        raise HTTPException(status_code=auth_resp.status_code, detail=detail)
    auth_data = auth_resp.json()

    # 2. Validate model and get pricing info
    model_resp = await client.get(f"/internal/models/{body.model}")
    if model_resp.status_code != 200:
        detail = model_resp.json().get("detail", "Model validation failed")
        raise HTTPException(status_code=model_resp.status_code, detail=detail)
    model_data = model_resp.json()

    # 3. Call the LLM provider
    llm_resp = await client.post(
        "/internal/llm/call",
        json={
            "provider": model_data["provider"],
            "model": body.model,
            "messages": [m.model_dump() for m in body.messages],
            "temperature": body.temperature,
            "max_tokens": body.max_tokens,
        },
    )
    if llm_resp.status_code != 200:
        detail = llm_resp.json().get("detail", "LLM call failed")
        raise HTTPException(status_code=llm_resp.status_code, detail=detail)
    llm_data = llm_resp.json()

    # 4. Calculate cost and record usage (deducts credits atomically on the primary service)
    usage = llm_data["usage"]
    input_tokens = usage["prompt_tokens"]
    output_tokens = usage["completion_tokens"]
    cost = (
        input_tokens / 1000.0 * model_data["input_price_per_1k_tokens"]
        + output_tokens / 1000.0 * model_data["output_price_per_1k_tokens"]
    )

    record_resp = await client.post(
        "/internal/usage/record",
        json={
            "user_id": auth_data["user_id"],
            "api_key_id": auth_data["api_key_id"],
            "model_name": body.model,
            "provider": model_data["provider"],
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost": cost,
        },
    )
    if record_resp.status_code != 200:
        detail = record_resp.json().get("detail", "Usage recording failed")
        raise HTTPException(status_code=record_resp.status_code, detail=detail)

    return llm_data
