"use client";

/**
 * Jónelis bólimleri (`data/directions.ts`) boyınsha hisabat kesteleri —
 * backend `/api/directions/report` ustinde, dáwir (q1/h1/m9/year) hám jıl
 * boyınsha ajratılǵan. `lib/directionDocuments.ts`dagı úlgi qaytalanadı:
 * `authHeaders()`, JSON qátelik oqıw.
 *
 * Excel fayldı oqıw/jazıw (`parseWorkbookFile`/`downloadReportSheet`) tek
 * brauzerde islenedi — backend olarǵа qatnaspaydı.
 */

import * as XLSX from "xlsx";
import { authHeaders } from "@/lib/session";
import { readError } from "@/lib/admin";
import type { DirectionPeriod } from "@/lib/directionDocuments";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface ReportSheet {
  columns: string[];
  rows: (string | number | null)[][];
  updatedAt: string;
}

export const DEFAULT_COLUMNS = ["Kórsetkish / Aymaq", "Reje", "Fakt", "Orınlanıw, %", "Eskertpe"];

export function emptyReportSheet(): ReportSheet {
  return { columns: [...DEFAULT_COLUMNS], rows: [], updatedAt: new Date().toISOString() };
}

/** Sáykes dáwir ushın hisabat joq bolsa `null` qaytadı ("ele toltırılmaǵan"). */
export async function fetchReportSheet(
  blockId: string,
  year: number,
  period: DirectionPeriod,
): Promise<ReportSheet | null> {
  const qs = new URLSearchParams({ block_id: blockId, year: String(year), period });
  const res = await fetch(`${BASE}/api/directions/report?${qs.toString()}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as {
    columns: string[];
    rows: (string | number | null)[][];
    updated_at: string;
  };
  return { columns: data.columns, rows: data.rows, updatedAt: data.updated_at };
}

export async function putReportSheet(params: {
  directionId: string;
  blockId: string;
  year: number;
  period: DirectionPeriod;
  sheet: Omit<ReportSheet, "updatedAt">;
}): Promise<ReportSheet> {
  const res = await fetch(`${BASE}/api/directions/report`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      direction_id: params.directionId,
      block_id: params.blockId,
      year: params.year,
      period: params.period,
      columns: params.sheet.columns,
      rows: params.sheet.rows,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as {
    columns: string[];
    rows: (string | number | null)[][];
    updated_at: string;
  };
  return { columns: data.columns, rows: data.rows, updatedAt: data.updated_at };
}

/** Júklengen Excel/CSV fayldı bólim jadvalına aylandıradı ("translyatsiya"). */
export async function parseWorkbookFile(file: File): Promise<ReportSheet> {
  const buf = await file.arrayBuffer();
  const book = XLSX.read(buf, { type: "array" });
  const sheetName = book.SheetNames[0];
  const sheet = book.Sheets[sheetName];
  if (!sheet) throw new Error("Fayldıń ishinde bet tabılmadı");

  const aoa = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  }) as (string | number | null)[][];

  const nonEmpty = aoa.filter((row) => row.some((c) => c !== null && String(c).trim() !== ""));
  if (nonEmpty.length === 0) throw new Error("Fayl bos kórinedi");

  const [header, ...rest] = nonEmpty;
  const columns = header.map((c, i) => (c === null || String(c).trim() === "" ? `Baǵana ${i + 1}` : String(c)));
  const rows = rest.map((r) => columns.map((_, i) => r[i] ?? null));

  return { columns, rows, updatedAt: new Date().toISOString() };
}

/** Bólim jadvalın Excel fayl sıpatında júklep alıw. */
export function downloadReportSheet(filename: string, sheet: ReportSheet): void {
  const aoa = [sheet.columns, ...sheet.rows.map((row) => row.map((c) => c ?? ""))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = sheet.columns.map((col, ci) => {
    const longest = sheet.rows.reduce(
      (max, row) => Math.max(max, String(row[ci] ?? "").length),
      col.length,
    );
    return { wch: Math.min(Math.max(longest + 2, 8), 42) };
  });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, ws, "Hisabat");
  XLSX.writeFile(book, filename);
}
