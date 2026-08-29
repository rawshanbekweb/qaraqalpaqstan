/** Jadval ma'lumotın Excel (.xlsx) faylǵa aylandırıw hám júklew (klient tárepte). */

import * as XLSX from "xlsx";

export interface ExcelColumn<T> {
  header: string;
  value: (row: T) => string | number | null;
}

export function downloadExcel<T>(
  filename: string,
  columns: ExcelColumn<T>[],
  rows: T[],
): void {
  // Positsiya boyınsha (baǵana atı emes) — eki baǵananıń atı sáykes kelse de
  // dereklik joǵalmaydı
  const aoa = [
    columns.map((c) => c.header),
    ...rows.map((row) => columns.map((c) => c.value(row) ?? "")),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Maǵlıwmat");
  XLSX.writeFile(book, filename);
}
