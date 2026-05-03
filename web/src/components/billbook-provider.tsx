"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { configureAnalyticsPresentation } from "@/lib/analytics";
import { AuthSession } from "@/lib/auth";
import {
  downloadWorkspaceBackup,
  downloadWorkspaceExport,
} from "@/lib/exporters";
import {
  clearLocalLedger,
  readLocalBackupMeta,
  readLocalLedger,
  writeLocalBackupMeta,
  writeLocalLedger,
} from "@/lib/local-ledger";
import {
  defaultLocalPreferences,
  LocalWorkspacePreferences,
  mergeWorkspacePreferences,
  readLocalPreferences,
  writeLocalPreferences,
} from "@/lib/local-preferences";
import {
  defaultWorkspaceMember,
  objectPalette,
  sampleState,
} from "@/lib/sample-data";
import {
  BillbookState,
  ExportFormat,
  HistoryDisplaySettings,
  LongTermCategorySetting,
  NewObjectInput,
  NewTransactionInput,
  ObjectKind,
  PermissionSet,
  TeamMember,
  UpdateTransactionInput,
  UserRole,
} from "@/lib/types";

type BillbookContextValue = {
  state: BillbookState;
  currentUser: TeamMember | null;
  hydrated: boolean;
  permissions: PermissionSet;
  errorMessage: string | null;
  lastBackupAt: string | null;
  clearError: () => void;
  addObject: (input: NewObjectInput) => void;
  addTransaction: (input: NewTransactionInput) => void;
  updateTransaction: (transactionId: string, updates: UpdateTransactionInput) => void;
  deleteTransaction: (transactionId: string) => void;
  exportData: (format: ExportFormat) => void;
  importData: (file: File) => Promise<void>;
  clearData: () => void;
  backupData: () => void;
  updateObjectConfig: (
    objectId: string,
    updates: Partial<
      Pick<
        BillbookState["objects"][number],
        "name" | "kind" | "note" | "status"
      >
    >,
  ) => void;
  updateObjectCategories: (objectId: string, categoryIds: string[]) => void;
  addCategoryToObject: (objectId: string, categoryName: string) => void;
  removeCategoryFromObject: (objectId: string, categoryId: string) => void;
  deleteObject: (objectId: string) => void;
  reorderObjects: (activeObjectId: string, targetObjectId: string) => void;
  updatePreferences: (updates: Partial<BillbookState["preferences"]>) => void;
  updateHistoryDisplaySettings: (
    updates: Partial<BillbookState["advancedSettings"]["historyDisplay"]>,
  ) => void;
  addLongTermCategory: (input: { objectId: string; name: string; cycleDays: number }) => void;
  updateLongTermCategory: (
    settingId: string,
    updates: { name: string; cycleDays: number },
  ) => void;
  deleteLongTermCategory: (settingId: string) => void;
  updateWorkspaceProfile: (updates: {
    workspaceName: string;
    workspaceDescription: string;
  }) => void;
  refreshFromSqlite: () => Promise<void>;
};

const BillbookContext = createContext<BillbookContextValue | null>(null);
const OTHER_CATEGORY_ID = "cat-other";
const OTHER_CATEGORY_NAME = "其它";
const LONG_TERM_CATEGORY_COLOR = "#0f8a78";
const GUEST_AUTH_SESSION: AuthSession = {
  user: {
    id: defaultWorkspaceMember.id,
    name: defaultWorkspaceMember.name,
    email: defaultWorkspaceMember.email,
    role: defaultWorkspaceMember.role,
    status: "active",
    createdAt: "2026-04-24T09:10:00+08:00",
    updatedAt: "2026-04-24T09:10:00+08:00",
    lastLoginAt: "2026-04-24T09:10:00+08:00",
  },
  expiresAt: "2099-12-31T23:59:59.000Z",
};

