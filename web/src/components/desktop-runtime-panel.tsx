"use client";

import { useCallback, useEffect, useState } from "react";
import { useBillbook } from "@/components/billbook-provider";
import { Panel } from "@/components/workspace-ui";

type DesktopEnvironment = {
  isDesktop: boolean;
  isDevelopment: boolean;
  appUrl: string;
};

type DesktopDatabaseStatus = {
  path: string;
  exists: boolean;
  workspaceName: string;
  syncedAt: string | null;
  objectCount: number;
  transactionCount: number;
  categoryCount: number;
  lastError?: string;
};

export function DesktopRuntimePanel() {
  const { state, currentUser } = useBillbook();
  const [environment, setEnvironment] = useState<DesktopEnvironment | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState<DesktopDatabaseStatus | null>(null);
  const [hermesAccess, setHermesAccess] = useState<boolean>(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    if (!window.billbookDesktop) return;

    let active = true;

    window.billbookDesktop.getEnvironment().then((value) => {
      if (active) setEnvironment(value);
    }).catch(() => {});

    window.billbookDesktop.getHermesAccess().then((value) => {
      if (active) setHermesAccess(value);
    }).catch(() => {});

    window.billbookDesktop.getDatabaseStatus().then((value) => {
      if (active) setDatabaseStatus(value);
    }).catch(() => {});

    const unsubscribeDatabase = window.billbookDesktop.onDatabaseStatus((nextStatus) => {
      if (active) setDatabaseStatus(nextStatus);
    });

    return () => { active = false; unsubscribeDatabase(); };
  }, []);

  const toggleHermesAccess = useCallback(async () => {
    if (!window.billbookDesktop) return;
    setBusyAction("hermes");
    try {
      const next = await window.billbookDesktop.setHermesAccess(!hermesAccess);
      setHermesAccess(next);
    } finally {
      setBusyAction(null);
    }
  }, [hermesAccess]);

  const syncWorkspaceToDesktop = async () => {
    if (!window.billbookDesktop) return;
    setBusyAction("sync");
    try {
      const nextStatus = await window.billbookDesktop.syncWorkspace({
        workspaceUserName: currentUser?.name ?? null,
        syncedAt: new Date().toISOString(),
        state,
      });
      setDatabaseStatus(nextStatus);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <Panel title="桌面运行时">
      {environment ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="运行模式" value={environment.isDevelopment ? "Development" : "Desktop"} />
            <Stat label="最近同步" value={databaseStatus?.syncedAt ? formatSyncTime(databaseStatus.syncedAt) : "未同步"} />
            <Stat label="交易数" value={databaseStatus ? String(databaseStatus.transactionCount) : "0"} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-4">
            <div>
              <p className="font-medium">工作区数据库</p>
              <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                同步后 Hermes 可读取最新数据
              </p>
            </div>
            <button
              type="button"
              disabled={Boolean(busyAction)}
              onClick={syncWorkspaceToDesktop}
              className="ui-button btn-accent disabled:opacity-50"
            >
              {busyAction === "sync" ? "同步中..." : "同步到 SQLite"}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-4">
            <div>
              <p className="font-medium">允许 Hermes 访问</p>
              <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                {hermesAccess
                  ? "Hermes Agent 可以读取和创建账单数据"
                  : "已阻止 Hermes 访问账单数据"}
              </p>
            </div>
            <button
              type="button"
              disabled={busyAction === "hermes"}
              onClick={toggleHermesAccess}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ${
                hermesAccess ? "bg-[color:var(--accent)]" : "bg-[color:var(--line)]"
              }`}
              role="switch"
              aria-checked={hermesAccess}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  hermesAccess ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <details className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-strong)]">
            <summary className="cursor-pointer list-none px-4 py-4 text-sm font-medium">
              展开查看路径和详情
            </summary>
            <div className="border-t border-[color:var(--line)] px-4 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Stat label="应用地址" value={environment.appUrl} />
                <Stat label="数据库路径" value={databaseStatus?.path || "等待初始化"} />
                <Stat label="Hermes 访问" value={hermesAccess ? "已开启" : "已关闭"} />
              </div>
            </div>
          </details>
        </div>
      ) : (
        <div className="surface-strong rounded-[18px] border border-[color:var(--line)] p-4 text-sm leading-7 text-[color:var(--muted)]">
          当前是在普通浏览器中运行。使用 Electron 桌面端打开后，这里会显示运行状态。
        </div>
      )}
    </Panel>
  );
}

function formatSyncTime(value: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-strong rounded-[16px] border border-[color:var(--line)] p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted)]">{label}</p>
      <p className="mt-2 break-all text-sm font-medium">{value}</p>
    </div>
  );
}
