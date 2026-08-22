"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { KarakalpakstanMap } from "@/components/map/KarakalpakstanMap";
import { StatsPanel } from "@/components/charts/StatsPanel";
import { warmUpApi } from "@/lib/api";
import { HEADER_HEIGHT, NAV_WIDTH, RAIL_LEFT } from "@/lib/layout";

const RAIL_TOP = 12;

/**
 * Foydalanuvchi paneli.
 *
 * Xarita butun ekranni egallaydi, statistika esa uning ustida suzuvchi
 * shisha panel sifatida turadi. Panel bilan xarita orasidagi bo'shliqda
 * sichqoncha to'g'ridan-to'g'ri xaritaga tegishi kerak, shuning uchun
 * ustki qatlamga `overlay-pass` qo'yilgan.
 *
 * `TopBar` va `NavDrawer` endi global (`layout.tsx`), sonlıqtan bul sahna
 * olardıń tolıq enli/biyikligindegi orınǵa tuzetiledi.
 */
export default function DashboardPage() {
  // Uxlab qolgan backendni oldindan uyg'otamiz (bepul hostingda muhim)
  useEffect(() => {
    warmUpApi();
  }, []);

  return (
    <div
      className="app-shell relative overflow-hidden"
      // Joqarǵı tolıq enli panel hám shep taraftaǵı turaqlı menyu ushın
      // orın ajratıladı — ishki qatlamlar (`inset-0`/`inset-x-0`) usı
      // div'ge salıstırǵanda esaplanadı.
      style={{ marginLeft: NAV_WIDTH, marginTop: HEADER_HEIGHT, height: `calc(100dvh - ${HEADER_HEIGHT}px)` }}
    >
      <AuroraBackground />

      {/* Xarita — eng ostki, lekin to'liq interaktiv qatlam */}
      <div className="absolute inset-0 z-0">
        <KarakalpakstanMap leftInset={0} topInset={RAIL_TOP} showTooltip={false} />
      </div>

      {/* Keng ekran — suzuvchi panellar */}
      <div className="overlay-pass absolute inset-0 z-20 hidden lg:block">
        <motion.section
          className="glass-rail glass-top-glow absolute bottom-3 right-3 overflow-hidden"
          style={{ width: RAIL_LEFT - 24, top: RAIL_TOP }}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <StatsPanel />
        </motion.section>
      </div>

      {/*
        Tor ekran — panellar ustma-ust. Tepada xarita ko'rinib turishi uchun
        ataylab bo'sh joy qoldirilgan; u sichqonchani o'tkazib yuboradi,
        shuning uchun ikkinchi SVG chizish shart emas.
      */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-y-auto lg:hidden">
        <div className="h-[46vh]" aria-hidden />
        <div className="pointer-events-auto space-y-3 p-3">
          <section className="glass-rail glass-top-glow h-[620px] overflow-hidden">
            <StatsPanel />
          </section>
        </div>
      </div>
    </div>
  );
}
