"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useRef, useState, useTransition } from "react";
import { useBillbook } from "@/components/billbook-provider";
import { UiSelect } from "@/components/ui-select";
import { Modal, Panel, getObjectKindLabel } from "@/components/workspace-ui";
import { CurrencyCode, ObjectKind, ThemePreset, WorkspaceLanguage } from "@/lib/types";
import { workspaceRoutes } from "@/lib/routes";
import { useI18n } from "@/lib/i18n";

const themeOptions: Array<{
  value: ThemePreset;
  labelKey: string;
  tones: [string, string, string];
}> = [
  { value: "fern", labelKey: "theme.fern", tones: ["#17806d", "#9ed9cd", "#f6f3ec"] },
  { value: "ember", labelKey: "theme.ember", tones: ["#cf6c4a", "#f3bf96", "#f7efe6"] },
  { value: "ocean", labelKey: "theme.ocean", tones: ["#3c6ca8", "#8db7e4", "#eef4f8"] },
  { value: "berry", labelKey: "theme.berry", tones: ["#b24f7a", "#e2a3bc", "#f7edf1"] },
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

const languageOptions: Array<{ value: WorkspaceLanguage; labelKey: string }> = [
  { value: "zh-CN", labelKey: "lang.zh" },
  { value: "en-US", labelKey: "lang.en" },
];

const currencyOptions: Array<{ value: CurrencyCode; labelKey: string }> = [
  { value: "CNY", labelKey: "currency.cny" },
  { value: "USD", labelKey: "currency.usd" },
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
  const { t, lang } = useI18n();

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
        label: `${ledgerObject.name} · ${getObjectKindLabel(ledgerObject.kind, t)}`,
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

  const backupLabel = formatBackupTime(lastBackupAt, t["settings.data.import"] || "Not backed up");
  const expenseCount = state.transactions.filter((item) => item.kind === "expense").length;

  return (
    <div className="space-y-4">
      <section className="panel panel-strong rounded-[24px] p-4 lg:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="type-kicker">Settings</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{t["settings.title"]}</h2>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link
              href={workspaceRoutes.home}
              className="ui-button w-full border border-[color:var(--line)] bg-[color:var(--surface-strong)] sm:w-auto"
            >
              {t["settings.gotoAccounts"]}
            </Link>
            <Link
              href={workspaceRoutes.advanced}
              className="ui-button w-full border border-[color:var(--line)] bg-[color:var(--surface-strong)] sm:w-auto"
            >
              {t["settings.gotoAdvanced"]}
            </Link>
          </div>
        </div>
      </section>

      <Panel title={t["settings.display"]}>
          <div className="space-y-4">
            <SettingGroup label={t["settings.theme"]}>
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
                    <p className="mt-2 text-sm font-medium">{t[option.labelKey]}</p>
                  </button>
                ))}
              </div>
            </SettingGroup>

            <div className="grid gap-4 md:grid-cols-2">
              <SettingGroup label={t["settings.language"]}>
                <OptionRow>
                  {languageOptions.map((option) => (
                    <ChoiceButton
                      key={option.value}
                      active={state.preferences.language === option.value}
                      onClick={() => updatePreferences({ language: option.value })}
                    >
                      {t[option.labelKey]}
                    </ChoiceButton>
                  ))}
                </OptionRow>
              </SettingGroup>

              <SettingGroup label={t["settings.currency"]}>
                <OptionRow>
                  {currencyOptions.map((option) => (
                    <ChoiceButton
                      key={option.value}
                      active={state.preferences.currency === option.value}
                      onClick={() => updatePreferences({ currency: option.value })}
                    >
                      {t[option.labelKey]}
                    </ChoiceButton>
                  ))}
                </OptionRow>
              </SettingGroup>
            </div>
          </div>
        </Panel>

      {/* 对象管理 — 新增与分类合并为一行 */}
      <Panel title={t["settings.objects.title"]} className="overflow-visible">
        <div className="flex flex-wrap gap-4">
          {/* 新增对象 */}
          <div className="min-w-0 flex-1 basis-[240px]">
            <p className="type-label mb-2">{t["settings.objects.new"]}</p>
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={objectName}
                  onChange={(event) => setObjectName(event.target.value)}
                  placeholder={t["settings.objects.namePlaceholder"]}
                  disabled={!permissions.canEdit}
                  className="ui-control flex-1"
                  required
                />
                <UiSelect
                  value={objectKind}
                  onChange={(nextValue) => setObjectKind(nextValue as ObjectKind)}
                  disabled={!permissions.canEdit}
                  className="sm:w-[180px]"
                  options={creatableObjectKinds.map((item) => ({
                    value: item,
                    label: getObjectKindLabel(item, t),
                  }))}
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={objectNote}
                  onChange={(event) => setObjectNote(event.target.value)}
                  disabled={!permissions.canEdit}
                  placeholder={t["settings.objects.notePlaceholder"]}
                  className="ui-control flex-1"
                />
                <button
                  type="submit"
                  disabled={isPending || !permissions.canEdit}
                  className="ui-button btn-accent w-full sm:w-auto"
                >
                  {isPending ? t["settings.objects.creating"] : t["settings.objects.create"]}
                </button>
              </div>
            </form>
          </div>

          {/* 对象与分类 */}
          <div className="min-w-0 flex-[2] basis-[320px]">
            <p className="type-label mb-2">{t["settings.objects.manage"]}</p>
            <div className="flex flex-col gap-2.5">
              <UiSelect
                value={effectiveSelectedObjectId}
                options={objectOptions}
                onChange={(value) => {
                  setSelectedObjectId(value);
                  setDraftCategory("");
                }}
                placeholder={t["settings.objects.select"]}
              />
              {selectedObject ? (
                <div className="surface-soft rounded-[14px] border border-[color:var(--line)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{selectedObject.name}</p>
                    <span className="text-xs text-[color:var(--muted)]">
                      {t["settings.objects.categoryCount"].replace("{count}", String(selectedObjectCategories.length))}
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
                              {t["settings.objects.remove"]}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={draftCategory}
                      onChange={(event) => setDraftCategory(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          submitCategory();
                        }
                      }}
                      placeholder={t["settings.objects.categoryPlaceholder"].replace("{name}", selectedObject.name)}
                      className="ui-control flex-1"
                    />
                    <ActionButton className="w-full sm:w-auto" onClick={submitCategory}>
                      {t["settings.objects.add"]}
                    </ActionButton>
                  </div>
                </div>
              ) : (
                <div className="flex h-[80px] items-center justify-center rounded-[14px] border border-dashed border-[color:var(--line)] text-sm text-[color:var(--muted)]">
                  {t["settings.objects.emptyHint"]}
                </div>
              )}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title={t["settings.data.title"]}>
        <div className="grid gap-3 md:grid-cols-3">
          <DataCard label={t["settings.data.objects"]} value={`${state.objects.length}`} />
          <DataCard label={t["settings.data.transactions"]} value={`${expenseCount}`} />
          <DataCard label={t["settings.data.storage"]} value={t["settings.data.storageLocal"]} />
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <p className="type-label">{t["settings.data.export"]}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <ActionButton onClick={() => exportData("json")}>JSON</ActionButton>
              <ActionButton onClick={() => exportData("csv")}>CSV</ActionButton>
              <ActionButton onClick={() => exportData("excel")}>Excel</ActionButton>
            </div>
          </div>
          <div>
            <p className="type-label">{t["settings.data.import"]}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <ActionButton onClick={handleImportTrigger}>{t["settings.data.importJson"]}</ActionButton>
              <ActionButton onClick={backupData}>{t["settings.data.backup"]}</ActionButton>
              <DangerButton onClick={() => setClearConfirmOpen(true)}>{t["settings.data.clear"]}</DangerButton>
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
        title={t["settings.deleteCat.title"]}
        description={
          pendingDeleteCategory
            ? t["settings.deleteCat.desc"].replace("{name}", pendingDeleteCategory.categoryName)
            : undefined
        }
        onClose={() => setPendingDeleteCategory(null)}
        t={t}
        footer={
          <>
            <button
              type="button"
              onClick={() => setPendingDeleteCategory(null)}
              className="ui-button border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
            >
              {t["modal.cancel"]}
            </button>
            <button
              type="button"
              onClick={deleteCategory}
              className="ui-button border border-[color:var(--warning-soft)] bg-[color:var(--accent-soft)] text-[color:var(--warning)]"
            >
              {t["modal.deleteConfirm"]}
            </button>
          </>
        }
      >
        <div className="rounded-[18px] bg-[color:var(--accent-soft)] px-4 py-3 text-sm leading-6 text-[color:var(--warning)]">
          {t["settings.deleteCat.hint"]}
        </div>
      </Modal>

      <Modal
        open={clearConfirmOpen}
        title={t["settings.clear.title"]}
        description={t["settings.clear.desc"]}
        onClose={() => setClearConfirmOpen(false)}
        t={t}
        footer={
          <>
            <button
              type="button"
              onClick={() => setClearConfirmOpen(false)}
              className="ui-button border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
            >
              {t["modal.cancel"]}
            </button>
            <button
              type="button"
              onClick={() => {
                setClearConfirmOpen(false);
                clearData();
              }}
              className="ui-button border border-[color:var(--warning-soft)] bg-[color:var(--accent-soft)] text-[color:var(--warning)]"
            >
              {t["modal.confirmClear"]}
            </button>
          </>
        }
      >
        <div className="rounded-[18px] bg-[color:var(--accent-soft)] px-4 py-3 text-sm leading-6 text-[color:var(--warning)]">
          {t["settings.clear.hint"]}
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
  className,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ui-button border border-[color:var(--line)] bg-[color:var(--surface-strong)] ${className ?? ""}`}
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
      className="ui-button border border-[color:var(--warning-soft)] bg-[color:var(--accent-soft)] text-[color:var(--warning)]"
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

function formatBackupTime(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return fallback;
  }
}