export function BillbookProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState(sampleState);
  const [authSession, setAuthSession] = useState<AuthSession | null>(GUEST_AUTH_SESSION);
  const [localPreferences, setLocalPreferences] = useState<LocalWorkspacePreferences>(
    defaultLocalPreferences,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const desktopSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDesktopSyncFingerprintRef = useRef<string | null>(null);

  const currentUser = authSession
    ? toTeamMember(authSession.user, state.teamMembers)
    : null;
  const permissions = getPermissions(currentUser?.role);

  useEffect(() => {
    configureAnalyticsPresentation({
      locale: state.preferences.language,
      currency: state.preferences.currency,
    });
    applyTheme(state.preferences.theme);
    document.documentElement.lang = state.preferences.language;
  }, [state.preferences.currency, state.preferences.language, state.preferences.theme]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.billbookDesktop ||
      !hydrated ||
      !authSession
    ) {
      return;
    }

    const payload = createDesktopWorkspaceSyncPayload(state, currentUser);
    const fingerprint = JSON.stringify(payload);

    if (lastDesktopSyncFingerprintRef.current === fingerprint) {
      return;
    }

    if (desktopSyncTimerRef.current) {
      clearTimeout(desktopSyncTimerRef.current);
    }

    desktopSyncTimerRef.current = setTimeout(() => {
      void window.billbookDesktop
        ?.syncWorkspace(payload)
        .then(() => {
          lastDesktopSyncFingerprintRef.current = fingerprint;
        })
        .catch((error) => {
          console.error("Failed to sync workspace to desktop SQLite:", error);
        });
    }, 900);

    return () => {
      if (desktopSyncTimerRef.current) {
        clearTimeout(desktopSyncTimerRef.current);
        desktopSyncTimerRef.current = null;
      }
    };
  }, [authSession, currentUser, hydrated, state]);

  const loadWorkspace = async (session: AuthSession) => {
    const nextLocalPreferences = readLocalPreferences(session.user.id);
    setLocalPreferences(nextLocalPreferences);
    setLastBackupAt(readLocalBackupMeta(session.user.id).lastBackupAt);
    setAuthSession(session);

    // 桌面端：优先从 SQLite 加载，避免 MCP 写入的数据被 localStorage 覆盖
    if (typeof window !== "undefined" && window.billbookDesktop) {
      try {
        const sqliteState = await window.billbookDesktop.readWorkspaceState();
        if (sqliteState && typeof sqliteState === "object") {
          const normalized = normalizeWorkspace(
            sqliteState as BillbookState,
            session,
            nextLocalPreferences,
          );
          setState(normalized);
          writeLocalLedger(session.user.id, normalized);
          // 设置初始指纹，避免自动 sync 覆盖相同数据
          if (lastDesktopSyncFingerprintRef) {
            const initialPayload = createDesktopWorkspaceSyncPayload(
              normalized,
              null,
            );
            lastDesktopSyncFingerprintRef.current = JSON.stringify(initialPayload);
          }
          return;
        }
      } catch {
        // SQLite 无数据或无连接，fallthrough 到 localStorage
      }
    }

    const localWorkspace = readLocalLedger(session.user.id);
    if (localWorkspace) {
      setState(normalizeWorkspace(localWorkspace, session, nextLocalPreferences));
      return;
    }

    const workspace = buildLocalWorkspaceSeed(session, nextLocalPreferences);
    writeLocalLedger(session.user.id, workspace);
    setState(workspace);
  };



  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        await loadWorkspace(GUEST_AUTH_SESSION);
      } catch {
          setState(buildLocalWorkspaceSeed(GUEST_AUTH_SESSION, defaultLocalPreferences));
          setLocalPreferences(defaultLocalPreferences);
          setLastBackupAt(null);
      } finally {
        setHydrated(true);
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);





  const saveWorkspace = (nextState: BillbookState) => {
    if (!authSession?.user.id) {
      throw new Error("账本数据保存失败。");
    }

    writeLocalLedger(authSession.user.id, nextState);
  };

  const commitWorkspaceChange = (
    updater: (current: BillbookState, user: TeamMember) => BillbookState,
    failureMessage: string,
  ) => {
    if (!currentUser) {
      setErrorMessage("当前会话不可用。");
      return;
    }

    setState((current) => {
      const nextState = normalizeWorkspace(
        updater(current, currentUser),
        authSession,
        localPreferences,
      );

      try {
        saveWorkspace(nextState);
      } catch {
        setErrorMessage(failureMessage);
        return current;
      }

      return nextState;
    });
  };

  const addObject = (input: NewObjectInput) => {
    if (!permissions.canEdit || !currentUser) {
      setErrorMessage("当前账号不能创建对象。");
      return;
    }

    const normalizedName = input.name.trim();

    if (!normalizedName) {
      setErrorMessage("对象名称不能为空。");
      return;
    }

    commitWorkspaceChange((current, user) => {
      const paletteIndex = current.objects.length % objectPalette.length;
      const normalizedKind = normalizeObjectKind(input.kind);
      const defaultCategoryIds =
        input.categoryIds && input.categoryIds.length > 0
          ? input.categoryIds
          : getDefaultCategoryIdsForKind(
              current.categories
                .filter((category) => category.kind === "expense")
                .map((category) => category.id),
              normalizedKind,
            );

      return appendHistory(
        {
          ...current,
          objects: [
            ...current.objects,
            {
              id: createId("obj"),
              name: normalizedName,
              kind: normalizedKind,
              accent: objectPalette[paletteIndex],
              monthlyBudget: 0,
              categoryIds: defaultCategoryIds,
              note: input.note.trim(),
              goal: "先录入 3 到 5 笔代表性交易，建立基础账本节奏。",
              status: "active",
            },
          ],
        },
        {
          actorId: user.id,
          action: "create_object",
          title: "创建对象",
          detail: `已创建 ${normalizedName}。`,
        },
      );
    }, "创建对象失败。");
  };

  const addTransaction = (input: NewTransactionInput) => {
    if (!permissions.canEdit || !currentUser) {
      setErrorMessage("当前账号不能创建交易。");
      return;
    }

    const title = input.title.trim();
    const amount = roundAmount(input.amount);

    if (!title || amount <= 0) {
      setErrorMessage("请输入有效的标题和金额。");
      return;
    }

    if (!input.objectId) {
      setErrorMessage("每笔交易都必须归属一个对象。");
      return;
    }

    commitWorkspaceChange((current, user) => {
      const nextTransaction = {
        id: createId("txn"),
        title,
        amount,
        date: input.date,
        kind: "expense" as const,
        categoryId: input.categoryId,
        accountId: current.accounts[0]?.id ?? "acc-local",
        allocations: [{ objectId: input.objectId, amount }],
        note: input.note.trim(),
        tags: ["single-object"],
        spreadDays: resolveTransactionSpreadDays(
          current,
          input.categoryId,
          input.spreadDays,
        ),
      };
      const accountDelta = -amount;

      return appendHistory(
        {
          ...current,
          transactions: [nextTransaction, ...current.transactions],
          accounts: current.accounts.map((account) =>
            account.id === (current.accounts[0]?.id ?? "acc-local")
              ? { ...account, balance: roundAmount(account.balance + accountDelta) }
              : account,
          ),
        },
        {
          actorId: user.id,
          action: "create_transaction",
          title: "创建交易",
          detail: `已记录 ${title}。`,
        },
      );
    }, "保存交易失败。");
  };

  const updateTransaction = (
    transactionId: string,
    updates: UpdateTransactionInput,
  ) => {
    if (!permissions.canEdit || !currentUser) {
      setErrorMessage("当前账号不能修改交易。");
      return;
    }

    const amount = roundAmount(updates.amount);

    if (amount <= 0) {
      setErrorMessage("请输入有效的消费金额。");
      return;
    }

    commitWorkspaceChange((current, user) => {
      const targetTransaction = current.transactions.find(
        (transaction) => transaction.id === transactionId,
      );

      if (!targetTransaction) {
        setErrorMessage("未找到要修改的消费记录。");
        return current;
      }

      const nextCategory = current.categories.find(
        (category) =>
          category.id === updates.categoryId && category.kind === targetTransaction.kind,
      );

      if (!nextCategory) {
        setErrorMessage("未找到要更新的消费分类。");
        return current;
      }

      const nextAllocations = scaleAllocationsToAmount(
        targetTransaction.allocations,
        targetTransaction.amount,
        amount,
      );
      const accountDelta =
        targetTransaction.kind === "expense"
          ? targetTransaction.amount - amount
          : amount - targetTransaction.amount;

      return appendHistory(
        {
          ...current,
          transactions: current.transactions.map((transaction) =>
            transaction.id === transactionId
              ? {
                  ...transaction,
                  title: nextCategory.name,
                  amount,
                  date: updates.date,
                  categoryId: updates.categoryId,
                  allocations: nextAllocations,
                  spreadDays: resolveTransactionSpreadDays(
                    current,
                    updates.categoryId,
                    updates.spreadDays,
                  ),
                }
              : transaction,
          ),
          accounts: current.accounts.map((account) =>
            account.id === targetTransaction.accountId
              ? {
                  ...account,
                  balance: roundAmount(account.balance + accountDelta),
                }
              : account,
          ),
        },
        {
          actorId: user.id,
          action: "update_transaction",
          title: "更新交易",
          detail: `已更新 ${nextCategory.name} 的消费记录。`,
        },
      );
    }, "修改交易失败。");
  };

  const deleteTransaction = (transactionId: string) => {
    if (!permissions.canEdit || !currentUser) {
      setErrorMessage("当前账号不能删除交易。");
      return;
    }

    commitWorkspaceChange((current, user) => {
      const targetTransaction = current.transactions.find(
        (transaction) => transaction.id === transactionId,
      );

      if (!targetTransaction) {
        setErrorMessage("未找到要删除的消费记录。");
        return current;
      }

      const accountDelta =
        targetTransaction.kind === "expense"
          ? targetTransaction.amount
          : -targetTransaction.amount;

      return appendHistory(
        {
          ...current,
          transactions: current.transactions.filter(
            (transaction) => transaction.id !== transactionId,
          ),
          accounts: current.accounts.map((account) =>
            account.id === targetTransaction.accountId
              ? {
                  ...account,
                  balance: roundAmount(account.balance + accountDelta),
                }
              : account,
          ),
        },
        {
          actorId: user.id,
          action: "delete_transaction",
          title: "删除交易",
          detail: `已删除 ${targetTransaction.title} 的消费记录。`,
        },
      );
    }, "删除交易失败。");
  };

  const updateObjectConfig = (
    objectId: string,
    updates: Partial<
      Pick<
        BillbookState["objects"][number],
        "name" | "kind" | "note" | "status"
      >
    >,
  ) => {
    if (!permissions.canEdit || !currentUser) {
      setErrorMessage("当前账号不能修改对象。");
      return;
    }

    commitWorkspaceChange((current, user) =>
      appendHistory(
        {
          ...current,
          objects: current.objects.map((ledgerObject) =>
            ledgerObject.id === objectId
              ? {
                  ...ledgerObject,
                  ...updates,
                  name: updates.name?.trim() || ledgerObject.name,
                  note:
                    typeof updates.note === "string"
                      ? updates.note.trim()
                      : ledgerObject.note,
                }
              : ledgerObject,
          ),
        },
        {
          actorId: user.id,
          action: "update_settings",
          title: "更新对象",
          detail: "已调整对象设置。",
        },
      ),
    "更新对象失败。");
  };

  const updateObjectCategories = (objectId: string, categoryIds: string[]) => {
    if (!permissions.canEdit || !currentUser) {
      setErrorMessage("当前账号不能修改分类。");
      return;
    }

    commitWorkspaceChange((current, user) =>
      appendHistory(
        {
          ...current,
          objects: current.objects.map((ledgerObject) =>
            ledgerObject.id === objectId
              ? {
                  ...ledgerObject,
                  categoryIds: normalizeCategoryIdsForObject(
                    ledgerObject.kind,
                    [...new Set(categoryIds)],
                    getRequiredCategoryIds(
                      current.advancedSettings.longTermCategories,
                      objectId,
                    ),
                  ),
                }
              : ledgerObject,
          ),
        },
        {
          actorId: user.id,
          action: "update_settings",
          title: "更新分类",
          detail: "已调整可用消费分类。",
        },
      ),
    "更新分类失败。");
  };

  const addCategoryToObject = (objectId: string, categoryName: string) => {
    if (!permissions.canEdit || !currentUser) {
      setErrorMessage("当前账号不能新增分类。");
      return;
    }

    const normalizedCategoryName = categoryName.trim();

    if (!normalizedCategoryName) {
      setErrorMessage("分类名称不能为空。");
      return;
    }

    commitWorkspaceChange((current, user) => {
      const existingCategory = current.categories.find(
        (category) =>
          category.kind === "expense" &&
          category.name.toLowerCase() === normalizedCategoryName.toLowerCase(),
      );
      const nextCategoryId = existingCategory?.id ?? createId("cat");
      const nextCategories = existingCategory
        ? current.categories
        : [
            ...current.categories,
            {
              id: nextCategoryId,
              name: normalizedCategoryName,
              kind: "expense" as const,
              group: "daily" as const,
            },
          ];

      return appendHistory(
        {
          ...current,
          categories: nextCategories,
          objects: current.objects.map((ledgerObject) =>
            ledgerObject.id === objectId
              ? {
                  ...ledgerObject,
                  categoryIds: [...new Set([...ledgerObject.categoryIds, nextCategoryId])],
                }
              : ledgerObject,
          ),
        },
        {
          actorId: user.id,
          action: "update_settings",
          title: "新增分类",
          detail: `已新增 ${normalizedCategoryName}。`,
        },
      );
    }, "新增分类失败。");
  };

  const removeCategoryFromObject = (objectId: string, categoryId: string) => {
    if (!permissions.canEdit || !currentUser) {
      setErrorMessage("当前账号不能移除分类。");
      return;
    }

    commitWorkspaceChange((current, user) => {
      const ledgerObject = current.objects.find((item) => item.id === objectId);
      const category = current.categories.find((item) => item.id === categoryId);

      if (!ledgerObject || !category) {
        return current;
      }

      if (categoryId === OTHER_CATEGORY_ID) {
        setErrorMessage(`“${OTHER_CATEGORY_NAME}”分类不能删除。`);
        return current;
      }

      if (
        isLongTermCategory(
          current.advancedSettings.longTermCategories,
          objectId,
          categoryId,
        )
      ) {
        setErrorMessage("长期消费分类请在高级设置中统一管理。");
        return current;
      }

      const nextObjects = current.objects.map((item) =>
        item.id === objectId
          ? {
              ...item,
              categoryIds: item.categoryIds.filter((id) => id !== categoryId),
            }
          : item,
      );

      const nextTransactions = current.transactions.map((transaction) => {
        if (
          transaction.kind !== "expense" ||
          transaction.categoryId !== categoryId ||
          !transaction.allocations.some((allocation) => allocation.objectId === objectId)
        ) {
          return transaction;
        }

        return {
          ...transaction,
          categoryId: OTHER_CATEGORY_ID,
          note: appendMigrationNote(transaction.note, `原分类：${category.name}`),
        };
      });

      const nextRecurringPlans = current.recurringPlans.map((plan) =>
        plan.objectId === objectId && plan.categoryId === categoryId
          ? { ...plan, categoryId: OTHER_CATEGORY_ID }
          : plan,
      );

      return appendHistory(
        {
          ...current,
          objects: nextObjects,
          transactions: nextTransactions,
          recurringPlans: nextRecurringPlans,
        },
        {
          actorId: user.id,
          action: "update_settings",
          title: "移除分类",
          detail: `已从 ${ledgerObject.name} 移除 ${category.name}。`,
        },
      );
    }, "移除分类失败。");
  };

  const deleteObject = (objectId: string) => {
    if (!permissions.canEdit || !currentUser) {
      setErrorMessage("当前账号不能删除对象。");
      return;
    }

    commitWorkspaceChange((current, user) => {
      const ledgerObject = current.objects.find((item) => item.id === objectId);
      const selfObject = current.objects.find((item) => item.kind === "self");

      if (!ledgerObject || !selfObject) {
        return current;
      }

      if (ledgerObject.id === selfObject.id) {
        setErrorMessage("我自己对象不能删除。");
        return current;
      }

      const existingSelfCategory = current.categories.find(
        (category) => category.kind === "expense" && category.name === ledgerObject.name,
      );
      const migratedCategoryId = existingSelfCategory?.id ?? createId("cat");
      const migratedCategory = existingSelfCategory ?? {
        id: migratedCategoryId,
        name: ledgerObject.name,
        kind: "expense" as const,
        group: getObjectMigrationCategoryGroup(ledgerObject.kind),
      };
      const removedLongTermCategoryIds = current.advancedSettings.longTermCategories
        .filter((setting) => setting.objectId === objectId)
        .map((setting) => setting.categoryId);
      const nextCategories = existingSelfCategory
        ? current.categories.filter(
            (category) => !removedLongTermCategoryIds.includes(category.id),
          )
        : [
            ...current.categories.filter(
              (category) => !removedLongTermCategoryIds.includes(category.id),
            ),
            migratedCategory,
          ];
      const nextObjects = current.objects
        .filter((item) => item.id !== objectId)
        .map((item) =>
          item.id === selfObject.id
            ? {
                ...item,
                categoryIds: item.categoryIds.includes(migratedCategoryId)
                  ? item.categoryIds
                  : [...item.categoryIds, migratedCategoryId],
              }
            : item,
        );

      const nextTransactions = current.transactions.map((transaction) => {
        if (!transaction.allocations.some((allocation) => allocation.objectId === objectId)) {
          return transaction;
        }

        return {
          ...transaction,
          allocations: mergeAllocations(
            transaction.allocations.map((allocation) =>
              allocation.objectId === objectId
                ? { ...allocation, objectId: selfObject.id }
                : allocation,
            ),
          ),
          categoryId: migratedCategoryId,
        };
      });

      const nextRecurringPlans = current.recurringPlans.map((plan) =>
        plan.objectId === objectId
          ? {
              ...plan,
              objectId: selfObject.id,
              categoryId: migratedCategoryId,
            }
          : plan,
      );
      const nextLongTermCategories = current.advancedSettings.longTermCategories.filter(
        (setting) => setting.objectId !== objectId,
      );

      return appendHistory(
        {
          ...current,
          objects: nextObjects,
          categories: nextCategories,
          transactions: nextTransactions,
          recurringPlans: nextRecurringPlans,
          advancedSettings: {
            ...current.advancedSettings,
            longTermCategories: nextLongTermCategories,
          },
        },
        {
          actorId: user.id,
          action: "update_settings",
          title: "删除对象",
          detail: `已将 ${ledgerObject.name} 的数据迁移到 ${selfObject.name}。`,
        },
      );
    }, "删除对象失败。");
  };

  const reorderObjects = (activeObjectId: string, targetObjectId: string) => {
    if (!permissions.canEdit || !currentUser || activeObjectId === targetObjectId) {
      return;
    }

    commitWorkspaceChange((current, user) => {
      const activeIndex = current.objects.findIndex((item) => item.id === activeObjectId);
      const targetIndex = current.objects.findIndex((item) => item.id === targetObjectId);

      if (activeIndex < 0 || targetIndex < 0 || activeIndex === targetIndex) {
        return current;
      }

      const nextObjects = [...current.objects];
      const [movedObject] = nextObjects.splice(activeIndex, 1);
      nextObjects.splice(targetIndex, 0, movedObject);

      return appendHistory(
        {
          ...current,
          objects: nextObjects,
        },
        {
          actorId: user.id,
          action: "update_settings",
          title: "调整对象顺序",
          detail: `已移动 ${movedObject.name}。`,
        },
      );
    }, "调整对象顺序失败。");
  };

  const exportData = (format: ExportFormat) => {
    if (!permissions.canExport || !currentUser) {
      setErrorMessage("当前账号不能导出数据。");
      return;
    }

    try {
      downloadWorkspaceExport(state, format);
      commitWorkspaceChange(
        (current, user) =>
          appendHistory(current, {
            actorId: user.id,
            action: "export",
            title: "导出数据",
            detail: `已导出 ${format.toUpperCase()} 快照。`,
          }),
        "记录导出操作失败。",
      );
    } catch {
      setErrorMessage("导出数据失败。");
    }
  };

  const importData = async (file: File) => {
    if (!permissions.canEdit || !currentUser || !authSession?.user.id) {
      setErrorMessage("当前账号不能导入数据。");
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<BillbookState> | { state?: Partial<BillbookState> };
      const rawWorkspace =
        parsed && typeof parsed === "object" && "state" in parsed && parsed.state
          ? parsed.state
          : parsed;

      const importedState = appendHistory(
        normalizeWorkspace(rawWorkspace as Partial<BillbookState>, authSession, localPreferences),
        {
          actorId: currentUser.id,
          action: "update_settings",
          title: "导入数据",
          detail: `已从 ${file.name} 导入本地账本。`,
        },
      );

      writeLocalLedger(authSession.user.id, importedState);
      setState(importedState);
    } catch {
      setErrorMessage("导入失败，请检查 JSON 文件格式。");
    }
  };

  const clearData = () => {
    if (!permissions.canEdit || !currentUser || !authSession?.user.id) {
      setErrorMessage("当前账号不能清空数据。");
      return;
    }

    try {
      clearLocalLedger(authSession.user.id);
      const nextState = appendHistory(
        buildLocalWorkspaceSeed(authSession, localPreferences),
        {
          actorId: currentUser.id,
          action: "update_settings",
          title: "清空数据",
          detail: "已重置当前账号在本地浏览器中的账本数据。",
        },
      );
      writeLocalLedger(authSession.user.id, nextState);
      setState(nextState);
    } catch {
      setErrorMessage("清空数据失败。");
    }
  };

  const backupData = () => {
    if (!permissions.canExport || !currentUser || !authSession?.user.id) {
      setErrorMessage("当前账号不能备份数据。");
      return;
    }

    try {
      const exportedAt = downloadWorkspaceBackup(state);
      writeLocalBackupMeta(authSession.user.id, { lastBackupAt: exportedAt });
      setLastBackupAt(exportedAt);

      commitWorkspaceChange(
        (current, user) =>
          appendHistory(current, {
            actorId: user.id,
            action: "export",
            title: "创建备份",
            detail: "已生成本地账本备份文件。",
          }),
        "记录备份操作失败。",
      );
    } catch {
      setErrorMessage("创建备份失败。");
    }
  };

  const updatePreferences = (updates: Partial<BillbookState["preferences"]>) => {
    if (!currentUser) {
      return;
    }

    const nextLocalPreferences = {
      theme: updates.theme ?? localPreferences.theme,
      language: updates.language ?? localPreferences.language,
      currency: updates.currency ?? localPreferences.currency,
      storagePath: updates.storagePath ?? localPreferences.storagePath,
    };

    setLocalPreferences(nextLocalPreferences);
    writeLocalPreferences(authSession?.user.id, nextLocalPreferences);
    setState((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        ...nextLocalPreferences,
      },
    }));
  };

  const updateHistoryDisplaySettings = (
    updates: Partial<BillbookState["advancedSettings"]["historyDisplay"]>,
  ) => {
    if (!permissions.canEdit || !currentUser) {
      setErrorMessage("当前账号不能修改高级设置。");
      return;
    }

    commitWorkspaceChange(
      (current, user) =>
        appendHistory(
          {
            ...current,
            advancedSettings: {
              ...current.advancedSettings,
              historyDisplay: normalizeHistoryDisplaySettings({
                ...current.advancedSettings.historyDisplay,
                ...updates,
              }),
            },
          },
          {
            actorId: user.id,
            action: "update_settings",
            title: "更新历史账显示设置",
            detail: "已调整历史账显示规则。",
          },
        ),
      "更新历史账显示设置失败。",
    );
  };

  const addLongTermCategory = (input: {
    objectId: string;
    name: string;
    cycleDays: number;
  }) => {
    if (!permissions.canEdit || !currentUser) {
      setErrorMessage("当前账号不能新增长期消费分类。");
      return;
    }

    const normalizedName = input.name.trim();
    const cycleDays = normalizeCycleDays(input.cycleDays);

    if (!normalizedName) {
      setErrorMessage("长期消费分类名称不能为空。");
      return;
    }

    if (cycleDays < 2) {
      setErrorMessage("默认消费周期至少为 2 天。");
      return;
    }

    commitWorkspaceChange((current, user) => {
      const targetObject = current.objects.find((ledgerObject) => ledgerObject.id === input.objectId);

      if (!targetObject) {
        setErrorMessage("未找到要绑定的消费对象。");
        return current;
      }

      const existingCategory = current.categories.find(
        (category) =>
          category.kind === "expense" &&
          targetObject.categoryIds.includes(category.id) &&
          category.name.toLowerCase() === normalizedName.toLowerCase(),
      );

      if (existingCategory) {
        setErrorMessage(`“${targetObject.name}”下已存在同名消费分类，请换个名称。`);
        return current;
      }

      const categoryId = createId("cat");
      const nextSetting: LongTermCategorySetting = {
        id: createId("ltc"),
        objectId: input.objectId,
        categoryId,
        cycleDays,
        color: getNextLongTermCategoryColor(current.advancedSettings.longTermCategories.length),
      };

      return appendHistory(
        {
          ...current,
          categories: [
            ...current.categories,
            {
              id: categoryId,
              name: normalizedName,
              kind: "expense",
              group: "daily",
            },
          ],
          objects: current.objects.map((ledgerObject) =>
            ledgerObject.id === input.objectId
              ? {
                  ...ledgerObject,
                  categoryIds: normalizeCategoryIdsForObject(
                    ledgerObject.kind,
                    [...ledgerObject.categoryIds, categoryId],
                    getRequiredCategoryIds(
                      [...current.advancedSettings.longTermCategories, nextSetting],
                      ledgerObject.id,
                    ),
                  ),
                }
              : ledgerObject,
          ),
          advancedSettings: {
            ...current.advancedSettings,
            longTermCategories: [
              ...current.advancedSettings.longTermCategories,
              nextSetting,
            ],
          },
        },
        {
          actorId: user.id,
          action: "update_settings",
          title: "新增长期消费分类",
          detail: `已为 ${targetObject.name} 新增 ${normalizedName}，默认周期为 ${cycleDays} 天。`,
        },
      );
    }, "新增长期消费分类失败。");
  };

  const updateLongTermCategory = (
    settingId: string,
    updates: { name: string; cycleDays: number },
  ) => {
    if (!permissions.canEdit || !currentUser) {
      setErrorMessage("当前账号不能修改长期消费分类。");
      return;
    }

    const normalizedName = updates.name.trim();
    const cycleDays = normalizeCycleDays(updates.cycleDays);

    if (!normalizedName) {
      setErrorMessage("长期消费分类名称不能为空。");
      return;
    }

    if (cycleDays < 2) {
      setErrorMessage("默认消费周期至少为 2 天。");
      return;
    }

    commitWorkspaceChange((current, user) => {
      const targetSetting = current.advancedSettings.longTermCategories.find(
        (setting) => setting.id === settingId,
      );

      if (!targetSetting) {
        return current;
      }

      const targetObject = current.objects.find(
        (ledgerObject) => ledgerObject.id === targetSetting.objectId,
      );

      const duplicateCategory = current.categories.find(
        (category) =>
          category.id !== targetSetting.categoryId &&
          category.kind === "expense" &&
          targetObject?.categoryIds.includes(category.id) &&
          category.name.toLowerCase() === normalizedName.toLowerCase(),
      );

      if (duplicateCategory) {
        setErrorMessage(
          `“${targetObject?.name ?? "当前对象"}”下已存在同名消费分类，请换个名称。`,
        );
        return current;
      }

      return appendHistory(
        {
          ...current,
          categories: current.categories.map((category) =>
            category.id === targetSetting.categoryId
              ? { ...category, name: normalizedName }
              : category,
          ),
          advancedSettings: {
            ...current.advancedSettings,
            longTermCategories: current.advancedSettings.longTermCategories.map((setting) =>
              setting.id === settingId
                ? {
                    ...setting,
                    cycleDays,
                  }
                : setting,
            ),
          },
        },
        {
          actorId: user.id,
          action: "update_settings",
          title: "更新长期消费分类",
          detail: `已更新 ${normalizedName}，默认周期改为 ${cycleDays} 天，仅影响后续新记账。`,
        },
      );
    }, "更新长期消费分类失败。");
  };

  const deleteLongTermCategory = (settingId: string) => {
    if (!permissions.canEdit || !currentUser) {
      setErrorMessage("当前账号不能删除长期消费分类。");
      return;
    }

    commitWorkspaceChange((current, user) => {
      const targetSetting = current.advancedSettings.longTermCategories.find(
        (setting) => setting.id === settingId,
      );
      const targetCategory = current.categories.find(
        (category) => category.id === targetSetting?.categoryId,
      );
      const targetObject = current.objects.find(
        (ledgerObject) => ledgerObject.id === targetSetting?.objectId,
      );

      if (!targetSetting || !targetCategory) {
        return current;
      }

      return appendHistory(
        {
          ...current,
          categories: current.categories.filter(
            (category) => category.id !== targetSetting.categoryId,
          ),
          objects: current.objects.map((ledgerObject) =>
            ledgerObject.id === targetSetting.objectId
              ? {
                  ...ledgerObject,
                  categoryIds: ledgerObject.categoryIds.filter(
                    (categoryId) => categoryId !== targetSetting.categoryId,
                  ),
                }
              : ledgerObject,
          ),
          transactions: current.transactions.map((transaction) =>
            transaction.categoryId === targetSetting.categoryId &&
            transaction.allocations.some(
              (allocation) => allocation.objectId === targetSetting.objectId,
            )
              ? {
                  ...transaction,
                  categoryId: OTHER_CATEGORY_ID,
                  spreadDays: 1,
                  note: appendMigrationNote(
                    transaction.note,
                    `原长期分类：${targetCategory.name}`,
                  ),
                }
              : transaction,
          ),
          recurringPlans: current.recurringPlans.map((plan) =>
            plan.categoryId === targetSetting.categoryId
              ? { ...plan, categoryId: OTHER_CATEGORY_ID }
              : plan,
          ),
          advancedSettings: {
            ...current.advancedSettings,
            longTermCategories: current.advancedSettings.longTermCategories.filter(
              (setting) => setting.id !== settingId,
            ),
          },
        },
        {
          actorId: user.id,
          action: "update_settings",
          title: "删除长期消费分类",
          detail: `已从 ${targetObject?.name ?? "当前对象"} 删除 ${targetCategory.name}，历史记录已并入“${OTHER_CATEGORY_NAME}”。`,
        },
      );
    }, "删除长期消费分类失败。");
  };

  const updateWorkspaceProfile = (updates: {
    workspaceName: string;
    workspaceDescription: string;
  }) => {
    if (!permissions.canEdit || !currentUser) {
      setErrorMessage("当前账号不能修改账本信息。");
      return;
    }

    const workspaceName = updates.workspaceName.trim();
    const workspaceDescription = updates.workspaceDescription.trim();

    if (!workspaceName) {
      setErrorMessage("账本名称不能为空。");
      return;
    }

    commitWorkspaceChange(
      (current, user) =>
        appendHistory(
          {
            ...current,
            workspaceName,
            workspaceDescription,
          },
          {
            actorId: user.id,
            action: "update_settings",
            title: "更新账本资料",
            detail: `账本已重命名为 ${workspaceName}。`,
          },
        ),
      "更新账本资料失败。",
    );
  };

  const refreshFromSqlite = async () => {
    if (!window.billbookDesktop) {
      return;
    }

    try {
      const nextState = await window.billbookDesktop.readWorkspaceState();
      if (nextState && typeof nextState === "object") {
        setState(nextState as BillbookState);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <BillbookContext.Provider
      value={{
        state,
        currentUser,
        hydrated,
        permissions,
        errorMessage,
        lastBackupAt,
        clearError: () => setErrorMessage(null),
        addObject,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        exportData,
        importData,
        clearData,
        backupData,
        updateObjectConfig,
        updateObjectCategories,
        addCategoryToObject,
        removeCategoryFromObject,
        deleteObject,
        reorderObjects,
        updatePreferences,
        updateHistoryDisplaySettings,
        addLongTermCategory,
        updateLongTermCategory,
        deleteLongTermCategory,
        updateWorkspaceProfile,
        refreshFromSqlite,
      }}
    >
      {children}
    </BillbookContext.Provider>
  );
}

export function useBillbook() {
  const context = useContext(BillbookContext);

  if (!context) {
    throw new Error("useBillbook 必须在 BillbookProvider 内使用。");
  }

  return context;
}

function normalizeWorkspace(
  raw: Partial<BillbookState>,
  session: AuthSession | null,
  localPreferences: LocalWorkspacePreferences = defaultLocalPreferences,
) {
  const normalizedCategories = Array.isArray(raw.categories)
    ? normalizeCategories(raw.categories)
    : sampleState.categories;
  const normalizedAdvancedSettings = normalizeAdvancedSettings(
    raw.advancedSettings,
    normalizedCategories,
    Array.isArray(raw.objects) ? raw.objects : sampleState.objects,
  );

  return {
    workspaceName:
      typeof raw.workspaceName === "string"
        ? raw.workspaceName
        : sampleState.workspaceName,
    workspaceDescription:
      typeof raw.workspaceDescription === "string"
        ? raw.workspaceDescription
        : sampleState.workspaceDescription,
    preferences: mergeWorkspacePreferences(
      raw.preferences && typeof raw.preferences === "object"
        ? raw.preferences
        : undefined,
      localPreferences,
    ),
    objects: Array.isArray(raw.objects)
      ? raw.objects.map((ledgerObject) => {
          const normalizedCategoryIds = normalizeCategoryIdsForObject(
            ledgerObject.kind,
            Array.isArray(ledgerObject.categoryIds) && ledgerObject.categoryIds.length > 0
              ? ledgerObject.categoryIds
              : normalizedCategories
                  .filter((category) => category.kind === "expense")
                  .map((category) => category.id),
            getRequiredCategoryIds(
              normalizedAdvancedSettings.longTermCategories,
              ledgerObject.id,
            ),
          );

          return {
            ...ledgerObject,
            categoryIds: normalizedCategoryIds,
          };
        })
      : sampleState.objects,
    accounts: Array.isArray(raw.accounts) ? raw.accounts : sampleState.accounts,
    categories: normalizedCategories,
    transactions: Array.isArray(raw.transactions)
      ? raw.transactions.map((transaction) => ({
          ...transaction,
          spreadDays: normalizeSpreadDays(transaction.spreadDays),
        }))
      : sampleState.transactions,
    recurringPlans: Array.isArray(raw.recurringPlans)
      ? raw.recurringPlans
      : sampleState.recurringPlans,
    teamMembers: normalizeTeamMembers(raw.teamMembers, session),
    history: Array.isArray(raw.history) ? raw.history : sampleState.history,
    advancedSettings: normalizedAdvancedSettings,
  } satisfies BillbookState;
}

function buildLocalWorkspaceSeed(
  session: AuthSession | null,
  localPreferences: LocalWorkspacePreferences = defaultLocalPreferences,
) {
  return normalizeWorkspace(sampleState, session, localPreferences);
}

function normalizeTeamMembers(
  members: BillbookState["teamMembers"] | undefined,
  session: AuthSession | null,
) {
  const baseMembers = Array.isArray(members) && members.length > 0
    ? members
    : [defaultWorkspaceMember];

  if (!session) {
    return baseMembers;
  }

  const sessionMember = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    accent: objectPalette[0],
    lastActive: session.user.lastLoginAt ?? new Date().toISOString(),
  };

  return baseMembers.some((member) => member.id === sessionMember.id)
    ? baseMembers.map((member) => (member.id === sessionMember.id ? sessionMember : member))
    : [sessionMember, ...baseMembers];
}

