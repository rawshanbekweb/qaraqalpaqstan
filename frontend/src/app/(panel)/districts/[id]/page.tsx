"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2, MapPin, TrendingDown, TrendingUp, Users, XCircle } from "lucide-react";
import { useDashboard } from "@/lib/store";
import {
  shortUnit,
  useDistrictProfile,
  useSeries,
  useStatsMeta,
  type OperationalKpi,
  type ProfileModule,
} from "@/lib/stats";
import { Panel, Segmented, YearScale } from "@/components/ui/primitives";
import { HeroFigure, StatTile } from "@/components/charts/StatTile";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { DataTable, cellNum, type DataTableColumn } from "@/components/ui/DataTable";
import type { ChartSpec } from "@/lib/types";
import { compact, trim } from "@/lib/utils";

/**
 * Tuman profili — bitta rayon boyınsha tolıq kórinis.
 *
 * Xarita kartochkasınıń ornına: barlıq tayanch sohalar, ólshemleri, ósiwi,
 * respublikadaǵı ulıqı hám orını bir bette. Ma'lumot backendtiń
 * `/api/stats/districts/{id}` javabınan aladı (`useDistrictProfile`) —
 * qosımsha esaplaw frontendte joq.
 */
export default function DistrictProfilePage() {
  const params = useParams<{ id: string }>();
  const districtId = params.id;

  const { moduleId, setModule, year, setYear } = useDashboard();
  const [modulesView, setModulesView] = useState<"cards" | "table">("cards");
  const [opView, setOpView] = useState<"cards" | "table">("cards");
  const { data: meta } = useStatsMeta();
  const { data: profile, loading } = useDistrictProfile(districtId, year || null);
  const { data: series } = useSeries(moduleId, districtId);

  const modules = meta?.modules ?? [];
  const activeModule = modules.find((m) => m.id === moduleId) ?? modules[0];
  const years = useMemo(() => meta?.years ?? [], [meta]);

  useEffect(() => {
    if (years.length === 0) return;
    if (!years.includes(year)) setYear(years[years.length - 1]);
  }, [years, year, setYear]);

  const dm = profile?.modules.find((m) => m.module === (activeModule?.id ?? moduleId));
  const unit = shortUnit(dm?.unit ?? activeModule?.unit ?? "");

  const trendChart: ChartSpec | null =
    profile && series && series.points.length > 1
      ? {
          id: `district-trend-${districtId}-${moduleId}`,
          kind: "area",
          title: `${dm?.name ?? activeModule?.name ?? ""} — jıllar boyınsha`,
          subtitle: `${profile.district.name} boyınsha, ${unit}`,
          unit,
          series: [{ key: "value", label: activeModule?.short ?? dm?.name ?? "", color: dm?.color ?? activeModule?.color }],
          data: series.points.map((p) => ({ label: p.label, value: p.value })),
        }
      : null;

  const structureChart: ChartSpec | null =
    profile && profile.modules.some((m) => m.share !== null)
      ? {
          id: `district-structure-${districtId}-${year}`,
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
      : null;

  const moduleColumns: DataTableColumn<ProfileModule>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Taraw",
        sortValue: (m) => m.name,
        searchValue: (m) => m.name,
        render: (m) => (
          <span className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full" style={{ background: m.color }} />
            <span className="font-medium text-ink">{m.name}</span>
          </span>
        ),
      },
      {
        key: "value",
        header: "Kólemi",
        align: "right",
        sortValue: (m) => m.value,
        render: (m) => cellNum(m.value, (n) => `${compact(n)} ${shortUnit(m.unit)}`),
      },
      {
        key: "yoy",
        header: "Ósiw, %",
        align: "right",
        sortValue: (m) => m.yoy,
        render: (m) => cellNum(m.yoy, (n) => `${n > 0 ? "+" : ""}${trim(n)}%`),
      },
      {
        key: "share",
        header: "Úlesi, %",
        align: "right",
        sortValue: (m) => m.share,
        render: (m) => cellNum(m.share, (n) => `${trim(n)}%`),
      },
      {
        key: "rank",
        header: "Orın",
        align: "right",
        sortValue: (m) => m.rank,
        render: (m) =>
          m.rank === null ? (
            <span className="text-ink-3">—</span>
          ) : (
            <span className="tnum">
              {m.rank}
              {m.of ? `/${m.of}` : ""}
            </span>
          ),
      },
    ],
    [],
  );

  const opColumns: DataTableColumn<OperationalKpi>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Kórsetkish",
        sortValue: (k) => k.name,
        searchValue: (k) => k.name,
        render: (k) => (
          <div>
            <div className="font-medium text-ink">{k.name}</div>
            <div className="text-[11px] text-ink-3">
              {k.caption} · {k.year}-jıl
            </div>
          </div>
        ),
      },
      {
        key: "value",
        header: "Fakt",
        align: "right",
        sortValue: (k) => k.value,
        render: (k) => (
          <span className="tnum">
            {trim(k.value)} <span className="text-[11px] text-ink-3">{shortUnit(k.unit)}</span>
          </span>
        ),
      },
      {
        key: "plan",
        header: "Reja",
        align: "right",
        sortValue: (k) => k.plan,
        render: (k) => (
          <span className="tnum">
            {trim(k.plan)} <span className="text-[11px] text-ink-3">{shortUnit(k.unit)}</span>
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortValue: (k) => k.status,
        render: (k) => (
          <span
            className="text-[12px] font-semibold"
            style={{ color: k.status === "orınlandı" ? "#34d399" : "#fb7185" }}
          >
            {k.status}
          </span>
        ),
      },
    ],
    [],
  );

  if (year > 0 && !loading && !profile) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-[15px] text-ink-3">Bul rayon tabılmadı</p>
        <Link
          href="/districts"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-cyan hover:underline"
        >
          <ArrowLeft size={14} />
          Tumanlar dizimine qaytıw
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="mr-1">
          <Link
            href="/districts"
            className="mb-1.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-3 transition hover:text-cyan"
          >
            <ArrowLeft size={13} />
            Tumanlar
          </Link>
          <h1 className="text-2xl font-bold text-ink">{profile?.district.name ?? "…"}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-3">
            {profile && (
              <>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} />
                  {profile.district.center}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users size={12} />
                  {trim(profile.district.population)} mıń kisi
                </span>
                <span>{trim(profile.district.area_km2, 0)} km²</span>
              </>
            )}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {modules.length > 0 && (
            <Segmented<string>
              layoutId="district-profile-module"
              size="sm"
              value={activeModule?.id ?? moduleId}
              onChange={setModule}
              options={modules.map((m) => ({ value: m.id, label: m.short, color: m.color }))}
            />
          )}
          <YearScale years={years} value={year} onChange={setYear} />
        </div>
      </div>

      {profile && profile.operational.length > 0 && (
        <div>
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-ink">2026-jıl operativ KPI</span>
            <span className="text-[12px] text-ink-3">reja hám fakt — joriy jıl monitoringi</span>
            <div className="flex-1" />
            <Segmented<"cards" | "table">
              layoutId="op-kpi-view"
              size="sm"
              value={opView}
              onChange={setOpView}
              options={[
                { value: "cards", label: "Kartalar" },
                { value: "table", label: "Jadval" },
              ]}
            />
          </div>
          {opView === "table" ? (
            <DataTable
              columns={opColumns}
              rows={profile.operational}
              getRowKey={(k) => k.indicator_id}
              searchPlaceholder="Kórsetkish izlew…"
              exportName={`${profile.district.name}-operativ-kpi`}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {profile.operational.map((k, i) => (
                <OperationalCard key={k.indicator_id} kpi={k} index={i} />
              ))}
            </div>
          )}
        </div>
      )}

      <HeroFigure
        label={dm?.name ?? activeModule?.name ?? "Kólemi"}
        value={dm?.value ?? null}
        suffix={unit}
        color={dm?.color ?? activeModule?.color ?? "#22d3ee"}
        caption={
          profile
            ? `${dm?.rank ?? "—"}-orın ${dm?.of ? `${dm.of} rayon ishinde` : ""} · respublikanıń ${trim(dm?.share ?? 0)}% i`
            : "júklenbekte…"
        }
      />

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatTile
          label={`${activeModule?.short ?? ""} ósiwi`}
          value={dm?.yoy ?? null}
          unit="%"
          delta={dm?.yoy ?? null}
          deltaLabel={`${year - 1}-jılǵa`}
          accent={dm?.color ?? activeModule?.color}
          index={0}
        />
        <StatTile
          label="Ortasha ósiw"
          value={profile?.avg_growth ?? null}
          unit="%"
          delta={profile?.avg_growth ?? null}
          deltaLabel="barlıq tarawlar"
          accent="#34d399"
          index={1}
        />
        <StatTile
          label="Ósip atır"
          value={profile ? profile.modules.filter((m) => (m.yoy ?? 0) > 0).length : null}
          digits={0}
          unit="taraw"
          accent="#2a78d6"
          index={2}
        />
        <StatTile
          label="Tómenlegen"
          value={profile ? profile.modules.filter((m) => (m.yoy ?? 0) < 0).length : null}
          digits={0}
          unit="taraw"
          upIsGood={false}
          accent="#d03b3b"
          index={3}
        />
      </div>

      {/* Barlıq tarawlar bir qarashta */}
      {profile && (
        <div className="glass rounded-2xl p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-ink">
              {profile.district.name} — tarawlar boyınsha
            </span>
            <div className="flex-1" />
            <Segmented<"cards" | "table">
              layoutId="district-modules-view"
              size="sm"
              value={modulesView}
              onChange={setModulesView}
              options={[
                { value: "cards", label: "Kartalar" },
                { value: "table", label: "Jadval" },
              ]}
            />
          </div>

          {modulesView === "table" ? (
            <DataTable
              columns={moduleColumns}
              rows={profile.modules}
              getRowKey={(m) => m.module}
              onRowClick={(m) => setModule(m.module)}
              searchPlaceholder="Taraw izlew…"
              exportName={`${profile.district.name}-tarawlar-${year}`}
            />
          ) : (
            <>
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {profile.modules.map((m, i) => (
                  <motion.button
                    key={m.module}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.03 * i }}
                    onClick={() => setModule(m.module)}
                    className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 text-left transition hover:bg-raised/40"
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: m.color }} />
                    <span className="w-28 shrink-0 truncate text-[13px] text-ink-2">{m.name}</span>
                    <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-abyss/70">
                      <motion.span
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ background: m.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (m.share ?? 0) * 3)}%` }}
                        transition={{ delay: 0.05 + 0.03 * i, duration: 0.6 }}
                      />
                    </span>
                    <span className="tnum w-12 shrink-0 text-right text-[13px] font-semibold text-ink">
                      {trim(m.share ?? 0)}%
                    </span>
                    <span
                      className="tnum inline-flex w-16 shrink-0 items-center justify-end gap-0.5 text-[12px]"
                      style={{ color: (m.yoy ?? 0) >= 0 ? "#34d399" : "#fb7185" }}
                    >
                      {m.yoy === null ? (
                        <span className="text-ink-3">—</span>
                      ) : (
                        <>
                          {m.yoy >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {trim(Math.abs(m.yoy))}%
                        </>
                      )}
                    </span>
                  </motion.button>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] text-ink-3">
                Bir tarawǵa bassańız — sol taraw ushın joqarıdaǵı kórsetkish hám grafik jańalanadı
              </p>
            </>
          )}
        </div>
      )}

      <div className="grid gap-5 pb-2 lg:grid-cols-2">
        {trendChart && <ChartRenderer spec={trendChart} />}
        {structureChart && <ChartRenderer spec={structureChart} />}
      </div>
    </div>
  );
}

function OperationalCard({ kpi, index }: { kpi: OperationalKpi; index: number }) {
  const done = kpi.status === "orınlandı";
  const unit = shortUnit(kpi.unit);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.35 }}
    >
      <Panel className="h-full rounded-2xl p-3.5">
        <div className="mb-2 flex items-start gap-2">
          <span className="min-w-0 flex-1 text-[13px] leading-snug font-semibold text-ink">
            {kpi.name}
          </span>
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={
              done
                ? { background: "rgb(52 211 153 / 0.12)", color: "#34d399" }
                : { background: "rgb(251 113 133 / 0.12)", color: "#fb7185" }
            }
          >
            {done ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
            {kpi.status}
          </span>
        </div>
        <div className="mb-1.5 text-[11px] text-ink-3">{kpi.caption} · {kpi.year}-jıl</div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10.5px] tracking-wide text-ink-3 uppercase">Fakt</div>
            <div className="tnum text-[18px] font-semibold text-ink">
              {trim(kpi.value)} <span className="text-[11px] font-normal text-ink-3">{unit}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] tracking-wide text-ink-3 uppercase">Reja</div>
            <div className="tnum text-[14px] font-medium text-ink-2">
              {trim(kpi.plan)} <span className="text-[11px] font-normal text-ink-3">{unit}</span>
            </div>
          </div>
        </div>
      </Panel>
    </motion.div>
  );
}
