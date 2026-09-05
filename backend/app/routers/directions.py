"""Jónelis bólimlerine baylanıslı hújjetler (fayl-qosımshalar).

Bólimlerdiń ózi (tekst, jetekshiler) `frontend/src/data/directions.ts`da
statik saqlanadı — bul jerde tek sol bólimlerge júklengen fayllardıń
ma'lumatnaması. Oqıw ushın auth talap etilmeydi (`stats.py`daǵı GET
endpointleri sıyaqlı), tek júklew/óshiriw admin huqıqın talap etedi.
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import DirectionDocument, User
from app.schemas import DirectionDocumentOut, DirectionPeriod
from app.security import current_user, require_admin

router = APIRouter(prefix="/api/directions", tags=["directions"])

_ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".png", ".jpg", ".jpeg",
}
_MAX_SIZE_BYTES = 25 * 1024 * 1024
_PERIODS = {"q1", "h1", "m9", "year"}


def _documents_root() -> Path:
    root = Path(get_settings().uploads_dir) / "directions"
    root.mkdir(parents=True, exist_ok=True)
    return root


@router.get("/documents", response_model=list[DirectionDocumentOut])
def list_documents(
    block_id: str,
    year: int,
    period: DirectionPeriod,
    db: Session = Depends(get_db),
):
    stmt = (
        select(DirectionDocument)
        .where(
            DirectionDocument.block_id == block_id,
            DirectionDocument.year == year,
            DirectionDocument.period == period,
        )
        .order_by(DirectionDocument.created_at.desc())
    )
    return db.scalars(stmt).all()


@router.post(
    "/documents",
    response_model=DirectionDocumentOut,
    status_code=201,
    dependencies=[Depends(require_admin)],
)
async def upload_document(
    direction_id: str = Form(...),
    block_id: str = Form(...),
    year: int = Form(...),
    period: str = Form(...),
    title: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if period not in _PERIODS:
        raise HTTPException(400, f"Belgisiz dáwir: {period}")

    original_name = os.path.basename(file.filename or "hújjet")
    ext = Path(original_name).suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Bul kеńeytpe qollap-quwatlanbaydı: {ext or '(joq)'}")

    data = await file.read()
    if len(data) > _MAX_SIZE_BYTES:
        raise HTTPException(400, "Fayl kólemi 25 MB-dan úlken bolıwı múmkin emes")
    if not data:
        raise HTTPException(400, "Fayl bos")

    block_dir = _documents_root() / block_id
    block_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}-{original_name}"
    (block_dir / stored_name).write_bytes(data)

    doc = DirectionDocument(
        direction_id=direction_id,
        block_id=block_id,
        year=year,
        period=period,
        title=title.strip(),
        filename=original_name,
        content_type=file.content_type or "",
        size_bytes=len(data),
        storage_path=str(Path("directions") / block_id / stored_name),
        uploaded_by=user.username,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/documents/{document_id}/download")
def download_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.get(DirectionDocument, document_id)
    if not doc:
        raise HTTPException(404, "Hújjet tabılmadı")

    path = Path(get_settings().uploads_dir) / doc.storage_path
    if not path.is_file():
        raise HTTPException(404, "Fayl serverde tabılmadı")

    return FileResponse(
        path,
        filename=doc.filename,
        media_type=doc.content_type or "application/octet-stream",
    )


@router.delete("/documents/{document_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.get(DirectionDocument, document_id)
    if not doc:
        raise HTTPException(404, "Hújjet tabılmadı")

    path = Path(get_settings().uploads_dir) / doc.storage_path
    if path.is_file():
        path.unlink()

    db.delete(doc)
    db.commit()