function toTeamMember(user: AuthSession["user"], members: BillbookState["teamMembers"]) {
  return (
    members.find((member) => member.id === user.id) ?? {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accent: objectPalette[0],
      lastActive: user.lastLoginAt ?? new Date().toISOString(),
    }
  );
}

function createDesktopWorkspaceSyncPayload(
  state: BillbookState,
  currentUser: TeamMember | null,
) {
  return {
    workspaceUserName: currentUser?.name ?? null,
    syncedAt: new Date().toISOString(),
    state,
  };
}

function appendHistory(
  state: BillbookState,
  entry: {
    actorId: string;
    action: BillbookState["history"][number]["action"];
    title: string;
    detail: string;
  },
) {
  return {
    ...state,
    history: [
      {
        id: createId("hist"),
        action: entry.action,
        title: entry.title,
        detail: entry.detail,
        actorId: entry.actorId,
        createdAt: new Date().toISOString(),
      },
      ...state.history,
    ].slice(0, 80),
    teamMembers: state.teamMembers.map((member) =>
      member.id === entry.actorId
        ? { ...member, lastActive: new Date().toISOString() }
        : member,
    ),
  };
}

function getPermissions(role?: UserRole): PermissionSet {
  switch (role) {
    case "owner":
      return { canEdit: true, canManagePermissions: true, canExport: true };
    case "editor":
      return { canEdit: true, canManagePermissions: false, canExport: true };
    case "viewer":
      return { canEdit: false, canManagePermissions: false, canExport: true };
    default:
      return { canEdit: false, canManagePermissions: false, canExport: false };
  }
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function normalizeObjectKind(kind: ObjectKind) {
  return kind;
}

function roundAmount(amount: number) {
  return Math.round(amount * 100) / 100;
}

function applyTheme(theme: BillbookState["preferences"]["theme"]) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const themeTokens = {
    fern: {
      background: "#f6f3ec",
      bgStart: "#faf8f4",
      bgEnd: "#f3f0e9",
      foreground: "#13231c",
      muted: "#66736c",
      surface: "rgba(255, 253, 249, 0.78)",
      surfaceStrong: "rgba(255, 253, 249, 0.94)",
      surfaceSoft: "rgba(255, 253, 249, 0.7)",
      surfaceSolid: "rgba(255, 253, 249, 0.98)",
      line: "rgba(19, 35, 28, 0.1)",
      accent: "#17806d",
      accentSoft: "rgba(23, 128, 109, 0.14)",
      glowA: "rgba(23, 128, 109, 0.12)",
      glowB: "rgba(221, 133, 86, 0.14)",
    },
    ember: {
      background: "#f7efe6",
      bgStart: "#fbf4ed",
      bgEnd: "#f2e8dc",
      foreground: "#2d1d18",
      muted: "#7c6a63",
      surface: "rgba(255, 250, 246, 0.8)",
      surfaceStrong: "rgba(255, 250, 246, 0.95)",
      surfaceSoft: "rgba(255, 250, 246, 0.72)",
      surfaceSolid: "rgba(255, 250, 246, 0.99)",
      line: "rgba(45, 29, 24, 0.1)",
      accent: "#cf6c4a",
      accentSoft: "rgba(207, 108, 74, 0.16)",
      glowA: "rgba(207, 108, 74, 0.14)",
      glowB: "rgba(199, 152, 70, 0.16)",
    },
    ocean: {
      background: "#eef4f8",
      bgStart: "#f4f8fb",
      bgEnd: "#e8eff5",
      foreground: "#102534",
      muted: "#617789",
      surface: "rgba(252, 254, 255, 0.78)",
      surfaceStrong: "rgba(252, 254, 255, 0.94)",
      surfaceSoft: "rgba(252, 254, 255, 0.68)",
      surfaceSolid: "rgba(252, 254, 255, 0.98)",
      line: "rgba(16, 37, 52, 0.1)",
      accent: "#3c6ca8",
      accentSoft: "rgba(60, 108, 168, 0.14)",
      glowA: "rgba(60, 108, 168, 0.14)",
      glowB: "rgba(73, 168, 180, 0.16)",
    },
    sand: {
      background: "#f6f0e4",
      bgStart: "#fbf7ef",
      bgEnd: "#efe6d6",
      foreground: "#2e2419",
      muted: "#7b6d5a",
      surface: "rgba(255, 251, 244, 0.8)",
      surfaceStrong: "rgba(255, 251, 244, 0.95)",
      surfaceSoft: "rgba(255, 251, 244, 0.72)",
      surfaceSolid: "rgba(255, 251, 244, 0.99)",
      line: "rgba(46, 36, 25, 0.1)",
      accent: "#b7821e",
      accentSoft: "rgba(183, 130, 30, 0.16)",
      glowA: "rgba(183, 130, 30, 0.14)",
      glowB: "rgba(214, 170, 87, 0.16)",
    },
    berry: {
      background: "#f7edf1",
      bgStart: "#fcf5f7",
      bgEnd: "#f0e2e8",
      foreground: "#351b27",
      muted: "#7f6571",
      surface: "rgba(255, 250, 252, 0.8)",
      surfaceStrong: "rgba(255, 250, 252, 0.95)",
      surfaceSoft: "rgba(255, 250, 252, 0.72)",
      surfaceSolid: "rgba(255, 250, 252, 0.99)",
      line: "rgba(53, 27, 39, 0.1)",
      accent: "#b24f7a",
      accentSoft: "rgba(178, 79, 122, 0.16)",
      glowA: "rgba(178, 79, 122, 0.14)",
      glowB: "rgba(215, 141, 171, 0.16)",
    },
    dusk: {
      background: "#11161c",
      bgStart: "#18212b",
      bgEnd: "#0f1419",
      foreground: "#edf3f7",
      muted: "#b3c0cb",
      surface: "rgba(22, 30, 38, 0.78)",
      surfaceStrong: "rgba(28, 38, 49, 0.92)",
      surfaceSoft: "rgba(35, 46, 58, 0.72)",
      surfaceSolid: "rgba(32, 43, 56, 0.98)",
      line: "rgba(237, 243, 247, 0.12)",
      accent: "#7eb2ff",
      accentSoft: "rgba(126, 178, 255, 0.16)",
      glowA: "rgba(126, 178, 255, 0.16)",
      glowB: "rgba(73, 168, 180, 0.12)",
    },
  }[theme];

  root.style.setProperty("--background", themeTokens.background);
  root.style.setProperty("--bg-start", themeTokens.bgStart);
  root.style.setProperty("--bg-end", themeTokens.bgEnd);
  root.style.setProperty("--foreground", themeTokens.foreground);
  root.style.setProperty("--muted", themeTokens.muted);
  root.style.setProperty("--surface", themeTokens.surface);
  root.style.setProperty("--surface-strong", themeTokens.surfaceStrong);
  root.style.setProperty("--surface-soft", themeTokens.surfaceSoft);
  root.style.setProperty("--surface-solid", themeTokens.surfaceSolid);
  root.style.setProperty("--line", themeTokens.line);
  root.style.setProperty("--accent", themeTokens.accent);
  root.style.setProperty("--accent-soft", themeTokens.accentSoft);
  root.style.setProperty("--glow-a", themeTokens.glowA);
  root.style.setProperty("--glow-b", themeTokens.glowB);
}

