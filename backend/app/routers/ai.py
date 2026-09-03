from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.ratelimit import rate_limit
from app.schemas import ChatRequest, ChatResponse
from app.services import claude, local_engine
from app.services import stats as st

router = APIRouter(prefix="/api/ai", tags=["ai"])

#: Avtorizatsiyasız endpoint — Claude API xarajatı hám servis
#: júklemesin sheklew ushın bir IP'den minutına 15 sorav
_chat_limit = rate_limit(limit=15, window_seconds=60)


@router.post("/chat", response_model=ChatResponse, dependencies=[Depends(_chat_limit)])
def chat(payload: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    """RAG chat: avval Claude, kalit yo'q yoki xato bo'lsa mahalliy dvigatel."""
    result = claude.ask(
        db,
        payload.prompt,
        district_id=payload.district_id,
        module_id=payload.module_id,
        year=payload.year,
    )
    if result is not None:
        return result

    return local_engine.answer(
        db,
        payload.prompt,
        district_id=payload.district_id,
        module_id=payload.module_id,
        year=payload.year,
    )


@router.get("/insight", response_model=ChatResponse)
def top_insight(year: int | None = None, db: Session = Depends(get_db)) -> ChatResponse:
    """Dashboard tepasidagi doimiy AI xulosasi (Claude'siz, tez)."""
    return local_engine.answer(db, "Máseleli rayonlardı kórset", year=year)


@router.get("/status")
def status(db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    return {
        "claude_enabled": bool(settings.anthropic_api_key),
        "model": settings.claude_model,
        "years": sorted(st.available_years(db), reverse=True),
    }
