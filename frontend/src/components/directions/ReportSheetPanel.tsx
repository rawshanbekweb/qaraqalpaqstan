"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import {
  downloadReportSheet,
  emptyReportSheet,
  loadReportSheet,
  parseWorkbookFile,
  saveReportSheet,
  type ReportSheet,
} from "@/lib/directionReports";
import { getSession } from "@/lib/session";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";

const NO_SUBSCRIBE = () => () => {};

/**
 * Bir jónelis bólimi ushın "excel kórinisindegi" hisabat.
 *
 * Backend házirshe joq — jadval brauzerdiń `localStorage`ında saqlanadı
 * (`lib/directionReports.ts`). Admin qolman toltıra yamasa Excel fayl
 * júkley aladı, kóriwshi tek kóredi hám eksportqa aladı.
 */
export function ReportSheetPanel({ blockId, exportName }: { blockId: string; exportName: string }) {
  const isAdmin = useSyncExternalStore(
    NO_SUBSCRIBE,
    () => getSession()?.role === "admin",
    () => false,
  );
  const [sheet, setSheet] = useState<ReportSheet | null>(() => loadReportSheet(blockId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const persist = useCallback(
    (next: Omit<ReportSheet, "updatedAt">) => {
      setSheet(saveReportSheet(blockId, next));
    },
    [blockId],
  );

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const parsed = await parseWorkbookFile(file);
      persist(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fayl oqılmadı");
    } finally {
      setBusy(false);
    }
  }

  function startEmpty() {
    persist(emptyReportSheet());
  }

  function setCell(ri: number, ci: number, value: string) {
    if (!sheet) return;
    const rows = sheet.rows.map((row, i) =>
      i === ri ? row.map((c, j) => (j === ci ? value : c)) : row,
    );
    persist({ columns: sheet.columns, rows });
  }

  function setHeader(ci: number, value: string) {
    if (!sheet) return;
    const columns = sheet.columns.map((c, i) => (i === ci ? value : c));
    persist({ columns, rows: sheet.rows });
  }

  function addRow() {
    if (!sheet) return;
    persist({ columns: sheet.columns, rows: [...sheet.rows, sheet.columns.map(() => "")] });
  }

  function addColumn() {
    if (!sheet) return;
    persist({
      columns: [...sheet.columns, `Baǵana ${sheet.columns.length + 1}`],
      rows: sheet.rows.map((r) => [...r, ""]),
    });
  }

  function removeRow(ri: number) {
    if (!sheet) return;
    persist({ columns: sheet.columns, rows: sheet.rows.filter((_, i) => i !== ri) });
  }

  function removeColumn(ci: number) {
    if (!sheet) return;
    persist({
      columns: sheet.columns.filter((_, i) => i !== ci),
      rows: sheet.rows.map((r) => r.filter((_, i) => i !== ci)),
    });
  }

  if (!sheet) {
    return (
      <div className="rounded-2xl bg-abyss/50 p-5 text-center ring-1 ring-edge/40">
        <FileSpreadsheet size={22} className="mx-auto mb-2 text-ink-3" />
        <p className="text-[13.5px] text-ink-3">Bul bólim ushın hisabat ele engizilmegen.</p>
        {isAdmin ? (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={startEmpty} variant="outline">
              <Plus size={14} />
              Qolman toltırıw
            </Button>
            <Button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Excel júklew
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        ) : (
          <p className="mt-1 text-[12px] text-ink-3">Admin panelinen jadval qosılǵanda usı jerde kórinedi.</p>
        )}
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-crimson/12 px-3 py-2 text-left ring-1 ring-crimson/30">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-crimson" />
            <span className="text-[12.5px] text-coral">{error}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="space-y-3"
      onDragOver={(e) => {
        if (!isAdmin) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (!isAdmin) return;
        e.preventDefault();
        setDragging(false);
        void handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-ink-3">
          Sońǵı jańalanıw: {formatDate(sheet.updatedAt.slice(0, 10))}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => downloadReportSheet(`${exportName}.xlsx`, sheet)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-abyss/70 px-3 py-2 text-[12.5px] text-ink-2 ring-1 ring-edge/60 transition hover:text-ink"
        >
          <Download size={13} />
          Excel
        </button>
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-abyss/70 px-3 py-2 text-[12.5px] text-ink-2 ring-1 ring-edge/60 transition hover:text-ink disabled:opacity-50"
              title="Jańa Excel fayl júklep, jadvaldı almastırıw"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              Qayta júklew
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={addColumn}
              className="inline-flex items-center gap-1.5 rounded-xl bg-abyss/70 px-3 py-2 text-[12.5px] text-ink-2 ring-1 ring-edge/60 transition hover:text-ink"
            >
              <Plus size={13} />
              Baǵana
            </button>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan/12 px-3 py-2 text-[12.5px] font-medium text-cyan ring-1 ring-cyan/30 transition hover:bg-cyan/20"
            >
              <Plus size={13} />
              Qatar
            </button>
          </>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 rounded-xl bg-crimson/12 px-3 py-2 ring-1 ring-crimson/30"
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-crimson" />
            <span className="text-[12.5px] text-coral">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "thin-scroll overflow-x-auto rounded-2xl ring-1 transition",
          dragging ? "ring-cyan/60 bg-cyan/5" : "ring-edge/50",
        )}
      >
        <table className="w-full min-w-[520px] border-collapse text-[13px]">
          <thead className="bg-abyss/70">
            <tr>
              {sheet.columns.map((col, ci) => (
                <th key={ci} className="px-3 py-2.5 text-left text-[11.5px] font-semibold tracking-wide text-ink-3 uppercase">
                  {isAdmin ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={col}
                        onChange={(e) => setHeader(ci, e.target.value)}
                        className="w-full min-w-[90px] rounded-md bg-transparent px-1 py-0.5 uppercase outline-none focus:bg-raised/60"
                      />
                      {sheet.columns.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColumn(ci)}
                          aria-label="Baǵananı óshiriw"
                          className="shrink-0 text-ink-3 hover:text-coral"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  ) : (
                    col
                  )}
                </th>
              ))}
              {isAdmin && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, ri) => (
              <tr key={ri} className="border-t border-hairline/50 hover:bg-raised/25">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1.5">
                    {isAdmin ? (
                      <input
                        value={cell ?? ""}
                        onChange={(e) => setCell(ri, ci, e.target.value)}
                        className="w-full min-w-[90px] rounded-md bg-transparent px-1 py-1 text-ink-2 outline-none focus:bg-raised/60 focus:text-ink"
                      />
                    ) : (
                      <span className="text-ink-2">{cell === null || cell === "" ? "—" : cell}</span>
                    )}
                  </td>
                ))}
                {isAdmin && (
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(ri)}
                      aria-label="Qatardı óshiriw"
                      className="grid size-6 place-items-center rounded text-ink-3 transition hover:text-coral"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {sheet.rows.length === 0 && (
              <tr>
                <td colSpan={sheet.columns.length + (isAdmin ? 1 : 0)} className="px-3 py-6 text-center text-ink-3">
                  Qatar joq{isAdmin ? " — «Qatar» túymesi menen qosıń" : ""}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