function getDefaultCategoryIdsForKind(
  categoryIds: string[],
  kind: ObjectKind,
  requiredCategoryIds: string[] = [],
) {
  const preferredCategoryIdsByKind: Record<ObjectKind, string[]> = {
    self: ["cat-food", "cat-grocery", "cat-transport", "cat-learning"],
    partner: ["cat-food", "cat-gift", "cat-grocery"],
    pet: ["cat-food", "cat-pet", "cat-grocery"],
    vehicle: ["cat-fuel", "cat-parking", "cat-transport"],
    home: ["cat-home", "cat-grocery"],
    project: ["cat-learning", "cat-grocery"],
    family: ["cat-food", "cat-gift", "cat-grocery"],
    other: ["cat-food", "cat-grocery", "cat-transport"],
  };

  const matchedCategoryIds = preferredCategoryIdsByKind[kind].filter((categoryId) =>
    categoryIds.includes(categoryId),
  );

  if (matchedCategoryIds.length > 0) {
    return normalizeCategoryIdsForObject(kind, matchedCategoryIds, requiredCategoryIds);
  }

  return normalizeCategoryIdsForObject(
    kind,
    categoryIds.slice(0, Math.min(3, categoryIds.length)),
    requiredCategoryIds,
  );
}

function normalizeCategoryIdsForObject(
  kind: ObjectKind,
  categoryIds: string[],
  requiredCategoryIds: string[] = [],
) {
  const normalizedCategoryIds = [
    ...new Set([...categoryIds, ...requiredCategoryIds, OTHER_CATEGORY_ID]),
  ];

  if (kind !== "vehicle") {
    return normalizedCategoryIds;
  }

  if (normalizedCategoryIds.includes("cat-fuel") && !normalizedCategoryIds.includes("cat-parking")) {
    return [...normalizedCategoryIds, "cat-parking"];
  }

  return normalizedCategoryIds;
}

