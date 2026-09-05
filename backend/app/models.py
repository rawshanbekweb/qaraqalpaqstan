from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class District(Base):
    """Qoraqalpog'iston Respublikasi tumani yoki shahri."""

    __tablename__ = "districts"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    name_ru: Mapped[str] = mapped_column(String(80), default="")
    center: Mapped[str] = mapped_column(String(80), default="")
    area_km2: Mapped[int] = mapped_column(Integer, default=0)
    population: Mapped[float] = mapped_column(Float, default=0)

    tasks: Mapped[list["EconomicTask"]] = relationship(back_populates="district")


class Module(Base):
    """Iqtisodiy soha (inflyatsiya, sanoat, qishloq xo'jaligi, ...)."""

    __tablename__ = "modules"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    short: Mapped[str] = mapped_column(String(60), default="")
    unit: Mapped[str] = mapped_column(String(40), default="")
    # Inflyatsiyada ko'rsatkichning pasayishi yaxshi hisoblanadi
    lower_is_better: Mapped[bool] = mapped_column(default=False)
    color: Mapped[str] = mapped_column(String(16), default="#0284c7")


class EconomicTask(Base):
    """Iqtisodiy topshiriq / loyiha."""

    __tablename__ = "economic_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    district_id: Mapped[str] = mapped_column(ForeignKey("districts.id"), nullable=False)
    module_id: Mapped[str] = mapped_column(ForeignKey("modules.id"), nullable=False)

    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    deadline: Mapped[date] = mapped_column(Date, nullable=False)
    assignee: Mapped[str] = mapped_column(String(120), default="")

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    district: Mapped[District] = relationship(back_populates="tasks")


class StatCategory(Base):
    """Statistika bo'limi (Sanaat, Awıl xojalıǵı, Investitsiya, ...)."""

    __tablename__ = "stat_categories"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    #: Manba papkasi nomi — qayta yuklashda moslash uchun
    source_dir: Mapped[str] = mapped_column(String(60), default="")
    name_kaa: Mapped[str] = mapped_column(String(120), nullable=False)
    name_uz: Mapped[str] = mapped_column(String(120), default="")
    color: Mapped[str] = mapped_column(String(16), default="#38bdf8")
    sort: Mapped[int] = mapped_column(Integer, default=0)

    indicators: Mapped[list["StatIndicator"]] = relationship(back_populates="category")


