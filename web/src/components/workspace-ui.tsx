"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useBillbook } from "@/components/billbook-provider";
import { UiSelect } from "@/components/ui-select";
import { NewObjectInput, NewTransactionInput, ObjectKind, UserRole } from "@/lib/types";

export function getObjectKindLabel(kind: ObjectKind, t: Record<string, string>): string {
  const map: Record<string, string> = {
    self: t["object.self"] || "Self",
    partner: t["object.partner"] || "Partner",
    pet: t["object.pet"] || "Pet",
    vehicle: t["object.vehicle"] || "Vehicle",
    home: t["object.home"] || "Home",
    project: t["object.project"] || "Project",
    family: t["object.family"] || "Family",
    other: t["object.other"] || "Other",
  };
  return map[kind] ?? kind;
}

export function getRoleLabel(role: UserRole, t: Record<string, string>): string {
  const map: Record<string, string> = {
    owner: t["role.owner"] || "Owner",
    editor: t["role.editor"] || "Editor",
    viewer: t["role.viewer"] || "Viewer",
  };
  return map[role] ?? role;
}

const creatableObjectKinds: ObjectKind[] = [
  "partner",
  "family",
  "pet",
  "vehicle",
  "home",
  "project",
  "other",
];

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={`panel rounded-[20px] p-3.5 lg:p-3.5 ${className ?? ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-1.5 text-[13px] leading-6 text-[color:var(--muted)]">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className={`mt-3.5 ${contentClassName ?? ""}`}>{children}</div>
    </section>
  );
}

export function MetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="surface-strong rounded-[14px] border border-[color:var(--line)] px-3 py-2.5">
      <p className="type-label">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold tracking-tight">{value}</p>
      {detail ? <p className="mt-0.5 text-[12px] leading-5 text-[color:var(--muted)]">{detail}</p> : null}
    </div>
  );
}

export function RoleBadge({ role, t }: { role: UserRole; t: Record<string, string> }) {
  const roleStyles: Record<UserRole, string> = {
    owner: "bg-[color:var(--accent)] text-white",
    editor: "bg-[color:var(--warning)] text-white",
    viewer: "bg-[color:var(--accent-soft)] text-[color:var(--accent)]",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleStyles[role]}`}>
      {getRoleLabel(role, t)}
    </span>
  );
}

