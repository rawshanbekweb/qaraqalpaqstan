"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { useDashboard } from "@/lib/store";
import { useDistrictProfile, useOverview, useSeries, useStatsMeta, shortUnit } from "@/lib/stats";
import { Segmented, YearScale } from "@/components/ui/primitives";
import { HeroFigure, StatTile } from "@/components/charts/StatTile";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { DataTable, cellNum, type DataTableColumn } from "@/components/ui/DataTable";
import { EXCEL_NUM_FMT, EXCEL_PERCENT_FMT, EXCEL_SIGNED_PERCENT_FMT } from "@/lib/excel";
import type { ChartSpec } from "@/lib/types";
import { compact, trim } from "@/lib/utils";

interface ModuleRow {
  key: string;
  name: string;
  color: string;
  unit: string;
  value: number;
  yoy: number | null;
  share: number | null;
  rank: number | null;
  of: number | null;
  leaderName: string | null;
}

/**
 * KPI paneli — tiykarǵı ekonomikalıq kórsetkishler.
 *
 * Filtr (taraw/jıl) hám tańlanǵan rayon `useDashboard` global sáwlesinde
 * saqlanadı, sonlıqtan Xarita yamasa Tumanlar sahifasında rayon tańlansa,
 * bul jerge qaytqanda sol rayonnıń kórsetkishleri kórinedi.
 */
