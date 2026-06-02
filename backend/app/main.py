"""Personal AI Memory — FastAPI entry point."""
from __future__ import annotations

import logging
import re

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routes import conversations, search

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(
    title="Personal AI Memory",
    version="0.1.0",
    description="Phase 1 — collect AI conversations and search them.",
)

# CORS: allow extension and local web UI
# We expand "chrome-extension://*" to a regex because Chrome's origins are
# chrome-extension://<random-id>, and FastAPI's CORS middleware needs allow_origin_regex
# for wildcards.
_explicit_origins: list[str] = []
_origin_patterns: list[str] = []
for o in settings.cors_origins_list:
    if "*" in o:
        _origin_patterns.append(re.escape(o).replace(r"\*", ".*"))
    else:
        _explicit_origins.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_explicit_origins or ["*"],
    allow_origin_regex="|".join(_origin_patterns) if _origin_patterns else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(conversations.router)
app.include_router(search.router)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "Personal AI Memory",
        "version": "0.1.0",
        "phase": "1 — collection & basic search",
    }


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
