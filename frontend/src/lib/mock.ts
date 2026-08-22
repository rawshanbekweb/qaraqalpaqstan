/**
 * Demo/fallback maǵlıwmatlar generatori.
 *
 * Backend qosılmaǵanda yamasa jetimsiz bolǵanda (`NEXT_PUBLIC_API_URL` bar,
 * biraq server juwap bermeydi) `lib/stats.ts` sonda usı funktsiyalarǵa
 * ótedi — panel bos ekran kórsetiwdiń ornına haqıyqıy sxema formatında,
 * biraq oylap tabılǵan sanlar menen tolıq kórinis beredi.
 *
 * Modul dizimi backendtiń `app/services/stats.py` MODULE_META tabligina
 * sáykes — API qosılǵanda kórinis birden-bir qalıp qaladı.
 */

import { DISTRICTS } from "@/data/districts";
import type {
  StatsMeta,
  Overview,
  OverviewModule,
  MapLayer,
  MapDistrict,
  DistrictProfile,
  ProfileModule,
  Series,
  SeriesPoint,
  IndicatorBrief,
} from "@/lib/stats";

const MODULE_META = [
  { id: "sanaat", name: "Sanaat ónimi kólemi", short: "Sanaat", color: "#0ea5e9", sort: 1, unit: "ámeldegi baxalarda; mlrd. som" },
  { id: "awil_xojaligi", name: "Awıl xojalıǵı ónimleri", short: "Awıl xojalıǵı", color: "#65a30d", sort: 2, unit: "ámeldegi baxalarda; mlrd. som" },
  { id: "investitsiya", name: "Tiykarǵı kapitalǵa investitsiyalar", short: "Investitsiya", color: "#4f46e5", sort: 3, unit: "ámeldegi baxalarda; mlrd. som" },
  { id: "qurilis", name: "Qurılıs jumısları", short: "Qurılıs", color: "#7c3aed", sort: 4, unit: "ámeldegi baxalarda; mlrd. som" },
  { id: "xizmetler", name: "Kórsetilgen xızmetler kólemi", short: "Xızmetler", color: "#059669", sort: 5, unit: "ámeldegi baxalarda; mlrd. som" },
  { id: "transport", name: "Tasılǵan júkler kólemi", short: "Transport", color: "#d97706", sort: 6, unit: "mıń tonna" },
  { id: "sawda", name: "Usaqlap satıw tovar aylanısı", short: "Sawda", color: "#ea580c", sort: 7, unit: "ámeldegi baxalarda; mlrd. som" },
] as const;

const YEARS = Array.from({ length: 2026 - 2010 + 1 }, (_, i) => 2010 + i);
const LATEST_YEAR = 2026;

