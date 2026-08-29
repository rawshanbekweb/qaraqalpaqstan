"use client";

import { AlertTriangle, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { downloadExport } from "@/lib/admin";
import type { StatsCategory } from "@/lib/stats";
import { Button, Field, Select } from "@/components/ui/primitives";

/**
 * Bazadagi statistikani Excel/CSV qilib yuklab olish.
 *
 * `jadval` sahifasida bitta ko'rsatkichni CSV qilib olish bor edi —
 * bul yerde bólim (yamasa butın baza) birden eksport etiledi, admin
 * ma'lumotni offline tekshirish yoki arxivlash uchun.
 */
export function DataExport({ categories }: { categories: StatsCategory[] }) {
  const [categoryId, setCategoryId] = useState("");
  const [fmt, setFmt] = useState<"xlsx" | "csv">("xlsx");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await downloadExport({ category_id: categoryId || undefined, fmt });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eksport ámelge aspadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2.5 rounded-2xl bg-abyss/50 p-3.5 ring-1 ring-edge/40">
      <Field label="Bólim" className="min-w-[200px] flex-1">
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Barlıq maǵlıwmat</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Format" className="w-36">
        <Select value={fmt} onChange={(e) => setFmt(e.target.value as "xlsx" | "csv")}>
          <option value="xlsx">Excel (.xlsx)</option>
          <option value="csv">CSV</option>
        </Select>
      </Field>
      <Button type="button" onClick={run} disabled={busy}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {busy ? "Tayarlanbekte…" : "Júklep alıw"}
      </Button>
      {error && (
        <span className="flex items-center gap-1.5 text-[12.5px] text-coral">
          <AlertTriangle size={13} className="shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}
