import json
import asyncio
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse, ServerSentEvent

from agent import run_agent, run_morning_briefing, run_greeting_briefing
from db import check_connection
from memory import memory

app = FastAPI(title="Hotel Revenue Manager Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class BriefingRequest(BaseModel):
    api_key: Optional[str] = None
    mode: str = "full"

class ChatRequest(BaseModel):
    message: str
    api_key: Optional[str] = None
    history: list = []          # conversation messages from the frontend

class AgentResponse(BaseModel):
    response: str
    history: list               # updated history — frontend stores and sends back

class HealthResponse(BaseModel):
    db: bool
    status: str

class MemoryResponse(BaseModel):
    memory: dict


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
def health():
    db_ok = check_connection()
    return {"db": db_ok, "status": "ok" if db_ok else "db_unavailable"}


@app.post("/briefing", response_model=AgentResponse)
def briefing(req: BriefingRequest):
    try:
        if req.mode == "greeting":
            text, history = run_greeting_briefing(api_key=req.api_key)
        else:
            text, history = run_morning_briefing(api_key=req.api_key)
        memory.log_session(f"Morning briefing: {text[:200]}")
        return {"response": text, "history": history}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat", response_model=AgentResponse)
def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    try:
        text, updated_history = run_agent(
            user_message=req.message,
            api_key=req.api_key,
            history=req.history,
        )
        memory.log_session(f"Q: {req.message[:50]} | A: {text[:150]}")
        return {"response": text, "history": updated_history}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/stream", response_class=EventSourceResponse, response_model=None)
async def chat_stream(req: ChatRequest):
    """SSE streaming endpoint — streams agent response word-by-word for typing effect."""

    async def _generate():
        try:
            text, updated_history = await asyncio.to_thread(
                run_agent,
                user_message=req.message,
                api_key=req.api_key,
                history=req.history,
            )
            words = text.split(" ")
            for i, word in enumerate(words):
                separator = " " if i > 0 else ""
                yield ServerSentEvent(
                    data=json.dumps({"type": "token", "text": separator + word}),
                    event="token",
                )
                await asyncio.sleep(0.02)
            yield ServerSentEvent(
                data=json.dumps({"type": "done", "history": updated_history}),
                event="done",
            )
            memory.log_session(f"Q: {req.message[:50]} | A: {text[:150]}")
        except Exception as e:
            yield ServerSentEvent(
                data=json.dumps({"type": "error", "message": str(e)}),
                event="error",
            )

    return EventSourceResponse(_generate())


@app.get("/memory", response_model=MemoryResponse)
def get_memory():
    return {"memory": memory.get_all()}


@app.delete("/memory")
def clear_memory():
    memory.clear()
    return {"status": "cleared"}
