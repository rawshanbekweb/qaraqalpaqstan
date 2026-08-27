"""
2026-jıl operativ KPI monitoring esabatların (Reja/Fakt/Farq) oqıydı.

Bul fayllar `model/data`dagi tarixiy statistika menen bir qıylı emes:
olar joriy jıldıń dawamındaǵı Reja/Fakt/Farq monitoring kestesi
(o'zbekcha kirill jazıwında). Sonıń ushın tiykarǵı `app/ingest/excel.py`
parseri (qaraqalpaq latini, tarixiy qatar format) olardı durıs oqıy
almaydı: hudud atlarin tanımaydı hám Reja/Fakt bagаnalarin ajıratpaydı.

"Fakt" bagаnası — `StatObservation.value`, ал sol dáwir toparındaǵı
"Режа" bagаnası (bar bolsa) — `plan_value`. Kútiliw (bolжам) hám Farq
bagаnaları hámme waqıt qásten qaldırıladı: olar ólshengen qiymet emes.

Ishge tusiriw:
    python -m app.ingest.kpi2026 <1_Экономика papkası> <4_Экспорт papkası>
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd

from app.database import SessionLocal, ensure_schema
from app.ingest.excel import Record, _clean, _numeric
from app.ingest.districts_map import REPUBLIC
from app.ingest.loader import keep_known, load_records

#: Kirill matnındaǵı latın húrpler menen almasıw ("Aмударё" ~ "Амударё")
_LOOKALIKE = str.maketrans({
    "A": "А", "a": "а", "O": "О", "o": "о", "E": "Е", "e": "е",
    "P": "Р", "p": "р", "C": "С", "c": "с", "X": "Х", "x": "х",
    "H": "Н", "h": "н", "B": "В", "K": "К", "k": "к", "M": "М",
})

#: Fayllardaǵı kirill (o'zbekcha HÁM qaraqalpaqsha imla) hudud atları
#: -> platforma ID'si. Hár fayl basqa transliteratsiya qollanadı
#: (Нукус/Нөкис, Бўзатов/Бозатаў, Чимбой/Шымбай...), sonıń ushın
#: gúzetilgen barlıq variantlar ashıq dizimlengen.
_DISTRICTS: dict[str, str] = {
    "қорақалпоғистон республикаси": REPUBLIC,
    "жәми қр": REPUBLIC,
    "нукус шаҳри": "nukus-shahri",
    "нөкис қаласы": "nukus-shahri",
    "нукус тумани": "nukus-tumani",
    "нөкис район": "nukus-tumani",
    "амударё": "amudaryo",
    "амударья": "amudaryo",
    "беруний": "beruniy",
    "бўзатов": "bozatov",
    "бозатаў": "bozatov",
    "қораўзак": "karaozak",
    "қараөзек": "karaozak",
    "кегейли": "kegeyli",
    "қўнғирот": "qongirot",
    "қоңырат": "qongirot",
    "қанликўл": "qanlikol",
    "қонликўл": "qanlikol",
    "қанлыкөл": "qanlikol",
    "мўйноқ": "moynoq",
    "муйноқ": "moynoq",
    "мойнақ": "moynoq",
    "тахиатош": "taxiatosh",
    "тахиаташ": "taxiatosh",
    "тахтакўпир": "taxtakopir",
    "тахтакөпир": "taxtakopir",
    "тўрткўл": "tortkol",
    "төрткүл": "tortkol",
    "хўжайли": "xojayli",
    "хожели": "xojayli",
    "чимбой": "chimboy",
    "шымбай": "chimboy",
    "шуманай": "shumanay",
    "шоманай": "shumanay",
    "елликкала": "ellikqala",
    "елликқала": "ellikqala",
    "элликқалъа": "ellikqala",
}

_WS_RE = re.compile(r"\s+")


def resolve_cyr(name) -> str | None:
    text = _WS_RE.sub(" ", _clean(name).translate(_LOOKALIKE)).strip().lower()
    return _DISTRICTS.get(text)


_RU_MONTHS = {
    "январь": 1, "февраль": 2, "март": 3, "апрель": 4, "май": 5, "июнь": 6,
    "июль": 7, "август": 8, "сентябрь": 9, "октябрь": 10, "ноябрь": 11, "декабрь": 12,
}
_YEAR_RE = re.compile(r"(20\d{2})")
_MONTHNO_RE = re.compile(r"(\d{1,2})\s*ойлик")


def parse_period_ru(text, *, default_year: int) -> tuple[int, str, int | None] | None:
    t = _clean(text).replace("\n", " ").lower()
    if not t:
        return None
    if m := _MONTHNO_RE.search(t):
        no = int(m.group(1))
    else:
        months = [n for name, n in _RU_MONTHS.items() if name in t]
        if not months:
            return None
        no = max(months)
    ym = _YEAR_RE.search(t)
    year = int(ym.group(1)) if ym else default_year
    if no >= 12:
        return year, "year", None
    return year, "ytd", no


def _ffill_row(df: pd.DataFrame, row: int) -> list[str]:
    out, cur = [], ""
    for c in range(df.shape[1]):
        v = _clean(df.iat[row, c]).replace("\n", " ").strip()
        if v:
            cur = v
        out.append(cur)
    return out


def _find_plan_col(period_labels: list[str], subcol_labels: list[str], col: int) -> int | None:
    """
    `col` (Fakt bagаnası) meńzes dáwir toparı ishinde, oннан shepte
    turǵan "Режа" bagаnasın izleydi.

    Fayllarda dáwir toparı ishinde bagаnalar ádette "Режа, Факт, Фарқи"
    (yamasa "Режа, Кутилиши, Фарқи") tártibinde keledi — sonlıqtan
    izlew basqa dáwir toparına ótkende toqtaydı.
    """
    period = period_labels[col]
    c = col - 1
    while c >= 0 and period_labels[c] == period:
        if subcol_labels[c] == "режа":
            return c
        c -= 1
    return None


def parse_kpi_sheet(
    path: Path,
    sheet: str,
    *,
    category: str,
    hajmi_title: str,
    osim_title: str | None = None,
    osim_scale: float = 100.0,
    default_year: int = 2026,
    label_col: int = 0,
    header_row: int = 4,
    metric_row: int = 5,
    subcol_row: int = 6,
    data_start: int = 7,
) -> list[Record]:
    """
    Ҳудудлар × davr (Reja/Fakt/Farq) kestesinen faqat FAKT qiymatlarin aladı.

    `metric_row` — "Ҳажми"/"Ўсиши" gruppa atı (yoq bolsa hajmi_title'ge
    tusedi, osim_title None qaldırılsa ósim ustunları qaldırıladı).

    `osim_scale` — dereksiz fayllarda ósim qatarı eki qıylı jazıladı:
    "1.075" (úlesh, ×100 kerek) yamasa "107.5" (aldın-ala protsent,
    ×1 kerek). Fayl-fayl menen tekseriliп, tuwrı mániske ornatıladı.
    """
    df = pd.ExcelFile(path).parse(sheet, header=None)
    period_labels = _ffill_row(df, header_row)
    metric_labels = _ffill_row(df, metric_row) if metric_row is not None else None
    subcol_labels = [
        _clean(df.iat[subcol_row, c]).replace("\n", " ").strip().lower()
        for c in range(df.shape[1])
    ]

    records: list[Record] = []
    source = f"{path.name}#{sheet}"

    for row in range(data_start, len(df)):
        label = df.iat[row, label_col]
        district = resolve_cyr(label)
        if district is None:
            continue
        did = None if district == REPUBLIC else district

        for col in range(label_col + 1, df.shape[1]):
            subcol = subcol_labels[col]
            if subcol != "факт":
                continue
            period = parse_period_ru(period_labels[col], default_year=default_year)
            if period is None:
                continue
            year, kind, no = period
            # Ele tamamlanbaǵan aylar ushın "Fakt" bagаnası bos bolıp,
            # keyin formula ony 0'ge aylandıradı — bul haqıyqıy ólshem
            # emes. Esabat "20 avgust" sholatına dúzilgen, sonlıqtan
            # iyuldan keyingi ay ele tolıq jabılmaǵan dep esaplanadı.
            if kind == "ytd" and no is not None and no > 7:
                continue
            val = _numeric(df.iat[row, col])
            if val is None:
                continue

            plan_col = _find_plan_col(period_labels, subcol_labels, col)
            plan_val = _numeric(df.iat[row, plan_col]) if plan_col is not None else None

            is_growth = bool(metric_labels) and "ўсиш" in metric_labels[col].lower()
            if is_growth:
                if osim_title is None:
                    continue
                indicator, unit, value = osim_title, "%", val * osim_scale
                plan_value = plan_val * osim_scale if plan_val is not None else None
            else:
                indicator, unit, value = hajmi_title, "mlrd. som", val
                plan_value = plan_val

            records.append(Record(
                category=category, indicator=indicator, unit=unit,
                district_id=did, year=year, period=kind, period_no=no,
                value=value, source=source, row=row, block=0,
                plan_value=plan_value,
            ))
    return records


#: (fayl, varaq, kategoriya, hajmi sarlawhasi, osim sarlawhasi, osim_scale, label_col)
#: osim_scale: Sanaat/Qurılıs fayllarında ósim úlesh túrinde (1.075),
#: Xızmetler faylında dáslep protsent túrinde (107.5) jazılǵan —
#: xiz_growth.txt tekseriwinde tastıyıqlandı.
#: label_col: "№" bagаnası bar fayllarda hudud atı 0-emes, 1-bagаnada.
SHEETS: list[tuple[str, str, str, str, str | None, float, int]] = [
    (
        "2_Саноат_Ки_Пи_Ай_ушын.xlsx", "1_Саноат хажми РК", "02_Sanaat",
        "2026-jıl sanaat ónimi kólemi (operativ maǵlıwmat)",
        "2026-jıl sanaat ónimi kóleminiń ósim páti (operativ)", 100.0, 0,
    ),
    (
        "3_Махаллийлаштириш_2026 .xlsx", "1_Махаллийлаштириш дастури", "02_Sanaat",
        "2026-jıl mahalliylestiriw dasturi boyınsha ónim islep shıǵarıw",
        None, 100.0, 1,
    ),
    (
        "4_Хызметлер_2026_Ки_Пи_Ай_ушын.xlsx", "Хизматлар хажми РК", "06_X_zmetler",
        "2026-jıl xızmetler kólemi (operativ maǵlıwmat)",
        "2026-jıl xızmetler kóleminiń ósim páti (operativ)", 1.0, 0,
    ),
    (
        "5_Курилиш_ишлари_2026.xlsx", "Курылыс объемы хажми РК", "04_Investitsiya",
        "2026-jıl qurılıs jumısları kólemi (operativ maǵlıwmat)",
        "2026-jıl qurılıs jumıslarınıń ósim páti (operativ)", 100.0, 0,
    ),
]


def collect(root: Path) -> list[Record]:
    out: list[Record] = []
    for fname, sheet, category, hajmi_title, osim_title, osim_scale, label_col in SHEETS:
        out.extend(parse_kpi_sheet(
            root / fname, sheet, category=category,
            hajmi_title=hajmi_title, osim_title=osim_title, osim_scale=osim_scale,
            label_col=label_col,
        ))
    return out


# ── "4_Экспорт" fayl toparı ──────────────────────────────────────────
#
# Bul fayllar joqarıdaǵı Reja/Fakt/Farq monitoring kestesinen basqasha:
# olar "N-avgust holatına" dep atalǵan bir mártelik esap-sanaq
# kórinisinde, ay-sайın Reja/Fakt qatarı emes. Sonıń ushın generic
# `parse_kpi_sheet` orınına ózine tán qısqa funktsiyalar jazıldı.


def parse_export_volume(path: Path, sheet: str) -> list[Record]:
    """
    `1_Экспорт+.xlsx` — hudud boyınsha eksport ҳаjmi.

    Faqat eki nızıq nuqtası bar hám ekewi de haqıyqıy ólshengen:
      · 2025-jıl tolıq jıl juwmagı (col11, "2025 йил янв-дек");
      · 2026-jıl yanvar-avgust "amalda" (col7) — esabat ózi
        "19-avgust holatına" dep ashıq kórsetedi, sonlıqtan bul
        bolжам emes, sol kúngo shekemgi haqıyqıy jıyındı.
    "Баж-ши %" bagаnaları josspardıń orınlaniw dárejesi (KPI), ósim
    páti emes — qaldırıladı, biraq тийкарǵы "Режа" (col6, sol dáwir
    toparınıń ózinde, col7 "Амалда"dan aldın) endi `plan_value`
    sıpatında saqlanadı. col2 "2026 йил (режа)" — jıllıq maqset,
    lekin oǵan sáykes tolıq jıllıq fakt joq (jıl tamamlanbaǵan),
    sonlıqtan bul qásten qaldırıladı: qiymatsiz reja saqlanbaydı.
    """
    df = pd.ExcelFile(path).parse(sheet, header=None)
    title = "2026-jıl eksport kólemi (operativ maǵlıwmat)"
    unit = "mln. doll."
    source = f"{path.name}#{sheet}"
    records: list[Record] = []

    for row in range(5, len(df)):
        district = resolve_cyr(df.iat[row, 1] if _clean(df.iat[row, 1]) else df.iat[row, 0])
        if district is None:
            continue
        did = None if district == REPUBLIC else district

        fact_2026 = _numeric(df.iat[row, 7])
        if fact_2026 is not None:
            plan_2026 = _numeric(df.iat[row, 6])
            records.append(Record(
                category="05_S_rtq_Sawda", indicator=title, unit=unit,
                district_id=did, year=2026, period="ytd", period_no=8,
                value=fact_2026 / 1000, source=source, row=row, block=0,
                plan_value=plan_2026 / 1000 if plan_2026 is not None else None,
            ))

        fact_2025 = _numeric(df.iat[row, 11])
        if fact_2025 is not None:
            records.append(Record(
                category="05_S_rtq_Sawda", indicator=title, unit=unit,
                district_id=did, year=2025, period="year", period_no=None,
                value=fact_2025 / 1000, source=source, row=row, block=0,
            ))
    return records


def parse_new_exporters(path: Path, sheet: str) -> list[Record]:
    """
    `5_Новые_экспортеры+.xlsx` — hudud boyınsha eksportshı sanı.

    Eki Fakt bagаnası: "jańa eksportshılar sanı" (col3) hám
    "barlıq eksportshılar sanı" (col6), ekewi de "19-avgust
    holatına" jıyındı-fakt (bolжам emes). Hár qaysısınıń aldında
    "Реже" (col2 / col5) — sonı `plan_value` sıpatında saqlaymız.
    """
    df = pd.ExcelFile(path).parse(sheet, header=None)
    source = f"{path.name}#{sheet}"
    records: list[Record] = []

    cols = [
        (3, 2, "2026-jıl jańa eksportshılar sanı (operativ maǵlıwmat)"),
        (6, 5, "2026-jıl barlıq eksportshılar sanı (operativ maǵlıwmat)"),
    ]

    for row in range(7, len(df)):
        district = resolve_cyr(df.iat[row, 1])
        if district is None:
            continue
        did = None if district == REPUBLIC else district

        for col, plan_col, title in cols:
            val = _numeric(df.iat[row, col])
            if val is None:
                continue
            records.append(Record(
                category="05_S_rtq_Sawda", indicator=title, unit="dana",
                district_id=did, year=2026, period="ytd", period_no=8,
                value=val, source=source, row=row, block=0,
                plan_value=_numeric(df.iat[row, plan_col]),
            ))
    return records


def collect_export(root: Path) -> list[Record]:
    out = parse_export_volume(root / "1_Экспорт+.xlsx", "экспорт 500 млн. долл.")
    out += parse_new_exporters(root / "5_Новые_экспортеры+ .xlsx", "83 жана экспортер")
    return out


def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit(
            "qollanılıwı: python -m app.ingest.kpi2026 <1_Экономика papkası> "
            "<4_Экспорт papkası>"
        )
    economy_root, export_root = Path(sys.argv[1]), Path(sys.argv[2])
    for root in (economy_root, export_root):
        if not root.exists():
            raise SystemExit(f"papka tabılmadı: {root}")

    records = keep_known(collect(economy_root) + collect_export(export_root))
    if not records:
        raise SystemExit("hesh bir jazba shıqmadı")

    ensure_schema()
    with SessionLocal() as db:
        stats = load_records(records, db, replace_all=False)

    print("Operativ KPI júklendi.")
    for k, v in stats.items():
        print(f"  {k:22} {v}")


if __name__ == "__main__":
    main()
