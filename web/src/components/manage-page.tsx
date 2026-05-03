"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useRef, useState, useTransition } from "react";
import { useBillbook } from "@/components/billbook-provider";
import { UiSelect } from "@/components/ui-select";
import { Modal, Panel, objectKindLabels } from "@/components/workspace-ui";
import { CurrencyCode, ObjectKind, ThemePreset, WorkspaceLanguage } from "@/lib/types";
import { workspaceRoutes } from "@/lib/routes";

const themeOptions: Array<{
  value: ThemePreset;
  label: string;
  tones: [string, string, string];
}> = [
  { value: "fern", label: "森绿", tones: ["#17806d", "#9ed9cd", "#f6f3ec"] },
  { value: "ember", label: "暖陶", tones: ["#cf6c4a", "#f3bf96", "#f7efe6"] },
  { value: "ocean", label: "海蓝", tones: ["#3c6ca8", "#8db7e4", "#eef4f8"] },
  { value: "sand", label: "沙金", tones: ["#b7821e", "#e4c37f", "#f6f0e4"] },
  { value: "berry", label: "莓红", tones: ["#b24f7a", "#e2a3bc", "#f7edf1"] },
  { value: "dusk", label: "深夜", tones: ["#7eb2ff", "#2c3b4a", "#11161c"] },
];

const creatableObjectKinds: ObjectKind[] = [
  "partner",
  "family",
  "pet",
  "vehicle",
  "home",
  "project",
  "other",
];

const languageOptions: Array<{ value: WorkspaceLanguage; label: string }> = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en-US", label: "English" },
];

const currencyOptions: Array<{ value: CurrencyCode; label: string }> = [
  { value: "CNY", label: "人民币" },
  { value: "USD", label: "美元" },
];

type PendingDeleteCategoryState = {
  objectId: string;
  categoryId: string;
  categoryName: string;
} | null;

