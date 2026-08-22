"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn, trim } from "@/lib/utils";

// ── Shisha panel ─────────────────────────────────────────────────────

export function Panel({
  children,
  className,
  glow = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("glass", glow && "glass-top-glow", className)} {...rest}>
      {children}
    </div>
  );
}

export function PanelHeader({
  icon,
  title,
  subtitle,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 border-b border-hairline/70 px-4 py-3", className)}>
      {icon ? (
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-raised/70 text-cyan ring-1 ring-edge/60">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-semibold tracking-tight text-ink">{title}</div>
        {subtitle ? (
          <div className="truncate text-[12.5px] text-ink-3">{subtitle}</div>
        ) : null}
      </div>
      {action}
    </div>
  );
}

// ── Animatsion raqam ─────────────────────────────────────────────────

export function Counter({
  value,
  digits = 1,
  suffix = "",
  prefix = "",
  className,
  duration = 1.1,
}: {
  value: number;
  digits?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  duration?: number;
}) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${prefix}${trim(v, digits)}${suffix}`);
  const prev = useRef(0);

  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, mv, duration]);

  return <motion.span className={cn("tnum", className)}>{text}</motion.span>;
}

// ── Segmentli filtr ──────────────────────────────────────────────────

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  color?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  className,
  size = "md",
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  layoutId: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full bg-abyss/70 p-1.5 ring-1 ring-edge/50",
        className,
      )}
      role="tablist"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative rounded-full whitespace-nowrap font-medium transition-colors",
              size === "sm" ? "px-3 py-1.5 text-[12.5px]" : "px-4 py-2 text-[13px]",
              active ? "text-void" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full"
                style={{
                  background: o.color
                    ? `linear-gradient(120deg, ${o.color}, color-mix(in oklab, ${o.color} 65%, #fff))`
                    : "linear-gradient(120deg, #22d3ee, #818cf8)",
                }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Yillar shkalasi ──────────────────────────────────────────────────

/**
 * 2010–2026 oralig'idagi yil tanlagich.
 *
 * `Segmented` bu yerda yaramaydi: 17 ta yil bir qatorga sig'maydi va
 * filtr qatorini butunlay egallab oladi. Shuning uchun yillar surilib
 * ko'rinadigan tor tasma sifatida beriladi — tanlangan yil to'liq,
 * qolganlari ikki xonali ko'rinishda.
 */
export function YearScale({
  years,
  value,
  onChange,
  className,
}: {
  years: number[];
  value: number;
  onChange: (y: number) => void;
  className?: string;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Tanlangan yil tasmaning ko'rinmas qismida qolib ketmasin.
  // `scrollIntoView` ataylap islatilmeydi: u JOL BOYINSHA HÁMME sırılatuǵın
  // ata-babalardı (mısalı, sırtqı filtr qatorın) da sıradı, tek usı tar
  // tasmanı emes. Sonlıqtan `scrollLeft` qolda esaplanadı.
  useEffect(() => {
    const strip = stripRef.current;
    const btn = activeRef.current;
    if (!strip || !btn) return;
    const target = btn.offsetLeft - strip.clientWidth / 2 + btn.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, target) });
  }, [value, years.length]);

  if (years.length === 0) return null;

  const index = years.indexOf(value);
  const step = (delta: number) => {
    const next = years[Math.min(years.length - 1, Math.max(0, index + delta))];
    if (next !== undefined && next !== value) onChange(next);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full bg-abyss/70 p-1.5 ring-1 ring-edge/50",
        className,
      )}
    >
      <YearStep label="Aldıńǵı jıl" disabled={index <= 0} onClick={() => step(-1)}>
        ‹
      </YearStep>

      <div
        ref={stripRef}
        className="no-scrollbar flex max-w-[min(42vw,300px)] items-center gap-0.5 overflow-x-auto"
      >
        {years.map((y) => {
          const active = y === value;
          return (
            <button
              key={y}
              ref={active ? activeRef : undefined}
              onClick={() => onChange(y)}
              aria-current={active}
              title={`${y}-jıl`}
              className={cn(
                "relative shrink-0 rounded-full px-2.5 py-1.5 text-[12.5px] font-medium tabular-nums whitespace-nowrap transition-colors",
                active ? "text-void" : "text-ink-3 hover:text-ink-2",
              )}
            >
              {active && (
                <motion.span
                  layoutId="year-scale"
                  className="absolute inset-0 rounded-full"
                  style={{ background: "linear-gradient(120deg, #22d3ee, #818cf8)" }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10">{active ? y : `’${String(y).slice(2)}`}</span>
            </button>
          );
        })}
      </div>

      <YearStep
        label="Keyingi jıl"
        disabled={index >= years.length - 1}
        onClick={() => step(1)}
      >
        ›
      </YearStep>
    </div>
  );
}

function YearStep({
  children,
  label,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid size-8 shrink-0 place-items-center rounded-full text-[15px] leading-none text-ink-3 transition hover:bg-raised/60 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

// ── Tugma ────────────────────────────────────────────────────────────

export function Button({
  children,
  variant = "solid",
  className,
  ...rest
}: {
  children: ReactNode;
  variant?: "solid" | "ghost" | "outline" | "danger";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.98]";
  const styles = {
    solid:
      "bg-gradient-to-br from-cyan to-iris text-void shadow-[0_8px_28px_-10px_rgba(34,211,238,0.75)] hover:brightness-110",
    ghost: "text-ink-2 hover:bg-raised/60 hover:text-ink",
    outline: "ring-1 ring-edge/70 text-ink-2 hover:ring-cyan/60 hover:text-ink bg-abyss/40",
    danger: "bg-crimson/15 text-crimson ring-1 ring-crimson/35 hover:bg-crimson/25",
  }[variant];
  return (
    <button className={cn(base, styles, className)} {...rest}>
      {children}
    </button>
  );
}

// ── Forma maydonlari ─────────────────────────────────────────────────

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12.5px] font-semibold tracking-wide text-ink-3 uppercase">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[12.5px] text-ink-3">{hint}</span> : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-xl bg-abyss/70 px-3.5 py-2.5 text-sm text-ink ring-1 ring-edge/60 outline-none transition placeholder:text-ink-3/70 focus:ring-cyan/70 focus:bg-abyss";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputBase, "resize-none", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(inputBase, "appearance-none bg-no-repeat pr-9", props.className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%236b779c' stroke-width='2'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 12px center",
        ...props.style,
      }}
    />
  );
}

// ── Progress ─────────────────────────────────────────────────────────

export function Meter({
  value,
  color = "#22d3ee",
  height = 6,
  className,
  delay = 0,
}: {
  /** 0..1 */
  value: number;
  color?: string;
  height?: number;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-abyss/80 ring-1 ring-edge/40", className)}
      style={{ height }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{
          background: `linear-gradient(90deg, color-mix(in oklab, ${color} 55%, transparent), ${color})`,
          boxShadow: `0 0 12px color-mix(in oklab, ${color} 60%, transparent)`,
        }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

// ── Skelet / yuklanish ───────────────────────────────────────────────

export function ThinkingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-cyan"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16 }}
        />
      ))}
    </span>
  );
}