// ── Seedlengen "psevdo-tosattan" san — har shaqırıqta bir xil nátiyje ──

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand(seed: string): number {
  let t = (hashSeed(seed) + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function districtWeight(moduleId: string, districtId: string): number {
  const boost = districtId === "nukus-shahri" ? 2.6 : districtId === "nukus-tumani" ? 1.35 : 1;
  return (35 + rand(`${moduleId}:${districtId}:w`) * 150) * boost;
}

/** 2010-jıldan baslap jıllıq ósiw — kompaundlanǵan. */
function yearFactor(moduleId: string, year: number): number {
  let f = 1;
  for (let y = 2011; y <= year; y++) {
    const g = 0.015 + rand(`${moduleId}:${y}:g`) * 0.095;
    f *= 1 + g;
  }
  return f;
}

function districtValue(moduleId: string, districtId: string, year: number): number {
  const jitter = 0.88 + rand(`${moduleId}:${districtId}:${year}:j`) * 0.24;
  return districtWeight(moduleId, districtId) * yearFactor(moduleId, year) * jitter;
}

function moduleTotal(moduleId: string, year: number): number {
  return DISTRICTS.reduce((s, d) => s + districtValue(moduleId, d.id, year), 0);
}

function findModule(id: string) {
  return MODULE_META.find((m) => m.id === id) ?? MODULE_META[0];
}

function mockIndicatorBrief(meta: (typeof MODULE_META)[number]): IndicatorBrief {
  return {
    id: meta.sort,
    slug: meta.id,
    category_id: meta.id,
    name: meta.name,
    name_uz: meta.name,
    unit: meta.unit,
    module: meta.id,
    module_name: meta.name,
    color: meta.color,
    has_districts: true,
    lower_is_better: false,
    source: "demo",
  };
}

// ── Xızmetler ────────────────────────────────────────────────────────

export function mockMeta(): StatsMeta {
  return {
    years: YEARS,
    latest_year: LATEST_YEAR,
    modules: MODULE_META.map((m) => ({
      id: m.id,
      name: m.name,
      short: m.short,
      color: m.color,
      sort: m.sort,
      unit: m.unit,
      indicator_id: m.sort,
      has_districts: true,
      years: YEARS,
      latest_year: LATEST_YEAR,
    })),
    categories: MODULE_META.map((m) => ({
      id: m.id,
      name: m.name,
      name_uz: m.name,
      color: m.color,
      sort: m.sort,
      indicators: 6 + Math.floor(rand(`${m.id}:cat`) * 10),
    })),
    districts: DISTRICTS.map((d) => ({
      id: d.id,
      name: d.name,
      name_ru: d.name,
      center: d.center,
      area_km2: d.areaKm2,
      population: d.population,
    })),
    indicators: 187,
    observations: 42311,
  };
}

export function mockOverview(year: number | null): Overview {
  const y = year || LATEST_YEAR;
  const modules: OverviewModule[] = MODULE_META.map((m) => {
    const total = moduleTotal(m.id, y);
    const prevTotal = moduleTotal(m.id, y - 1);
    const yoy = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;

    const ranked = [...DISTRICTS]
      .map((d) => ({ d, v: districtValue(m.id, d.id, y) }))
      .sort((a, b) => b.v - a.v);
    const leader = ranked[0];
    const laggard = ranked[ranked.length - 1];

    const trend = YEARS.filter((yy) => yy <= y).map((yy) => ({
      year: yy,
      value: moduleTotal(m.id, yy),
    }));

    return {
      module: m.id,
      name: m.name,
      full_name: m.name,
      color: m.color,
      sort: m.sort,
      indicator_id: m.sort,
      unit: m.unit,
      value: total,
      yoy,
      partial: false,
      caption: `Aldıńǵı — ${leader.d.name} · eń páseń — ${laggard.d.name}`,
      leader: { district_id: leader.d.id, name: leader.d.name, value: leader.v },
      laggard: { district_id: laggard.d.id, name: laggard.d.name, value: laggard.v },
      trend,
    };
  });

  const yoys = modules.map((m) => m.yoy).filter((v): v is number => v !== null);
  const avgGrowth = yoys.length ? yoys.reduce((s, v) => s + v, 0) / yoys.length : null;

  return {
    year: y,
    years: YEARS,
    modules,
    avg_growth: avgGrowth,
    growing: modules.filter((m) => (m.yoy ?? 0) > 0).length,
    declining: modules.filter((m) => (m.yoy ?? 0) < 0).length,
  };
}

export function mockMapLayer(moduleId: string | null, year: number | null): MapLayer {
  const meta = findModule(moduleId ?? MODULE_META[0].id);
  const y = year || LATEST_YEAR;

  const rows = DISTRICTS.map((d) => ({
    d,
    value: districtValue(meta.id, d.id, y),
    prev: districtValue(meta.id, d.id, y - 1),
  }));
  const total = rows.reduce((s, r) => s + r.value, 0);
  const max = Math.max(...rows.map((r) => r.value));
  const ranked = [...rows].sort((a, b) => b.value - a.value);
  const rankOf = new Map(ranked.map((r, i) => [r.d.id, i + 1]));

  const districts: MapDistrict[] = rows.map((r) => ({
    district_id: r.d.id,
    name: r.d.name,
    value: r.value,
    share: total > 0 ? (r.value / total) * 100 : null,
    yoy: r.prev > 0 ? ((r.value - r.prev) / r.prev) * 100 : null,
    intensity: max > 0 ? r.value / max : null,
    rank: rankOf.get(r.d.id) ?? null,
  }));

  return {
    indicator: mockIndicatorBrief(meta),
    year: y,
    period: "year",
    period_caption: null,
    partial: false,
    comparable: true,
    unit: meta.unit,
    total,
    max,
    covered: districts.length,
    districts,
  };
}

export function mockDistrictProfile(districtId: string, year: number | null): DistrictProfile {
  const district = DISTRICTS.find((d) => d.id === districtId) ?? DISTRICTS[0];
  const y = year || LATEST_YEAR;

  const modules: ProfileModule[] = MODULE_META.map((m) => {
    const value = districtValue(m.id, district.id, y);
    const prev = districtValue(m.id, district.id, y - 1);
    const yoy = prev > 0 ? ((value - prev) / prev) * 100 : null;
    const total = moduleTotal(m.id, y);

    const ranked = [...DISTRICTS]
      .map((d) => ({ id: d.id, v: districtValue(m.id, d.id, y) }))
      .sort((a, b) => b.v - a.v);
    const rank = ranked.findIndex((r) => r.id === district.id) + 1;

    const trend = YEARS.filter((yy) => yy <= y)
      .slice(-8)
      .map((yy) => districtValue(m.id, district.id, yy));

    return {
      module: m.id,
      name: m.short,
      full_name: m.name,
      color: m.color,
      sort: m.sort,
      indicator_id: m.sort,
      unit: m.unit,
      value,
      yoy,
      partial: false,
      share: total > 0 ? (value / total) * 100 : null,
      rank: rank || null,
      of: DISTRICTS.length,
      trend,
    };
  });

  const yoys = modules.map((m) => m.yoy).filter((v): v is number => v !== null);
  const avgGrowth = yoys.length ? yoys.reduce((s, v) => s + v, 0) / yoys.length : null;

  return {
    district: {
      id: district.id,
      name: district.name,
      name_ru: district.name,
      center: district.center,
      area_km2: district.areaKm2,
      population: district.population,
    },
    year: y,
    modules,
    avg_growth: avgGrowth,
  };
}

export function mockSeries(
  moduleId: string | null,
  districtId: string | null,
  yearFrom?: number,
  yearTo?: number,
): Series {
  const meta = findModule(moduleId ?? MODULE_META[0].id);
  const from = yearFrom ?? YEARS[0];
  const to = yearTo ?? LATEST_YEAR;
  const years = YEARS.filter((y) => y >= from && y <= to);

  const valueAt = (y: number) =>
    districtId ? districtValue(meta.id, districtId, y) : moduleTotal(meta.id, y);

  const points: SeriesPoint[] = years.map((y) => {
    const value = valueAt(y);
    const prevValue = valueAt(y - 1);
    return {
      year: y,
      label: String(y),
      caption: "jıl",
      partial: false,
      value,
      yoy: prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : null,
      sources: 1,
      aggregated: !districtId,
    };
  });

  return { indicator: mockIndicatorBrief(meta), district_id: districtId, unit: meta.unit, points };
}

/**
 * Backend juwap berdi, biraq bazası bos bolsa (mısalı, hali egelenbegen)
 * — panel jáne de bos kórinedi. Usı jaǵdaydı anıqlaw ushın.
 */
export function isEmptyResponse(path: string, data: unknown): boolean {
  if (data === null || data === undefined) return true;
  const d = data as Record<string, unknown>;
  if (path === "/meta") return !Array.isArray(d.modules) || d.modules.length === 0;
  if (path === "/overview") return !Array.isArray(d.modules) || d.modules.length === 0;
  if (path === "/map") return !Array.isArray(d.districts) || d.districts.length === 0;
  if (path.startsWith("/districts/")) return !d.district;
  if (path === "/series") return !Array.isArray(d.points) || d.points.length === 0;
  return false;
}

/**
 * `/api/stats` yolı boyınsha sáykes mok generatorın tańlaydı.
 * Tanımaytuǵın yol ushın `undefined` qaytaradı — shaqırıwshı haqıyqıy
 * qátelikti taslap qaldıradı.
 */
export function mockForPath(
  path: string,
  params: Record<string, string | number | undefined> = {},
): unknown {
  if (path === "/meta") return mockMeta();
  if (path === "/overview") return mockOverview(params.year ? Number(params.year) : null);
  if (path === "/map") {
    return mockMapLayer(
      params.module ? String(params.module) : null,
      params.year ? Number(params.year) : null,
    );
  }
  if (path.startsWith("/districts/")) {
    const districtId = path.slice("/districts/".length);
    return mockDistrictProfile(districtId, params.year ? Number(params.year) : null);
  }
  if (path === "/series") {
    return mockSeries(
      params.module ? String(params.module) : null,
      params.district_id ? String(params.district_id) : null,
      params.year_from ? Number(params.year_from) : undefined,
      params.year_to ? Number(params.year_to) : undefined,
    );
  }
  return undefined;
}