export function Drawer({
  open,
  title,
  description,
  onClose,
  children,
  t,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  t: Record<string, string>;
}) {
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex animate-[float-in_0.24s_ease] justify-end bg-[#18231f]/44 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        aria-label={t["drawer.closeLabel"]}
        className="h-full flex-1 cursor-default"
      />
      <div className="surface-solid h-full w-full max-w-[560px] overflow-y-auto border-l border-[color:var(--line)] px-5 py-5 shadow-[0_40px_100px_rgba(18,31,27,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="type-kicker">Workspace</p>
            <h3 className="mt-1.5 font-display text-[26px] font-semibold tracking-tight">{title}</h3>
            {description ? (
              <p className="mt-2 max-w-xl text-[13px] leading-6 text-[color:var(--muted)]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-button border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
          >
            {t["modal.close"]}
          </button>
        </div>
        <div className="mt-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

export function Modal({
  open,
  title,
  description,
  onClose,
  footer,
  children,
  t,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
  t: Record<string, string>;
}) {
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231f]/48 px-4 py-6 backdrop-blur-sm">
      <button
        type="button"
        aria-label={t["modal.closeLabel"]}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className="surface-solid relative w-full max-w-[520px] rounded-[24px] border border-[color:var(--line)] p-4 shadow-[0_34px_96px_rgba(18,31,27,0.22)] lg:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="type-kicker">Confirmation</p>
            <h3 className="mt-1.5 font-display text-[24px] font-semibold tracking-tight">{title}</h3>
            {description ? (
              <p className="mt-2 text-[13px] leading-6 text-[color:var(--muted)]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-button border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
          >
            {t["modal.close"]}
          </button>
        </div>
        <div className="mt-5">{children}</div>
        {footer ? <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

export function PermissionNotice() {
  return null;
}

export function TransactionComposer({
  onSubmit,
  objectId,
  className,
  t,
}: {
  onSubmit: (input: NewTransactionInput) => void;
  objectId: string;
  className?: string;
  t: Record<string, string>;
}) {
  const { state, permissions } = useBillbook();
  const [isPending, startTransition] = useTransition();
  const ledgerObject = state.objects.find((item) => item.id === objectId);
  const longTermCategoryMap = useMemo(
    () =>
      new Map(
        state.advancedSettings.longTermCategories.map((setting) => [setting.categoryId, setting]),
      ),
    [state.advancedSettings.longTermCategories],
  );
  const categoryOptions = useMemo(() => {
    if (!ledgerObject) return [];

    return state.categories.filter(
      (category) => category.kind === "expense" && ledgerObject.categoryIds.includes(category.id),
    );
  }, [ledgerObject, state.categories]);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getTodayDate());
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [spreadDaysOverride, setSpreadDaysOverride] = useState<string | null>(null);
  const selectedCategory =
    categoryOptions.find((category) => category.id === categoryId) ?? categoryOptions[0];
  const effectiveCategoryId = selectedCategory?.id ?? "";
  const selectedLongTermSetting = effectiveCategoryId
    ? longTermCategoryMap.get(effectiveCategoryId)
    : undefined;
  const spreadDaysInput =
    spreadDaysOverride ?? (selectedLongTermSetting ? String(selectedLongTermSetting.cycleDays) : "");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!permissions.canEdit || !selectedCategory || !effectiveCategoryId) return;

    startTransition(() => {
      onSubmit({
        title: selectedCategory.name,
        amount: Number.parseFloat(amount),
        date,
        categoryId: effectiveCategoryId,
        objectId,
        note,
        spreadDays: selectedLongTermSetting
          ? Number.parseInt(spreadDaysInput, 10)
          : undefined,
      });
    });

    setAmount("");
    setNote("");
    setSpreadDaysOverride(null);
  };

  return (
    <Panel title={t["composer.title"]} className={`h-full ${className ?? ""}`} contentClassName="flex min-h-0 flex-1">
      <form onSubmit={handleSubmit} className="flex h-full w-full flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
          <Field label={t["composer.amount"]}>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="ui-control"
              disabled={!permissions.canEdit}
              required
            />
          </Field>
          <Field label={t["composer.date"]}>
            <input
              value={date}
              onChange={(event) => setDate(event.target.value)}
              type="date"
              className="ui-control"
              disabled={!permissions.canEdit}
            />
          </Field>
        </div>

        {selectedLongTermSetting ? (
          <Field label={t["composer.cycle"]}>
            <div className="space-y-2">
              <input
                value={spreadDaysInput}
                onChange={(event) => setSpreadDaysOverride(event.target.value)}
                type="number"
                min="2"
                step="1"
                className="ui-control"
                disabled={!permissions.canEdit}
                required
              />
              <p className="text-[12px] leading-5 text-[color:var(--muted)]">
                {t["composer.cycleHint"].replace("{days}", String(selectedLongTermSetting.cycleDays))}
              </p>
            </div>
          </Field>
        ) : null}

        <div>
          <Field label={t["composer.category"]}>
            <div className="max-h-[168px] overflow-y-auto hide-scrollbar">
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((category) => {
                  const active = category.id === effectiveCategoryId;
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
                      disabled={!permissions.canEdit}
                      onClick={() => {
                        setCategoryId(category.id);
                        setSpreadDaysOverride(null);
                      }}
                      style={active ? activeStyle : inactiveStyle}
                      className={`ui-chip inline-flex max-w-full items-center gap-2 overflow-hidden border transition ${
                        active
                          ? "border-transparent btn-accent"
                          : "border-[color:var(--line)] bg-[color:var(--surface-strong)] hover:bg-[color:var(--surface-solid)]"
                      }`}
                    >
                      {longTermSetting ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" /> : null}
                      <span className="truncate">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {categoryOptions.length === 0 ? (
              <p className="mt-2 text-[12px] text-[color:var(--warning)]">
                {t["composer.noCategories"]}
              </p>
            ) : null}
          </Field>
        </div>

        <Field label={t["composer.note"]}>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={!permissions.canEdit}
            placeholder={t["composer.optional"]}
            className="ui-control"
          />
        </Field>

        <button
          type="submit"
          disabled={isPending || !permissions.canEdit || !effectiveCategoryId}
          className="ui-button soft-ring mt-auto w-full btn-accent"
        >
          {permissions.canEdit ? (isPending ? t["composer.saving"] : t["composer.save"]) : t["composer.noEdit"]}
        </button>
      </form>
    </Panel>
  );
}

export function ObjectComposer({
  onSubmit,
  className,
  contentClassName,
  t,
}: {
  onSubmit: (input: NewObjectInput) => void;
  className?: string;
  contentClassName?: string;
  t: Record<string, string>;
}) {
  const { permissions } = useBillbook();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ObjectKind>("partner");
  const [note, setNote] = useState("");

  return (
    <Panel
      title={t["object.new"]}

      className={className}
      contentClassName={contentClassName}
    >
      <form
        className="flex h-full flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!permissions.canEdit) return;

          startTransition(() => {
            onSubmit({ name, kind, note });
          });

          setName("");
          setNote("");
          setKind("partner");
        }}
      >
        <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <Field label={t["object.name"]}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t["object.namePlaceholder"]}
              disabled={!permissions.canEdit}
              className="ui-control"
              required
            />
          </Field>
          <Field label={t["object.kind"]}>
            <UiSelect
              value={kind}
              onChange={(nextValue) => setKind(nextValue as ObjectKind)}
              disabled={!permissions.canEdit}
              options={creatableObjectKinds.map((item) => ({
                value: item,
                label: getObjectKindLabel(item, t),
              }))}
            />
          </Field>
        </div>

        <Field label={t["object.note"]}>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={!permissions.canEdit}
            placeholder={t["object.notePlaceholder"]}
            className="ui-control"
          />
        </Field>

        <button
          type="submit"
          disabled={isPending || !permissions.canEdit}
          className="ui-button mt-auto w-full border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
        >
          {permissions.canEdit ? (isPending ? t["object.creating"] : t["object.create"]) : t["composer.noEdit"]}
        </button>
      </form>
    </Panel>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="type-label">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");

  if (normalized.length !== 6) return hex;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