export default function DashboardPage() {
  const { moduleId, setModule, year, setYear, selectedDistrict, selectDistrict } = useDashboard();
  const [view, setView] = useState<"cards" | "table">("cards");
  const { data: meta } = useStatsMeta();
  const { data: overview } = useOverview(year || null);
  const { data: profile } = useDistrictProfile(selectedDistrict, year || null);
  const { data: series } = useSeries(moduleId, selectedDistrict);

  const modules = meta?.modules ?? [];
  const activeModule = modules.find((m) => m.id === moduleId) ?? modules[0];
  const years = useMemo(() => activeModule?.years ?? [], [activeModule]);

  useEffect(() => {
    if (years.length === 0) return;
    if (!years.includes(year)) setYear(years[years.length - 1]);
  }, [years, year, setYear]);

  /** Respublika kesiminde — overview'dan; rayon tańlansa — profildiń sol tarawınan. */
  const om = overview?.modules.find((m) => m.module === (activeModule?.id ?? moduleId));
  const dm = profile?.modules.find((m) => m.module === (activeModule?.id ?? moduleId));

  const accent = dm?.color ?? om?.color ?? activeModule?.color ?? "#2563eb";
  const unit = shortUnit(dm?.unit ?? om?.unit ?? activeModule?.unit ?? "");
  const avgGrowth = profile ? profile.avg_growth : overview?.avg_growth;

  const trendChart: ChartSpec | null = profile
    ? series && series.points.length > 1
      ? {
          id: `kpi-trend-${moduleId}-${selectedDistrict}`,
          kind: "area",
          title: `${activeModule?.name ?? dm?.name ?? ""} — jıllar boyınsha`,
          subtitle: `${profile.district.name} boyınsha, ${unit}`,
          unit,
          series: [{ key: "value", label: activeModule?.short ?? dm?.name ?? "", color: accent }],
          data: series.points.map((p) => ({ label: p.label, value: p.value })),
        }
      : null
    : om && om.trend.length > 1
      ? {
          id: `kpi-trend-${moduleId}`,
          kind: "area",
          title: `${om.name} — jıllar boyınsha`,
          subtitle: `Respublika boyınsha, ${unit}`,
          unit,
          series: [{ key: "value", label: activeModule?.short ?? om.name, color: accent }],
          data: om.trend.map((t) => ({ label: String(t.year), value: t.value })),
        }
      : null;

  const moduleRows: ModuleRow[] = useMemo(() => {
    if (profile) {
      return profile.modules.map((m) => ({
        key: m.module,
        name: m.name,
        color: m.color,
        unit: shortUnit(m.unit),
        value: m.value,
        yoy: m.yoy,
        share: m.share,
        rank: m.rank,
        of: m.of,
        leaderName: null,
      }));
    }
    return (overview?.modules ?? []).map((m) => ({
      key: m.module,
      name: m.name,
      color: m.color,
      unit: shortUnit(m.unit),
      value: m.value,
      yoy: m.yoy,
      share: null,
      rank: null,
      of: null,
      leaderName: m.leader?.name ?? null,
    }));
  }, [profile, overview]);

  const moduleColumns: DataTableColumn<ModuleRow>[] = useMemo(() => {
    const cols: DataTableColumn<ModuleRow>[] = [
      {
        key: "name",
        header: "Taraw",
        sortValue: (r) => r.name,
        searchValue: (r) => r.name,
        render: (r) => (
          <span className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full" style={{ background: r.color }} />
            <span className="font-medium text-ink">{r.name}</span>
          </span>
        ),
      },
      {
        key: "value",
        header: "Kólemi",
        align: "right",
        sortValue: (r) => r.value,
        numFmt: EXCEL_NUM_FMT,
        render: (r) => (
          <span className="tnum">
            {compact(r.value)} <span className="text-[11px] text-ink-3">{r.unit}</span>
          </span>
        ),
      },
      {
        key: "yoy",
        header: "Ósiw, %",
        align: "right",
        sortValue: (r) => r.yoy,
        numFmt: EXCEL_SIGNED_PERCENT_FMT,
        render: (r) => cellNum(r.yoy, (n) => `${n > 0 ? "+" : ""}${trim(n)}%`),
      },
    ];
    if (profile) {
      cols.push(
        {
          key: "share",
          header: "Úlesi, %",
          align: "right",
          sortValue: (r) => r.share,
          numFmt: EXCEL_PERCENT_FMT,
          render: (r) => cellNum(r.share, (n) => `${trim(n)}%`),
        },
        {
          key: "rank",
          header: "Orın",
          align: "right",
          sortValue: (r) => r.rank,
          render: (r) =>
            r.rank === null ? (
              <span className="text-ink-3">—</span>
            ) : (
              <span className="tnum">
                {r.rank}
                {r.of ? `/${r.of}` : ""}
              </span>
            ),
        },
      );
    } else {
      cols.push({
        key: "leader",
        header: "Basshi tuman",
        sortValue: (r) => r.leaderName,
        searchValue: (r) => r.leaderName ?? "",
        render: (r) =>
          r.leaderName ? (
            <span className="text-ink-2">{r.leaderName}</span>
          ) : (
            <span className="text-ink-3">—</span>
          ),
      });
    }
    return cols;
  }, [profile]);

  const secondaryChart: ChartSpec | null = profile
    ? profile.modules.some((m) => m.share !== null)
      ? {
          id: `kpi-structure-${profile.district.id}-${year}`,
          kind: "bar",
          title: `${profile.district.name} — tarawlar keseginde`,
          subtitle: `${year}-jıl · respublikadaǵı úlesi, %`,
          unit: "%",
          series: [{ key: "value", label: "Úlesi" }],
          data: [...profile.modules]
            .filter((m) => m.share !== null)
            .sort((a, b) => (b.share ?? 0) - (a.share ?? 0))
            .map((m) => ({ label: m.name, value: m.share ?? 0, color: m.color })),
        }
      : null
    : overview && overview.modules.length > 1
      ? {
          id: `kpi-modules-${year}`,
          kind: "bar",
          title: "Tarawlar boyınsha ósiw",
          subtitle: `${year}-jıl · ótken jılǵa salıstırǵanda, %`,
          unit: "%",
          series: [{ key: "value", label: "Ósiw" }],
          data: [...overview.modules]
            .sort((a, b) => (b.yoy ?? 0) - (a.yoy ?? 0))
            .map((m) => ({
              label: modules.find((mm) => mm.id === m.module)?.short ?? m.name,
              value: m.yoy ?? 0,
              color: (m.yoy ?? 0) >= 0 ? "#2563eb" : "#dc2626",
            })),
        }
      : null;

  return (
    <div className="flex w-full flex-col gap-7">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-1">
          <h1 className="text-2xl font-bold text-ink">
            {profile ? `${profile.district.name} — KPI kórsetkishleri` : "KPI kórsetkishleri"}
          </h1>
          <p className="text-sm text-ink-3">
            {profile
              ? `${profile.district.center} · rayon kesiminde jıllıq kórsetkishler`
              : "Tiykarǵı ekonomikalıq tarawlar boyınsha jıllıq kórsetkishler"}
          </p>
        </div>
        {selectedDistrict && (
          <button
            onClick={() => selectDistrict(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-cyan/12 px-3 py-1.5 text-[12.5px] font-semibold text-cyan ring-1 ring-cyan/35 transition hover:bg-cyan/20"
          >
            <MapPin size={12} />
            {profile?.district.name ?? selectedDistrict}
            <span className="text-cyan/60">✕</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {modules.length > 0 && (
          <Segmented<string>
            layoutId="kpi-module"
            value={activeModule?.id ?? moduleId}
            onChange={setModule}
            options={modules.map((m) => ({ value: m.id, label: m.short, color: m.color }))}
          />
        )}
        <YearScale years={years} value={year} onChange={setYear} />
        <div className="flex-1" />
        <Segmented<"cards" | "table">
          layoutId="kpi-view"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: "cards", label: "Kartalar" },
            { value: "table", label: "Jadval" },
          ]}
        />
      </div>

      <HeroFigure
        label={dm?.name ?? om?.name ?? activeModule?.name ?? "Kólemi"}
        value={dm?.value ?? om?.value ?? null}
        suffix={unit}
        color={accent}
        caption={
          profile
            ? `${dm?.rank ?? "—"}-orın · respublikanıń ${trim(dm?.share ?? 0)}% i`
            : (om?.caption ?? "júklenbekte…")
        }
      />

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatTile
          label={`${activeModule?.short ?? ""} ósiwi`}
          value={dm?.yoy ?? om?.yoy ?? null}
          unit="%"
          delta={dm?.yoy ?? om?.yoy ?? null}
          deltaLabel={`${year - 1}-jılǵa`}
          accent={accent}
          index={0}
        />
        <StatTile
          label="Ortasha ósiw"
          value={avgGrowth ?? null}
          unit="%"
          delta={avgGrowth ?? null}
          deltaLabel="barlıq tarawlar"
          accent="#059669"
          index={1}
        />
        <StatTile
          label="Ósip atır"
          value={
            profile
              ? profile.modules.filter((m) => (m.yoy ?? 0) > 0).length
              : (overview?.growing ?? null)
          }
          digits={0}
          unit={profile ? "taraw" : "rayon"}
          accent="#2563eb"
          index={2}
        />
        <StatTile
          label="Tómenlegen"
          value={
            profile
              ? profile.modules.filter((m) => (m.yoy ?? 0) < 0).length
              : (overview?.declining ?? null)
          }
          digits={0}
          unit={profile ? "taraw" : "rayon"}
          upIsGood={false}
          accent="#dc2626"
          index={3}
        />
      </div>

      {view === "table" ? (
        <DataTable
          columns={moduleColumns}
          rows={moduleRows}
          getRowKey={(r) => r.key}
          searchPlaceholder="Taraw izlew…"
          exportName={
            profile ? `${profile.district.name}-kpi-${year}` : `respublika-kpi-${year}`
          }
        />
      ) : (
        <div className="grid gap-5 pb-2 lg:grid-cols-2">
          {trendChart && <ChartRenderer spec={trendChart} />}
          {secondaryChart && <ChartRenderer spec={secondaryChart} />}
        </div>
      )}
    </div>
  );
}
