import { ExpenseModeLegend } from "@/components/expense-mode-legend";
import { CategoryBreakdownItem, formatCurrency } from "@/lib/analytics";

export function CategoryBreakdownBars({
  items,
  showLegend = true,
}: {
  items: CategoryBreakdownItem[];
  showLegend?: boolean;
}) {
  return (
    <div className="space-y-3.5">
      {showLegend ? <ExpenseModeLegend /> : null}
      {items.map((item) => {
        const totalWidth = `${Math.max(item.share * 100, 8)}%`;
        const shortTermRatio = item.amount === 0 ? 0 : item.shortTermAmount / item.amount;
        const longTermRatio = item.amount === 0 ? 0 : item.longTermAmount / item.amount;

        return (
          <div key={item.categoryId}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{item.categoryName}</span>
              <span className="shrink-0 text-[color:var(--muted)]">{formatCurrency(item.amount)}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[color:var(--accent-soft)]">
              <div className="flex h-full overflow-hidden rounded-full" style={{ width: totalWidth }}>
                {item.shortTermAmount > 0 ? (
                  <div
                    className="h-full bg-[color:var(--accent)]"
                    style={{ width: `${shortTermRatio * 100}%` }}
                  />
                ) : null}
                {item.longTermAmount > 0 ? (
                  <div
                    className="h-full"
                    style={{
                      width: `${longTermRatio * 100}%`,
                      background:
                        "repeating-linear-gradient(135deg, color-mix(in srgb, var(--long-term-accent) 94%, white) 0 7px, color-mix(in srgb, var(--long-term-accent) 70%, white) 7px 14px)",
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
