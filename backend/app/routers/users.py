"""
Paydalanıwshılardı basqarıw — admin panel.

Aldın hisap tek `app.seed` skripti arqalı (yamasa tikkeley bazaǵa kirip)
jaratıla alatuǵın edi. Bul router admin panelge hisap qosıw/ózgertiw/
óshiriw imkaniyatın beredi.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserOut, UserUpdate
from app.security import current_user, hash_password, require_admin

router = APIRouter(
    prefix="/api/users", tags=["users"], dependencies=[Depends(require_admin)]
)


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.username)).all()


@router.post("", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    login = payload.username.strip().lower()
    if not login:
        raise HTTPException(400, "Login bos bolıwı múmkin emes")
    if db.scalar(select(User).where(User.username == login)):
        raise HTTPException(400, "Bul login band")

    user = User(
        username=login,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    me: User = Depends(current_user),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Paydalanıwshı tabılmadı")

    fields = payload.model_dump(exclude_unset=True)
    if "full_name" in fields:
        user.full_name = (fields["full_name"] or "").strip()
    if "role" in fields and fields["role"] is not None:
        # Óz-óziniń administratorlıq huqıqın alıp taslawın boldırmaymız —
        # aks halda sońǵı administrator ózin kilitlep qoyıwı múmkin
        if user.id == me.id and fields["role"] != "admin":
            raise HTTPException(400, "Óz huqıqıńızdı ózińiz tómenlete almaysız")
        user.role = fields["role"]
    if fields.get("password"):
        user.password_hash = hash_password(fields["password"])

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    me: User = Depends(current_user),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Paydalanıwshı tabılmadı")
    if user.id == me.id:
        raise HTTPException(400, "Óz hesabıńızdı ózińiz óshire almaysız")
    if user.role == "admin":
        # `with_for_update` — admin qatarların qulıplaydı, sonlıqtan eki
        # bir waqıtta kelgen óshiriw sorawı bir-birin gúzetip, sanaǵın
        # eski mánis penen esaplap ekewi de ótip ketpeydi (TOCTOU)
        admin_ids = db.scalars(
            select(User.id).where(User.role == "admin").with_for_update()
        ).all()
        if len(admin_ids) <= 1:
            raise HTTPException(400, "Aqırǵı administratordı óshirip bolmaydı")

    db.delete(user)
    db.commit()
