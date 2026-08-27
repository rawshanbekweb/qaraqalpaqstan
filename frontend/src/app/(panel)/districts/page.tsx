"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, MapPin, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useDashboard } from "@/lib/store";
import { shortUnit, useMapLayer, useStatsMeta, type MapDistrict, type StatsDistrict } from "@/lib/stats";
import { volumeColor } from "@/lib/scale";
import { compact, trim } from "@/lib/utils";
import { Panel, Segmented, YearScale } from "@/components/ui/primitives";
import { DataTable, cellNum, type DataTableColumn } from "@/components/ui/DataTable";

/**
 * Tumanlar ro'yxati — kartochkalar panjarasi.
 *
 * Ilgari bu yerda interaktiv SVG xarita bo'lgan. Loyihani soddalashtirish
 * ushun xarita butunlay olib tashlandi: tuman kartochkasini bosish endi
 * to'g'ridan-to'g'ri o'sha tumanning to'liq profil sahifasiga
 * (`/districts/[id]`) olib boradi.
 */
interface DistrictRow {
  id: string;
  name: string;
  center: string;
  value: number | null;
  share: number | null;
  yoy: number | null;
  rank: number | null;
  plan: number | null;
  status: string | null;
}

export default function DistrictsPage() {
  const { moduleId, setModule, year, setYear } = useDashboard();
  const [view, setView] = useState<"cards" | "table">("cards");
  const router = useRouter();
  const { data: meta } = useStatsMeta();
  const { data: layer } = useMapLayer(moduleId, year || null);

  const modules = meta?.modules ?? [];
  const activeModule = modules.find((m) => m.id === moduleId) ?? modules[0];
  const years = useMemo(() => activeModule?.years ?? [], [activeModule]);

  useEffect(() => {
    if (years.length === 0) return;
    if (!years.includes(year)) setYear(years[years.length - 1]);
  }, [years, year, setYear]);

  const cellByDistrict = useMemo(() => {
    const out: Record<string, MapDistrict> = {};
    for (const d of layer?.districts ?? []) out[d.district_id] = d;
    return out;
  }, [layer]);

  const districts = useMemo(
    () => [...(meta?.districts ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [meta],
  );

  const unit = shortUnit(layer?.unit ?? activeModule?.unit ?? "");

  const districtRows: DistrictRow[] = useMemo(
    () =>
      districts.map((d) => {
        const cell = cellByDistrict[d.id];
        return {
          id: d.id,
          name: d.name,
          center: d.center,
          value: cell?.value ?? null,
          share: cell?.share ?? null,
          yoy: cell?.yoy ?? null,
          rank: cell?.rank ?? null,
          plan: cell?.plan ?? null,
          status: cell?.status ?? null,
        };
      }),
    [districts, cellByDistrict],
  );

  const hasPlan = districtRows.some((r) => r.plan !== null);

  const districtColumns: DataTableColumn<DistrictRow>[] = useMemo(() => {
    const cols: DataTableColumn<DistrictRow>[] = [
      {
        key: "name",
        header: "Rayon",
        sortValue: (r) => r.name,
        searchValue: (r) => r.name,
        render: (r) => (
          <div>
            <div className="font-medium text-ink">{r.name}</div>
            <div className="text-[11.5px] text-ink-3">{r.center}</div>
          </div>
        ),
      },
      {
        key: "value",
        header: "Qıymet",
        align: "right",
        sortValue: (r) => r.value,
        render: (r) =>
          cellNum(r.value, (n) => `${compact(n)} ${unit}`),
      },
      {
        key: "share",
        header: "Úlesi, %",
        align: "right",
        sortValue: (r) => r.share,
        render: (r) => cellNum(r.share, (n) => `${trim(n)}%`),
      },
      {
        key: "yoy",
        header: "Ósiw, %",
        align: "right",
        sortValue: (r) => r.yoy,
        render: (r) => cellNum(r.yoy, (n) => `${n > 0 ? "+" : ""}${trim(n)}%`),
      },
      {
        key: "rank",
        header: "Orın",
        align: "right",
        sortValue: (r) => r.rank,
        render: (r) => cellNum(r.rank, (n) => `${n}`),
      },
    ];
    if (hasPlan) {
      cols.push(
        {
          key: "plan",
          header: "Reja",
          align: "right",
          sortValue: (r) => r.plan,
          render: (r) => cellNum(r.plan, (n) => `${compact(n)} ${unit}`),
        },
        {
          key: "status",
          header: "Status",
          sortValue: (r) => r.status,
          render: (r) =>
            r.status ? (
              <span
                className="text-[12px] font-semibold"
                style={{ color: r.status === "orınlandı" ? "#34d399" : "#fb7185" }}
              >
                {r.status}
              </span>
            ) : (
              <span className="text-ink-3">—</span>
            ),
        },
      );
    }
    return cols;
  }, [unit, hasPlan]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="mr-1">
          <h1 className="text-2xl font-bold text-ink">Tumanlar</h1>
          <p className="text-sm text-ink-3">
            Rayon ushın bassańız — tolıq maǵlıwmat hám kórsetkishler ashıladı
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {modules.length > 0 && (
            <Segmented<string>
              layoutId="districts-module"
              size="sm"
              value={activeModule?.id ?? moduleId}
              onChange={setModule}
              options={modules.map((m) => ({ value: m.id, label: m.short, color: m.color }))}
            />
          )}
          <YearScale years={years} value={year} onChange={setYear} />
          <Segmented<"cards" | "table">
            layoutId="districts-view"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "cards", label: "Kartalar" },
              { value: "table", label: "Jadval" },
            ]}
          />
        </div>
      </div>

      {view === "table" ? (
        <DataTable
          columns={districtColumns}
          rows={districtRows}
          getRowKey={(r) => r.id}
          onRowClick={(r) => router.push(`/districts/${r.id}`)}
          searchPlaceholder="Rayon izlew…"
          exportName={`rayonlar-${activeModule?.id ?? moduleId}-${year}`}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {districts.map((d, i) => (
            <DistrictCard
              key={d.id}
              district={d}
              cell={cellByDistrict[d.id]}
              unit={unit}
              moduleName={activeModule?.name ?? "Kólemi"}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DistrictCard({
  district,
  cell,
  unit,
  moduleName,
  index,
}: {
  district: StatsDistrict;
  cell: MapDistrict | undefined;
  unit: string;
  moduleName: string;
  index: number;
}) {
  const yoy = cell?.yoy ?? null;
  const up = (yoy ?? 0) >= 0;

  return (
    <Link href={`/districts/${district.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.4 }}
        whileHover={{ y: -3 }}
      >
        <Panel glow className="group h-full overflow-hidden rounded-2xl transition hover:ring-cyan/50">
          <div className="flex items-start gap-3 px-4 pt-4 pb-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-bold text-ink">{district.name}</div>
              <div className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-ink-3">
                <MapPin size={11} className="shrink-0" />
                {district.center}
              </div>
            </div>
            <ArrowRight
              size={16}
              className="mt-0.5 shrink-0 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-cyan"
            />
          </div>

          <div className="flex items-center justify-between border-t border-hairline/60 px-4 py-3">
            <div className="min-w-0">
              <div className="text-[11px] tracking-wide text-ink-3 uppercase">{moduleName}</div>
              <div className="tnum text-[19px] font-semibold text-ink">
                {cell?.value !== null && cell?.value !== undefined ? compact(cell.value) : "—"}
                <span className="ml-1 text-[11.5px] font-normal text-ink-3">{unit}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {yoy !== null ? (
                <span
                  className="tnum inline-flex items-center gap-1 text-[12.5px] font-semibold"
                  style={{ color: up ? "#34d399" : "#fb7185" }}
                >
                  {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {trim(Math.abs(yoy))}%
                </span>
              ) : (
                <span className="text-[12px] text-ink-3">—</span>
              )}
              {cell?.rank ? (
                <span className="text-[11px] text-ink-3">{cell.rank}-orın</span>
              ) : null}
            </div>
          </div>

          <div className="h-1 w-full" style={{ background: volumeColor(cell?.intensity) }} />

          <div className="flex items-center gap-1.5 px-4 py-2.5 text-[11.5px] text-ink-3">
            <Users size={11} />
            {trim(district.population)} mıń kisi · {trim(district.area_km2, 0)} km²
          </div>
        </Panel>
      </motion.div>
    </Link>
  );
}