function normalizeAdvancedSettings(
  raw: Partial<BillbookState["advancedSettings"]> | undefined,
  categories: BillbookState["categories"],
  objects: BillbookState["objects"],
) {
  const fallbackObjectId =
    objects.find((ledgerObject) => ledgerObject.kind === "self")?.id ?? objects[0]?.id ?? "obj-self";
  const longTermCategories = Array.isArray(raw?.longTermCategories)
    ? raw.longTermCategories
        .filter(
          (setting): setting is LongTermCategorySetting =>
            Boolean(
              setting &&
                typeof setting.id === "string" &&
                typeof setting.categoryId === "string" &&
                categories.some((category) => category.id === setting.categoryId),
            ),
        )
        .map((setting, index) => ({
          ...setting,
          objectId:
            typeof setting.objectId === "string" &&
            objects.some((ledgerObject) => ledgerObject.id === setting.objectId)
              ? setting.objectId
              : fallbackObjectId,
          cycleDays: normalizeCycleDays(setting.cycleDays),
          color:
            typeof setting.color === "string" && setting.color.trim()
              ? setting.color
              : getNextLongTermCategoryColor(index),
        }))
    : sampleState.advancedSettings.longTermCategories;

  return {
    historyDisplay: normalizeHistoryDisplaySettings(raw?.historyDisplay),
    longTermCategories,
  };
}

