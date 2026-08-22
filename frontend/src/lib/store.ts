"use client";

import { create } from "zustand";

interface DashboardState {
  // ── Filtrlar ──
  /**
   * Tayanch soha kodi (`sanaat`, `awil_xojaligi`, ...) — backend
   * `/api/stats/meta` qaytaradigan ro'yxatdan. "Barchasi" varianti yo'q:
   * tonna bilan mlrd so'mni qo'shib bo'lmaydi, xarita esa har doim bitta
   * ko'rsatkichni bo'yaydi.
   */
  moduleId: string;
  /** 0 — yillar ro'yxati hali kelmagan (meta yuklanmoqda). */
  year: number;
  setModule: (m: string) => void;
  setYear: (y: number) => void;

  // ── Xarita ──
  hoveredDistrict: string | null;
  selectedDistrict: string | null;
  /** Juwmaq qatoridan kelib chiqib yoritiladigan tumanlar */
  highlighted: string[];
  setHovered: (id: string | null) => void;
  selectDistrict: (id: string | null) => void;
  setHighlighted: (ids: string[]) => void;

  // ── Chuqur fokus ──
  /** Bitta hudud tanlanganda yoqiladi: xarita ortga chekinib faqat shu hududga qaraydi. */
  focusMode: boolean;
  focusDistrict: (id: string) => void;
  exitFocus: () => void;
}

export const useDashboard = create<DashboardState>((set) => ({
  moduleId: "sanaat",
  year: 0,
  setModule: (moduleId) => set({ moduleId }),
  setYear: (year) => set({ year }),

  hoveredDistrict: null,
  selectedDistrict: null,
  highlighted: [],
  setHovered: (hoveredDistrict) => set({ hoveredDistrict }),
  // Tumandan voz kechilsa chuqur fokus ham o'z-o'zidan yopiladi
  selectDistrict: (selectedDistrict) =>
    set(selectedDistrict ? { selectedDistrict } : { selectedDistrict: null, focusMode: false }),
  setHighlighted: (highlighted) => set({ highlighted }),

  focusMode: false,
  focusDistrict: (id) => set({ selectedDistrict: id, highlighted: [id], focusMode: true }),
  exitFocus: () => set({ focusMode: false }),
}));
