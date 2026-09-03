"use client";

import { motion } from "motion/react";
import { AlertTriangle, Link2, Link2Off, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { bulkSetIndicatorModule, setIndicatorModule, type SummaryModule } from "@/lib/admin";
import { clearStatsCache, useStats, type IndicatorBrief, type StatsCategory } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { Button, Input, Select } from "@/components/ui/primitives";

const PER_PAGE = 25;

/**
 * 1084 ko'rsatkich ustidan qidiruv va tayanch sohaga biriktirish.
 *
 * "Tayanch" ko'rsatkich — xarita va bosh panel ishlatadigan ko'rsatkich.
 * Bitta sohaga bir nechtasi biriktirilgan bo'lsa, tizim ular orasidan
 * rayon kesimi bor HAJM ko'rsatkichini tanlaydi (o'sish sur'atini emas).
 * Boshqasini tayanch qilish uchun raqibining biriktirishini uzish kerak.
 */
export function IndicatorBrowser({
  categories,
  modules,
  onChanged,
}: {
  categories: StatsCategory[];
  modules: SummaryModule[];
  onChanged: () => void;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [districtsOnly, setDistrictsOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkModule, setBulkModule] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  // Har harfda so'rov ketmasin. Sahifa raqami ham shu yerda nolga
  // qaytadi — yangi qidiruvda 5-sahifada turib qolish mumkin emas.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q.trim());
      setPage(0);
      // Filtr ózgerdi — tańlanǵanlar endi ekranda joq bolıwı múmkin
      setSelected(new Set());
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, error: fetchError } = useStats<{
    total: number;
    items: IndicatorBrief[];
  }>("/indicators", {
    q: debounced || undefined,
    category_id: categoryId || undefined,
    has_districts: districtsOnly ? "true" : undefined,
    limit: PER_PAGE,
    offset: page * PER_PAGE,
    // Biriktirish o'zgargach keshni chetlab o'tish uchun
    v: version || undefined,
  });

  const primaryIds = useMemo(
    () => new Set(modules.map((m) => m.indicator_id)),
    [modules],
  );

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const pageItems = data?.items ?? [];

  async function toggle(item: IndicatorBrief, module: string | null) {
    setBusyId(item.id);
    setError(null);
    try {
      await setIndicatorModule(item.id, module);
      clearStatsCache();
      setVersion((v) => v + 1);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ózgeris saqlanbadı");
    } finally {
      setBusyId(null);
    }
  }

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((i) => selected.has(i.id));

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageItems.forEach((i) => next.delete(i.id));
      else pageItems.forEach((i) => next.add(i.id));
      return next;
    });
  }

  async function applyBulk() {
    if (selected.size === 0) return;
    setBulkBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await bulkSetIndicatorModule(Array.from(selected), bulkModule || null);
      clearStatsCache();
      setVersion((v) => v + 1);
      onChanged();
      setSelected(new Set());
      if (res.skipped > 0) {
        setNote(`${res.updated} kórsetkish biriktirildi, ${res.skipped} ótkerip jiberildi — rayon kesimi joq`);
      } else {
        setNote(`${res.updated} kórsetkish biriktirildi`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ózgeris saqlanbadı");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kórsetkish atı boyınsha izlew…"
            className="pl-9"
          />
        </div>

        <Select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(0);
            setSelected(new Set());
          }}
          className="w-auto min-w-[180px]"
        >
          <option value="">Barlıq bólimler</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.indicators})
            </option>
          ))}
        </Select>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-abyss/70 px-3 py-2.5 text-[13px] text-ink-2 ring-1 ring-edge/60">
          <input
            type="checkbox"
            checked={districtsOnly}
            onChange={(e) => {
              setDistrictsOnly(e.target.checked);
              setPage(0);
              setSelected(new Set());
            }}
            className="size-3.5 accent-cyan"
          />
          Tek rayon kesimi bar
        </label>
      </div>

      {(error || fetchError) && (
        <div className="flex items-start gap-2 rounded-xl bg-crimson/12 px-3 py-2.5 ring-1 ring-crimson/30">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-crimson" />
          <span className="text-[13px] text-coral">
            {error || `Kórsetkishler dizimi júklenbedi: ${fetchError?.message}`}
          </span>
        </div>
      )}

      {note && !error && (
        <div className="flex items-start justify-between gap-2 rounded-xl bg-mint/10 px-3 py-2.5 ring-1 ring-mint/25">
          <span className="text-[13px] text-mint">{note}</span>
          <button onClick={() => setNote(null)} aria-label="Jabıw" className="text-ink-3 hover:text-ink">
            <X size={13} />
          </button>
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-cyan/8 px-3.5 py-2.5 ring-1 ring-cyan/25">
          <span className="text-[13px] font-medium text-ink">
            {selected.size} kórsetkish tańlandı
          </span>
          <div className="flex-1" />
          <Select
            value={bulkModule}
            onChange={(e) => setBulkModule(e.target.value)}
            className="w-auto min-w-[200px]"
            disabled={bulkBusy}
          >
            <option value="">— biriktiriwdi uziw —</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          <Button type="button" onClick={applyBulk} disabled={bulkBusy}>
            {bulkBusy ? <Loader2 size={14} className="animate-spin" /> : null}
            Qollanıw
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSelected(new Set())} disabled={bulkBusy}>
            Biykarlaw
          </Button>
        </div>
      )}

      <div className="thin-scroll overflow-x-auto rounded-2xl ring-1 ring-edge/50">
        <table className="w-full min-w-[900px] border-collapse text-[13px]">
          <thead className="bg-abyss/70">
            <tr>
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAllOnPage}
                  className="size-3.5 accent-cyan"
                  aria-label="Betteginiń bárin tańlaw"
                />
              </th>
              {["Kórsetkish", "Ólshem", "Rayon kesimi", "Tayanch taraw", ""].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left text-[11.5px] font-semibold tracking-wider text-ink-3 uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((item, i) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.012, 0.25) }}
                className={cn(
                  "border-t border-hairline/50 transition hover:bg-raised/35",
                  selected.has(item.id) && "bg-cyan/6",
                )}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelected(item.id)}
                    className="size-3.5 accent-cyan"
                    aria-label={`${item.name} tańlaw`}
                  />
                </td>
                <td className="max-w-[380px] px-3 py-2">
                  <div className="truncate text-ink" title={item.name}>
                    {item.name}
                  </div>
                  <div className="truncate text-[11.5px] text-ink-3" title={item.source}>
                    {item.source}
                  </div>
                </td>
                <td className="max-w-[160px] truncate px-3 py-2 text-ink-3" title={item.unit}>
                  {item.unit || "—"}
                </td>
                <td className="px-3 py-2">
                  <span className={item.has_districts ? "text-mint" : "text-ink-3"}>
                    {item.has_districts ? "bar" : "joq"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <ModuleSelect
                    item={item}
                    modules={modules}
                    disabled={busyId === item.id}
                    onChange={(m) => toggle(item, m)}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  {busyId === item.id ? (
                    <Loader2 size={14} className="ml-auto animate-spin text-ink-3" />
                  ) : primaryIds.has(item.id) ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-cyan/12 px-2 py-0.5 text-[11.5px] font-semibold text-cyan ring-1 ring-cyan/30"
                      title="Karta hám bas panel usı kórsetkishti isletedi"
                    >
                      <Link2 size={11} />
                      tiykarǵı
                    </span>
                  ) : item.module ? (
                    <span
                      className="inline-flex items-center gap-1 text-[11.5px] text-ink-3"
                      title="Tarawǵa biriktirilgen, biraq tiykarǵı sıpatında basqası saylanǵan"
                    >
                      <Link2Off size={11} />
                      rezerv
                    </span>
                  ) : null}
                </td>
              </motion.tr>
            ))}

            {!loading && (data?.items.length ?? 0) === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-ink-3">
                  {fetchError ? "Maǵlıwmat júklenbedi" : "Hesh nárse tabılmadı"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[12.5px] text-ink-3">
          {loading ? "Izlenbekte…" : `${total} kórsetkishten ${total === 0 ? 0 : page * PER_PAGE + 1}–${Math.min(total, (page + 1) * PER_PAGE)}`}
        </span>
        <div className="flex-1" />
        <PageBtn disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
          Aldıńǵı
        </PageBtn>
        <PageBtn
          disabled={page >= pages - 1}
          onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
        >
          Keyingi
        </PageBtn>
      </div>
    </div>
  );
}

function ModuleSelect({
  item,
  modules,
  disabled,
  onChange,
}: {
  item: IndicatorBrief;
  modules: SummaryModule[];
  disabled: boolean;
  onChange: (module: string | null) => void;
}) {
  // Rayon kesimisiz ko'rsatkich xaritani bo'yay olmaydi — backend ham
  // bunday biriktirishni rad etadi, shuning uchun tanlov ochilmaydi
  if (!item.has_districts) {
    return <span className="text-[12.5px] text-ink-3">—</span>;
  }
  return (
    <select
      value={item.module ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn(
        "rounded-lg bg-abyss/70 px-2 py-1 text-[12.5px] text-ink ring-1 ring-edge/60 outline-none transition",
        "focus:ring-cyan/70 disabled:opacity-50",
      )}
    >
      <option value="">— biriktirilmegen —</option>
      {modules.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}

function PageBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg bg-abyss/70 px-3 py-1.5 text-[13px] text-ink-2 ring-1 ring-edge/50 transition disabled:opacity-40 enabled:hover:text-ink"
    >
      {children}
    </button>
  );
}
