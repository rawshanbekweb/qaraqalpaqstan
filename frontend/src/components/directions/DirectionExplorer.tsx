"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Layers, ListTree, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DIRECTIONS, DIRECTIONS_CLOSING_NOTE, type Direction, type DirectionBlock } from "@/data/directions";
import { cn } from "@/lib/utils";
import { ReportSheetPanel } from "@/components/directions/ReportSheetPanel";
import { DirectionDocuments } from "@/components/directions/DirectionDocuments";
import {
  currentDirectionPeriod,
  directionDocumentsConfigured,
  fetchDirectionSummary,
  PERIOD_LABELS,
  PERIOD_ORDER,
  type DirectionBlockCoverage,
  type DirectionPeriod,
} from "@/lib/directionDocuments";
import { Segmented, YearScale } from "@/components/ui/primitives";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

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
 * Jónelisler (bur. "Tapsırmalar") — tórt basqıshlı kóriniс:
 *
 *   1) Jónelis kartaları (7 taraw, húdjettegi tártipte)
 *   2) Saylanǵan jóneliстiń tiykarǵı bólim kartaları (húdjettegi nomerlengen
 *      bántler, mısalı D1 ushın 9 dana)
 *   3) Bólim ashılǵanda — sol bólimniń ózi ushın hisabat/hújjetler, al
 *      astında (bar болса) «Соның ишинде киши көрсеткишлер:» dep atalatuǵın
 *      kishi kórsetkish kartaları
 *   4) Kishi kórsetkishti basqanda — sol ushın excel-kórinisindegi hisabat
 *      hám júklengen hújjetler
 */
