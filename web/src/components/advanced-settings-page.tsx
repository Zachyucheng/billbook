"use client";

import { useMemo, useState, useTransition } from "react";
import { DesktopRuntimePanel } from "@/components/desktop-runtime-panel";
import { useBillbook } from "@/components/billbook-provider";
import { Modal, Panel } from "@/components/workspace-ui";

type EditingLongTermCategory = {
  id: string;
  name: string;
  cycleDays: string;
};

type NoticeModalState = {
  title: string;
  description: string;
};

type DeleteModalState = {
  id: string;
  name: string;
  objectName: string;
};

export function AdvancedSettingsPageContent() {
  const {
    state,
    permissions,
    updateHistoryDisplaySettings,
    addLongTermCategory,
    updateLongTermCategory,
    deleteLongTermCategory,
  } = useBillbook();
  const [isPending, startTransition] = useTransition();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCycleDays, setNewCycleDays] = useState("30");
  const [historyPeriodDays, setHistoryPeriodDays] = useState(
    String(state.advancedSettings.historyDisplay.periodDays),
  );
  const [selectedObjectId, setSelectedObjectId] = useState(state.objects[0]?.id ?? "");
  const [editingCategory, setEditingCategory] = useState<EditingLongTermCategory | null>(null);
  const [noticeModal, setNoticeModal] = useState<NoticeModalState | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null);

  const effectiveObjectId = state.objects.some((ledgerObject) => ledgerObject.id === selectedObjectId)
    ? selectedObjectId
    : (state.objects[0]?.id ?? "");
  const selectedObject =
    state.objects.find((ledgerObject) => ledgerObject.id === effectiveObjectId) ?? null;
  const categoryMap = useMemo(
    () => new Map(state.categories.map((category) => [category.id, category])),
    [state.categories],
  );
  const selectedObjectCategories = useMemo(() => {
    if (!selectedObject) {
      return [];
    }

    return state.categories.filter(
      (category) =>
        category.kind === "expense" && selectedObject.categoryIds.includes(category.id),
    );
  }, [selectedObject, state.categories]);
  const longTermCategories = useMemo(
    () =>
      state.advancedSettings.longTermCategories
        .filter((setting) => setting.objectId === effectiveObjectId)
        .map((setting) => ({
          ...setting,
          categoryName: categoryMap.get(setting.categoryId)?.name ?? setting.categoryId,
        }))
        .sort((left, right) => left.categoryName.localeCompare(right.categoryName, "zh-CN")),
    [categoryMap, effectiveObjectId, state.advancedSettings.longTermCategories],
  );
  const previewPeriodDays = Math.max(
    1,
    Number.parseInt(historyPeriodDays, 10) || state.advancedSettings.historyDisplay.periodDays,
  );

  const hasDuplicateCategoryName = (name: string, excludeSettingId?: string) => {
    const normalizedName = name.trim().toLowerCase();

    if (!normalizedName || !selectedObject) {
      return false;
    }

    const excludedCategoryId = excludeSettingId
      ? state.advancedSettings.longTermCategories.find((setting) => setting.id === excludeSettingId)
          ?.categoryId
      : null;

    return selectedObjectCategories.some(
      (category) =>
        category.id !== excludedCategoryId &&
        category.name.trim().toLowerCase() === normalizedName,
    );
  };

  const handleCreateLongTermCategory = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!effectiveObjectId || !selectedObject) {
      return;
    }

    if (hasDuplicateCategoryName(newCategoryName)) {
      setNoticeModal({
        title: "分类已存在",
        description: `“${selectedObject.name}”下已经有同名分类，请换一个名称。`,
      });
      return;
    }

    startTransition(() => {
      addLongTermCategory({
        objectId: effectiveObjectId,
        name: newCategoryName,
        cycleDays: Number.parseInt(newCycleDays, 10),
      });
    });

    setNewCategoryName("");
    setNewCycleDays("30");
  };

  const handleSaveEditingCategory = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingCategory) {
      return;
    }

    if (hasDuplicateCategoryName(editingCategory.name, editingCategory.id)) {
      setNoticeModal({
        title: "分类名称冲突",
        description: "当前对象下已经存在同名分类，请修改后再保存。",
      });
      return;
    }

    startTransition(() => {
      updateLongTermCategory(editingCategory.id, {
        name: editingCategory.name,
        cycleDays: Number.parseInt(editingCategory.cycleDays, 10),
      });
    });

    setEditingCategory(null);
  };

  return (
    <div className="space-y-5">
      <section className="panel panel-strong rounded-[28px] p-5 lg:p-6">
        <p className="type-kicker">Advanced</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">高级规则</h2>

      </section>

      <Panel
        title="长期消费分类"
  
      >
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {state.objects.map((ledgerObject) => {
              const active = ledgerObject.id === effectiveObjectId;

              return (
                <button
                  key={ledgerObject.id}
                  type="button"
                  onClick={() => {
                    setSelectedObjectId(ledgerObject.id);
                    setEditingCategory(null);
                  }}
                  className={`rounded-full border px-3 py-2 text-sm transition ${
                    active
                      ? "border-transparent bg-[color:var(--foreground)] text-white"
                      : "border-[color:var(--line)] bg-[color:var(--surface-strong)] text-foreground"
                  }`}
                >
                  {ledgerObject.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
          <form
            className="surface-strong rounded-[22px] border border-[color:var(--line)] p-4"
            onSubmit={handleCreateLongTermCategory}
          >
            <div className="space-y-4">
              <div>
                <p className="type-label">新增长期分类</p>

              </div>

              <label className="block">
                <span className="text-sm font-medium">分类名称</span>
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  className="ui-control mt-2 w-full disabled:opacity-60"
                  placeholder="例如：理发"
                  disabled={!permissions.canEdit}
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">默认周期天数</span>
                <input
                  value={newCycleDays}
                  onChange={(event) => setNewCycleDays(event.target.value)}
                  className="ui-control mt-2 w-full disabled:opacity-60"
                  type="number"
                  min="2"
                  step="1"
                  disabled={!permissions.canEdit}
                  required
                />
              </label>

              <div className="rounded-[18px] bg-[color:var(--accent-soft)] px-3 py-3 text-sm leading-6 text-[color:var(--muted)]">
                默认周期只影响之后的新记账，不会回改历史记录。
              </div>

              <button
                type="submit"
                disabled={!permissions.canEdit || isPending || !effectiveObjectId}
                className="ui-button w-full btn-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "保存中..." : "新增长期分类"}
              </button>
            </div>
          </form>

          <section className="surface-strong overflow-hidden rounded-[22px] border border-[color:var(--line)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--line)] px-4 py-4">
              <div>
                <p className="text-sm font-medium">已配置分类</p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {selectedObject
                    ? `${selectedObject.name} 下共有 ${longTermCategories.length} 项`
                    : "请选择一个对象"}
                </p>
              </div>
              <span className="rounded-full bg-[#0f8a78]/10 px-3 py-1 text-xs font-medium text-[#0f8a78]">
                默认周期
              </span>
            </div>

            {longTermCategories.length === 0 ? (
              <div className="px-5 py-10 text-sm leading-6 text-[color:var(--muted)]">
                这个对象下还没有长期消费分类。
              </div>
            ) : (
              <div className="max-h-[460px] overflow-y-auto px-3 py-3">
                <div className="space-y-3">
                  {longTermCategories.map((setting) => (
                    <article
                      key={setting.id}
                      className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-solid)] px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#0f8a78]" />
                            <h3 className="truncate text-sm font-semibold">{setting.categoryName}</h3>
                            <span className="shrink-0 rounded-full bg-[#0f8a78]/10 px-2.5 py-1 text-xs font-medium text-[#0f8a78]">
                              {setting.cycleDays} 天
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                            删除后，该分类历史记录会并入“其它”。
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={!permissions.canEdit || isPending}
                            onClick={() =>
                              setEditingCategory({
                                id: setting.id,
                                name: setting.categoryName,
                                cycleDays: String(setting.cycleDays),
                              })
                            }
                            className="ui-button border border-[color:var(--line)] bg-[color:var(--surface-strong)] disabled:opacity-50"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            disabled={!permissions.canEdit || isPending}
                            onClick={() =>
                              setDeleteModal({
                                id: setting.id,
                                name: setting.categoryName,
                                objectName: selectedObject?.name ?? "当前对象",
                              })
                            }
                            className="ui-button border border-[#cf6c4a]/20 bg-[#cf6c4a]/10 text-[#a44a2d] disabled:opacity-50"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </Panel>

      <Panel
        title="历史账提示"
  
      >
        <form
          className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]"
          onSubmit={(event) => {
            event.preventDefault();

            startTransition(() => {
              updateHistoryDisplaySettings({
                periodDays: Number.parseInt(historyPeriodDays, 10),
              });
            });
          }}
        >
          <div className="surface-strong rounded-[22px] border border-[color:var(--line)] p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-[color:var(--line)]"
                checked={state.advancedSettings.historyDisplay.enabled}
                disabled={!permissions.canEdit || isPending}
                onChange={(event) =>
                  startTransition(() => {
                    updateHistoryDisplaySettings({
                      enabled: event.target.checked,
                    });
                  })
                }
              />
              <span>
                <span className="block text-base font-semibold">开启历史账提示</span>
                <span className="mt-1 block text-sm leading-6 text-[color:var(--muted)]">
                  打开后，最近消费卡片会显示对比信息。
                </span>
              </span>
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-medium">统计周期天数</span>
              <input
                value={historyPeriodDays}
                onChange={(event) => setHistoryPeriodDays(event.target.value)}
                className="ui-control mt-2 w-full disabled:opacity-60"
                type="number"
                min="1"
                step="1"
                disabled={!permissions.canEdit || !state.advancedSettings.historyDisplay.enabled}
                required
              />
            </label>

            <button
              type="submit"
              disabled={!permissions.canEdit || !state.advancedSettings.historyDisplay.enabled || isPending}
              className="ui-button mt-4 w-full btn-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              保存统计周期
            </button>
          </div>

          <div className="surface-strong rounded-[22px] border border-[color:var(--line)] p-4">
            <p className="text-sm font-medium">效果预览</p>
            <div className="mt-4 rounded-[20px] border border-[color:var(--line)] bg-[color:var(--surface-solid)] p-4">
              <p className="font-medium">早餐</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">5 月 1 日</p>
              {state.advancedSettings.historyDisplay.enabled ? (
                <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                  上一次早餐为 18.00 元，{previewPeriodDays} 天平均为 16.20 元。
                </p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                  关闭后，卡片只显示基础消费信息。
                </p>
              )}
            </div>
          </div>
        </form>
      </Panel>

      <section className="content-auto-block">
        <DesktopRuntimePanel />
      </section>

      <Modal
        open={Boolean(editingCategory)}
        title="编辑长期消费分类"

        onClose={() => setEditingCategory(null)}
      >
        {editingCategory ? (
          <form className="space-y-4" onSubmit={handleSaveEditingCategory}>
            <label className="block">
              <span className="text-sm font-medium">分类名称</span>
              <input
                value={editingCategory.name}
                onChange={(event) =>
                  setEditingCategory((current) =>
                    current ? { ...current, name: event.target.value } : current,
                  )
                }
                className="ui-control mt-2 w-full"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">默认消费周期天数</span>
              <input
                value={editingCategory.cycleDays}
                onChange={(event) =>
                  setEditingCategory((current) =>
                    current ? { ...current, cycleDays: event.target.value } : current,
                  )
                }
                className="ui-control mt-2 w-full"
                type="number"
                min="2"
                step="1"
                required
              />
            </label>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="ui-button border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="ui-button btn-accent disabled:opacity-50"
              >
                保存修改
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(deleteModal)}
        title="删除长期消费分类"
        description={
          deleteModal
            ? `将从“${deleteModal.objectName}”中移除“${deleteModal.name}”。`
            : undefined
        }
        onClose={() => setDeleteModal(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteModal(null)}
              className="ui-button border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
            >
              取消
            </button>
            <button
              type="button"
              disabled={isPending || !deleteModal}
              onClick={() => {
                if (!deleteModal) {
                  return;
                }

                startTransition(() => {
                  deleteLongTermCategory(deleteModal.id);
                });
                setDeleteModal(null);
              }}
              className="ui-button bg-[#cf6c4a] text-white disabled:opacity-50"
            >
              确认删除
            </button>
          </>
        }
      >
        <div className="rounded-[18px] bg-[#cf6c4a]/10 px-4 py-3 text-sm leading-6 text-[#a44a2d]">
          删除后，相关记录不会被重新计算，只会回归为普通消费分类。
        </div>
      </Modal>

      <Modal
        open={Boolean(noticeModal)}
        title={noticeModal?.title ?? "提示"}
        description={noticeModal?.description}
        onClose={() => setNoticeModal(null)}
        footer={
          <button
            type="button"
            onClick={() => setNoticeModal(null)}
            className="ui-button btn-accent"
          >
            知道了
          </button>
        }
      >
        <div className="rounded-[18px] bg-[color:var(--accent-soft)] px-4 py-3 text-sm leading-6 text-[color:var(--muted)]">
          为避免同一对象下出现重名分类，系统会要求你使用新的名称。
        </div>
      </Modal>
    </div>
  );
}
