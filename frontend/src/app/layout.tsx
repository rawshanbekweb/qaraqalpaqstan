import { NavDrawer } from "@/components/layout/NavDrawer";
import { TopBar } from "@/components/layout/TopBar";
import "./globals.css";

export const metadata = {
  title: "Qaraqalpaqstan AI — Monitoring",
  description: "Ekonomikalıq monitoring hám AI analitika platforması",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="kaa">
      <body className="bg-cerr-bg text-slate-800 antialiased">
        <TopBar />
        <NavDrawer />
        {children}
      </body>
    </html>
  );
}
