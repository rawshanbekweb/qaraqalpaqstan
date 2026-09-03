"use client";

import { motion } from "motion/react";
import { LayoutGrid, LogOut, MapPin, Menu, Radio, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DISTRICT_BY_ID } from "@/data/districts";
import { HEADER_HEIGHT } from "@/lib/layout";
import { useDashboard } from "@/lib/store";
import { clearSession, getSession } from "@/lib/session";
import { warmUpApi } from "@/lib/api";
import { useEffect, useSyncExternalStore } from "react";

/** useSyncExternalStore uchun o'zgarmas "obuna bo'lmaslik" funksiyasi. */
const NO_SUBSCRIBE = () => () => {};

/**
 * Tolıq enli, birden-bir joqarǵı panel — barlıq sahifalarda birdey orında
 * turadı (logo + admin/shıǵıw), `NavDrawer` sol bağana onıń ástinde
 * baslanadı. `/login` hám `/admin` óz-ózinshe naviqasiyaǵa iye, sonlıqtan
 * bul jerde kórsetilmeydi. Soha/jıl filtri hár sahifaniń ózinde (KPI,
 * Tumanlar) — bul jerde qaytalanbaydı.
 */
export function TopBar() {
  const pathname = usePathname();
  const { selectedDistrict, selectDistrict, mobileNavOpen, setMobileNavOpen } = useDashboard();
  const router = useRouter();
  // Sessiya cookie'da — serverda o'qilmaydi, shuning uchun tashqi "store" sifatida
  const role = useSyncExternalStore(NO_SUBSCRIBE, () => getSession()?.role ?? null, () => null);

  // Uxlab qolgan backendni oldindan uyg'otamiz (bepul hostingda muhim) —
  // TopBar barlıq sahifalarda bir márte mount bolady (layout.tsx global).
  useEffect(() => {
    warmUpApi();
  }, []);

  if (pathname === "/login" || pathname === "/admin" || pathname?.startsWith("/admin/")) {
    return null;
  }

  return (
    <header
      style={{ height: HEADER_HEIGHT }}
      className="fixed inset-x-0 top-0 z-[110] flex w-full items-center justify-between gap-2 bg-cerr-navy px-3 py-3 sm:gap-4 sm:px-6"
    >
      {/* Mobil menyu ashıw — NavDrawer tar ekranda dizimnen shıǵarılǵan, usı túyme onı overlay retinde qaytadan kórsetedi */}
      <button
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-blue-100 ring-1 ring-white/15 transition hover:text-white md:hidden"
        aria-label="Menyu"
      >
        <Menu size={18} />
      </button>

      {/* Brend */}
      <Link
        href="/dashboard"
        className="flex shrink-0 items-center gap-2.5"
        onClick={() => selectDistrict(null)}
      >
        <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-cyan via-iris to-magenta">
          <Radio size={18} className="text-void" strokeWidth={2.4} />
        </div>
        <div className="hidden sm:block">
          <div className="text-[14.5px] leading-tight font-bold tracking-tight text-white">
            Qaraqalpaqstan AI
          </div>
          <div className="text-[11.5px] leading-tight text-blue-200">Basqarıw orayı</div>
        </div>
      </Link>

      <div className="flex-1" />

      {/* O'ng tomon */}
      <div className="flex shrink-0 items-center gap-2">
        {selectedDistrict && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => selectDistrict(null)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cyan/12 px-3 py-1.5 text-[12.5px] font-semibold text-cyan ring-1 ring-cyan/35 transition hover:bg-cyan/20"
          >
            <MapPin size={12} />
            {DISTRICT_BY_ID[selectedDistrict]?.name}
            <span className="text-cyan/60">✕</span>
          </motion.button>
        )}
        {role === "admin" && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-[13px] font-semibold text-blue-100 ring-1 ring-white/15 transition hover:text-white hover:ring-cyan/50"
          >
            <ShieldCheck size={14} />
            <span className="hidden md:inline">Admin panel</span>
          </Link>
        )}
        <button
          onClick={() => {
            clearSession();
            router.push("/login");
          }}
          className="grid size-10 place-items-center rounded-xl bg-white/10 text-blue-200 ring-1 ring-white/15 transition hover:text-coral"
          title="Shıǵıw"
          aria-label="Shıǵıw"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}

export function AdminTopBar({ title }: { title: string }) {
  const router = useRouter();
  return (
    <header className="relative z-30 flex shrink-0 flex-wrap items-center gap-4 border-b border-hairline/70 bg-abyss/60 px-6 py-4 backdrop-blur-xl">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-cyan via-iris to-magenta">
          <Radio size={18} className="text-void" strokeWidth={2.4} />
        </div>
        <div>
          <div className="text-[14.5px] leading-tight font-bold tracking-tight text-ink">{title}</div>
          <div className="text-[11.5px] leading-tight text-ink-3">
            Qaraqalpaqstan Respublikası
          </div>
        </div>
      </Link>
      <div className="flex-1" />
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-xl bg-abyss/70 px-3 py-2 text-[13px] font-semibold text-ink-2 ring-1 ring-edge/60 transition hover:text-ink hover:ring-cyan/50"
      >
        <LayoutGrid size={14} />
        <span className="hidden sm:inline">Bas bet</span>
      </Link>
      <button
        onClick={() => {
          clearSession();
          router.push("/login");
        }}
        className="grid size-10 place-items-center rounded-xl bg-abyss/70 text-ink-3 ring-1 ring-edge/60 transition hover:text-coral"
        title="Shıǵıw"
        aria-label="Shıǵıw"
      >
        <LogOut size={15} />
      </button>
    </header>
  );
}