export function ManagePage() {
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const [draftCategory, setDraftCategory] = useState("");
  const [pendingDeleteCategory, setPendingDeleteCategory] =
    useState<PendingDeleteCategoryState>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [objectName, setObjectName] = useState("");
  const [objectNote, setObjectNote] = useState("");
  const [objectKind, setObjectKind] = useState<ObjectKind>("partner");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const {
    addCategoryToObject,
    addObject,
    backupData,
    clearData,
    exportData,
    importData,
    lastBackupAt,
    permissions,
    removeCategoryFromObject,
    state,
    updatePreferences,
  } = useBillbook();

  const categoryMap = useMemo(
    () => new Map(state.categories.map((category) => [category.id, category])),
    [state.categories],
  );

  const objectOptions = useMemo(
    () =>
      state.objects.map((ledgerObject) => ({
        value: ledgerObject.id,
        label: `${ledgerObject.name} · ${objectKindLabels[ledgerObject.kind]}`,
      })),
    [state.objects],
  );

  const effectiveSelectedObjectId = state.objects.some(
    (ledgerObject) => ledgerObject.id === selectedObjectId,
  )
    ? selectedObjectId
    : (state.objects[0]?.id ?? "");

  const selectedObject =
    state.objects.find((ledgerObject) => ledgerObject.id === effectiveSelectedObjectId) ?? null;

  const selectedObjectCategories = useMemo(() => {
    if (!selectedObject) {
      return [];
    }

    return selectedObject.categoryIds
      .map((categoryId) => categoryMap.get(categoryId))
      .filter((category) => category?.kind === "expense");
  }, [categoryMap, selectedObject]);

  const submitCategory = () => {
    const nextCategory = draftCategory.trim();

    if (!selectedObject || !nextCategory) {
      return;
    }

    addCategoryToObject(selectedObject.id, nextCategory);
    setDraftCategory("");
  };

  const deleteCategory = () => {
    if (!pendingDeleteCategory) {
      return;
    }

    setPendingDeleteCategory(null);
    removeCategoryFromObject(pendingDeleteCategory.objectId, pendingDeleteCategory.categoryId);
  };

  const handleImportTrigger = () => {
    importInputRef.current?.click();
  };

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await importData(file);
    event.target.value = "";
  };

  const backupLabel = formatBackupTime(lastBackupAt);
  const expenseCount = state.transactions.filter((item) => item.kind === "expense").length;

  return (
    <div className="space-y-4">
      <section className="panel panel-strong rounded-[24px] p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="type-kicker">Settings</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">工作区设置</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={workspaceRoutes.home}
              className="ui-button border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
            >
              账户与会话
            </Link>
            <Link
              href={workspaceRoutes.advanced}
              className="ui-button border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
            >
              高级规则
            </Link>
          </div>
        </div>
      </section>

      <Panel title="显示偏好">
          <div className="space-y-4">
            <SettingGroup label="主题">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updatePreferences({ theme: option.value })}
                    className={`rounded-[14px] border p-2.5 text-left transition ${
                      state.preferences.theme === option.value
                        ? "border-transparent bg-[color:var(--foreground)] text-white"
                        : "border-[color:var(--line)] bg-[color:var(--surface-strong)]"
                    }`}
                  >
                    <div className="flex gap-1.5">
                      {option.tones.map((tone) => (
                        <span
                          key={tone}
                          className="h-5 flex-1 rounded-full"
                          style={{ backgroundColor: tone }}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-sm font-medium">{option.label}</p>
                  </button>
                ))}
              </div>
            </SettingGroup>

            <div className="grid gap-4 md:grid-cols-2">
              <SettingGroup label="语言">
                <OptionRow>
                  {languageOptions.map((option) => (
                    <ChoiceButton
                      key={option.value}
                      active={state.preferences.language === option.value}
                      onClick={() => updatePreferences({ language: option.value })}
                    >
                      {option.label}
                    </ChoiceButton>
                  ))}
                </OptionRow>
              </SettingGroup>

              <SettingGroup label="货币">
                <OptionRow>
                  {currencyOptions.map((option) => (
                    <ChoiceButton
                      key={option.value}
                      active={state.preferences.currency === option.value}
                      onClick={() => updatePreferences({ currency: option.value })}
                    >
                      {option.label}
                    </ChoiceButton>
                  ))}
                </OptionRow>
              </SettingGroup>
            </div>
          </div>
        </Panel>

      {/* 对象管理 — 新增与分类合并为一行 */}
      <Panel title="对象管理" className="overflow-visible">
        <div className="flex flex-wrap gap-4">
          {/* 新增对象 */}
          <div className="min-w-0 flex-1 basis-[240px]">
            <p className="type-label mb-2">新建对象</p>
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!permissions.canEdit) return;
                startTransition(() => {
                  addObject({ name: objectName, kind: objectKind, note: objectNote });
                });
                setObjectName("");
                setObjectNote("");
                setObjectKind("partner");
              }}
            >
              <div className="flex gap-2">
                <input
                  value={objectName}
                  onChange={(event) => setObjectName(event.target.value)}
                  placeholder="对象名称"
                  disabled={!permissions.canEdit}
                  className="ui-control flex-1"
                  required
                />
                <UiSelect
                  value={objectKind}
                  onChange={(nextValue) => setObjectKind(nextValue as ObjectKind)}
                  disabled={!permissions.canEdit}
                  options={creatableObjectKinds.map((item) => ({
                    value: item,
                    label: objectKindLabels[item],
                  }))}
                />
              </div>
              <div className="flex gap-2">
                <input
                  value={objectNote}
                  onChange={(event) => setObjectNote(event.target.value)}
                  disabled={!permissions.canEdit}
                  placeholder="可选说明"
                  className="ui-control flex-1"
                />
                <button
                  type="submit"
                  disabled={isPending || !permissions.canEdit}
                  className="ui-button btn-accent"
                >
                  {isPending ? "..." : "创建"}
                </button>
              </div>
            </form>
          </div>

          {/* 对象与分类 */}
          <div className="min-w-0 flex-[2] basis-[320px]">
            <p className="type-label mb-2">管理分类</p>
            <div className="flex flex-col gap-2.5">
              <UiSelect
                value={effectiveSelectedObjectId}
                options={objectOptions}
                onChange={(value) => {
                  setSelectedObjectId(value);
                  setDraftCategory("");
                }}
                placeholder="选择对象"
              />
              {selectedObject ? (
                <div className="surface-soft rounded-[14px] border border-[color:var(--line)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{selectedObject.name}</p>
                    <span className="text-xs text-[color:var(--muted)]">
                      {selectedObjectCategories.length} 个分类
                    </span>
                  </div>
                  <div className="mt-2 flex min-h-[36px] flex-wrap gap-1.5">
                    {selectedObjectCategories.map((category) => {
                      if (!category) return null;
                      const isProtectedCategory = category.id === "cat-other";
                      return (
                        <div
                          key={category.id}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                            isProtectedCategory
                              ? "border-transparent bg-[color:var(--foreground)] text-white"
                              : "border-[color:var(--line)] bg-[color:var(--surface-strong)]"
                          }`}
                        >
                          <span>{category.name}</span>
                          {!isProtectedCategory && (
                            <button
                              type="button"
                              onClick={() =>
                                setPendingDeleteCategory({
                                  objectId: selectedObject.id,
                                  categoryId: category.id,
                                  categoryName: category.name,
                                })
                              }
                              className="rounded-full bg-black/5 px-1.5 py-0.5 text-[11px] text-[color:var(--muted)]"
                            >
                              移除
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={draftCategory}
                      onChange={(event) => setDraftCategory(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          submitCategory();
                        }
                      }}
                      placeholder={`为 ${selectedObject.name} 新增分类`}
                      className="ui-control flex-1"
                    />
                    <ActionButton onClick={submitCategory}>新增</ActionButton>
                  </div>
                </div>
              ) : (
                <div className="flex h-[80px] items-center justify-center rounded-[14px] border border-dashed border-[color:var(--line)] text-sm text-[color:var(--muted)]">
                  选择对象后管理分类
                </div>
              )}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="数据管理">
        <div className="grid gap-3 md:grid-cols-3">
          <DataCard label="对象数量" value={`${state.objects.length}`} />
          <DataCard label="支出笔数" value={`${expenseCount}`} />
          <DataCard label="数据位置" value="浏览器本地" />
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <p className="type-label">导出</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <ActionButton onClick={() => exportData("json")}>JSON</ActionButton>
              <ActionButton onClick={() => exportData("csv")}>CSV</ActionButton>
              <ActionButton onClick={() => exportData("excel")}>Excel</ActionButton>
            </div>
          </div>
          <div>
            <p className="type-label">导入与备份</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <ActionButton onClick={handleImportTrigger}>导入 JSON</ActionButton>
              <ActionButton onClick={backupData}>创建备份</ActionButton>
              <DangerButton onClick={() => setClearConfirmOpen(true)}>清空本地数据</DangerButton>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportChange}
              className="hidden"
            />
          </div>
        </div>
      </Panel>

      <Modal
        open={Boolean(pendingDeleteCategory)}
        title="确认删除分类"
        description={
          pendingDeleteCategory
            ? `删除“${pendingDeleteCategory.categoryName}”后，相关记录会自动归并到“其它”。`
            : undefined
        }
        onClose={() => setPendingDeleteCategory(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setPendingDeleteCategory(null)}
              className="ui-button border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={deleteCategory}
              className="ui-button border border-[#cf6c4a]/25 bg-[#fff4f0] text-[#b24f2f]"
            >
              确认删除
            </button>
          </>
        }
      >
        <div className="rounded-[18px] bg-[#fff5ef] px-4 py-3 text-sm leading-6 text-[#b24f2f]">
          建议在清理分类前先导出一份当前账本。
        </div>
      </Modal>

      <Modal
        open={clearConfirmOpen}
        title="清空本地数据"
        description="这会移除当前浏览器中的对象、交易、分类与计划。"
        onClose={() => setClearConfirmOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setClearConfirmOpen(false)}
              className="ui-button border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                setClearConfirmOpen(false);
                clearData();
              }}
              className="ui-button border border-[#cf6c4a]/25 bg-[#fff4f0] text-[#b24f2f]"
            >
              确认清空
            </button>
          </>
        }
      >
        <div className="rounded-[18px] bg-[#fff5ef] px-4 py-3 text-sm leading-6 text-[#b24f2f]">
          如果你之后还需要恢复这套账本，请先创建备份或导出 JSON 文件。
        </div>
      </Modal>
    </div>
  );
}

function SettingGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="type-label">{label}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function OptionRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ui-chip border transition ${
        active
          ? "border-transparent bg-[color:var(--foreground)] text-white"
          : "border-[color:var(--line)] bg-[color:var(--surface-strong)]"
      }`}
    >
      {children}
    </button>
  );
}

function ActionButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ui-button border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
    >
      {children}
    </button>
  );
}

function DangerButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ui-button border border-[#cf6c4a]/25 bg-[#fff4f0] text-[#b24f2f]"
    >
      {children}
    </button>
  );
}

function DataCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="surface-strong rounded-[14px] border border-[color:var(--line)] p-3">
      <p className="type-label">{label}</p>
      <p className="mt-1.5 font-display text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function formatBackupTime(value: string | null) {
  if (!value) {
    return "未备份";
  }

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "未备份";
  }
}
