const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Backendni oldindan uyg'otish. Sahifa ochilganda bir marta chaqiriladi —
 * foydalanuvchi dashboardni ko'zdan kechirguncha xizmat tayyor bo'ladi.
 * Natijasi ahamiyatsiz, xatolar ataylab yutiladi.
 */
export function warmUpApi(): void {
  if (!BASE) return;
  void fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(60_000) }).catch(() => {});
}

export function apiConfigured(): boolean {
  return Boolean(BASE);
}