class StatIndicator(Base):
    """
    Ko'rsatkich ma'lumotnomasi.

    Excel'dan 700 dan ortiq ko'rsatkich keladi. Hammasi saqlanadi, lekin
    xarita va asosiy panel faqat `module` belgilangan "tayanch"
    ko'rsatkichlar bilan ishlaydi — aks holda interfeys o'qib bo'lmas
    darajada to'lib ketadi.
    """

    __tablename__ = "stat_indicators"
    __table_args__ = (
        Index("ix_indicator_module", "module", "has_districts"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    #: Nomdan hosil qilingan barqaror kalit — qayta yuklashda takrorlanmaslik uchun
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    category_id: Mapped[str] = mapped_column(ForeignKey("stat_categories.id"), nullable=False)

    name_kaa: Mapped[str] = mapped_column(String(300), nullable=False)
    name_uz: Mapped[str] = mapped_column(String(300), default="")
    unit: Mapped[str] = mapped_column(String(80), default="")

    #: Rayon kesimida ma'lumot bormi (xaritada ko'rsatish mumkinmi)
    has_districts: Mapped[bool] = mapped_column(default=False)
    #: Tayanch ko'rsatkich kodi (sanaat, awil_xojaligi, ...) yoki bo'sh
    module: Mapped[str | None] = mapped_column(String(40), nullable=True)
    #: Inflyatsiya kabi ko'rsatkichlarda pasayish yaxshi
    lower_is_better: Mapped[bool] = mapped_column(default=False)
    #: Manba fayl — ma'lumot qayerdan kelganini ko'rsatish uchun
    source: Mapped[str] = mapped_column(String(200), default="")

    category: Mapped[StatCategory] = relationship(back_populates="indicators")
    observations: Mapped[list["StatObservation"]] = relationship(back_populates="indicator")


class StatObservation(Base):
    """
    Bitta o'lchov: ko'rsatkich × hudud × davr.

    `district_id` bo'sh bo'lsa — respublika bo'yicha yig'ma qiymat.
    `period`: "year" (to'liq yil) yoki "ytd" (yil boshidan yig'indi;
    `period_no` — nechanchi oygacha). Manbada choraklik/oylik qator yo'q.
    """

    __tablename__ = "stat_observations"
    __table_args__ = (
        UniqueConstraint(
            "indicator_id", "district_id", "year", "period", "period_no",
            name="uq_observation",
        ),
        Index("ix_observation_lookup", "indicator_id", "year", "district_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    indicator_id: Mapped[int] = mapped_column(ForeignKey("stat_indicators.id"), nullable=False)
    district_id: Mapped[str | None] = mapped_column(
        ForeignKey("districts.id"), nullable=True
    )

    year: Mapped[int] = mapped_column(Integer, nullable=False)
    period: Mapped[str] = mapped_column(String(10), default="year")
    period_no: Mapped[int | None] = mapped_column(Integer, nullable=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    #: Josspar (reja) — operativ KPI fayllarında bar, tariyxıy fayllarda joq
    plan_value: Mapped[float | None] = mapped_column(Float, nullable=True)

    indicator: Mapped[StatIndicator] = relationship(back_populates="observations")


class DirectionDocument(Base):
    """
    Jónelis bólimine (`frontend/src/data/directions.ts`daǵı block_id) baylanıslı
    júklengen hújjet (PDF/Excel/Word esabat), dáwir (q1/h1/m9/year) hám jıl
    boyınsha ajratılǵan.

    `direction_id`/`block_id` frontenttegi statik dizimdi kórsetedi — bazada
    bólek ma'lumotnoma keste joq, sebebi bólim tekstleri húdjetten alınǵan
    turaqlı kontent, olardı kóshirip alıw artıqsha.
    """

    __tablename__ = "direction_documents"
    __table_args__ = (
        Index("ix_direction_document_lookup", "block_id", "year", "period"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    direction_id: Mapped[str] = mapped_column(String(20), nullable=False)
    block_id: Mapped[str] = mapped_column(String(30), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    period: Mapped[str] = mapped_column(String(10), nullable=False)

    title: Mapped[str] = mapped_column(String(300), default="")
    filename: Mapped[str] = mapped_column(String(300), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), default="")
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    #: Fayldıń óz baytları — Render'diń tegin xızmetinde disk deploy'lar
    #: arasında saqlanbaydı (ephemeral), al baza (Neon) turaqlı
    file_data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    uploaded_by: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class DirectionReportSheet(Base):
    """
    Bólim ushın "Excel-kórinisindegi" qolman-toltırılatuǵın hisabat kestesi
    (Reje/Fakt/Orınlanıw%), dáwir hám jıl boyınsha — `DirectionDocument`
    menen bir sistema, biraq fayl emes, kesте (baǵana atları + qatarlar).
    """

    __tablename__ = "direction_report_sheets"
    __table_args__ = (
        UniqueConstraint("block_id", "year", "period", name="uq_report_sheet"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    direction_id: Mapped[str] = mapped_column(String(20), nullable=False)
    block_id: Mapped[str] = mapped_column(String(30), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    period: Mapped[str] = mapped_column(String(10), nullable=False)

    columns: Mapped[list] = mapped_column(JSON, nullable=False)
    rows: Mapped[list] = mapped_column(JSON, nullable=False)

    updated_by: Mapped[str] = mapped_column(String(120), default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class User(Base):
    """Platforma foydalanuvchisi (admin yoki ko'ruvchi)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), default="")
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="viewer")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
