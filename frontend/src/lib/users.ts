"use client";

/**
 * Admin paydalanıwshılarını basqarıw — `/api/users/*`.
 *
 * Aldın hisap tek serverge kirip `python -m app.seed` arqalı jaratılatuǵın
 * edi. Bul modul admin panelge hisap qosıw/rolin ózgertiw/óshiriw
 * imkaniyatın beredi.
 */

import { authHeaders } from "@/lib/session";
import { readError } from "@/lib/admin";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export type UserRole = "admin" | "viewer";

export interface AdminUser {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

/** `/api/users/*` ushın ortaq soraw: headers/timeout/qátelik islew bir jerde */
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}/api/users${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok && res.status !== 204) throw new Error(await readError(res));
  return res;
}

export async function listUsers(): Promise<AdminUser[]> {
  const res = await apiFetch("");
  return (await res.json()) as AdminUser[];
}

export async function createUser(input: {
  username: string;
  full_name: string;
  password: string;
  role: UserRole;
}): Promise<AdminUser> {
  const res = await apiFetch("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await res.json()) as AdminUser;
}

export async function updateUser(
  id: number,
  patch: { full_name?: string; role?: UserRole; password?: string },
): Promise<AdminUser> {
  const res = await apiFetch(`/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return (await res.json()) as AdminUser;
}

export async function deleteUser(id: number): Promise<void> {
  await apiFetch(`/${id}`, { method: "DELETE" });
}
