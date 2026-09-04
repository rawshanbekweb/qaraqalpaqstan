"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronLeft, ChevronRight, Layers, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { DIRECTIONS, DIRECTIONS_CLOSING_NOTE, type Direction, type DirectionBlock } from "@/data/directions";
import { cn } from "@/lib/utils";
import { ReportSheetPanel } from "@/components/directions/ReportSheetPanel";

const CARD_ACCENTS = [
  "#22d3ee",
  "#818cf8",
  "#34d399",
  "#f59e0b",
  "#f472b6",
  "#60a5fa",
  "#fb7185",
];

/**
 * Jónelisler (bur. "Tapsırmalar") — úsh basqıshlı kóriniс:
 *
 *   1) Jónelis kartaları (7 taraw, húdjettegi tártipte)
 *   2) Saylanǵan jóneliстiń bólimleri — bir tekis qatarlar (kartadaн parıqlı)
 *   3) Qatardı basqanda — sol bólim ushın excel-kórinisindegi hisabat
 */
export function DirectionExplorer() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const active = useMemo(() => DIRECTIONS.find((d) => d.id === activeId) ?? null, [activeId]);

  function openDirection(id: string) {
    setActiveId(id);
    setExpandedBlockId(null);
  }

  function back() {
    setActiveId(null);
    setExpandedBlockId(null);
  }

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait">
        {!active ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {DIRECTIONS.map((d, i) => (
              <DirectionCard
                key={d.id}
                direction={d}
                accent={CARD_ACCENTS[i % CARD_ACCENTS.length]}
                index={i}
                onOpen={() => openDirection(d.id)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="rows"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="space-y-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={back}
                className="inline-flex items-center gap-1.5 rounded-full bg-abyss/70 px-3.5 py-2 text-[13px] font-medium text-ink-2 ring-1 ring-edge/60 transition hover:text-ink"
              >
                <ChevronLeft size={15} />
                Barlıq jónelisler
              </button>
              <div className="min-w-0">
                <h2 className="truncate text-[15.5px] font-semibold text-ink">{active.title}</h2>
                {active.leads && (
                  <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
                    <Users size={11} />
                    {active.leads}
                  </p>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl ring-1 ring-edge/50">
              {active.blocks.map((block, i) => (
                <BlockRow
                  key={block.id}
                  block={block}
                  index={i}
                  directionTitle={active.title}
                  expanded={expandedBlockId === block.id}
                  onToggle={() =>
                    setExpandedBlockId((cur) => (cur === block.id ? null : block.id))
                  }
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!active && DIRECTIONS_CLOSING_NOTE.length > 0 && (
        <div className="rounded-2xl bg-abyss/40 px-4 py-3.5 ring-1 ring-edge/40">
          <div className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-ink-3 uppercase">
            Qosımsha punkt
          </div>
          <ul className="space-y-1 text-[12.5px] leading-relaxed text-ink-2">
            {DIRECTIONS_CLOSING_NOTE.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DirectionCard({
  direction,
  accent,
  index,
  onOpen,
}: {
  direction: Direction;
  accent: string;
  index: number;
  onOpen: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.35 }}
      className="glass group flex flex-col gap-3.5 rounded-2xl p-[18px] text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(34,211,238,0.45)]"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-xl text-[13px] font-bold text-void"
          style={{ background: `linear-gradient(135deg, ${accent}, color-mix(in oklab, ${accent} 60%, #fff))` }}
        >
          {direction.order}
        </span>
        <ChevronRight
          size={16}
          className="mt-1.5 shrink-0 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink"
        />
      </div>

      <h3 className="min-w-0 flex-1 text-[14.5px] leading-snug font-semibold text-ink">
        {direction.title}
      </h3>

      {direction.leads && (
        <p className="line-clamp-1 flex items-center gap-1.5 text-[12px] text-ink-3" title={direction.leads}>
          <Users size={11} className="shrink-0" />
          {direction.leads}
        </p>
      )}

      <div className="mt-auto flex items-center gap-1.5 border-t border-hairline/60 pt-2.5 text-[12px] text-ink-3">
        <Layers size={12} />
        {direction.blocks.length} bólim
      </div>
    </motion.button>
  );
}

function BlockRow({
  block,
  index,
  directionTitle,
  expanded,
  onToggle,
}: {
  block: DirectionBlock;
  index: number;
  directionTitle: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={cn("bg-abyss/40", index > 0 && "border-t border-hairline/50")}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-raised/30",
          expanded && "bg-raised/40",
        )}
      >
        <span className="mt-0.5 shrink-0 rounded-md bg-abyss/70 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-ink-3 ring-1 ring-edge/50">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-ink-2">{block.text}</span>
        {block.ownerGroup && (
          <span className="mt-0.5 hidden shrink-0 rounded-full bg-iris/12 px-2 py-0.5 text-[11px] font-medium text-iris ring-1 ring-iris/25 sm:inline-block">
            {block.ownerGroup}
          </span>
        )}
        <ChevronDown
          size={16}
          className={cn("mt-0.5 shrink-0 text-ink-3 transition-transform", expanded && "rotate-180 text-cyan")}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t border-hairline/50 bg-abyss/60 p-4">
              <ReportSheetPanel blockId={block.id} exportName={`${directionTitle}-${index + 1}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
