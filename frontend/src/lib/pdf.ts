"use client";

/** Jadval maǵlıwmatın PDF etip basıp shıǵarıw/saqlaw (klient tárepte). */

export interface PdfColumn<T> {
  header: string;
  value: (row: T) => string | number | null;
  align?: "left" | "right";
}

/**
 * Jańa penshereде taza, basıp shıǵarıwǵa arналǵan HTML jasap, brauzerdiń
 * óz "PDF etip saqlaw" diалогын shaqıradı.
 *
 * `jsPDF` sıyaqlı kitapxanalar ataylı isletilmeydi: olardıń dástúrli
 * qarpları (Helvetica h.t.b.) qaraqalpaq diakritikalarin (ǵ, ń, ı, ó, ú)
 * durıs kórsete almaydı — arнаулы qarp qosıw bolsa keregínен artıq
 * salmaq hám qátelik qáwipin qosar edi. Brauzerdiń óz basıp shıǵarıw
 * dvigateli bolsa HTML'di sistemadaǵı qarplar menen tuwrı kórsetedi.
 */
export function printTable<T>(
  title: string,
  subtitle: string,
  columns: PdfColumn<T>[],
  rows: T[],
): void {
  const win = window.open("", "_blank", "width=1000,height=800");
  if (!win) {
    window.alert(
      "Jańa penshere ashılmadı — brauzer popup'lardı bloklaǵan bolıwı múmkin, sazlamalardan ruxsat beriń.",
    );
    return;
  }
  const doc = win.document;
  doc.title = title;

  const style = doc.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Arial, sans-serif; margin: 28px; color: #101a33; }
    h1 { font-size: 17px; margin: 0 0 2px; }
    .subtitle { font-size: 11.5px; color: #43507a; margin: 0 0 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    th, td { border: 1px solid #c7d1e6; padding: 5px 8px; text-align: left; }
    th { background: #eef1f8; font-weight: 600; text-transform: uppercase; letter-spacing: .02em; font-size: 9.5px; }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    @media print {
      @page { margin: 14mm; }
    }
  `;
  doc.head.appendChild(style);

  const h1 = doc.createElement("h1");
  h1.textContent = title;
  doc.body.appendChild(h1);

  const sub = doc.createElement("p");
  sub.className = "subtitle";
  sub.textContent = subtitle;
  doc.body.appendChild(sub);

  const table = doc.createElement("table");

  const thead = doc.createElement("thead");
  const headRow = doc.createElement("tr");
  for (const c of columns) {
    const th = doc.createElement("th");
    th.textContent = c.header;
    if (c.align === "right") th.className = "num";
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = doc.createElement("tbody");
  for (const row of rows) {
    const tr = doc.createElement("tr");
    for (const c of columns) {
      const td = doc.createElement("td");
      const v = c.value(row);
      td.textContent = v === null || v === undefined || v === "" ? "—" : String(v);
      if (c.align === "right") td.className = "num";
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  doc.body.appendChild(table);

  win.focus();
  // Kishi keshiktiriw — brauzer stildi tolıq qollanıp úlgersin, bolmasa
  // print preview stilsiz (formatlanbaǵan) kóriner edi
  setTimeout(() => win.print(), 150);
}
