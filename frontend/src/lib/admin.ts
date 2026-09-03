"use client";

/**
 * Admin amallari — hammasi backenddagi `/api/stats/*` ustida.
 *
 * O'lchovlar Excel'dan yuklanadi: qo'lda bitta qiymat kiritish yo'q,
 * chunki manba fayl tuzilishi (davr ustunlari, ierarxik qatorlar,
 * hududlar bloklari) parserda hal qilinadi.
 */

import { authHeaders } from "@/lib/session";
import { fetchStats, type IndicatorBrief } from "@/lib/stats";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface SummaryCategory {
  id: string;
  name: string;
  source_dir: string;
  color: string;
  indicators: number;
  observations: number;
}

export interface SummaryModule {
  id: string;
  name: string;
  color: string;
  indicator_id: number;
  indicator_name: string;
  unit: string;
}

export interface AdminSummary {
  years: number[];
  latest_year: number | null;
  indicators: number;
  observations: number;
  districts: number;
  with_districts: number;
  categories: SummaryCategory[];
  source_dirs: string[];
  modules: SummaryModule[];
}

export interface TouchedIndicator {
  id: number;
  name: string;
  /** Bul júklew menen jańadan jaratıldımı, yamasa bar bolǵan jańalandımı */
  yangi: boolean;
}

export interface SampleRow {
  korsetkish: string;
  rayon: string;
  jıl: number;
  dawir: string;
  qıymet: number;
  olshem: string;
}

export interface UploadResult {
  file: string;
  category: string;
  /** true bo'lsa — bu faqat oldindan ko'rish, baza o'zgarmagan */
  preview: boolean;
  kategoriya: number;
  korsetkish: number;
  olshov: number;
  otkazib_yuborilgan: number;
  sebep_belgisiz_rayon: number;
  sebep_qaytalanma: number;
  korsetkishler: TouchedIndicator[];
  /** Tek `preview`de keledi — parsıńǵan haqıyqıy qatarlardan namuna */
  namuna?: SampleRow[];
}

export async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
  } catch {
    // JSON emas — quyidagi umumiy xabar
  }
  if (res.status === 401) return "Sessiya tamamlandı, qaytadan kiriń";
  if (res.status === 403) return "Bul ámel ushın administrator huqıqı kerek";
  return `Server qátesi (${res.status})`;
}

export async function fetchSummary(): Promise<AdminSummary> {
  const res = await fetch(`${BASE}/api/stats/summary`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AdminSummary;
}

/** Ko'rsatkichni tayanch sohaga biriktiradi yoki biriktirishni uzadi. */
export async function setIndicatorModule(
  indicatorId: number,
  module: string | null,
): Promise<IndicatorBrief> {
  const res = await fetch(`${BASE}/api/stats/indicators/${indicatorId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ module: module ?? "" }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as IndicatorBrief;
}

export async function uploadWorkbook(file: File, category: string): Promise<UploadResult> {
  const body = new FormData();
  body.append("file", file);
  body.append("category", category);

  const res = await fetch(`${BASE}/api/stats/upload`, {
    method: "POST",
    headers: authHeaders(),
    body,
    // Yuklash + parser + bazaga yozish: katta faylda bir necha daqiqa
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as UploadResult;
}

/**
 * Faylni bazaǵa jazbastan sınap kóredi — nátiyje `uploadWorkbook` menen
 * bir túrde, biraq eshqanday ózgeris qalmaydı. Admin nadurıs bólim
 * tańlaǵanın tastıyıqlawdan aldın kóre aladı.
 */
export async function previewWorkbook(file: File, category: string): Promise<UploadResult> {
  const body = new FormData();
  body.append("file", file);
  body.append("category", category);

  const res = await fetch(`${BASE}/api/stats/upload/preview`, {
    method: "POST",
    headers: authHeaders(),
    body,
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as UploadResult;
}

/** Bir nechte ko'rsatkishti birdey tayanch sohaǵa biriktiredi. */
export async function bulkSetIndicatorModule(
  ids: number[],
  module: string | null,
): Promise<{ updated: number; skipped: number }> {
  const res = await fetch(`${BASE}/api/stats/indicators/bulk`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ids, module: module ?? "" }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { updated: number; skipped: number };
}

/** Bazadagi statistikani Excel qilip yuklab oladi (klient brauzeriga). */
export async function downloadExport(params: { category_id?: string }): Promise<void> {
  const qs = new URLSearchParams();
  if (params.category_id) qs.set("category_id", params.category_id);

  const res = await fetch(`${BASE}/api/stats/export?${qs.toString()}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(await readError(res));

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filename = /filename="?([^"]+)"?/.exec(disposition)?.[1] ?? "statistika.xlsx";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Ko'rsatkichlar ma'lumotnomasi — o'qish uchun, keshdan foydalanadi. */
export function searchIndicators(params: {
  q?: string;
  category_id?: string;
  module?: string;
  has_districts?: string;
  limit?: number;
  offset?: number;
}) {
  return fetchStats<{
    total: number;
    limit: number;
    offset: number;
    items: IndicatorBrief[];
  }>("/indicators", params);
}

export function adminConfigured(): boolean {
  return Boolean(BASE);
}
