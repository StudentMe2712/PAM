"""Phase 5 — личный лектор: ingest + list learning material.

POST /learn/article  {url}            → fetch + extract an article
POST /learn/pdf      (multipart file) → extract text from an uploaded PDF
GET  /learn/sources                   → list ingested sources
GET  /learn/sources/{id}              → one source (with extracted text)
DELETE /learn/sources/{id}            → remove a source (+ its chunks)

Course generation lives in a later step; this slice just gets material in,
extracted, chunked and (via the background worker) embedded.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..content import ingest_article, ingest_pdf, ingest_youtube
from ..courses import generate_course
from ..db import get_session
from ..models import ContentSource, Course
from ..schemas import ContentSourceOut, CourseOut, IngestArticleIn

router = APIRouter(prefix="/learn", tags=["learn"])

MAX_PDF_BYTES = 25 * 1024 * 1024  # 25 MB


@router.post("/article", response_model=ContentSourceOut)
async def add_article(
    payload: IngestArticleIn,
    session: AsyncSession = Depends(get_session),
) -> ContentSource:
    url = payload.url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="url must be http(s)")
    src = await ingest_article(session, url)
    if src.status == "failed":
        raise HTTPException(status_code=422, detail=src.error or "extraction failed")
    return src


@router.post("/youtube", response_model=ContentSourceOut)
async def add_youtube(
    payload: IngestArticleIn,
    session: AsyncSession = Depends(get_session),
) -> ContentSource:
    url = payload.url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="url must be http(s)")
    src = await ingest_youtube(session, url)
    if src.status == "failed":
        raise HTTPException(status_code=422, detail=src.error or "transcript failed")
    return src


@router.post("/pdf", response_model=ContentSourceOut)
async def add_pdf(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
) -> ContentSource:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty file")
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="pdf too large (max 25 MB)")
    src = await ingest_pdf(session, file.filename or "document.pdf", data)
    if src.status == "failed":
        raise HTTPException(status_code=422, detail=src.error or "extraction failed")
    return src


@router.get("/sources", response_model=list[ContentSourceOut])
async def list_sources(
    session: AsyncSession = Depends(get_session),
) -> list[ContentSource]:
    rows = (
        await session.execute(
            select(ContentSource).order_by(ContentSource.created_at.desc())
        )
    ).scalars().all()
    return list(rows)


@router.get("/sources/{source_id}")
async def get_source(
    source_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> dict:
    src = (
        await session.execute(
            select(ContentSource).where(ContentSource.id == source_id)
        )
    ).scalar_one_or_none()
    if not src:
        raise HTTPException(status_code=404, detail="source not found")
    return {
        "id": str(src.id),
        "kind": src.kind,
        "title": src.title,
        "url": src.url,
        "status": src.status,
        "char_count": src.char_count,
        "error": src.error,
        "text": src.text,
        "created_at": src.created_at.isoformat() if src.created_at else None,
    }


@router.delete("/sources/{source_id}", status_code=204)
async def delete_source(
    source_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    src = (
        await session.execute(
            select(ContentSource).where(ContentSource.id == source_id)
        )
    ).scalar_one_or_none()
    if not src:
        raise HTTPException(status_code=404, detail="source not found")
    await session.delete(src)
    await session.commit()


@router.post("/sources/{source_id}/course", response_model=CourseOut)
async def make_course(
    source_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> Course:
    """Generate a mini-course from the source, tailored to the user's level."""
    src = (
        await session.execute(
            select(ContentSource).where(ContentSource.id == source_id)
        )
    ).scalar_one_or_none()
    if not src:
        raise HTTPException(status_code=404, detail="source not found")
    if src.status != "extracted" or not src.text:
        raise HTTPException(status_code=409, detail="source has no extracted text")
    try:
        return await generate_course(session, src)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"course generation failed: {e}")


@router.get("/sources/{source_id}/course", response_model=CourseOut | None)
async def latest_course(
    source_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> Course | None:
    """Return the most recently generated course for the source (or null)."""
    return (
        await session.execute(
            select(Course)
            .where(Course.source_id == source_id)
            .order_by(Course.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