export function DirectionExplorer() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [period, setPeriod] = useState<DirectionPeriod>(() => currentDirectionPeriod());
  const [coverage, setCoverage] = useState<Map<string, DirectionBlockCoverage>>(new Map());
  const active = useMemo(() => DIRECTIONS.find((d) => d.id === activeId) ?? null, [activeId]);
  const activeBlock = useMemo(
    () => active?.blocks.find((b) => b.id === activeBlockId) ?? null,
    [active, activeBlockId],
  );
  const activeSub = useMemo(
    () => activeBlock?.subBlocks?.find((s) => s.id === activeSubId) ?? null,
    [activeBlock, activeSubId],
  );

  const reloadCoverage = useCallback(() => {
    if (!active || !directionDocumentsConfigured()) return;
    fetchDirectionSummary(year, period)
      .then((rows) => setCoverage(new Map(rows.map((r) => [r.block_id, r]))))
      .catch(() => setCoverage(new Map()));
  }, [active, year, period]);

  useEffect(() => {
    void reloadCoverage();
  }, [reloadCoverage]);

  function isCovered(id: string): boolean {
    const c = coverage.get(id);
    return Boolean(c && (c.document_count > 0 || c.has_report));
  }

  function openDirection(id: string) {
    setActiveId(id);
    setActiveBlockId(null);
    setActiveSubId(null);
  }

  function backToDirections() {
    setActiveId(null);
    setActiveBlockId(null);
    setActiveSubId(null);
  }

  function openBlock(id: string) {
    setActiveBlockId(id);
    setActiveSubId(null);
  }

  function backToBlocks() {
    setActiveBlockId(null);
    setActiveSubId(null);
  }

  function openSub(id: string) {
    setActiveSubId(id);
  }

  function backToSubs() {
    setActiveSubId(null);
  }

  const stage = !active ? "directions" : !activeBlock ? "blocks" : !activeSub ? "block" : "sub";

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait">
        {stage === "directions" && (
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
        )}

        {stage !== "directions" && active && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center gap-3">
              {stage === "blocks" && (
                <button
                  onClick={backToDirections}
                  className="inline-flex items-center gap-1.5 rounded-full bg-abyss/70 px-3.5 py-2 text-[13px] font-medium text-ink-2 ring-1 ring-edge/60 transition hover:text-ink"
                >
                  <ChevronLeft size={15} />
                  Barlıq jónelisler
                </button>
              )}
              {stage === "block" && (
                <button
                  onClick={backToBlocks}
                  className="inline-flex items-center gap-1.5 rounded-full bg-abyss/70 px-3.5 py-2 text-[13px] font-medium text-ink-2 ring-1 ring-edge/60 transition hover:text-ink"
                >
                  <ChevronLeft size={15} />
                  {active.title.split(" ")[0]} bólimleri
                </button>
              )}
              {stage === "sub" && (
                <button
                  onClick={backToSubs}
                  className="inline-flex items-center gap-1.5 rounded-full bg-abyss/70 px-3.5 py-2 text-[13px] font-medium text-ink-2 ring-1 ring-edge/60 transition hover:text-ink"
                >
                  <ChevronLeft size={15} />
                  Kishi kórsetkishler
                </button>
              )}

              <div className="min-w-0">
                <h2 className="truncate text-[15.5px] font-semibold text-ink">
                  {stage === "blocks" ? active.title : null}
                  {(stage === "block" || stage === "sub") && (
                    <span className="line-clamp-1">{stage === "sub" ? activeSub?.text : activeBlock?.text}</span>
                  )}
                </h2>
                {stage === "blocks" && active.leads && (
                  <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
                    <Users size={11} />
                    {active.leads}
                  </p>
                )}
                {(stage === "block" || stage === "sub") && (
                  <p className="truncate text-[12px] text-ink-3">
                    {active.order}. {active.title}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <YearScale years={YEARS} value={year} onChange={setYear} />
                <Segmented
                  layoutId="direction-period"
                  size="sm"
                  value={period}
                  onChange={setPeriod}
                  options={PERIOD_ORDER.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
                />
              </div>
            </div>

            {stage === "blocks" && (
              <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {active.blocks.map((block, i) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    index={i}
                    accent={CARD_ACCENTS[i % CARD_ACCENTS.length]}
                    covered={
                      isCovered(block.id) || Boolean(block.subBlocks?.some((s) => isCovered(s.id)))
                    }
                    onOpen={() => openBlock(block.id)}
                  />
                ))}
              </div>
            )}

            {stage === "block" && activeBlock && (
              <div className="space-y-5">
                <div className="space-y-4 rounded-2xl bg-abyss/40 p-4 ring-1 ring-edge/50">
                  {activeBlock.ownerGroup && (
                    <span className="inline-block rounded-full bg-iris/12 px-2 py-0.5 text-[11px] font-medium text-iris ring-1 ring-iris/25">
                      {activeBlock.ownerGroup}
                    </span>
                  )}
                  <ReportSheetPanel
                    blockId={activeBlock.id}
                    directionId={active.id}
                    year={year}
                    period={period}
                    exportName={`${active.title}-${activeBlock.id}`}
                    onChanged={reloadCoverage}
                  />
                  <DirectionDocuments
                    blockId={activeBlock.id}
                    directionId={active.id}
                    year={year}
                    period={period}
                    onChanged={reloadCoverage}
                  />
                </div>

                {activeBlock.subBlocks && activeBlock.subBlocks.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-[12.5px] font-semibold tracking-wide text-ink-3 uppercase">
                      <ListTree size={13} />
                      Соның ишинде киши көрсеткишлер:
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {activeBlock.subBlocks.map((sub, i) => (
                        <SubCard
                          key={sub.id}
                          sub={sub}
                          index={i}
                          covered={isCovered(sub.id)}
                          onOpen={() => openSub(sub.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {stage === "sub" && activeSub && (
              <div className="space-y-4 rounded-2xl bg-abyss/40 p-4 ring-1 ring-edge/50">
                {activeSub.ownerGroup && (
                  <span className="inline-block rounded-full bg-iris/12 px-2 py-0.5 text-[11px] font-medium text-iris ring-1 ring-iris/25">
                    {activeSub.ownerGroup}
                  </span>
                )}
                <ReportSheetPanel
                  blockId={activeSub.id}
                  directionId={active.id}
                  year={year}
                  period={period}
                  exportName={`${active.title}-${activeSub.id}`}
                  onChanged={reloadCoverage}
                />
                <DirectionDocuments
                  blockId={activeSub.id}
                  directionId={active.id}
                  year={year}
                  period={period}
                  onChanged={reloadCoverage}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {stage === "directions" && DIRECTIONS_CLOSING_NOTE.length > 0 && (
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

function BlockCard({
  block,
  index,
  accent,
  covered,
  onOpen,
}: {
  block: DirectionBlock;
  index: number;
  accent: string;
  covered: boolean;
  onOpen: () => void;
}) {
  const subCount = block.subBlocks?.length ?? 0;
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.24), duration: 0.3 }}
      className="glass group flex flex-col gap-3 rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-20px_rgba(34,211,238,0.4)]"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-lg text-[12.5px] font-bold text-void"
          style={{ background: `linear-gradient(135deg, ${accent}, color-mix(in oklab, ${accent} 60%, #fff))` }}
        >
          {index + 1}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            title={covered ? "Bul dáwir ushın maǵlıwmat bar" : "Bul dáwir ushın maǵlıwmat ele joq"}
            className={cn(
              "size-2 shrink-0 rounded-full",
              covered ? "bg-[#34d399] shadow-[0_0_6px_1px_rgba(52,211,153,0.55)]" : "ring-1 ring-edge/60",
            )}
          />
          <ChevronRight
            size={15}
            className="shrink-0 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink"
          />
        </div>
      </div>

      <p className="line-clamp-4 min-w-0 flex-1 text-[13px] leading-relaxed text-ink-2">{block.text}</p>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-hairline/60 pt-2.5 text-[11px] text-ink-3">
        {block.ownerGroup && (
          <span className="rounded-full bg-iris/12 px-2 py-0.5 font-medium text-iris ring-1 ring-iris/25">
            {block.ownerGroup}
          </span>
        )}
        {subCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <ListTree size={11} />
            {subCount} kishi kórsetkish
          </span>
        )}
      </div>
    </motion.button>
  );
}

function SubCard({
  sub,
  index,
  covered,
  onOpen,
}: {
  sub: DirectionBlock;
  index: number;
  covered: boolean;
  onOpen: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.21), duration: 0.26 }}
      className="group flex flex-col gap-2.5 rounded-xl bg-abyss/50 p-3.5 text-left ring-1 ring-edge/50 transition hover:-translate-y-0.5 hover:bg-raised/40 hover:ring-cyan/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-md bg-abyss/70 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-ink-3 ring-1 ring-edge/50">
          {index + 1}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            title={covered ? "Bul dáwir ushın maǵlıwmat bar" : "Bul dáwir ushın maǵlıwmat ele joq"}
            className={cn(
              "size-2 shrink-0 rounded-full",
              covered ? "bg-[#34d399] shadow-[0_0_6px_1px_rgba(52,211,153,0.55)]" : "ring-1 ring-edge/60",
            )}
          />
          <ChevronRight
            size={13}
            className="shrink-0 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink"
          />
        </div>
      </div>
      <p className="line-clamp-3 text-[12.5px] leading-relaxed text-ink-2">{sub.text}</p>
      {sub.ownerGroup && (
        <span className="w-fit rounded-full bg-iris/12 px-2 py-0.5 text-[10.5px] font-medium text-iris ring-1 ring-iris/25">
          {sub.ownerGroup}
        </span>
      )}
    </motion.button>
  );
}
