import { HEADER_HEIGHT } from "@/lib/layout";

/**
 * KPI / Topshiriqlar / Tumanlar sahifaları.
 *
 * `NavDrawer` `md`den baslap turaqlı bağаnalı menyu retinde shep jaqta
 * kórinedi, sonlıqtan mazmun sol jaqqa `md:pl-[292px]` menen iteriledi
 * (260px NAV_WIDTH + 2rem boslıq — `lib/layout.ts`dağı `NAV_WIDTH` penen
 * qol menen sáykes ustalıp turıladı). Tar ekranda menyu overlay retinde
 * ashıladı (mazmundı itermeydi), sonlıqtan bul jerde sol jaqtan orın
 * ajratılmaydı. `TopBar` bolsa hár qıylı enlikte tolıq enli joqarǵı
 * panel retinde kórinedi — mazmun joqarı muǵdarǵa itereledi.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{ paddingTop: `calc(${HEADER_HEIGHT}px + 1.25rem)` }}
      className="h-screen w-full overflow-y-auto bg-cerr-bg p-4 pb-8 sm:p-6 md:p-8 md:pl-[292px]"
    >
      {children}
    </main>
  );
}
