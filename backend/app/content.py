"""Phase 5 — личный лектор: ingest learning material into `ContentSource`.

Extracts plain text from a source (article URL → HTML→text, PDF bytes → text),
then chunks + embeds it (reusing the Phase 2 local-embedding pipeline) so a
course can later be generated and lessons can retrieve the relevant part.

YouTube transcript ingest is intentionally deferred (needs an extra dependency
and a transcript fetch); the model already carries a `youtube` kind for it.

Security: extracted text is UNTRUSTED external content. It is never executed
and, when later fed to the LLM, must be wrapped as data (see course generation),
mirroring the anti-injection handling of chat <context>.
"""
from __future__ import annotations

import io
import logging

import httpx
from bs4 import BeautifulSoup
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .indexing import chunk_text, embed_text
from .models import ContentChunk, ContentSource

log = logging.getLogger(__name__)

MAX_TEXT_CHARS = 200_000  # safety cap on stored extracted text
# Browser-like headers — some sites (e.g. Wikipedia) 403 minimal/bot user agents.
_FETCH_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
}
# Tags whose text is navigation/boilerplate, not article content.
_STRIP_TAGS = ("script", "style", "nav", "header", "footer", "aside", "form", "noscript")


def html_to_text(html: str) -> tuple[str | None, str]:
    """Extract (title, readable_text) from an HTML document, dropping boilerplate."""
    soup = BeautifulSoup(html, "html.parser")
    title = soup.title.string.strip() if soup.title and soup.title.string else None
    for tag in soup(_STRIP_TAGS):
        tag.decompose()
    # Prefer <article> / <main> if present; else fall back to the whole body.
    root = soup.find("article") or soup.find("main") or soup.body or soup
    parts: list[str] = []
    for el in root.find_all(["h1", "h2", "h3", "h4", "li", "p", "blockquote", "pre"]):
        t = el.get_text(" ", strip=True)
        if t:
            parts.append(t)
    text = "\n\n".join(parts).strip()
    if not text:  # last resort: all text
        text = root.get_text("\n", strip=True)
    return title, text


async def _extract_article(url: str) -> tuple[str | None, str]:
    async with httpx.AsyncClient(
        timeout=30.0, follow_redirects=True, headers=_FETCH_HEADERS
    ) as client:
        r = await client.get(url)
        r.raise_for_status()
        return html_to_text(r.text)


def pdf_to_text(data: bytes) -> str:
    """Extract text from PDF bytes (pure-python pypdf)."""
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    pages = [(page.extract_text() or "").strip() for page in reader.pages]
    return "\n\n".join(p for p in pages if p).strip()


async def ingest_article(session: AsyncSession, url: str) -> ContentSource:
    """Fetch + extract an article URL into a ContentSource (status set accordingly)."""
    src = ContentSource(kind="article", url=url, status="pending")
    session.add(src)
    await session.flush()
    try:
        title, text = await _extract_article(url)
        await _finalize(session, src, title=title, text=text)
    except Exception as e:  # noqa: BLE001
        await _fail(session, src, f"article extract failed: {e}")
    await session.commit()
    return src


async def ingest_pdf(session: AsyncSession, filename: str, data: bytes) -> ContentSource:
    """Extract text from an uploaded PDF into a ContentSource."""
    src = ContentSource(kind="pdf", title=filename, status="pending")
    session.add(src)
    await session.flush()
    try:
        text = pdf_to_text(data)
        await _finalize(session, src, title=filename, text=text)
    except Exception as e:  # noqa: BLE001
        await _fail(session, src, f"pdf extract failed: {e}")
    await session.commit()
    return src


async def _finalize(
    session: AsyncSession, src: ContentSource, *, title: str | None, text: str
) -> None:
    text = (text or "").strip()[:MAX_TEXT_CHARS]
    if not text:
        src.status = "failed"
        src.error = "no text extracted"
        return
    if title and not src.title:
        src.title = title[:500]
    src.text = text
    src.char_count = len(text)
    src.status = "extracted"
    for i, ch in enumerate(chunk_text(text)):
        session.add(ContentChunk(source_id=src.id, content=ch, position=i))


async def _fail(session: AsyncSession, src: ContentSource, msg: str) -> None:
    log.warning("content ingest %s: %s", src.id, msg)
    src.status = "failed"
    src.error = msg[:1000]


async def embed_pending_content(session: AsyncSession, limit: int = 64) -> int:
    """Embed up to `limit` content chunks whose embedding is still NULL."""
    pending = (
        await session.execute(
            select(ContentChunk).where(ContentChunk.embedding.is_(None)).limit(limit)
        )
    ).scalars().all()
    done = 0
    for ch in pending:
        ch.embedding = await embed_text(ch.content)
        done += 1
    if done:
        await session.commit()
    return done


async def content_remaining(session: AsyncSession) -> int:
    return int(
        (
            await session.execute(
                select(func.count())
                .select_from(ContentChunk)
                .where(ContentChunk.embedding.is_(None))
            )
        ).scalar_one()
    )
