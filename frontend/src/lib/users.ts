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

export async function listUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${BASE}/api/users`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AdminUser[];
}

export async function createUser(input: {
  username: string;
  full_name: string;
  password: string;
  role: UserRole;
}): Promise<AdminUser> {
  const res = await fetch(`${BASE}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AdminUser;
}

export async function updateUser(
  id: number,
  patch: { full_name?: string; role?: UserRole; password?: string },
): Promise<AdminUser> {
  const res = await fetch(`${BASE}/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(patch),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AdminUser;
}

export async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`${BASE}/api/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok && res.status !== 204) throw new Error(await readError(res));
}
