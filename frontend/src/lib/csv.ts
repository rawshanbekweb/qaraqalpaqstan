/** Jadval ma'lumotын CSV faylǵa aylandırıw hám júklew (klient tárepte). */

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null;
}

function escapeCell(v: string | number | null): string {
  if (v === null) return "";
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  // Ajratqısh — ";": kóplegen aymaqta Excel vergul ornına usını kútedi
  // (ondalıq bólgish úshin vergul isletiletuǵın lokalizatsiya).
  const lines = [columns.map((c) => escapeCell(c.header)).join(";")];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(c.value(row))).join(";"));
  }
  return lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM — Excel'de kirill/qaraqalpaq húrpleri buzılmay ashılıwı ushın
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
