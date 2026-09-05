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
        # `direction_documents` dáslep server diskindegi jolǵа silteme
        # (`storage_path`) saqlaytuǵın edi; endi fayl baytları tikkeley
        # bazada (`file_data`) — Render'diń tegin xızmetinde disk
        # deploy'lar arasında saqlanbaydı. Eski bagana óshirilmeydi (bul
        # jobadaǵı úlgi — tek qatań emes etiledi), tek jańa bagana qosıladı.
        conn.execute(
            text("ALTER TABLE direction_documents ADD COLUMN IF NOT EXISTS file_data BYTEA")
        )
        # Jańa (bul jazbadan keyingi) bazada bul bagana ele jaratılmaǵan
        # bolıwı múmkin (model onı endi jarat­paydı) — sonlıqtan bar-joqlıǵı
        # aldın tekseriledi.
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'direction_documents' AND column_name = 'storage_path'
                    ) THEN
                        ALTER TABLE direction_documents ALTER COLUMN storage_path DROP NOT NULL;
                    END IF;
                END $$;
                """
            )
        )
