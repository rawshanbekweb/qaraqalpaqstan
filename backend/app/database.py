from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema() -> None:
    """
    Jadvallardı jaratadı hám olardıń izinen qosılǵan bagаnalardı qosadı.

    Alembic joq — sxema usı arqalı basqarıladı. `create_all` tek JOQ
    jadvaldı jaratadı, bar jadvalǵa bagаna QOSPAYDI, sonlıqtan jańa
    bagаnalar (mısalı `plan_value`) ushın qolda "ADD COLUMN IF NOT
    EXISTS" kerek.
    """
    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE stat_observations "
                "ADD COLUMN IF NOT EXISTS plan_value DOUBLE PRECISION"
            )
        )
