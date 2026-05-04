"use client";

import {
  BillbookState,
  CurrencyCode,
  ThemePreset,
  WorkspaceLanguage,
} from "@/lib/types";

const LOCAL_PREFERENCES_KEY = "billbook-local-preferences";
const LEGACY_LOCAL_PREFERENCES_KEY = "laicai-local-preferences";
const LOCAL_PREFERENCES_VERSION = 1;

export type LocalWorkspacePreferences = {
  theme: ThemePreset;
  language: WorkspaceLanguage;
  currency: CurrencyCode;
  storagePath: string;
};

export const defaultLocalPreferences: LocalWorkspacePreferences = {
  theme: "fern",
  language: "zh-CN",
  currency: "CNY",
  storagePath: "browser://localStorage/billbook/workspace/default",
};

export function getLocalPreferencesStorageKey(userId?: string | null) {
  return userId ? `${LOCAL_PREFERENCES_KEY}:${userId}` : LOCAL_PREFERENCES_KEY;
}

export function readLocalPreferences(userId?: string | null): LocalWorkspacePreferences {
  if (typeof window === "undefined") {
    return defaultLocalPreferences;
  }

  try {
    const storageKey = resolveExistingStorageKey(
      getLocalPreferencesStorageKey(userId),
      userId ? `${LEGACY_LOCAL_PREFERENCES_KEY}:${userId}` : LEGACY_LOCAL_PREFERENCES_KEY,
    );
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return defaultLocalPreferences;
    }

    const parsed = JSON.parse(raw) as Partial<LocalWorkspacePreferences>;
    return {
      theme: isThemePreset(parsed.theme) ? parsed.theme : defaultLocalPreferences.theme,
      language: isWorkspaceLanguage(parsed.language)
        ? parsed.language
        : defaultLocalPreferences.language,
      currency: isCurrencyCode(parsed.currency)
        ? parsed.currency
        : defaultLocalPreferences.currency,
      storagePath:
        typeof parsed.storagePath === "string" && parsed.storagePath.trim()
          ? parsed.storagePath.trim()
          : defaultLocalPreferences.storagePath,
    };
  } catch {
    return defaultLocalPreferences;
  }
}

export function writeLocalPreferences(
  userId: string | null | undefined,
  preferences: LocalWorkspacePreferences,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getLocalPreferencesStorageKey(userId),
    JSON.stringify({
      version: LOCAL_PREFERENCES_VERSION,
      ...preferences,
    }),
  );
}

export function mergeWorkspacePreferences(
  remotePreferences: Partial<BillbookState["preferences"]> | undefined,
  localPreferences: LocalWorkspacePreferences,
): BillbookState["preferences"] {
  return {
    theme: localPreferences.theme,
    language: localPreferences.language,
    currency: localPreferences.currency,
    storagePath:
      typeof remotePreferences?.storagePath === "string" && remotePreferences.storagePath.trim()
        ? remotePreferences.storagePath
        : localPreferences.storagePath,
  };
}

function isThemePreset(value: unknown): value is ThemePreset {
  return (
    value === "fern" ||
    value === "ember" ||
    value === "ocean" ||
    value === "berry"
  );
}

function isWorkspaceLanguage(value: unknown): value is WorkspaceLanguage {
  return value === "zh-CN" || value === "en-US";
}

function isCurrencyCode(value: unknown): value is CurrencyCode {
  return value === "CNY" || value === "USD";
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
