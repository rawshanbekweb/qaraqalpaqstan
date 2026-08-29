"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Download, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { downloadExcel } from "@/lib/excel";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/primitives";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  /** Saralanadıǵın bolsa — usı funktsiyanıń nátiyjesi boyınsha (san yamasa satır) */
  sortValue?: (row: T) => number | string | null;
  /** Qidiriw ushın tekst — bolmasa `sortValue` isletiledi */
  searchValue?: (row: T) => string;
  /** Excel eksportqa jazılatuǵın "tap" qıymet — bolmasa `sortValue` isletiledi */
  excelValue?: (row: T) => string | number | null;
  /** Excel eksportta sanlıq baǵanaǵа qollanılatuǵın format kodı (mısalı "#,##0.###") */
  numFmt?: string;
  render: (row: T) => ReactNode;
  hideByDefault?: boolean;
}

/**
 * Qayta isletiletuǵın jadval: saralaw, qidiriw, ustun jasırıw/kórsetiw hám
 * Excel eksport. Bos/`null` mánisler hámishe "—" — hesh qashan "0"ǵa
 * aylanbaydı (`ChartRenderer` TableView hám `IndicatorBrowser` menen bir
 * uslub).
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  searchable = true,
  searchPlaceholder = "Izlew…",
  onRowClick,
  exportName,
  emptyLabel = "Hesh nárse tabılmadı",
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  /** Berilse — eksport tugması kórinedi, fayl atı usı bolıp saqlanadı (`.xlsx` avtomatik) */
  exportName?: string;
  emptyLabel?: string;
}) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.hideByDefault).map((c) => c.key)),
  );
  const [colMenuOpen, setColMenuOpen] = useState(false);

  const visibleColumns = columns.filter((c) => !hidden.has(c.key));

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      columns.some((c) => {
        const text = c.searchValue ? c.searchValue(r) : String(c.sortValue?.(r) ?? "");
        return text.toLowerCase().includes(needle);
      }),
    );
  }, [rows, q, columns]);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const withVal = filtered.map((r) => ({ r, v: col.sortValue!(r) }));
    withVal.sort((a, b) => {
      if (a.v === null && b.v === null) return 0;
      if (a.v === null) return 1;
      if (b.v === null) return -1;
      if (typeof a.v === "string" || typeof b.v === "string") {
        return String(a.v).localeCompare(String(b.v)) * sortDir;
      }
      return (a.v - b.v) * sortDir;
    });
    return withVal.map((x) => x.r);
  }, [filtered, sortKey, sortDir, columns]);

  function toggleSort(col: DataTableColumn<T>) {
    if (!col.sortValue) return;
    if (sortKey !== col.key) {
      setSortKey(col.key);
      setSortDir(1);
    } else {
      setSortDir((d) => (d === 1 ? -1 : 1));
    }
  }

  function toggleColumn(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function exportExcel() {
    downloadExcel(
      `${exportName ?? "jadval"}.xlsx`,
      visibleColumns.map((c) => ({
        header: c.header,
        value: (r: T) => (c.excelValue ?? c.sortValue)?.(r) ?? null,
        numFmt: c.numFmt,
      })),
      sorted,
    );
  }

  return (
    <div className="space-y-2.5">
      {(searchable || exportName) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <div className="relative min-w-[180px] flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
              />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder}
                className="py-2 pl-9 text-[12.5px]"
              />
            </div>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setColMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-abyss/70 px-3 py-2 text-[12.5px] text-ink-2 ring-1 ring-edge/60 transition hover:text-ink"
            >
              <Columns3 size={13} />
              Ustunlar
            </button>
            {colMenuOpen && (
              <div className="glass absolute top-full right-0 z-20 mt-1.5 w-52 space-y-1 rounded-xl p-2">
                {columns.map((c) => (
                  <label
                    key={c.key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] text-ink-2 hover:bg-raised/50"
                  >
                    <input
                      type="checkbox"
                      checked={!hidden.has(c.key)}
                      onChange={() => toggleColumn(c.key)}
                      className="size-3.5 accent-cyan"
                    />
                    {c.header}
                  </label>
                ))}
              </div>
            )}
          </div>
          {exportName && (
            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex items-center gap-1.5 rounded-xl bg-abyss/70 px-3 py-2 text-[12.5px] text-ink-2 ring-1 ring-edge/60 transition hover:text-ink"
              title="Excel sıpatında júklep alıw"
            >
              <Download size={13} />
              Excel
            </button>
          )}
        </div>
      )}

      <div className="thin-scroll overflow-x-auto rounded-2xl ring-1 ring-edge/50">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead className="bg-abyss/70">
            <tr>
              {visibleColumns.map((c) => {
                const active = sortKey === c.key;
                const Icon = active ? (sortDir === 1 ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c)}
                    className={cn(
                      "px-3 py-2.5 text-[11.5px] font-semibold tracking-wider text-ink-3 uppercase",
                      c.align === "right" ? "text-right" : "text-left",
                      c.sortValue && "cursor-pointer select-none hover:text-ink-2",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        c.align === "right" && "flex-row-reverse",
                      )}
                    >
                      {c.header}
                      {c.sortValue && (
                        <Icon size={11} className={active ? "text-cyan" : "text-ink-3/60"} />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-t border-hairline/50 transition",
                  onRowClick ? "cursor-pointer hover:bg-raised/40" : "hover:bg-raised/25",
                )}
              >
                {visibleColumns.map((c) => (
                  <td
                    key={c.key}
                    className={cn("px-3 py-2", c.align === "right" ? "text-right" : "text-left")}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length} className="px-3 py-6 text-center text-ink-3">
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Bos/`null` sanni "—" ǵa aylandıradı — jadval katakshelerinde ortaq isletiledi. */
export function cellNum(v: number | null | undefined, fmt: (n: number) => string): ReactNode {
  if (v === null || v === undefined) return <span className="text-ink-3">—</span>;
  return <span className="tnum">{fmt(v)}</span>;
}
