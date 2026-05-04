"use client";

import { useId, useMemo, useState } from "react";
import { ExpenseModeLegend } from "@/components/expense-mode-legend";
import { formatCompactCurrency, MonthlyPoint } from "@/lib/analytics";

export function TrendLineChart({
  points,
  accent = "var(--accent)",
  longTermAccent = "var(--long-term-accent)",
  height = 224,
  emptyLabel = "暂无可展示的月度消费数据",
}: {
  points: MonthlyPoint[];
  accent?: string;
  longTermAccent?: string;
  height?: number;
  emptyLabel?: string;
}) {
  const gradientId = useId().replace(/:/g, "");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const hasData = points.some((point) => point.expense > 0);
  const hasLongTermData = points.some((point) => point.longTermExpense > 0);
  const chartWidth = 100;
  const chartHeight = 100;
  const maxExpense = Math.max(...points.map((point) => point.expense), 1);
  const activePoint = activeIndex === null ? null : points[activeIndex];
  const yAxisLabels = [maxExpense, maxExpense / 2, 0];

  const totalCoords = useMemo(
    () => createCoords(points, chartWidth, chartHeight, maxExpense, (point) => point.expense),
    [maxExpense, points],
  );
  const longTermCoords = useMemo(
    () =>
      createCoords(points, chartWidth, chartHeight, maxExpense, (point) => point.longTermExpense),
    [maxExpense, points],
  );

  const totalLinePath = useMemo(() => buildLinePath(totalCoords), [totalCoords]);
  const totalAreaPath = buildAreaPath(totalLinePath, totalCoords, chartHeight);
  const longTermLinePath = useMemo(() => buildLinePath(longTermCoords), [longTermCoords]);
  const longTermAreaPath = buildAreaPath(longTermLinePath, longTermCoords, chartHeight);
  const activeCoord = activeIndex === null ? null : totalCoords[activeIndex];
  const activeLongTermCoord = activeIndex === null ? null : longTermCoords[activeIndex];

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (points.length === 0) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const nextIndex = Math.round(ratio * (points.length - 1));
    setActiveIndex(nextIndex);
  };

  if (!hasData) {
    return (
      <div
        className="surface-soft flex items-center justify-center rounded-[20px] border border-dashed border-[color:var(--line)] text-sm text-[color:var(--muted)]"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div
        className="surface-soft relative h-[192px] overflow-hidden rounded-[20px] border border-[color:var(--line)] px-4 py-4"
        style={{ height }}
      >
        <div className="pointer-events-none absolute inset-x-4 bottom-4 top-4 grid grid-rows-3">
          {yAxisLabels.map((label, index) => (
            <div key={index} className="relative border-t border-dashed border-[color:var(--line)]/70">
              <span className="surface-soft absolute -top-2 right-0 rounded-full px-1.5 text-[10px] font-medium text-[color:var(--muted)]">
                {formatCompactCurrency(label)}
              </span>
            </div>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          className="relative h-full w-full cursor-crosshair"
          role="img"
          aria-label="消费趋势图"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id={`trend-fill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.14" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id={`trend-long-term-fill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={longTermAccent} stopOpacity="0.12" />
              <stop offset="100%" stopColor={longTermAccent} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <path d={totalAreaPath} fill={`url(#trend-fill-${gradientId})`} />
          {hasLongTermData ? (
            <path d={longTermAreaPath} fill={`url(#trend-long-term-fill-${gradientId})`} />
          ) : null}
          <path
            d={totalLinePath}
            fill="none"
            stroke={accent}
            strokeOpacity="0.82"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {hasLongTermData ? (
            <path
              d={longTermLinePath}
              fill="none"
              stroke={longTermAccent}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          {activeCoord ? (
            <g>
              <line
                x1={activeCoord.x}
                x2={activeCoord.x}
                y1="4"
                y2="96"
                stroke="var(--foreground)"
                strokeDasharray="3 3"
                strokeOpacity="0.18"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={activeCoord.x} cy={activeCoord.y} r="5.5" fill={accent} fillOpacity="0.12" />
              <circle cx={activeCoord.x} cy={activeCoord.y} r="2.3" fill={accent} />
              <circle cx={activeCoord.x} cy={activeCoord.y} r="1.15" fill="white" fillOpacity="0.9" />
            </g>
          ) : null}

          {hasLongTermData && activeLongTermCoord && (activePoint?.longTermExpense ?? 0) > 0 ? (
            <g>
              <circle
                cx={activeLongTermCoord.x}
                cy={activeLongTermCoord.y}
                r="3.8"
                fill="white"
                stroke={longTermAccent}
                strokeWidth="1.5"
              />
            </g>
          ) : null}
        </svg>

        {activePoint && activeCoord ? (
          <div
            className="surface-solid pointer-events-none absolute z-10 min-w-[144px] rounded-[14px] border border-[color:var(--line)] px-3 py-2 text-sm shadow-[0_14px_34px_rgba(32,49,41,0.08)]"
            style={{
              left: `clamp(12px, calc(${activeCoord.x}% - 72px), calc(100% - 156px))`,
              top: `clamp(12px, calc(${activeCoord.y}% - 68px), calc(100% - 108px))`,
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              {activePoint.label}
            </p>
            <p className="mt-1 font-display text-lg font-semibold tracking-tight">
              {formatCompactCurrency(activePoint.expense)}
            </p>
            <div className="mt-2 space-y-1 text-[11px] text-[color:var(--muted)]">
              <p className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" />
                  短期
                </span>
                <span>{formatCompactCurrency(activePoint.shortTermExpense)}</span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background:
                        "repeating-linear-gradient(135deg, color-mix(in srgb, var(--long-term-accent) 94%, white) 0 3px, color-mix(in srgb, var(--long-term-accent) 70%, white) 3px 6px)",
                    }}
                  />
                  长期
                </span>
                <span>{formatCompactCurrency(activePoint.longTermExpense)}</span>
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto pb-1">
        <div className="space-y-3">
          <ExpenseModeLegend />
          <div
            className="grid min-w-[312px] gap-2"
            style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
          >
            {points.map((point) => (
              <div key={point.label} className="min-w-0 text-center">
                <p className="truncate text-[11px] text-[color:var(--muted)]">{point.label}</p>
                <p className="mt-1 truncate text-sm font-medium">
                  {formatCompactCurrency(point.expense)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function createCoords(
  points: MonthlyPoint[],
  chartWidth: number,
  chartHeight: number,
  maxExpense: number,
  getValue: (point: MonthlyPoint) => number,
) {
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : 0;

  return points.map((point, index) => {
    const value = getValue(point);
    const x = Number((index * stepX).toFixed(2));
    const y = Number((chartHeight - (value / maxExpense) * 76 - 12).toFixed(2));

    return { ...point, x, y };
  });
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  return points.reduce((path, point, index, allPoints) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const prev = allPoints[index - 1];
    const midX = Number(((prev.x + point.x) / 2).toFixed(2));

    return `${path} C ${midX} ${prev.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function buildAreaPath(
  linePath: string,
  points: Array<{ x: number; y: number }>,
  chartHeight: number,
) {
  if (!linePath || points.length === 0) {
    return "";
  }

  return `${linePath} L ${points.at(-1)?.x ?? 0} ${chartHeight} L ${points[0]?.x ?? 0} ${chartHeight} Z`;
}
