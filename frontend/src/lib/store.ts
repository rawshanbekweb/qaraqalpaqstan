"use client";

import { create } from "zustand";

interface DashboardState {
  // ── Filtrlar ──
  /**
   * Tayanch soha kodi (`sanaat`, `awil_xojaligi`, ...) — backend
   * `/api/stats/meta` qaytaradigan ro'yxatdan. "Barchasi" varianti yo'q:
   * tonna bilan mlrd so'mni qo'shib bo'lmaydi.
   */
  moduleId: string;
  /** 0 — yillar ro'yxati hali kelmagan (meta yuklanmoqda). */
  year: number;
  setModule: (m: string) => void;
  setYear: (y: number) => void;

  // ── Tuman tańlaw ──
  /** KPI sahifasında grafiklerdi bir tumanǵa tarlaw ushın ulanadı. */
  selectedDistrict: string | null;
  selectDistrict: (id: string | null) => void;

  // ── Mobil naviqasiya ──
  /** Tar ekranda `NavDrawer` háreket etpeydi, sonlıqtan overlay retinde ashıladı-jabıladı. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

export const useDashboard = create<DashboardState>((set) => ({
  moduleId: "sanaat",
  year: 0,
  setModule: (moduleId) => set({ moduleId }),
  setYear: (year) => set({ year }),

  selectedDistrict: null,
  selectDistrict: (selectedDistrict) => set({ selectedDistrict }),

  mobileNavOpen: false,
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
}));
