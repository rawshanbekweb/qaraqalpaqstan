"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import {
  shortUnit,
  useMapLayer,
  useSeries,
  useStats,
  useStatsMeta,
  type IndicatorBrief,
  type MapDistrict,
  type SeriesPoint,
} from "@/lib/stats";
import { Input, Select, YearScale } from "@/components/ui/primitives";
import { DataTable, cellNum, type DataTableColumn } from "@/components/ui/DataTable";
import { cn, trim } from "@/lib/utils";

const PER_PAGE = 25;

/**
 * Barlıq 1084 ko'rsatkishti qidiriw hám tańlanǵannıń tolıq dereginiń
 * jadval kórinisi — jıllar boyınsha hám (bar bolsa) rayonlar boyınsha,
 * saralaw/filtrlew/CSV eksport penen. `IndicatorBrowser` (admin)
 * naqshın qaytaradı, biraq admin huqıqı talap etilmeydi hám
 * "tayanch soha" biriktiriw joq — qatordı basıw kórsetkishti tańlaydı.
 */
export default function JadvalPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<IndicatorBrief | null>(null);
  const [year, setYear] = useState(0);

  const { data: meta } = useStatsMeta();

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading } = useStats<{ total: number; items: IndicatorBrief[] }>("/indicators", {
    q: debounced || undefined,
    category_id: categoryId || undefined,
    limit: PER_PAGE,
    offset: page * PER_PAGE,
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const { data: series } = useSeries(null, null, undefined, undefined, selected?.id ?? null);
  const years = useMemo(() => series?.points.map((p) => p.year) ?? [], [series]);
  // `year` tańlanbaǵanda yamasa tańlanǵan jıl endi dizimde joq bolsa —
  // eń sońǵısı isletiledi. Effekt kerek emes: bul tek kórsetiw ushın
  // esaplanatuǵın mánis, `setYear` tek qollanıwshı tańlaǵanda shaqırıladı.
  const effectiveYear = years.includes(year) ? year : (years[years.length - 1] ?? 0);

  const { data: layer } = useMapLayer(
    null,
    selected?.has_districts ? effectiveYear || null : null,
    selected?.id ?? null,
  );

  const unit = shortUnit(selected?.unit ?? "");
  const hasSeriesPlan = series?.points.some((p) => p.plan !== null) ?? false;
  const hasDistrictPlan = layer?.districts.some((d) => d.plan !== null) ?? false;

  const seriesColumns: DataTableColumn<SeriesPoint>[] = useMemo(() => {
    const cols: DataTableColumn<SeriesPoint>[] = [
      {
        key: "label",
        header: "Dáwir",
        sortValue: (p) => p.year,
        searchValue: (p) => p.label,
        render: (p) => <span className="font-medium text-ink">{p.caption ?? p.label}</span>,
      },
      {
        key: "value",
        header: "Qıymet",
        align: "right",
        sortValue: (p) => p.value,
        render: (p) => (
          <span className="tnum">
            {trim(p.value)} <span className="text-[11px] text-ink-3">{unit}</span>
          </span>
        ),
      },
      {
        key: "yoy",
        header: "Ósiw, %",
        align: "right",
        sortValue: (p) => p.yoy,
        render: (p) => cellNum(p.yoy, (n) => `${n > 0 ? "+" : ""}${trim(n)}%`),
      },
    ];
    if (hasSeriesPlan) {
      cols.push(
        {
          key: "plan",
          header: "Reja",
          align: "right",
          sortValue: (p) => p.plan,
          render: (p) => cellNum(p.plan, (n) => `${trim(n)} ${unit}`),
        },
        {
          key: "status",
          header: "Status",
          sortValue: (p) => p.status,
          render: (p) =>
            p.status ? (
              <span
                className="text-[12px] font-semibold"
                style={{ color: p.status === "orınlandı" ? "#34d399" : "#fb7185" }}
              >
                {p.status}
              </span>
            ) : (
              <span className="text-ink-3">—</span>
            ),
        },
      );
    }
    return cols;
  }, [unit, hasSeriesPlan]);

  const districtColumns: DataTableColumn<MapDistrict>[] = useMemo(() => {
    const cols: DataTableColumn<MapDistrict>[] = [
      {
        key: "name",
        header: "Rayon",
        sortValue: (d) => d.name,
        searchValue: (d) => d.name,
        render: (d) => <span className="font-medium text-ink">{d.name}</span>,
      },
      {
        key: "value",
        header: "Qıymet",
        align: "right",
        sortValue: (d) => d.value,
        render: (d) => cellNum(d.value, (n) => `${trim(n)} ${unit}`),
      },
      {
        key: "share",
        header: "Úlesi, %",
        align: "right",
        sortValue: (d) => d.share,
        render: (d) => cellNum(d.share, (n) => `${trim(n)}%`),
      },
      {
        key: "yoy",
        header: "Ósiw, %",
        align: "right",
        sortValue: (d) => d.yoy,
        render: (d) => cellNum(d.yoy, (n) => `${n > 0 ? "+" : ""}${trim(n)}%`),
      },
      {
        key: "rank",
        header: "Orın",
        align: "right",
        sortValue: (d) => d.rank,
        render: (d) => cellNum(d.rank, (n) => `${n}`),
      },
    ];
    if (hasDistrictPlan) {
      cols.push(
        {
          key: "plan",
          header: "Reja",
          align: "right",
          sortValue: (d) => d.plan,
          render: (d) => cellNum(d.plan, (n) => `${trim(n)} ${unit}`),
        },
        {
          key: "status",
          header: "Status",
          sortValue: (d) => d.status,
          render: (d) =>
            d.status ? (
              <span
                className="text-[12px] font-semibold"
                style={{ color: d.status === "orınlandı" ? "#34d399" : "#fb7185" }}
              >
                {d.status}
              </span>
            ) : (
              <span className="text-ink-3">—</span>
            ),
        },
      );
    }
    return cols;
  }, [unit, hasDistrictPlan]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Jadval</h1>
        <p className="text-sm text-ink-3">
          1084 kórsetkishtiń tolıq dizimi — tańlań, jadval kórinisinde kóriń hám CSV sıpatında
          alıń
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kórsetkish atı boyınsha izlew…"
            className="pl-9"
          />
        </div>
        <Select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(0);
          }}
          className="w-auto min-w-[180px]"
        >
          <option value="">Barlıq bólimler</option>
          {(meta?.categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.indicators})
            </option>
          ))}
        </Select>
      </div>

      <div className="thin-scroll overflow-x-auto rounded-2xl ring-1 ring-edge/50">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead className="bg-abyss/70">
            <tr>
              {["Kórsetkish", "Ólshem", "Rayon kesimi", ""].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left text-[11.5px] font-semibold tracking-wider text-ink-3 uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((item) => (
              <tr
                key={item.id}
                onClick={() => setSelected(item)}
                className={cn(
                  "cursor-pointer border-t border-hairline/50 transition hover:bg-raised/35",
                  selected?.id === item.id && "bg-cyan/8",
                )}
              >
                <td className="max-w-[380px] px-3 py-2">
                  <div className="truncate text-ink" title={item.name}>
                    {item.name}
                  </div>
                  <div className="truncate text-[11.5px] text-ink-3" title={item.source}>
                    {item.source}
                  </div>
                </td>
                <td className="max-w-[160px] truncate px-3 py-2 text-ink-3" title={item.unit}>
                  {item.unit || "—"}
                </td>
                <td className="px-3 py-2">
                  <span className={item.has_districts ? "text-mint" : "text-ink-3"}>
                    {item.has_districts ? "bar" : "joq"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  {selected?.id === item.id && (
                    <span className="text-[11.5px] font-semibold text-cyan">saylanǵan</span>
                  )}
                </td>
              </tr>
            ))}

            {!loading && (data?.items.length ?? 0) === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-ink-3">
                  Hesh nárse tabılmadı
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[12.5px] text-ink-3">
          {loading ? (
            <Loader2 size={13} className="inline animate-spin" />
          ) : (
            `${total} kórsetkishten ${total === 0 ? 0 : page * PER_PAGE + 1}–${Math.min(total, (page + 1) * PER_PAGE)}`
          )}
        </span>
        <div className="flex-1" />
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="grid size-8 place-items-center rounded-lg bg-abyss/70 text-ink-2 ring-1 ring-edge/50 transition disabled:opacity-40 enabled:hover:text-ink"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          disabled={page >= pages - 1}
          onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
          className="grid size-8 place-items-center rounded-lg bg-abyss/70 text-ink-2 ring-1 ring-edge/50 transition disabled:opacity-40 enabled:hover:text-ink"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {selected && (
        <div className="space-y-5 border-t border-hairline/60 pt-5">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">{selected.name}</h2>
            <p className="text-[12.5px] text-ink-3">{selected.source}</p>
          </div>

          <div>
            <div className="mb-2.5 text-[13.5px] font-semibold text-ink">Jıllar boyınsha</div>
            <DataTable
              columns={seriesColumns}
              rows={series?.points ?? []}
              getRowKey={(p) => `${p.year}-${p.label}`}
              searchable={false}
              exportName={`${selected.slug}-jillar`}
            />
          </div>

          {selected.has_districts && (
            <div>
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className="text-[13.5px] font-semibold text-ink">Rayonlar boyınsha</span>
                <div className="flex-1" />
                <YearScale years={years} value={effectiveYear} onChange={setYear} />
              </div>
              <DataTable
                columns={districtColumns}
                rows={layer?.districts ?? []}
                getRowKey={(d) => d.district_id}
                searchPlaceholder="Rayon izlew…"
                exportName={`${selected.slug}-rayonlar-${effectiveYear}`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
