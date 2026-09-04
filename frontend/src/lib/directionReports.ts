"use client";

/**
 * Jónelis bólimleri (`data/directions.ts`) boyınsha ǵárezsiz hisabatlar.
 *
 * Ápiwayı prototip: server API házirshe joq, sonlıqtan hár bólimniń
 * jadvalı brauzerdiń `localStorage`ında saqlanadı (tek usı qurılmada
 * kórinedi). Excel fayldı jükleseń — client tárepte oqılıp, sol jerde
 * kórsetiledi ("translyatsiya"); qolman tolтырыў da usı jadvalǵа jazadı.
 */

import * as XLSX from "xlsx";

export interface ReportSheet {
  columns: string[];
  rows: (string | number | null)[][];
  updatedAt: string;
}

const KEY_PREFIX = "qr-direction-report:";

const DEFAULT_COLUMNS = ["Kórsetkish / Aymaq", "Reje", "Fakt", "Orınlanıw, %", "Eskertpe"];

function storageKey(blockId: string): string {
  return `${KEY_PREFIX}${blockId}`;
}

export function loadReportSheet(blockId: string): ReportSheet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(blockId));
    if (!raw) return null;
    return JSON.parse(raw) as ReportSheet;
  } catch {
    return null;
  }
}

export function saveReportSheet(blockId: string, sheet: Omit<ReportSheet, "updatedAt">): ReportSheet {
  const saved: ReportSheet = { ...sheet, updatedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey(blockId), JSON.stringify(saved));
  }
  return saved;
}

export function clearReportSheet(blockId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(blockId));
}

export function emptyReportSheet(): ReportSheet {
  return { columns: [...DEFAULT_COLUMNS], rows: [], updatedAt: new Date().toISOString() };
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
