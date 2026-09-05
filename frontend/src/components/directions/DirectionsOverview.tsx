"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { DIRECTIONS } from "@/data/directions";
import {
  currentDirectionPeriod,
  directionDocumentsConfigured,
  fetchDirectionSummary,
  PERIOD_LABELS,
  PERIOD_ORDER,
  type DirectionBlockCoverage,
  type DirectionPeriod,
} from "@/lib/directionDocuments";
import { ErrorNotice, Segmented, YearScale } from "@/components/ui/primitives";
import { StatTile } from "@/components/charts/StatTile";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import type { ChartSpec } from "@/lib/types";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const BAR_COLORS = ["#22d3ee", "#818cf8", "#34d399", "#f59e0b", "#f472b6", "#60a5fa", "#fb7185"];

/**
 * 7 jónelistiń jámi haline qısqasha kóz-qaras — tańlanǵan dáwir ushın
 * qansha bólimge hújjet júklengeni/hisabat toltırılǵanı. Sanlar tikkeley
 * "bar-joqlıǵına" tiykarlanadı (erkin Reje/Fakt matnın sanaw isenimsiz,
 * sebebi baǵana atların admin ózgerte aladı).
 */
export function DirectionsOverview() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [period, setPeriod] = useState<DirectionPeriod>(() => currentDirectionPeriod());
  const [coverage, setCoverage] = useState<DirectionBlockCoverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    fetchDirectionSummary(year, period)
      .then((rows) => {
        setCoverage(rows);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Analitika alınbadı"))
      .finally(() => setLoading(false));
  }, [year, period]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const stats = useMemo(() => {
    const coveredBlocks = new Set(coverage.map((c) => c.block_id));
    const totalDocuments = coverage.reduce((sum, c) => sum + c.document_count, 0);

    const perDirection = DIRECTIONS.map((d) => {
      const covered = d.blocks.filter((b) => coveredBlocks.has(b.id)).length;
      return { direction: d, covered, total: d.blocks.length };
    });
    const totalBlocks = perDirection.reduce((sum, p) => sum + p.total, 0);
    const fullDirections = perDirection.filter((p) => p.covered === p.total).length;

    const chart: ChartSpec = {
      id: `directions-coverage-${year}-${period}`,
      kind: "bar",
      title: "Jónelisler boyınsha tolıq bólimler",
      subtitle: `${PERIOD_LABELS[period]}, ${year} · bólim sanı`,
      series: [{ key: "value", label: "Tolıq bólimler" }],
      data: perDirection.map((p, i) => ({
        label: `${p.direction.order}. ${p.direction.title.split(" ")[0]}`,
        value: p.covered,
        color: BAR_COLORS[i % BAR_COLORS.length],
      })),
    };

    return {
      coveredBlocksCount: coveredBlocks.size,
      totalBlocks,
      totalDocuments,
      fullDirections,
      chart,
    };
  }, [coverage, year, period]);

  if (!directionDocumentsConfigured()) return null;

  return (
    <div className="glass space-y-4 rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <BarChart3 size={15} className="text-cyan" />
          Jónelisler boyınsha analitika
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <YearScale years={YEARS} value={year} onChange={setYear} />
          <Segmented
            layoutId="directions-overview-period"
            size="sm"
            value={period}
            onChange={setPeriod}
            options={PERIOD_ORDER.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
          />
        </div>
      </div>

      {error && <ErrorNotice message={error} />}

      {!loading && (
        <>
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3">
            <StatTile
              label="Jámi hújjetler"
              value={stats.totalDocuments}
              digits={0}
              unit="dana"
              accent="#22d3ee"
              index={0}
            />
            <StatTile
              label="Tolıq bólimler"
              value={stats.coveredBlocksCount}
              digits={0}
              unit={`/ ${stats.totalBlocks}`}
              accent="#818cf8"
              index={1}
            />
            <StatTile
              label="Tolıq jónelisler"
              value={stats.fullDirections}
              digits={0}
              unit={`/ ${DIRECTIONS.length}`}
              accent="#34d399"
              index={2}
            />
          </div>
          <ChartRenderer spec={stats.chart} height={170} />
        </>
      )}
    </div>
  );
}
