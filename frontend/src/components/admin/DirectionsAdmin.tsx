"use client";

import { CalendarClock, Loader2, Search, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DIRECTIONS, directionLeafBlocks } from "@/data/directions";
import { TASK_STATUS_LIST, taskStatus } from "@/data/modules";
import type { TaskStatusId } from "@/data/modules";
import {
  directionStatusConfigured,
  fetchDirectionStatuses,
  putDirectionBlockStatus,
  type DirectionBlockStatus,
} from "@/lib/directionStatus";
import { cn, daysLeft, formatDate } from "@/lib/utils";
import { ErrorNotice, Input, Segmented, Select, YearScale } from "@/components/ui/primitives";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

interface Row {
  directionId: string;
  directionOrder: number;
  directionLabel: string;
  blockId: string;
  blockIndex: number;
  text: string;
  progress: number;
  deadline: string;
  assignee: string;
}

/**
 * 7 jónelistiń 63 bóliminiń h́ámmesin bir dizimde kórsetip, hár qaysısına
 * juwapker/múddet/orınlanıw payızın belgilew — eski `TaskBoard`tıń
 * (demo iqtisodiy topshiriqlar) sырtına emes, haqıyqıy KPI bólimlerine
 * qollanılatuǵın nusqası. Status TaskBoard'dagı `taskStatus()` menen bir
 * logika arqalı esaplanadı.
 */
