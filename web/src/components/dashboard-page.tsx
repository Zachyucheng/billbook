"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBillbook } from "@/components/billbook-provider";
import { CategoryBreakdownBars } from "@/components/category-breakdown-bars";
import { MetricTile, getObjectKindLabel, Panel } from "@/components/workspace-ui";
import { useI18n } from "@/lib/i18n";
import { TrendLineChart } from "@/components/trend-line-chart";
import { withObjectId, workspaceRoutes } from "@/lib/routes";
import {
  formatDateTime,
  formatCompactCurrency,
  formatCurrency,
  getCategoryBreakdown,
  getDailySeries,
  getDashboardMetrics,
  getHistoryEntries,
  getMonthlySeries,
  getObjectSummaries,
  getSortedTransactions,
  getWeeklySeries,
  TrendGranularity,
} from "@/lib/analytics";

export function DashboardPage() {
  const { t } = useI18n();
  const { state } = useBillbook();
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>("week");

  const objectSummaries = useMemo(() => getObjectSummaries(state), [state]);
  const dashboardMetrics = useMemo(() => getDashboardMetrics(state), [state]);
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(state), [state]);
  const trendSeries = useMemo(() => {
    if (trendGranularity === "day") {
      return getDailySeries(state);
    }

    if (trendGranularity === "month") {
      return getMonthlySeries(state);
    }

    return getWeeklySeries(state);
  }, [state, trendGranularity]);
  const recentTransactions = useMemo(
    () => getSortedTransactions(state).filter((item) => item.kind === "expense").slice(0, 6),
    [state],
  );
  const historyEntries = useMemo(() => getHistoryEntries(state, 6), [state]);

  const averageExpense =
    dashboardMetrics.totalExpenseCount > 0
      ? dashboardMetrics.totalExpense / dashboardMetrics.totalExpenseCount
      : 0;
  const leadObject = objectSummaries[0] ?? null;

  return (
    <div className="space-y-5">
      {/* Header + Trend */}
      <section className="panel panel-strong rounded-[28px] p-5 md:p-6">
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0">
            <p className="type-kicker">Overview</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{state.workspaceName}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">
              {state.workspaceDescription}
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <MetricTile
                label={t["dashboard.totalExpense"]}
                value={formatCompactCurrency(dashboardMetrics.totalExpense)}
                detail={t["dashboard.expenseCount"].replace("{count}", String(dashboardMetrics.totalExpenseCount))}
              />
              <MetricTile
                label={t["dashboard.activeObjects"]}
                value={`${dashboardMetrics.activeObjects}`}
                detail={t["dashboard.totalObjects"].replace("{count}", String(state.objects.length))}
              />
              <MetricTile
                label={t["dashboard.avgPerTx"]}
                value={formatCompactCurrency(averageExpense)}
                detail={t["dashboard.avgDetail"]}
              />
              <MetricTile
                label={t["dashboard.topObject"]}
                value={leadObject?.object.name ?? t["dashboard.leadEmpty"]}
                detail={leadObject ? leadObject.dominantCategory : t["dashboard.leadHint"]}
              />
            </div>
          </div>

          <Panel
            title={t["dashboard.trend.title"]}
            description={t["dashboard.trend.desc"]}
            className="h-full"
          >
            <div className="flex flex-wrap gap-2">
              {([
                ["week", t["dashboard.trend.week"]],
                ["day", t["dashboard.trend.day"]],
                ["month", t["dashboard.trend.month"]],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTrendGranularity(value)}
                  className={`ui-chip border transition ${
                    trendGranularity === value
                      ? "border-transparent bg-[color:var(--foreground)] text-white"
                      : "border-[color:var(--line)] bg-[color:var(--surface-strong)] text-[color:var(--muted)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5">
              <TrendLineChart
                points={trendSeries}
                emptyLabel={t["dashboard.trend.empty"]}
              />
            </div>
          </Panel>
        </div>
      </section>

      {/* Ranking + Recent — two columns */}
      <section className="grid gap-5 md:grid-cols-2">
        <Panel
          title={t["dashboard.ranking.title"]}
          description={t["dashboard.ranking.desc"]}
        >
          <div className="space-y-2.5">
            {objectSummaries.map((summary, index) => (
              <Link
                key={summary.object.id}
                href={withObjectId(workspaceRoutes.ledger, summary.object.id)}
                className="surface-strong flex items-center justify-between rounded-[14px] border border-[color:var(--line)] px-3.5 py-2.5 transition hover:bg-[color:var(--surface-solid)]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-xs font-semibold">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{summary.object.name}</p>
                    <p className="mt-0.5 text-[13px] leading-5 text-[color:var(--muted)]">
                      {t["dashboard.ranking.detail"]
                        .replace("{kind}", getObjectKindLabel(summary.object.kind, t))
                        .replace("{count}", String(summary.transactionCount))
                        .replace("{category}", summary.dominantCategory)}
                    </p>
                  </div>
                </div>
                <p className="shrink-0 font-display text-base font-semibold tracking-tight">
                  {formatCurrency(summary.expense)}
                </p>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel
          title={t["dashboard.recent.title"]}
          description={t["dashboard.recent.desc"]}
        >
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto hide-scrollbar">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="surface-strong flex items-center justify-between rounded-[14px] border border-[color:var(--line)] px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{transaction.title}</p>
                    <p className="mt-0.5 text-sm text-[color:var(--muted)]">
                      {transaction.date}
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-base font-semibold tracking-tight">
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState message={t["dashboard.recent.empty"]} />
            )}
          </div>
        </Panel>
      </section>

      {/* Category structure + Recent activity */}
      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr] content-auto-block">
        <div className="grid gap-5 md:grid-cols-2">
          <Panel title={t["dashboard.category.title"]} description={t["dashboard.category.desc"]}>
            <CategoryBreakdownBars items={categoryBreakdown} />
          </Panel>

          <Panel title={t["dashboard.activity.title"]} description={t["dashboard.activity.desc"]}>
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto hide-scrollbar">
              {historyEntries.length > 0 ? (
                historyEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="surface-strong rounded-[14px] border border-[color:var(--line)] px-3.5 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{entry.title}</p>
                        <p className="mt-0.5 text-[13px] leading-5 text-[color:var(--muted)]">
                          {entry.detail}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-[color:var(--muted)]">
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message={t["dashboard.activity.empty"]} />
              )}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[120px] items-center justify-center rounded-[20px] border border-dashed border-[color:var(--line)] text-sm text-[color:var(--muted)]">
      {message}
    </div>
  );
}
