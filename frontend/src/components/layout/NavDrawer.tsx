"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { BarChart3, CheckSquare, MapPin, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { HEADER_HEIGHT, NAV_WIDTH } from "@/lib/layout";
import { useDashboard } from "@/lib/store";

const NAV_ITEMS = [
  { href: "/dashboard", label: "KPI", icon: BarChart3 },
  { href: "/tasks", label: "Tapsırmalar", icon: CheckSquare },
  { href: "/districts", label: "Tumanlar", icon: MapPin },
  { href: "/jadval", label: "Jadval", icon: Table2 },
];

/**
 * `md` hám úlkenirek ekrannda — turaqlı bağаnalı menyu, ekrannıń shep
 * jağında hámishe kórinip turadı, tolıq enli `TopBar`diń ástinde
 * baslanadı. Tarrağ ekranda (telefon) usı еni ushın orın joq, sonlıqtan
 * dizimnen shığarılады: `TopBar`daǵı gамburger túymesi basılğanda ǵana
 * qara fon (backdrop) penen birge overlay retinde ashıladı, sırtqa
 * basılsa yamasa sahifa almassa jabıladı. `/login` ózinshe kirüw beti
 * (sessiya joq), `/admin` bolsa óz `AdminTopBar` naviqasiyasına iye —
 * ekewi de bul menyu ushın orın ajratpaǵan, sonlıqtan bul jerde
 * kórsetilmeydi.
 */
export function NavDrawer() {
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen } = useDashboard();

  // Sahifa almasqanda mobil menyu ashıq qalmasın
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  if (pathname === "/login" || pathname === "/admin" || pathname?.startsWith("/admin/")) {
    return null;
  }

  return (
    <>
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-[99] bg-black/50 md:hidden"
          aria-hidden="true"
        />
      )}
      <aside
        style={{ width: NAV_WIDTH, top: HEADER_HEIGHT }}
        className={cn(
          "fixed bottom-0 left-0 z-[100] flex flex-col bg-cerr-navy text-white shadow-2xl transition-transform duration-200 md:translate-x-0",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full",
        )}
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
    </>
  );
}
