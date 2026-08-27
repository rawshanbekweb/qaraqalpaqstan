"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CheckSquare, MapPin, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { HEADER_HEIGHT, NAV_WIDTH } from "@/lib/layout";

const NAV_ITEMS = [
  { href: "/dashboard", label: "KPI", icon: BarChart3 },
  { href: "/tasks", label: "Tapsırmalar", icon: CheckSquare },
  { href: "/districts", label: "Tumanlar", icon: MapPin },
  { href: "/jadval", label: "Jadval", icon: Table2 },
];

/**
 * Turaqlı bağаnalı menyu — dashboard betlerinde ekrannıń shep jağında
 * hámishe kórinip turadı, tolıq enli `TopBar`diń ástinde baslanadı (logo
 * endi sol jerde, bul jerde qaytalanbaydı). `/login` ózinshe kirüw beti
 * (sessiya joq), `/admin` bolsa óz `AdminTopBar` naviqasiyasına iye —
 * ekewi de bul menyu ushın orın ajratpaǵan, sonlıqtan bul jerde
 * kórsetilmeydi.
 */
export function NavDrawer() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/admin" || pathname?.startsWith("/admin/")) {
    return null;
  }

  return (
    <aside
      style={{ width: NAV_WIDTH, top: HEADER_HEIGHT }}
      className="fixed bottom-0 left-0 z-[100] flex flex-col bg-cerr-navy text-white shadow-2xl"
    >
      <nav className="flex flex-1 flex-col gap-2 p-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-cyan/20 text-white ring-1 ring-cyan/40"
                  : "text-sky-100 hover:bg-white/10",
              )}
            >
              <Icon size={21} className={active ? "text-cyan" : "text-blue-400"} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
