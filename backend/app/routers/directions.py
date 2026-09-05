"""Jónelis bólimlerine baylanıslı hújjetler hám hisabat kesteleri.

Bólimlerdiń ózi (tekst, jetekshiler) `frontend/src/data/directions.ts`da
statik saqlanadı — bul jerde tek sol bólimlerge júklengen fayllar,
qolman-toltırılatuǵın hisabat kesteleri hám olardıń qısqasha kórinisi
(summary). Oqıw ushın auth talap etilmeydi (`stats.py`daǵı GET
endpointleri sıyaqlı), tek jazıw/óshiriw admin huqıqın talap etedi.

Fayl baytları tikkeley bazada (`file_data`, bytea) saqlanadı — server
diski Render'diń tegin xızmetinde deploy'lar arasında saqlanbaydı
(ephemeral), al baza (Neon) turaqlı.
"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DirectionDocument, DirectionReportSheet, User
from app.schemas import (
    DirectionBlockCoverage,
    DirectionDocumentOut,
    DirectionPeriod,
    DirectionReportSheetIn,
    DirectionReportSheetOut,
)
from app.security import current_user, require_admin

router = APIRouter(prefix="/api/directions", tags=["directions"])

_ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".png", ".jpg", ".jpeg",
}
_MAX_SIZE_BYTES = 25 * 1024 * 1024
_PERIODS = {"q1", "h1", "m9", "year"}


# ── Hújjetler ────────────────────────────────────────────────────────


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

    doc = DirectionDocument(
        direction_id=direction_id,
        block_id=block_id,
        year=year,
        period=period,
        title=title.strip(),
        filename=original_name,
        content_type=file.content_type or "",
        size_bytes=len(data),
        file_data=data,
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

    return Response(
        content=doc.file_data,
        media_type=doc.content_type or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{doc.filename}"'},
    )


@router.delete("/documents/{document_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.get(DirectionDocument, document_id)
    if not doc:
        raise HTTPException(404, "Hújjet tabılmadı")
    db.delete(doc)
    db.commit()


# ── Hisabat kesteleri ───────────────────────────────────────────────


@router.get("/report", response_model=DirectionReportSheetOut)
def get_report(
    block_id: str,
    year: int,
    period: DirectionPeriod,
    db: Session = Depends(get_db),
):
    sheet = db.scalar(
        select(DirectionReportSheet).where(
            DirectionReportSheet.block_id == block_id,
            DirectionReportSheet.year == year,
            DirectionReportSheet.period == period,
        )
    )
    if not sheet:
        raise HTTPException(404, "Bul dáwir ushın hisabat ele toltırılmaǵan")
    return sheet


@router.put(
    "/report",
    response_model=DirectionReportSheetOut,
    dependencies=[Depends(require_admin)],
)
def put_report(
    payload: DirectionReportSheetIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    sheet = db.scalar(
        select(DirectionReportSheet).where(
            DirectionReportSheet.block_id == payload.block_id,
            DirectionReportSheet.year == payload.year,
            DirectionReportSheet.period == payload.period,
        )
    )
    if not sheet:
        sheet = DirectionReportSheet(
            direction_id=payload.direction_id,
            block_id=payload.block_id,
            year=payload.year,
            period=payload.period,
        )
        db.add(sheet)

    sheet.columns = payload.columns
    sheet.rows = payload.rows
    sheet.updated_by = user.username
    db.commit()
    db.refresh(sheet)
    return sheet


# ── Qısqasha kórinis (analitika) ────────────────────────────────────


@router.get("/summary", response_model=list[DirectionBlockCoverage])
def summary(year: int, period: DirectionPeriod, db: Session = Depends(get_db)):
    doc_rows = db.execute(
        select(
            DirectionDocument.direction_id,
            DirectionDocument.block_id,
            func.count(DirectionDocument.id),
        )
        .where(DirectionDocument.year == year, DirectionDocument.period == period)
        .group_by(DirectionDocument.direction_id, DirectionDocument.block_id)
    ).all()
    report_blocks = set(
        db.scalars(
            select(DirectionReportSheet.block_id).where(
                DirectionReportSheet.year == year, DirectionReportSheet.period == period
            )
        ).all()
    )

    covered: dict[str, DirectionBlockCoverage] = {
        block_id: DirectionBlockCoverage(
            direction_id=direction_id,
            block_id=block_id,
            document_count=count,
            has_report=block_id in report_blocks,
        )
        for direction_id, block_id, count in doc_rows
    }
    for sheet in db.scalars(
        select(DirectionReportSheet).where(
            DirectionReportSheet.year == year, DirectionReportSheet.period == period
        )
    ):
        if sheet.block_id not in covered:
            covered[sheet.block_id] = DirectionBlockCoverage(
                direction_id=sheet.direction_id,
                block_id=sheet.block_id,
                document_count=0,
                has_report=True,
            )

    return list(covered.values())
