/** Jadval ma'lumotın Excel (.xlsx) faylǵa aylandırıw hám júklew (klient tárepte). */

import * as XLSX from "xlsx";

export interface ExcelColumn<T> {
  header: string;
  value: (row: T) => string | number | null;
  /** Sanlıq baǵanalar ushın Excel format kodı (mısalı "#,##0.###" yamasa '0.0"%"') */
  numFmt?: string;
}

const MIN_COL_WIDTH = 8;
const MAX_COL_WIDTH = 42;

//: `DataTableColumn.numFmt` ushın ortaq format kodları
export const EXCEL_NUM_FMT = "#,##0.###";
export const EXCEL_PERCENT_FMT = '0.0"%"';
export const EXCEL_SIGNED_PERCENT_FMT = '+0.0"%";-0.0"%"';

export function downloadExcel<T>(
  filename: string,
  columns: ExcelColumn<T>[],
  rows: T[],
): void {
  // Positsiya boyınsha (baǵana atı emes) — eki baǵananıń atı sáykes kelse de
  // dereklik joǵalmaydı
  const body = rows.map((row) => columns.map((c) => c.value(row) ?? ""));
  const sheet = XLSX.utils.aoa_to_sheet([columns.map((c) => c.header), ...body]);

  columns.forEach((col, ci) => {
    if (!col.numFmt) return;
    for (let ri = 0; ri < body.length; ri++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: ri + 1, c: ci })];
      if (cell && cell.t === "n") cell.z = col.numFmt;
    }
  });

  // Baǵana keńligi — sarlawha hám mazmunnıń eń uzın qatarına qarap
  sheet["!cols"] = columns.map((col, ci) => {
    const longest = body.reduce((max, row) => Math.max(max, String(row[ci]).length), col.header.length);
    return { wch: Math.min(Math.max(longest + 2, MIN_COL_WIDTH), MAX_COL_WIDTH) };
  });

  if (rows.length > 0) {
    sheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: body.length, c: columns.length - 1 },
      }),
    };
  }

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Maǵlıwmat");
  XLSX.writeFile(book, filename);
}
