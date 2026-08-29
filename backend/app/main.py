import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import SessionLocal, ensure_schema
from app.routers import ai, auth, data, stats, users
from app.seed import seed_reference, seed_users

logging.basicConfig(level=logging.INFO)

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Jadvallar mavjud bo'lmasa yaratiladi, ma'lumotnomalar va demo hisoblar sinxronlanadi."""
    ensure_schema()
    with SessionLocal() as db:
        seed_reference(db)
        seed_users(db)
    yield


app = FastAPI(
    lifespan=lifespan,
    title="Qoraqalpog'iston — Iqtisodiy monitoring va AI analitika",
    description=(
        "Admin kiritgan ko'rsatkichlar PostgreSQL'da saqlanadi; AI javoblari "
        "aynan shu bazadan olingan kontekst asosida quriladi (RAG)."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Excel/CSV eksport faylı nomi usı sarlawhada keledi — brauzer ony
    # ashıq qoyılmasa aralıq-domen sorawda oqıy almaydı
    expose_headers=["Content-Disposition"],
)

app.include_router(auth.router)
app.include_router(data.router)
app.include_router(stats.router)
app.include_router(ai.router)
app.include_router(users.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "claude_enabled": bool(settings.anthropic_api_key)}
