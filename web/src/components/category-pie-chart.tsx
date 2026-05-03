"use client";

import { useMemo, useState } from "react";
import { CategoryBreakdownItem, formatCompactCurrency } from "@/lib/analytics";

const piePalette = [
  "var(--accent)",
  "color-mix(in srgb, var(--accent) 82%, white)",
  "color-mix(in srgb, var(--accent) 68%, white)",
  "color-mix(in srgb, var(--accent) 54%, white)",
  "color-mix(in srgb, var(--accent) 40%, white)",
];

export function CategoryPieChart({
  items,
}: {
  items: CategoryBreakdownItem[];
}) {
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const longTermTotal = items.reduce((sum, item) => sum + item.longTermAmount, 0);
  const shortTermTotal = total - longTermTotal;

  const slices = useMemo(
    () =>
      items.reduce<
        Array<{
          item: CategoryBreakdownItem;
          start: number;
          end: number;
          color: string;
          longTermEnd: number;
        }>
      >((result, item, index) => {
        const start = result.at(-1)?.end ?? 0;
        const end = start + (item.amount / total) * Math.PI * 2;
        const longTermRatio = item.amount === 0 ? 0 : item.longTermAmount / item.amount;

        result.push({
          item,
          start,
          end,
          color: piePalette[index % piePalette.length],
          longTermEnd: start + (end - start) * longTermRatio,
        });

        return result;
      }, []),
    [items, total],
  );

  if (total <= 0 || items.length === 0) {
    return (
      <div className="surface-soft flex h-[192px] items-center justify-center rounded-[20px] border border-dashed border-[color:var(--line)] text-sm text-[color:var(--muted)]">
        暂无分类占比
      </div>
    );
  }

  const activeSlice = slices.find((slice) => slice.item.categoryId === hoveredCategoryId) ?? null;
  const centerTitle = getPieCenterLabel(activeSlice?.item.categoryName ?? "分类占比");
  const centerAmount = activeSlice
    ? formatCompactCurrency(activeSlice.item.amount)
    : formatCompactCurrency(total);
  const centerMeta = activeSlice
    ? `${activeSlice.item.longTermAmount > 0 ? "长期" : "短期"} ${Math.round(
        ((activeSlice.item.longTermAmount > 0
          ? activeSlice.item.longTermAmount
          : activeSlice.item.shortTermAmount) /
          activeSlice.item.amount) *
          100,
      )}%`
    : `${longTermTotal > 0 ? "长期" : "短期"} ${Math.round(
        ((longTermTotal > 0 ? longTermTotal : shortTermTotal) / total) * 100,
      )}%`;

  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3">
      <div className="surface-soft flex min-h-0 items-center justify-center rounded-[20px] border border-[color:var(--line)] px-3 py-3">
        <svg
          viewBox="0 0 120 120"
          className="aspect-square h-full max-h-[220px] w-full max-w-[220px] overflow-visible"
        >
          {slices.map((slice) => {
            const isActive = activeSlice?.item.categoryId === slice.item.categoryId;

            return (
              <g
                key={slice.item.categoryId}
                className="cursor-pointer transition-transform duration-150 ease-out"
                onMouseEnter={() => setHoveredCategoryId(slice.item.categoryId)}
                onMouseLeave={() => setHoveredCategoryId(null)}
                style={{
                  transformOrigin: "60px 60px",
                  transform: isActive ? "scale(1.04)" : "scale(1)",
                }}
              >
                <path
                  d={describeDonutArc(60, 60, 39, 24, slice.start, slice.end)}
                  fill={slice.color}
                />
                {slice.item.longTermAmount > 0 ? (
                  <path
                    d={describeDonutArc(60, 60, 46, 40, slice.start, slice.longTermEnd)}
                    fill="var(--long-term-accent)"
                  />
                ) : null}
              </g>
            );
          })}
          <circle cx="60" cy="60" r="24" fill="var(--surface-solid)" />
          <text
            x="60"
            y="52"
            textAnchor="middle"
            className="fill-[color:var(--muted)] text-[5px] tracking-[0.08em]"
          >
            {centerTitle}
          </text>
          <text
            x="60"
            y="63"
            textAnchor="middle"
            className="fill-[color:var(--foreground)] text-[8px] font-semibold"
          >
            {centerAmount}
          </text>
          <text
            x="60"
            y="71"
            textAnchor="middle"
            className="fill-[color:var(--muted)] text-[5px]"
          >
            {centerMeta}
          </text>
        </svg>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-[color:var(--muted)]">
        <ModeInlineStat label="短期" value={formatCompactCurrency(shortTermTotal)} variant="short" />
        <ModeInlineStat label="长期" value={formatCompactCurrency(longTermTotal)} variant="long" />
      </div>
    </div>
  );
}

function ModeInlineStat({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "short" | "long";
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          variant === "short" ? "bg-[color:var(--accent)]" : ""
        }`}
        style={
          variant === "long"
            ? {
                background:
                  "repeating-linear-gradient(135deg, color-mix(in srgb, var(--long-term-accent) 94%, white) 0 3px, color-mix(in srgb, var(--long-term-accent) 68%, white) 3px 6px)",
                border: "1px solid color-mix(in srgb, var(--long-term-accent) 24%, white)",
              }
            : undefined
        }
      />
      <span>{label}</span>
      <span className="font-medium text-[color:var(--foreground)]">{value}</span>
    </span>
  );
}

function getPieCenterLabel(label: string) {
  if (label.length <= 6) {
    return label;
  }

  return `${label.slice(0, 5)}…`;
}

function describeDonutArc(
  cx: number,
  cy: number,
  radius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const startOuter = polarToCartesian(cx, cy, radius, endAngle);
  const endOuter = polarToCartesian(cx, cy, radius, startAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, endAngle);
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle - Math.PI / 2),
    y: cy + radius * Math.sin(angle - Math.PI / 2),
  };
}
