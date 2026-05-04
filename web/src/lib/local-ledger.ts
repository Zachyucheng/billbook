"use client";

import { BillbookState } from "@/lib/types";

const LOCAL_LEDGER_KEY = "billbook-local-ledger";
const LEGACY_LOCAL_LEDGER_KEY = "laicai-local-ledger";
const LOCAL_LEDGER_VERSION = 1;
const LOCAL_BACKUP_META_KEY = "billbook-local-ledger-backup-meta";
const LEGACY_LOCAL_BACKUP_META_KEY = "laicai-local-ledger-backup-meta";

type LocalLedgerEnvelope = {
  version: number;
  state: BillbookState;
};

type LocalBackupMetaEnvelope = {
  version: number;
  lastBackupAt: string | null;
};

export type LocalBackupMeta = {
  lastBackupAt: string | null;
};

export function getLocalLedgerStorageKey(userId?: string | null) {
  return userId ? `${LOCAL_LEDGER_KEY}:${userId}` : LOCAL_LEDGER_KEY;
}

export function getLocalBackupMetaStorageKey(userId?: string | null) {
  return userId ? `${LOCAL_BACKUP_META_KEY}:${userId}` : LOCAL_BACKUP_META_KEY;
}

export function readLocalLedger(userId?: string | null) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storageKey = resolveExistingStorageKey(
      getLocalLedgerStorageKey(userId),
      userId ? `${LEGACY_LOCAL_LEDGER_KEY}:${userId}` : LEGACY_LOCAL_LEDGER_KEY,
    );
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<LocalLedgerEnvelope & BillbookState>;

    if (parsed && typeof parsed === "object" && parsed.state && typeof parsed.state === "object") {
      return parsed.state as Partial<BillbookState>;
    }

    return parsed as Partial<BillbookState>;
  } catch {
    return null;
  }
}

export function writeLocalLedger(userId: string | null | undefined, state: BillbookState) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: LocalLedgerEnvelope = {
    version: LOCAL_LEDGER_VERSION,
    state,
  };

  window.localStorage.setItem(getLocalLedgerStorageKey(userId), JSON.stringify(payload));
}

export function clearLocalLedger(userId: string | null | undefined) {
  if (typeof window === "undefined") {
    return;
  }

  const nextKey = getLocalLedgerStorageKey(userId);
  const legacyKey = userId ? `${LEGACY_LOCAL_LEDGER_KEY}:${userId}` : LEGACY_LOCAL_LEDGER_KEY;
  window.localStorage.removeItem(nextKey);
  window.localStorage.removeItem(legacyKey);
}

export function readLocalBackupMeta(userId?: string | null): LocalBackupMeta {
  if (typeof window === "undefined") {
    return { lastBackupAt: null };
  }

  try {
    const storageKey = resolveExistingStorageKey(
      getLocalBackupMetaStorageKey(userId),
      userId ? `${LEGACY_LOCAL_BACKUP_META_KEY}:${userId}` : LEGACY_LOCAL_BACKUP_META_KEY,
    );
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return { lastBackupAt: null };
    }

    const parsed = JSON.parse(raw) as Partial<LocalBackupMetaEnvelope>;
    return {
      lastBackupAt:
        typeof parsed.lastBackupAt === "string" && parsed.lastBackupAt
          ? parsed.lastBackupAt
          : null,
    };
  } catch {
    return { lastBackupAt: null };
  }
}

export function writeLocalBackupMeta(
  userId: string | null | undefined,
  meta: LocalBackupMeta,
) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: LocalBackupMetaEnvelope = {
    version: LOCAL_LEDGER_VERSION,
    lastBackupAt: meta.lastBackupAt,
  };

  window.localStorage.setItem(getLocalBackupMetaStorageKey(userId), JSON.stringify(payload));
}

function resolveExistingStorageKey(...candidates: string[]) {
  if (typeof window === "undefined") {
    return candidates[0];
  }

  for (const candidate of candidates) {
    if (window.localStorage.getItem(candidate) !== null) {
      return candidate;
    }
  }

  const scopedKeys: string[] = [];

  for (const candidate of candidates) {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (key && key.startsWith(`${candidate}:`)) {
        scopedKeys.push(key);
      }
    }
  }

  return scopedKeys.at(-1) ?? candidates[0];
}
