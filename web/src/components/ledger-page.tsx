"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { useBillbook } from "@/components/billbook-provider";
import { CategoryBreakdownBars } from "@/components/category-breakdown-bars";
import {
  formatCurrency,
  formatShortDate,
  getCategoryBreakdown,
  getDailySeries,
  getObjectSummary,
  getObjectTransactions,
  getTransactionHistoryInsight,
} from "@/lib/analytics";
import { Modal, Panel, TransactionComposer } from "@/components/workspace-ui";
import { TrendLineChart } from "@/components/trend-line-chart";
import { workspaceRoutes } from "@/lib/routes";
import Link from "next/link";

type EditingTransaction = {
  id: string;
  title: string;
  amount: string;
  date: string;
  categoryId: string;
  spreadDays: string;
};

export function LedgerPage({ initialObjectId }: { initialObjectId?: string }) {
  const { state, addTransaction, updateTransaction, deleteTransaction, permissions } = useBillbook();
  const [preferredObjectId, setPreferredObjectId] = useState<string | null>(
    initialObjectId ?? null,
  );
  const [isSwitching, startSwitchTransition] = useTransition();
  const [editingTransaction, setEditingTransaction] = useState<EditingTransaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);

  const selectedObjectId =
    preferredObjectId && state.objects.some((item) => item.id === preferredObjectId)
      ? preferredObjectId
      : initialObjectId && state.objects.some((item) => item.id === initialObjectId)
        ? initialObjectId
        : (state.objects[0]?.id ?? "");

  const deferredObjectId = useDeferredValue(selectedObjectId);
  const effectiveObjectId = state.objects.some((item) => item.id === deferredObjectId)
    ? deferredObjectId
    : (state.objects[0]?.id ?? "");

  const selectedObject = useMemo(
    () => state.objects.find((item) => item.id === effectiveObjectId) ?? null,
    [effectiveObjectId, state.objects],
  );
  const summary = useMemo(
    () => getObjectSummary(state, effectiveObjectId),
    [effectiveObjectId, state],
  );
  const objectTransactions = useMemo(
    () => getObjectTransactions(state, effectiveObjectId).slice(0, 8),
    [effectiveObjectId, state],
  );
  const categoryBreakdown = useMemo(
    () => getCategoryBreakdown(state, effectiveObjectId),
    [effectiveObjectId, state],
  );
  const dailySeries = useMemo(
    () => getDailySeries(state, effectiveObjectId),
    [effectiveObjectId, state],
  );
  const longTermCategoryMap = useMemo(
    () =>
      new Map(
        state.advancedSettings.longTermCategories.map((setting) => [setting.categoryId, setting]),
      ),
    [state.advancedSettings.longTermCategories],
  );
  const objectCategoryOptions = useMemo(() => {
    if (!selectedObject) {
      return [];
    }

    return state.categories.filter(
      (category) =>
        category.kind === "expense" && selectedObject.categoryIds.includes(category.id),
    );
  }, [selectedObject, state.categories]);
  const historyInsightMap = useMemo(() => {
    if (!effectiveObjectId || !state.advancedSettings.historyDisplay.enabled) {
      return new Map();
    }

    return new Map(
      objectTransactions.map((transaction) => [
        transaction.id,
        getTransactionHistoryInsight(
          state,
          transaction,
          effectiveObjectId,
          state.advancedSettings.historyDisplay.periodDays,
        ),
      ]),
    );
  }, [effectiveObjectId, objectTransactions, state]);
  const objectCards = useMemo(
    () =>
      state.objects.map((ledgerObject) => ({
        object: ledgerObject,
        summary: getObjectSummary(state, ledgerObject.id),
      })),
    [state],
  );

  if (!state.objects.length) {
    return (
      <section className="panel panel-strong rounded-[20px] p-4">
        <h2 className="text-lg font-semibold tracking-tight">请先在设置页创建消费对象</h2>
      </section>
    );
  }

  if (!selectedObject || !summary) {
    return null;
  }

  const activeEditingCategoryId =
    editingTransaction?.categoryId || objectCategoryOptions[0]?.id || "";
  const activeEditingLongTermSetting = longTermCategoryMap.get(activeEditingCategoryId);
  const deletingTransaction =
    objectTransactions.find((transaction) => transaction.id === deletingTransactionId) ?? null;

  const selectObject = (objectId: string) => {
    if (objectId === selectedObjectId) {
      return;
    }

    startSwitchTransition(() => {
      setPreferredObjectId(objectId);
    });

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("objectId", objectId);
      window.history.replaceState(null, "", `${workspaceRoutes.ledger}?${params.toString()}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Object selector — compact chips row */}
      <div className="flex flex-wrap items-center gap-2">
        {objectCards.map(({ object, summary: objectSummary }) => {
          const active = object.id === selectedObjectId;

          return (
            <button
              key={object.id}
              type="button"
              onClick={() => selectObject(object.id)}
              className={`rounded-[10px] border px-2.5 py-1.5 text-left transition ${
                active
                  ? "border-[color:var(--accent-soft)] bg-[color:var(--surface-solid)]"
                  : "border-[color:var(--line)] bg-[color:var(--surface-strong)] hover:bg-[color:var(--surface-solid)]"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{object.name}</span>
                <span className="text-[11px] text-[color:var(--muted)]">
                  {formatCurrency(objectSummary?.expense ?? 0)}
                </span>
              </div>
            </button>
          );
        })}
        <Link
          href={workspaceRoutes.settings}
          className="rounded-[10px] border border-dashed border-[color:var(--line)] px-2.5 py-1.5 text-[11px] text-[color:var(--muted)] transition hover:border-solid hover:bg-[color:var(--surface-soft)]"
        >
          管理对象
        </Link>
      </div>

      {/* Main: equal-height two-column row */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="min-w-0 flex-1">
          <TransactionComposer onSubmit={addTransaction} objectId={selectedObject.id} className="h-full" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {summary.transactionCount > 0 && (
            <div className="mb-3 grid shrink-0 grid-cols-2 gap-2">
              <MiniStat label="累计" value={formatCurrency(summary.expense)} />
              <MiniStat label="笔数" value={`${summary.transactionCount}`} />
            </div>
          )}

          <Panel title="最近消费" className="max-h-[380px] flex flex-col" contentClassName="flex-1 min-h-0 overflow-y-auto hide-scrollbar">
            <div className="space-y-2">
              {objectTransactions.length > 0 ? (
                objectTransactions.map((transaction) => {
                  const longTermSetting = longTermCategoryMap.get(transaction.categoryId);

                  return (
                    <div
                      key={transaction.id}
                      className="surface-strong rounded-[12px] border border-[color:var(--line)] px-3 py-2"
                      style={{
                        borderColor: longTermSetting?.color ?? undefined,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm font-medium">{transaction.title}</p>
                            {longTermSetting ? (
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                                style={{
                                  color: longTermSetting.color,
                                  backgroundColor: hexToRgba(longTermSetting.color, 0.1),
                                }}
                              >
                                {transaction.spreadDays ?? 1}天
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                            {formatShortDate(transaction.date)}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="font-display text-sm font-semibold tracking-tight">
                            {formatCurrency(transaction.amount)}
                          </p>
                          <button
                            type="button"
                            disabled={!permissions.canEdit}
                            onClick={() =>
                              setEditingTransaction({
                                id: transaction.id,
                                title: transaction.title,
                                amount: String(transaction.amount),
                                date: transaction.date,
                                categoryId: transaction.categoryId,
                                spreadDays: String(transaction.spreadDays ?? 1),
                              })
                            }
                            className="mt-1 text-[10px] font-medium text-[color:var(--accent)] disabled:opacity-50"
                          >
                            编辑
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-[120px] items-center justify-center rounded-[14px] border border-dashed border-[color:var(--line)] text-sm text-[color:var(--muted)]">
                  还没有消费记录
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* Analytics — equal-height row */}
      <div className="grid gap-4 md:grid-cols-2 content-auto-block">
        <Panel title="分类分析" className="flex flex-col h-full">
          <CategoryBreakdownBars items={categoryBreakdown} />
        </Panel>

        <Panel title="近 7 天趋势" className="flex flex-col h-full">
          <TrendLineChart
            points={dailySeries}
            accent="var(--accent)"
            height={180}
            emptyLabel="暂无可展示的每日支出数据"
          />
        </Panel>
      </div>

      {/* Edit modal */}
      <Modal
        open={Boolean(editingTransaction)}
        title="编辑消费记录"
        onClose={() => {
          setEditingTransaction(null);
          setDeletingTransactionId(null);
        }}
      >
        {editingTransaction ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();

              updateTransaction(editingTransaction.id, {
                amount: Number.parseFloat(editingTransaction.amount),
                date: editingTransaction.date,
                categoryId: activeEditingCategoryId,
                spreadDays: activeEditingLongTermSetting
                  ? Number.parseInt(editingTransaction.spreadDays, 10)
                  : undefined,
              });
              setEditingTransaction(null);
              setDeletingTransactionId(null);
            }}
          >
            <label className="block">
              <span className="text-sm font-medium">消费分类</span>
              <div className="mt-2 flex max-h-[180px] flex-wrap gap-2 overflow-y-auto hide-scrollbar">
                {objectCategoryOptions.map((category) => {
                  const active = category.id === activeEditingCategoryId;
                  const longTermSetting = longTermCategoryMap.get(category.id);
                  const activeStyle = longTermSetting
                    ? {
                        backgroundColor: longTermSetting.color,
                        borderColor: longTermSetting.color,
                        color: "#ffffff",
                      }
                    : undefined;
                  const inactiveStyle = longTermSetting
                    ? {
                        borderColor: longTermSetting.color,
                        color: longTermSetting.color,
                        backgroundColor: hexToRgba(longTermSetting.color, 0.08),
                      }
                    : undefined;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() =>
                        setEditingTransaction((current) =>
                          current
                            ? {
                                ...current,
                                categoryId: category.id,
                                spreadDays: longTermSetting
                                  ? String(longTermSetting.cycleDays)
                                  : "",
                              }
                            : current,
                        )
                      }
                      style={active ? activeStyle : inactiveStyle}
                      className={`ui-chip inline-flex max-w-full items-center gap-2 overflow-hidden border transition ${
                        active
                          ? "border-transparent btn-accent"
                          : "border-[color:var(--line)] bg-[color:var(--surface-strong)] text-foreground hover:bg-[color:var(--surface-solid)]"
                      }`}
                    >
                      {longTermSetting ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                      ) : null}
                      <span className="truncate">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">消费金额</span>
                <input
                  value={editingTransaction.amount}
                  onChange={(event) =>
                    setEditingTransaction((current) =>
                      current ? { ...current, amount: event.target.value } : current,
                    )
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  className="ui-control mt-2 w-full"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">消费日期</span>
                <input
                  value={editingTransaction.date}
                  onChange={(event) =>
                    setEditingTransaction((current) =>
                      current ? { ...current, date: event.target.value } : current,
                    )
                  }
                  type="date"
                  className="ui-control mt-2 w-full"
                  required
                />
              </label>
            </div>

            {activeEditingLongTermSetting ? (
              <label className="block">
                <span className="text-sm font-medium">本次消费周期</span>
                <input
                  value={editingTransaction.spreadDays}
                  onChange={(event) =>
                    setEditingTransaction((current) =>
                      current ? { ...current, spreadDays: event.target.value } : current,
                    )
                  }
                  type="number"
                  min="2"
                  step="1"
                  className="ui-control mt-2 w-full"
                  required
                />
              </label>
            ) : null}

            <div className="flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={() => setDeletingTransactionId(editingTransaction.id)}
                className="ui-button border border-[#cf6c4a]/20 bg-[#cf6c4a]/10 text-[#a44a2d]"
              >
                删除记录
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTransaction(null);
                    setDeletingTransactionId(null);
                  }}
                  className="ui-button border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!permissions.canEdit || !activeEditingCategoryId}
                  className="ui-button btn-accent disabled:opacity-50"
                >
                  保存修改
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* Delete modal */}
      <Modal
        open={Boolean(deletingTransactionId)}
        title="删除消费记录"
        onClose={() => setDeletingTransactionId(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeletingTransactionId(null)}
              className="ui-button border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!deletingTransactionId}
              onClick={() => {
                if (!deletingTransactionId) {
                  return;
                }

                deleteTransaction(deletingTransactionId);
                setDeletingTransactionId(null);
                setEditingTransaction(null);
              }}
              className="ui-button bg-[#cf6c4a] text-white disabled:opacity-50"
            >
              确认删除
            </button>
          </>
        }
      >
        <div className="rounded-[18px] bg-[#cf6c4a]/10 px-4 py-3 text-sm leading-6 text-[#a44a2d]">
          删除后，这条记录会从当前对象的统计与列表中一并移除。
        </div>
      </Modal>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-strong rounded-[10px] border border-[color:var(--line)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-[color:var(--muted)]">{label}</p>
      <p className="font-display text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");

  if (normalized.length !== 6) {
    return hex;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
