"""Search routes — full-text search over messages (Phase 1)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import Conversation, Message
from ..schemas import SearchHit

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=list[SearchHit])
async def search_messages(
    q: str = Query(..., min_length=1, description="search query"),
    source: str | None = Query(None),
    limit: int = Query(30, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> list[SearchHit]:
    """Full-text search using PostgreSQL `websearch_to_tsquery`.

    Returns the most relevant messages with conversation context and a snippet.
    """
    tsquery = func.websearch_to_tsquery("simple", q)
    rank = func.ts_rank(Message.content_tsv, tsquery)
    snippet = func.ts_headline(
        "simple",
        Message.content,
        tsquery,
        "MaxFragments=2, MaxWords=20, MinWords=5, StartSel=«, StopSel=»",
    )

    stmt = (
        select(
            Conversation.id.label("conversation_id"),
            Message.id.label("message_id"),
            Conversation.source,
            Conversation.title,
            Message.role,
            snippet.label("snippet"),
            Message.sent_at,
            rank.label("rank"),
        )
        .join(Conversation, Conversation.id == Message.conversation_id)
        .where(Message.content_tsv.op("@@")(tsquery))
        .order_by(rank.desc())
        .limit(limit)
    )
    if source:
        stmt = stmt.where(Conversation.source == source)

    rows = (await session.execute(stmt)).all()
    return [
        SearchHit(
            conversation_id=r.conversation_id,
            message_id=r.message_id,
            source=r.source,
            title=r.title,
            role=r.role,
            snippet=r.snippet or "",
            sent_at=r.sent_at,
            rank=float(r.rank or 0.0),
        )
        for r in rows
    ]
