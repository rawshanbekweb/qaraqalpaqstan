"use client";

import { useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { MapPin } from "lucide-react";
import { KarakalpakstanMap } from "@/components/map/KarakalpakstanMap";
import { StatsPanel } from "@/components/charts/StatsPanel";
import { useStatsMeta } from "@/lib/stats";
import { useDashboard } from "@/lib/store";
import { DISTRICT_BY_ID } from "@/data/districts";
import { RAIL_RIGHT } from "@/lib/layout";
import { Segmented, YearScale } from "@/components/ui/primitives";

/**
 * Tumanlar kartası — taraw/jıl filtri `useDashboard` global sáwlesinde,
 * sonlıqtan KPI sahifasında saylanǵan taraw usı jerde de saqlanıp qaladı.
 */
export default function DistrictsPage() {
  const { moduleId, setModule, year, setYear, selectedDistrict, selectDistrict } = useDashboard();
  const { data: meta } = useStatsMeta();

  const modules = meta?.modules ?? [];
  const activeModule = modules.find((m) => m.id === moduleId) ?? modules[0];
  const years = useMemo(() => activeModule?.years ?? [], [activeModule]);

  useEffect(() => {
    if (years.length === 0) return;
    if (!years.includes(year)) setYear(years[years.length - 1]);
  }, [years, year, setYear]);

  return (
    <div className="flex size-full flex-col gap-5 overflow-hidden">
      <div className="flex flex-wrap items-center gap-4">
        <div className="mr-1">
          <h1 className="text-2xl font-bold text-ink">Tumanlar kartası</h1>
          <p className="text-sm text-ink-3">Rayonlar boyınsha kólemi hám ósiwi</p>
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
          {selectedDistrict && (
            <button
              onClick={() => selectDistrict(null)}
              className="inline-flex items-center gap-1.5 rounded-full bg-cyan/12 px-3 py-1.5 text-[12.5px] font-semibold text-cyan ring-1 ring-cyan/35 transition hover:bg-cyan/20"
            >
              <MapPin size={12} />
              {DISTRICT_BY_ID[selectedDistrict]?.name}
              <span className="text-cyan/60">✕</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl ring-1 ring-hairline">
        <KarakalpakstanMap leftInset={20} rightInset={RAIL_RIGHT} topInset={12} />

        {/* Keng ekran — suzuvchi statistika paneli */}
        <div className="overlay-pass absolute inset-0 z-20 hidden lg:block">
          <motion.section
            className="glass-rail glass-top-glow absolute top-3 right-3 bottom-3 overflow-hidden"
            style={{ width: RAIL_RIGHT - 24 }}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <StatsPanel />
          </motion.section>
        </div>

        {/* Tor ekran — panel xarita astında */}
        <div className="pointer-events-none absolute inset-0 z-20 overflow-y-auto lg:hidden">
          <div className="h-[54vh]" aria-hidden />
          <div className="pointer-events-auto p-3">
            <section className="glass-rail glass-top-glow h-[560px] overflow-hidden">
              <StatsPanel />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
