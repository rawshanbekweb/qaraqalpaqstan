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
  const data = rows.map((row) =>
    Object.fromEntries(columns.map((c) => [c.header, c.value(row) ?? ""])),
  );
  const sheet = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.header) });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Maǵlıwmat");
  XLSX.writeFile(book, filename);
}
