import { HEADER_HEIGHT, NAV_WIDTH } from "@/lib/layout";

/**
 * KPI / Topshiriqlar / Tumanlar sahifaları.
 *
 * `NavDrawer` barlıq betlerde turaqlı bağаnalı menyu retinde shep jaqta,
 * `TopBar` bolsa tolıq enli joqarǵı panel retinde kórinedi — mazmun sol
 * hám joqarı muǵdarǵa itereledi.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        paddingLeft: `calc(${NAV_WIDTH}px + 2rem)`,
        paddingTop: `calc(${HEADER_HEIGHT}px + 2rem)`,
      }}
      className="h-screen w-full overflow-y-auto bg-cerr-bg p-8"
    >
      {children}
    </main>
  );
}
