"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useBillbook } from "@/components/billbook-provider";
import { UiSelect } from "@/components/ui-select";
import { NewObjectInput, NewTransactionInput, ObjectKind, UserRole } from "@/lib/types";

export const objectKindLabels: Record<ObjectKind, string> = {
  self: "本人",
  partner: "伴侣",
  pet: "宠物",
  vehicle: "车辆",
  home: "居家",
  project: "项目",
  family: "家人",
  other: "其他",
};

export const roleLabels: Record<UserRole, string> = {
  owner: "所有者",
  editor: "协作者",
  viewer: "只读",
};

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

export function RoleBadge({ role }: { role: UserRole }) {
  const roleStyles: Record<UserRole, string> = {
    owner: "bg-[color:var(--accent)] text-white",
    editor: "bg-[#c26840] text-white",
    viewer: "bg-[#3c6ca8] text-white",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleStyles[role]}`}>
      {roleLabels[role]}
    </span>
  );
}

export function Drawer({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
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
        aria-label="关闭抽屉"
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
            关闭
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
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
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
        aria-label="关闭弹窗"
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
            关闭
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
}: {
  onSubmit: (input: NewTransactionInput) => void;
  objectId: string;
  className?: string;
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
    <Panel title="记录一笔支出" className={`h-full ${className ?? ""}`} contentClassName="flex min-h-0 flex-1">
      <form onSubmit={handleSubmit} className="flex h-full w-full flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
          <Field label="金额">
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
          <Field label="日期">
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
          <Field label="本次消费周期">
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
                默认周期是 {selectedLongTermSetting.cycleDays} 天。你可以只调整这一笔，不调整就按默认周期记账。
              </p>
            </div>
          </Field>
        ) : null}

        <div>
          <Field label="分类">
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
                当前对象还没有可用分类，请先到工作区页补充。
              </p>
            ) : null}
          </Field>
        </div>

        <Field label="备注">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={!permissions.canEdit}
            placeholder="可选补充"
            className="ui-control"
          />
        </Field>

        <button
          type="submit"
          disabled={isPending || !permissions.canEdit || !effectiveCategoryId}
          className="ui-button soft-ring mt-auto w-full btn-accent"
        >
          {permissions.canEdit ? (isPending ? "正在保存..." : "保存支出") : "当前角色不可编辑"}
        </button>
      </form>
    </Panel>
  );
}

export function ObjectComposer({
  onSubmit,
  className,
  contentClassName,
}: {
  onSubmit: (input: NewObjectInput) => void;
  className?: string;
  contentClassName?: string;
}) {
  const { permissions } = useBillbook();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ObjectKind>("partner");
  const [note, setNote] = useState("");

  return (
    <Panel
      title="新增对象"

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
          <Field label="名称">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：家用车、猫咪、小家"
              disabled={!permissions.canEdit}
              className="ui-control"
              required
            />
          </Field>
          <Field label="类型">
            <UiSelect
              value={kind}
              onChange={(nextValue) => setKind(nextValue as ObjectKind)}
              disabled={!permissions.canEdit}
              options={creatableObjectKinds.map((item) => ({
                value: item,
                label: objectKindLabels[item],
              }))}
            />
          </Field>
        </div>

        <Field label="说明">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={!permissions.canEdit}
            placeholder="可选补充这个对象的预算边界或用途"
            className="ui-control"
          />
        </Field>

        <button
          type="submit"
          disabled={isPending || !permissions.canEdit}
          className="ui-button mt-auto w-full border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
        >
          {permissions.canEdit ? (isPending ? "正在创建..." : "创建对象") : "当前角色不可编辑"}
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
