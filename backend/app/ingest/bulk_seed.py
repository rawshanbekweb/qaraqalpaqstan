"""
Masofaviy (Neon kabi) bazaǵa tez júkleu ushın — `app.ingest.loader`diń
ORM sikli (hár ko'rsetkishke jeke flush) joqarı keshiktiriwli baylanısta
óte sekin: 2200+ ko'rsetkish = 2200+ round-trip. Bul modul sol
ko'rsetkishler/ólshemlerdi kóp qatarlı (bulk) INSERT arqalı, az sanlı
round-trip penen jazadı.

Ishge tusiriw:
    python -m app.ingest.bulk_seed ../model/data
"""

from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path

from sqlalchemy import delete, insert, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.database import SessionLocal, ensure_schema
from app.ingest.excel import parse_tree
from app.ingest.loader import CATEGORIES, LOWER_IS_BETTER, core_module, keep_known, record_slug
from app.models import District, StatCategory, StatIndicator, StatObservation

INDICATOR_CHUNK = 500
OBSERVATION_CHUNK = 2000


def load_fast(data_root: Path, db: Session) -> dict[str, int]:
    records = keep_known(parse_tree(data_root))
    if not records:
        raise SystemExit(f"'{data_root}' ichinen jazba tabılmadı")

    known_districts = {d.id for d in db.scalars(select(District))}
    if not known_districts:
        raise SystemExit("districts kestesi bos — aldın `python -m app.seed` iske túsiriń")

    # ── Kategoriyalar ──
    cat_rows = []
    for src_dir in {r.category for r in records}:
        cid, kaa, uz, color, sort = CATEGORIES[src_dir]
        cat_rows.append(dict(id=cid, source_dir=src_dir, name_kaa=kaa, name_uz=uz, color=color, sort=sort))
    if cat_rows:
        stmt = pg_insert(StatCategory).values(cat_rows)
        stmt = stmt.on_conflict_do_nothing(index_elements=["id"])
        db.execute(stmt)

    # ── Ko'rsetkishler (bulk upsert, RETURNING arqalı id alıw) ──
    grouped: dict[str, list] = defaultdict(list)
    for r in records:
        grouped[record_slug(r)].append(r)

    ind_rows = []
    for slug, rows in grouped.items():
        first = rows[0]
        ind_rows.append(dict(
            slug=slug,
            category_id=CATEGORIES[first.category][0],
            name_kaa=first.indicator[:300],
            unit=next((r.unit for r in rows if r.unit), "")[:80],
            has_districts=any(r.district_id for r in rows),
            module=core_module(first.indicator),
            lower_is_better=any(k in first.indicator.lower() for k in LOWER_IS_BETTER),
            source=first.source[:200],
        ))

    indicator_ids: dict[str, int] = {}
    for i in range(0, len(ind_rows), INDICATOR_CHUNK):
        chunk = ind_rows[i : i + INDICATOR_CHUNK]
        stmt = pg_insert(StatIndicator).values(chunk)
        stmt = stmt.on_conflict_do_update(
            index_elements=["slug"],
            set_=dict(
                category_id=stmt.excluded.category_id,
                name_kaa=stmt.excluded.name_kaa,
                unit=stmt.excluded.unit,
                has_districts=stmt.excluded.has_districts,
                module=stmt.excluded.module,
                lower_is_better=stmt.excluded.lower_is_better,
                source=stmt.excluded.source,
            ),
        ).returning(StatIndicator.id, StatIndicator.slug)
        for id_, slug in db.execute(stmt):
            indicator_ids[slug] = id_
    db.commit()

    # ── Ólshemler: tolıq qayta júkleu ──
    db.execute(delete(StatObservation))
    db.commit()

    seen: set[tuple] = set()
    obs_rows = []
    added = skipped = 0
    for r in records:
        did = r.district_id
        if did and did not in known_districts:
            skipped += 1
            continue
        key = (indicator_ids[record_slug(r)], did, r.year, r.period, r.period_no)
        if key in seen:
            skipped += 1
            continue
        seen.add(key)
        obs_rows.append(dict(
            indicator_id=key[0], district_id=did, year=r.year,
            period=r.period, period_no=r.period_no, value=r.value,
            plan_value=r.plan_value,
        ))
        added += 1

    for i in range(0, len(obs_rows), OBSERVATION_CHUNK):
        db.execute(insert(StatObservation), obs_rows[i : i + OBSERVATION_CHUNK])
    db.commit()

    orphans = db.query(StatIndicator).filter(~StatIndicator.observations.any()).delete(synchronize_session=False)
    db.commit()

    return {
        "kategoriya": len(cat_rows),
        "korsetkish": len(indicator_ids),
        "olshov": added,
        "otkazib_yuborilgan": skipped,
        "eskirgen": orphans,
    }


def main() -> None:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "../model/data")
    if not root.exists():
        raise SystemExit(f"papka topilmadi: {root}")

    ensure_schema()
    with SessionLocal() as db:
        stats = load_fast(root, db)

    print("Yuklandi.")
    for k, v in stats.items():
        print(f"  {k:22} {v:,}")


if __name__ == "__main__":
    main()