function normalizeHistoryDisplaySettings(
  settings?: Partial<HistoryDisplaySettings>,
): HistoryDisplaySettings {
  return {
    enabled: settings?.enabled === true,
    periodDays: Math.max(1, normalizeCycleDays(settings?.periodDays ?? 30)),
  };
}

function normalizeCycleDays(value: number) {
  return Math.max(1, Math.round(Number.isFinite(value) ? value : 1));
}

function normalizeSpreadDays(value?: number) {
  return normalizeCycleDays(value ?? 1);
}

function getRequiredCategoryIds(
  longTermCategories: LongTermCategorySetting[],
  objectId?: string,
) {
  return longTermCategories
    .filter((setting) => (objectId ? setting.objectId === objectId : true))
    .map((setting) => setting.categoryId);
}

function isLongTermCategory(
  longTermCategories: LongTermCategorySetting[],
  objectId: string,
  categoryId: string,
) {
  return longTermCategories.some(
    (setting) => setting.objectId === objectId && setting.categoryId === categoryId,
  );
}

function getDefaultTransactionSpreadDays(state: BillbookState, categoryId: string) {
  return state.advancedSettings.longTermCategories.find(
    (setting) => setting.categoryId === categoryId,
  )?.cycleDays;
}

function resolveTransactionSpreadDays(
  state: BillbookState,
  categoryId: string,
  spreadDays?: number,
) {
  const defaultSpreadDays = getDefaultTransactionSpreadDays(state, categoryId);

  if (defaultSpreadDays === undefined) {
    return 1;
  }

  return normalizeSpreadDays(spreadDays ?? defaultSpreadDays);
}