export function DirectionsAdmin() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [statuses, setStatuses] = useState<Map<string, DirectionBlockStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatusId | "all">("all");
  const [search, setSearch] = useState("");

  const reload = useCallback(() => {
    fetchDirectionStatuses(year)
      .then((rows) => {
        setStatuses(new Map(rows.map((r) => [r.block_id, r])));
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Maǵlıwmat alınbadı"))
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const allRows: Row[] = useMemo(
    () =>
      DIRECTIONS.flatMap((d) =>
        directionLeafBlocks(d).map((b, i) => {
          const s = statuses.get(b.id);
          return {
            directionId: d.id,
            directionOrder: d.order,
            directionLabel: `${d.order}. ${d.title.split(" ")[0]}`,
            blockId: b.id,
            blockIndex: i + 1,
            text: b.parentText ? `${b.parentText} — ${b.text}` : b.text,
            progress: s?.progress ?? 0,
            deadline: s?.deadline ?? `${year}-12-31`,
            assignee: s?.assignee ?? "",
          };
        }),
      ),
    [statuses, year],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (directionFilter !== "all" && r.directionId !== directionFilter) return false;
      if (statusFilter !== "all" && taskStatus(r.progress, r.deadline).id !== statusFilter) return false;
      if (q && !r.text.toLowerCase().includes(q) && !r.assignee.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allRows, directionFilter, statusFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allRows.length };
    for (const r of allRows) {
      const id = taskStatus(r.progress, r.deadline).id;
      c[id] = (c[id] ?? 0) + 1;
    }
    return c;
  }, [allRows]);

  async function commit(row: Row, patch: Partial<Pick<Row, "progress" | "deadline" | "assignee">>) {
    const next = { ...row, ...patch };
    const prev = statuses.get(row.blockId);
    setStatuses((cur) => {
      const map = new Map(cur);
      map.set(row.blockId, {
        direction_id: row.directionId,
        block_id: row.blockId,
        year,
        progress: next.progress,
        deadline: next.deadline,
        assignee: next.assignee,
        updated_by: prev?.updated_by ?? "",
        updated_at: prev?.updated_at ?? new Date().toISOString(),
      });
      return map;
    });
    try {
      const saved = await putDirectionBlockStatus({
        directionId: row.directionId,
        blockId: row.blockId,
        year,
        progress: next.progress,
        deadline: next.deadline,
        assignee: next.assignee,
      });
      setStatuses((cur) => new Map(cur).set(row.blockId, saved));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ózgeris saqlanbadı");
      setStatuses((cur) => {
        const map = new Map(cur);
        if (prev) map.set(row.blockId, prev);
        else map.delete(row.blockId);
        return map;
      });
    }
  }

  if (!directionStatusConfigured()) {
    return <ErrorNotice message="NEXT_PUBLIC_API_URL sazlanbaǵan — bul bólim serversiz islemeydi" />;
  }

  return (
    <div className="space-y-4">
      {error && <ErrorNotice message={error} />}

      <div className="flex flex-wrap items-center gap-2">
        <YearScale years={YEARS} value={year} onChange={setYear} />
        <Select
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value)}
          className="w-auto"
        >
          <option value="all">Barlıq jónelisler</option>
          {DIRECTIONS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.order}. {d.title.split(" ")[0]}
            </option>
          ))}
        </Select>
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Bólim yamasa juwapker izlew…"
            className="w-56 pl-8"
          />
        </div>
        <div className="flex-1" />
        <Segmented<TaskStatusId | "all">
          layoutId="direction-status-filter"
          size="sm"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: `Barlıǵı (${counts.all})` },
            ...TASK_STATUS_LIST.map((s) => ({
              value: s.id,
              label: `${s.label} (${counts[s.id] ?? 0})`,
              color: s.color,
            })),
          ]}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-[13.5px] text-ink-3">
          <Loader2 size={15} className="animate-spin" />
          Júklenbekte…
        </div>
      ) : (
        <div className="thin-scroll overflow-x-auto rounded-2xl ring-1 ring-edge/50">
          <table className="w-full min-w-[820px] border-collapse text-[13px]">
            <thead className="bg-abyss/70">
              <tr>
                {["Jónelis", "Bólim", "Juwapker", "Múddet", "Orınlanıw, %", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-[11.5px] font-semibold tracking-wide text-ink-3 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <BlockStatusRow key={row.blockId} row={row} onCommit={(patch) => void commit(row, patch)} />
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-ink-3">
                    Saylanǵan halatta bólim joq.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BlockStatusRow({
  row,
  onCommit,
}: {
  row: Row;
  onCommit: (patch: Partial<Pick<Row, "progress" | "deadline" | "assignee">>) => void;
}) {
  // Sırttan (server yamasa dáwir awıstırılǵanda) kelgen `row` menen
  // lokal qoralamanı sáykeslestiremiz — effekt emes, render waqtında
  // ("adjust state during render", TaskBoard'dagı `TaskCard` úlgisi).
  const [assignee, setAssignee] = useState(row.assignee);
  const [syncedAssignee, setSyncedAssignee] = useState(row.assignee);
  if (row.assignee !== syncedAssignee) {
    setSyncedAssignee(row.assignee);
    setAssignee(row.assignee);
  }
  const [progress, setProgress] = useState(row.progress);
  const [syncedProgress, setSyncedProgress] = useState(row.progress);
  if (row.progress !== syncedProgress) {
    setSyncedProgress(row.progress);
    setProgress(row.progress);
  }

  const status = taskStatus(row.progress, row.deadline);
  const left = daysLeft(row.deadline);
  const overdue = left < 0 && row.progress < 100;

  return (
    <tr className="border-t border-hairline/50 align-top hover:bg-raised/25">
      <td className="px-3 py-2 text-[11.5px] font-semibold tabular-nums text-ink-3">
        {row.directionLabel}
      </td>
      <td className="max-w-[340px] px-3 py-2">
        <p className="line-clamp-2 text-ink-2" title={row.text}>
          {row.text}
        </p>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <User size={12} className="shrink-0 text-ink-3" />
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            onBlur={() => {
              if (assignee !== row.assignee) onCommit({ assignee });
            }}
            placeholder="A.Á.T."
            className="w-32 min-w-[110px] rounded-md bg-transparent px-1 py-1 text-ink-2 outline-none focus:bg-raised/60 focus:text-ink"
          />
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <CalendarClock size={12} className={cn("shrink-0", overdue ? "text-crimson" : "text-ink-3")} />
          <input
            type="date"
            value={row.deadline}
            onChange={(e) => onCommit({ deadline: e.target.value })}
            className="rounded-md bg-transparent px-1 py-1 text-[12.5px] text-ink-2 outline-none focus:bg-raised/60 focus:text-ink"
          />
        </div>
        {overdue && (
          <div className="mt-0.5 text-[11px] font-medium text-crimson">
            {Math.abs(left)} kún keshikti
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          max={100}
          step={5}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          onBlur={() => {
            const clamped = Math.max(0, Math.min(100, progress));
            setProgress(clamped);
            if (clamped !== row.progress) onCommit({ progress: clamped });
          }}
          className="tnum w-16 rounded-md bg-transparent px-1 py-1 text-ink-2 outline-none focus:bg-raised/60 focus:text-ink"
        />
      </td>
      <td className="px-3 py-2">
        <span
          className={cn(
            "inline-flex items-center rounded-lg px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap",
            status.buttonClass,
          )}
        >
          {status.label}
        </span>
        {row.deadline && (
          <div className="mt-1 text-[11px] text-ink-3">{formatDate(row.deadline)}</div>
        )}
      </td>
    </tr>
  );
}
