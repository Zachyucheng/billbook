export type DesktopEnvironment = {
  isDesktop: boolean;
  isDevelopment: boolean;
  appUrl: string;
};

export type DesktopDatabaseStatus = {
  path: string;
  exists: boolean;
  workspaceName: string;
  syncedAt: string | null;
  accountEmail: string;
  objectCount: number;
  transactionCount: number;
  categoryCount: number;
  lastError?: string;
};

export type DesktopWorkspaceSyncPayload = {
  accountId: string | null;
  accountEmail: string | null;
  workspaceUserName: string | null;
  syncedAt: string;
  state: unknown;
};

export type BillbookDesktopBridge = {
  getEnvironment: () => Promise<DesktopEnvironment>;
  getHermesAccess: () => Promise<boolean>;
  setHermesAccess: (enabled: boolean) => Promise<boolean>;
  getDatabaseStatus: () => Promise<DesktopDatabaseStatus>;
  syncWorkspace: (
    payload: DesktopWorkspaceSyncPayload,
  ) => Promise<DesktopDatabaseStatus>;
  readWorkspaceState: () => Promise<unknown>;
  onDatabaseStatus: (
    callback: (status: DesktopDatabaseStatus) => void,
  ) => () => void;
};

declare global {
  interface Window {
    billbookDesktop?: BillbookDesktopBridge;
  }
}

export {};