function getNextLongTermCategoryColor(index: number) {
  void index;
  return LONG_TERM_CATEGORY_COLOR;
}

function normalizeCategories(categories: BillbookState["categories"]) {
  const normalizedDefaults = sampleState.categories.map((defaultCategory) => {
    const existingCategory = categories.find((category) => category.id === defaultCategory.id);

    if (!existingCategory) {
      return defaultCategory;
    }

    return {
      ...existingCategory,
      name: defaultCategory.name,
      group: defaultCategory.group,
      kind: defaultCategory.kind,
    };
  });

  const customCategories = categories.filter(
    (category) => !sampleState.categories.some((defaultCategory) => defaultCategory.id === category.id),
  );

  return [...normalizedDefaults, ...customCategories];
}

function getObjectMigrationCategoryGroup(kind: ObjectKind) {
  switch (kind) {
    case "partner":
    case "family":
      return "family";
    case "pet":
      return "pet-care";
    case "vehicle":
      return "transport";
    case "home":
      return "housing";
    case "project":
      return "growth";
    default:
      return "daily";
  }
}

function appendMigrationNote(note: string, addition: string) {
  return note.trim() ? `${note.trim()}; ${addition}` : addition;
}

function mergeAllocations(allocations: BillbookState["transactions"][number]["allocations"]) {
  const merged = new Map<string, number>();

  allocations.forEach((allocation) => {
    merged.set(allocation.objectId, (merged.get(allocation.objectId) ?? 0) + allocation.amount);
  });

  return [...merged.entries()].map(([objectId, amount]) => ({ objectId, amount }));
}

function scaleAllocationsToAmount(
  allocations: BillbookState["transactions"][number]["allocations"],
  previousAmount: number,
  nextAmount: number,
) {
  if (allocations.length === 0) {
    return allocations;
  }

  if (allocations.length === 1 || previousAmount <= 0) {
    return [{ ...allocations[0], amount: nextAmount }];
  }

  let remaining = nextAmount;

  return allocations.map((allocation, index) => {
    if (index === allocations.length - 1) {
      return { ...allocation, amount: roundAmount(remaining) };
    }

    const scaledAmount = roundAmount((allocation.amount / previousAmount) * nextAmount);
    remaining = roundAmount(remaining - scaledAmount);
    return { ...allocation, amount: scaledAmount };
  });
}


