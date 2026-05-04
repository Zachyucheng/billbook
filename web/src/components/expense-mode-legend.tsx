export function ExpenseModeLegend({ className }: { className?: string }) {
  return (
    <div
      className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[color:var(--muted)] ${className ?? ""}`}
    >
      <LegendSwatch label="短期消费" variant="short" />
      <LegendSwatch label="长期平摊" variant="long" />
    </div>
  );
}

function LegendSwatch({
  label,
  variant,
}: {
  label: string;
  variant: "short" | "long";
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
      <span
        className={`h-2.5 w-5 rounded-full border border-white/60 ${
          variant === "short" ? "bg-[color:var(--accent)]" : ""
        }`}
        style={
          variant === "long"
            ? {
                borderColor: "color-mix(in srgb, var(--long-term-accent) 28%, white)",
                background:
                  "repeating-linear-gradient(135deg, color-mix(in srgb, var(--long-term-accent) 94%, white) 0 6px, color-mix(in srgb, var(--long-term-accent) 68%, white) 6px 12px)",
              }
            : undefined
        }
      />
      <span>{label}</span>
    </span>
  );
}
