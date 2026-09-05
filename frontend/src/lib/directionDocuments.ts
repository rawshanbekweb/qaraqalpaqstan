"use client";

/**
 * Jónelis bólimlerine baylanıslı hújjetler (fayl-qosımshalar) — backend
 * `/api/directions/documents` ustinde. `lib/admin.ts`dagi úlgi qaytalanadı:
 * `authHeaders()`, JSON qátelik oqıw, FormData arqalı júklew.
 */

import { authHeaders } from "@/lib/session";
import { readError } from "@/lib/admin";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export type DirectionPeriod = "q1" | "h1" | "m9" | "year";

export const PERIOD_LABELS: Record<DirectionPeriod, string> = {
  q1: "I-shárek",
  h1: "I-yarım jıl",
  m9: "9 ay",
  year: "Jıl juwmaǵı",
};

export const PERIOD_ORDER: DirectionPeriod[] = ["q1", "h1", "m9", "year"];

export interface DirectionDocument {
  id: number;
  direction_id: string;
  block_id: string;
  year: number;
  period: DirectionPeriod;
  title: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
}

/** Ay boyınsha ádetegi dáwirdi ǵana esaplaydı — sanaw h`újjetlerdi ashqanda kórinedi. */
export function currentDirectionPeriod(): DirectionPeriod {
  const month = new Date().getMonth() + 1;
  if (month <= 3) return "q1";
  if (month <= 6) return "h1";
  if (month <= 9) return "m9";
  return "year";
}

export function directionDocumentsConfigured(): boolean {
  return Boolean(BASE);
}

export async function listDirectionDocuments(
  blockId: string,
  year: number,
  period: DirectionPeriod,
): Promise<DirectionDocument[]> {
  const qs = new URLSearchParams({ block_id: blockId, year: String(year), period });
  const res = await fetch(`${BASE}/api/directions/documents?${qs.toString()}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as DirectionDocument[];
}

export async function uploadDirectionDocument(params: {
  directionId: string;
  blockId: string;
  year: number;
  period: DirectionPeriod;
  title?: string;
  file: File;
}): Promise<DirectionDocument> {
  const body = new FormData();
  body.append("direction_id", params.directionId);
  body.append("block_id", params.blockId);
  body.append("year", String(params.year));
  body.append("period", params.period);
  body.append("title", params.title ?? "");
  body.append("file", params.file);

  const res = await fetch(`${BASE}/api/directions/documents`, {
    method: "POST",
    headers: authHeaders(),
    body,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as DirectionDocument;
}

export interface DirectionBlockCoverage {
  direction_id: string;
  block_id: string;
  document_count: number;
  has_report: boolean;
}

/** Tańlanǵan dáwir ushın hár bólimniń hújjet/hisabat bar-joqlıǵı — analitika panelinde. */
export async function fetchDirectionSummary(
  year: number,
  period: DirectionPeriod,
): Promise<DirectionBlockCoverage[]> {
  const qs = new URLSearchParams({ year: String(year), period });
  const res = await fetch(`${BASE}/api/directions/summary?${qs.toString()}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as DirectionBlockCoverage[];
}

export async function deleteDirectionDocument(id: number): Promise<void> {
  const res = await fetch(`${BASE}/api/directions/documents/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(await readError(res));
}

/** Hújjetti brauzerge júklep aladı — авторизация kerek bolmasa da, aynı
 * úlgi (`downloadExport`) menen birdey ıqtıbaslıq ushın blob arqalı islenedi. */
export async function downloadDirectionDocument(doc: DirectionDocument): Promise<void> {
  const res = await fetch(`${BASE}/api/directions/documents/${doc.id}/download`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(await readError(res));

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
