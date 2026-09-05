"use client";

import { AlertTriangle, Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  deleteDirectionDocument,
  directionDocumentsConfigured,
  downloadDirectionDocument,
  listDirectionDocuments,
  PERIOD_LABELS,
  uploadDirectionDocument,
  type DirectionDocument,
  type DirectionPeriod,
} from "@/lib/directionDocuments";
import { getSession } from "@/lib/session";
import { cn, formatDate } from "@/lib/utils";

const NO_SUBSCRIBE = () => () => {};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Bir jónelis bólimi ushın (ata component'ten berilgen) dáwir/jıl kesiminde
 * hújjet dizimi. `ReportSheetPanel`diń astında kórsetiledi — admin fayl
 * qosadı/óshiredi, basqalar tek kóredi hám júklep aladı (huqıq server
 * tárepte `require_admin` menen tekseriledi).
 */
export function DirectionDocuments({
  blockId,
  directionId,
  year,
  period,
  onChanged,
}: {
  blockId: string;
  directionId: string;
  year: number;
  period: DirectionPeriod;
  onChanged?: () => void;
}) {
  const isAdmin = useSyncExternalStore(
    NO_SUBSCRIBE,
    () => getSession()?.role === "admin",
    () => false,
  );
  const [docs, setDocs] = useState<DirectionDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(() => {
    listDirectionDocuments(blockId, year, period)
      .then((rows) => {
        setDocs(rows);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Hújjetler alınbadı"))
      .finally(() => setLoading(false));
  }, [blockId, year, period]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!directionDocumentsConfigured()) return null;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await uploadDirectionDocument({ directionId, blockId, year, period, file });
      reload();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fayl júklenbedi");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(doc: DirectionDocument) {
    setBusy(true);
    setError(null);
    try {
      await deleteDirectionDocument(doc.id);
      setDocs((cur) => cur.filter((d) => d.id !== doc.id));
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hújjet óshirilmedi");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(doc: DirectionDocument) {
    try {
      await downloadDirectionDocument(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hújjet júklep alınbadı");
    }
  }

  return (
    <div className="space-y-3 border-t border-hairline/50 pt-3.5">
      <div className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">
        <FileText size={13} />
        Hújjetler
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-crimson/12 px-3 py-2 ring-1 ring-crimson/30">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-crimson" />
          <span className="text-[12.5px] text-coral">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl bg-abyss/40 px-4 py-4 text-[12.5px] text-ink-3 ring-1 ring-edge/40">
          <Loader2 size={14} className="animate-spin" />
          Júklenbekte…
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-2xl bg-abyss/40 px-4 py-4 text-center ring-1 ring-edge/40">
          <p className="text-[12.5px] text-ink-3">
            Bul dáwir ({PERIOD_LABELS[period]}, {year}) ushın hújjet ele joq.
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl ring-1 ring-edge/50">
          {docs.map((doc, i) => (
            <li
              key={doc.id}
              className={cn("flex items-start gap-2.5 bg-abyss/40 px-3.5 py-2.5", i > 0 && "border-t border-hairline/50")}
            >
              <FileText size={15} className="mt-0.5 shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-ink">
                  {doc.title || doc.filename}
                </div>
                <div className="truncate text-[11.5px] text-ink-3">
                  {doc.uploaded_by || "—"} · {formatDate(doc.created_at.slice(0, 10))} ·{" "}
                  {formatSize(doc.size_bytes)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleDownload(doc)}
                aria-label="Júklep alıw"
                title="Júklep alıw"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 transition hover:bg-raised/60 hover:text-cyan"
              >
                <Download size={14} />
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => void handleDelete(doc)}
                  disabled={busy}
                  aria-label="Óshiriw"
                  title="Óshiriw"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 transition hover:bg-crimson/15 hover:text-crimson disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-abyss/70 px-3 py-2 text-[12.5px] text-ink-2 ring-1 ring-edge/60 transition hover:text-ink disabled:opacity-50"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            Fayl qosıw
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}
