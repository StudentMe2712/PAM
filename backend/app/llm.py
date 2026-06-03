"""Phase 4 — chat LLM provider abstraction with token streaming.

Provider-agnostic: `stream_chat(messages)` yields text tokens from either
Groq (cloud, free tier, OpenAI-compatible API) or a local Ollama chat model,
selected by `settings.LLM_PROVIDER`. Embeddings stay local (see indexing.py);
this is only for the chat/extraction LLM.
"""
from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator

import httpx

from .config import settings

log = logging.getLogger(__name__)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


async def stream_chat(messages: list[dict]) -> AsyncIterator[str]:
    """Yield response tokens for the given chat messages, via the configured provider."""
    provider = settings.LLM_PROVIDER.lower()
    if provider == "ollama":
        async for tok in _stream_ollama(messages):
            yield tok
    else:
        async for tok in _stream_groq(messages):
            yield tok


async def _stream_groq(messages: list[dict]) -> AsyncIterator[str]:
    if not settings.GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY не задан. Добавь ключ в backend/.env или переключи "
            "LLM_PROVIDER=ollama."
        )
    payload = {"model": settings.GROQ_MODEL, "messages": messages, "stream": True}
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", GROQ_URL, headers=headers, json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data = line[6:]
                if data == "[DONE]":
                    break
                try:
                    delta = json.loads(data)["choices"][0]["delta"].get("content")
                except (KeyError, IndexError, json.JSONDecodeError):
                    continue
                if delta:
                    yield delta


async def complete(messages: list[dict], json_mode: bool = False) -> str:
    """Non-streaming completion (used for fact extraction). Returns full text."""
    provider = settings.LLM_PROVIDER.lower()
    if provider == "ollama":
        return await _complete_ollama(messages, json_mode)
    return await _complete_groq(messages, json_mode)


async def _complete_groq(messages: list[dict], json_mode: bool) -> str:
    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY не задан (или переключи LLM_PROVIDER=ollama).")
    payload: dict = {"model": settings.GROQ_MODEL, "messages": messages, "stream": False}
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(GROQ_URL, headers=headers, json=payload)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


async def _complete_ollama(messages: list[dict], json_mode: bool) -> str:
    payload: dict = {"model": settings.OLLAMA_CHAT_MODEL, "messages": messages, "stream": False}
    if json_mode:
        payload["format"] = "json"
    async with httpx.AsyncClient(timeout=300.0) as client:
        r = await client.post(f"{settings.OLLAMA_URL}/api/chat", json=payload)
        r.raise_for_status()
        return r.json()["message"]["content"]


async def _stream_ollama(messages: list[dict]) -> AsyncIterator[str]:
    payload = {"model": settings.OLLAMA_CHAT_MODEL, "messages": messages, "stream": True}
    async with httpx.AsyncClient(timeout=300.0) as client:
        async with client.stream(
            "POST", f"{settings.OLLAMA_URL}/api/chat", json=payload
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                tok = (obj.get("message") or {}).get("content")
                if tok:
                    yield tok
                if obj.get("done"):
                    break
