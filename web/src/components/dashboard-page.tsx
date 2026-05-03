"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBillbook } from "@/components/billbook-provider";
import { CategoryBreakdownBars } from "@/components/category-breakdown-bars";
import { MetricTile, objectKindLabels, Panel } from "@/components/workspace-ui";
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
                label="总支出"
                value={formatCompactCurrency(dashboardMetrics.totalExpense)}
                detail={`${dashboardMetrics.totalExpenseCount} 笔支出`}
              />
              <MetricTile
                label="活跃对象"
                value={`${dashboardMetrics.activeObjects}`}
                detail={`共 ${state.objects.length} 个消费对象`}
              />
              <MetricTile
                label="平均单笔"
                value={formatCompactCurrency(averageExpense)}
                detail="按全部支出记录计算"
              />
              <MetricTile
                label="重点对象"
                value={leadObject?.object.name ?? "暂无"}
                detail={leadObject ? leadObject.dominantCategory : "先记录几笔消费"}
              />
            </div>
          </div>

          <Panel
            title="支出趋势"
            description="用日、周、月三个视角快速检查最近的消费变化。"
            className="h-full"
          >
            <div className="flex flex-wrap gap-2">
              {([
                ["week", "按周"],
                ["day", "按日"],
                ["month", "按月"],
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
                emptyLabel="暂无可用于展示的趋势数据"
              />
            </div>
          </Panel>
        </div>
      </section>

      {/* Ranking + Recent — two columns */}
      <section className="grid gap-5 md:grid-cols-2">
        <Panel
          title="对象排行"
          description="按累计支出排序，方便快速看出主要消费重心。"
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
                      {objectKindLabels[summary.object.kind]} · {summary.transactionCount} 笔 · {summary.dominantCategory}
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
          title="最近记账"
          description="最近几笔支出会优先展示，方便你快速回看。"
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
              <EmptyState message="还没有支出记录，先去记一笔。" />
            )}
          </div>
        </Panel>
      </section>

      {/* Category structure + Recent activity */}
      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr] content-auto-block">
        <div className="grid gap-5 md:grid-cols-2">
          <Panel title="分类结构" description="看清最近的钱主要花在什么地方。">
            <CategoryBreakdownBars items={categoryBreakdown} />
          </Panel>

          <Panel title="最近动态" description="工作区内最近发生的关键变更。">
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
                <EmptyState message="当前还没有可展示的动态。" />
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
