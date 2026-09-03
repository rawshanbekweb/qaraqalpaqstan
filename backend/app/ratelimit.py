"""
Sırtqı kitapxanasız, IP tiykarındaǵı ápiwayı tezlik sheklewi.

Bazadaǵı emes, process xotirasındaǵı sanaq — kóp instance'li deployda
hár instance ózinshe esaplaydı, biraq bul platforma bir instance'de
isleydi (Render Free), sonlıqtan jeterli. Maqset DDoS qorǵawı emes:
parol izlew (login brute-force) hám bekar AI-chat so'rawların
qıyınlastırıw, ekewi de ashıq (avtorizatsiyasız) endpointler.
"""

from __future__ import annotations

import time
from collections import defaultdict
from collections.abc import Callable

from fastapi import HTTPException, Request, status

_hits: dict[str, list[float]] = defaultdict(list)


def _client_key(request: Request) -> str:
    """
    Render/Cloudflare artından kelgen sorawda `request.client.host`
    proksidiń óziniń IP'si boladı — barlıq paydalanıwshılar bir "IP"
    astında qosılıp, biri-birin bloklap qoyar edi. `X-Forwarded-For`
    (bar bolsa) haqıyqıy klient IP'sin beredi.
    """
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(*, limit: int, window_seconds: float) -> Callable[[Request], None]:
    """
    FastAPI dependency fabrikası: `Depends(rate_limit(limit=5, window_seconds=60))`.

    Hár shaqırıw ózine tán jabıq esap kеńisligine iye boladı (`bucket`
    arqalı ajıratılǵan), sonlıqtan eki bólek endpoint bir-birine tásir
    etpeydi, hátte ekewi de sol bir IP'den kelse de.
    """
    bucket = object()

    def dep(request: Request) -> None:
        key = f"{id(bucket)}:{_client_key(request)}"
        now = time.monotonic()
        hits = _hits[key]
        cutoff = now - window_seconds
        while hits and hits[0] < cutoff:
            hits.pop(0)
        if len(hits) >= limit:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "Tolıq kóp urınıs — biraz kútip qaytadan urınıp kóriń.",
            )
        hits.append(now)

    return dep
