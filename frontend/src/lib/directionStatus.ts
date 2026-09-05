"use client";

/**
 * Jónelis bólimleriniń admin-basqaratuǵın tapsırma jaǵdayı: juwapker,
 * múddet, orınlanıw payızı — jıl boyınsha (`/api/directions/status`).
 * Status TaskBoard'dagı `taskStatus(progress, deadline)` arqalı
 * esaplanadı — bul jerde tek sırt maǵlıwmat saqlanadı.
 */

import { authHeaders } from "@/lib/session";
import { readError } from "@/lib/admin";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface DirectionBlockStatus {
  direction_id: string;
  block_id: string;
  year: number;
  progress: number;
  deadline: string | null;
  assignee: string;
  updated_by: string;
  updated_at: string;
}

export function directionStatusConfigured(): boolean {
  return Boolean(BASE);
}

export async function fetchDirectionStatuses(year: number): Promise<DirectionBlockStatus[]> {
  const res = await fetch(`${BASE}/api/directions/status?year=${year}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as DirectionBlockStatus[];
}

export async function putDirectionBlockStatus(params: {
  directionId: string;
  blockId: string;
  year: number;
  progress: number;
  deadline: string | null;
  assignee: string;
}): Promise<DirectionBlockStatus> {
  const res = await fetch(`${BASE}/api/directions/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      direction_id: params.directionId,
      block_id: params.blockId,
      year: params.year,
      progress: params.progress,
      deadline: params.deadline,
      assignee: params.assignee,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as DirectionBlockStatus;
}
