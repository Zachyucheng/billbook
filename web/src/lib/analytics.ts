import { BillbookState, HistoryItem, LedgerObject, TeamMember, Transaction } from "@/lib/types";

let activeLocale = "zh-CN";
let activeCurrency = "CNY";
let currencyFormatterCacheKey = "";
let currencyFormatter: Intl.NumberFormat | null = null;
let compactCurrencyFormatterCacheKey = "";
let compactCurrencyFormatter: Intl.NumberFormat | null = null;
let shortDateFormatterCacheKey = "";
let shortDateFormatter: Intl.DateTimeFormat | null = null;
let dateTimeFormatterCacheKey = "";
let dateTimeFormatter: Intl.DateTimeFormat | null = null;
let monthFormatterCacheKey = "";
let monthFormatter: Intl.DateTimeFormat | null = null;

export type ObjectSummary = {
  object: LedgerObject;
  expense: number;
  income: number;
  balance: number;
  remainingBudget: number;
  budgetUsage: number;
  transactionCount: number;
  sharedTransactionCount: number;
  dominantCategory: string;
  lastActivity?: string;
};

export type CategoryBreakdownItem = {
  categoryId: string;
  categoryName: string;
  amount: number;
  share: number;
  shortTermAmount: number;
  longTermAmount: number;
};

export type MonthlyPoint = {
  label: string;
  expense: number;
  income: number;
  shortTermExpense: number;
  longTermExpense: number;
};

export type TrendGranularity = "month" | "week" | "day";

export type ObjectConnection = {
  objectId: string;
  objectName: string;
  sharedTransactions: number;
  sharedSpend: number;
};

export type TransactionHistoryInsight = {
  categoryName: string;
  previousAmount: number | null;
  averageAmount: number | null;
  periodDays: number;
};

export function formatCurrency(value: number) {
  return createCurrencyFormatter().format(value);
}

export function formatCompactCurrency(value: number) {
  return createCompactCurrencyFormatter().format(value);
}

export function formatShortDate(isoDate: string) {
  return createShortDateFormatter().format(new Date(isoDate));
}

export function formatDateTime(isoDate: string) {
  return createDateTimeFormatter().format(new Date(isoDate));
}

export function configureAnalyticsPresentation(input: {
  locale: string;
  currency: string;
}) {
  activeLocale = input.locale;
  activeCurrency = input.currency;
}

export function getSortedTransactions(state: BillbookState) {
  return [...state.transactions].sort((left, right) =>
    right.date.localeCompare(left.date),
  );
}

export function getTotalBalance(state: BillbookState) {
  return state.accounts.reduce((sum, account) => sum + account.balance, 0);
}

export function getDashboardMetrics(state: BillbookState) {
  const totalExpense = state.transactions
    .filter((transaction) => transaction.kind === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExpenseCount = state.transactions.filter(
    (transaction) => transaction.kind === "expense",
  ).length;
  const assignedExpense = state.transactions
    .filter(
      (transaction) =>
        transaction.kind === "expense" && transaction.allocations.length > 0,
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalBudget = state.objects.reduce(
    (sum, ledgerObject) => sum + ledgerObject.monthlyBudget,
    0,
  );
  const budgetUsed = state.objects.reduce((sum, ledgerObject) => {
    const objectExpense = state.transactions.reduce((transactionSum, transaction) => {
      if (transaction.kind !== "expense") {
        return transactionSum;
      }

      return (
        transactionSum +
        transaction.allocations
          .filter((allocation) => allocation.objectId === ledgerObject.id)
          .reduce((allocationSum, allocation) => allocationSum + allocation.amount, 0)
      );
    }, 0);

    return sum + objectExpense;
  }, 0);
  const activeObjects = state.objects.filter(
    (ledgerObject) => ledgerObject.status === "active",
  ).length;

  return {
    totalExpense,
    totalExpenseCount,
    totalIncome: 0,
    net: -totalExpense,
    totalBudget,
    budgetUsage: totalBudget === 0 ? 0 : budgetUsed / totalBudget,
    assignedRate: totalExpense === 0 ? 0 : assignedExpense / totalExpense,
    activeObjects,
  };
}

export function getMonthlySeries(
  state: BillbookState,
  focusObjectId?: string,
): MonthlyPoint[] {
  return getExpenseSeries(state, { focusObjectId, granularity: "month" });
}

export function getWeeklySeries(
  state: BillbookState,
  focusObjectId?: string,
) {
  return getExpenseSeries(state, { focusObjectId, granularity: "week" });
}

export function getDailySeries(
  state: BillbookState,
  focusObjectId?: string,
) {
  return getExpenseSeries(state, { focusObjectId, granularity: "day" });
}

export function getExpenseSeries(
  state: BillbookState,
  {
    focusObjectId,
    granularity,
  }: {
    focusObjectId?: string;
    granularity: TrendGranularity;
  },
): MonthlyPoint[] {
  const anchorDate = getSeriesAnchorDate(state, focusObjectId);
  const longTermCategoryIds = new Set(
    state.advancedSettings.longTermCategories.map((setting) => setting.categoryId),
  );
  const buckets =
    granularity === "day"
      ? getTrailingDays(7, anchorDate)
      : granularity === "week"
        ? getTrailingWeeks(8, anchorDate)
        : getTrailingMonths(6, anchorDate);

  return buckets.map((bucket) => {
    const bucketTotals = state.transactions.reduce(
      (sum, transaction) => {
      if (transaction.kind !== "expense") {
        return sum;
      }

        const isLongTerm = longTermCategoryIds.has(transaction.categoryId);

      if (!focusObjectId) {
          const distributedAmount = getDistributedTransactionSlices(
            transaction,
            transaction.amount,
          ).reduce(
            (sliceSum, slice) =>
              bucket.matcher(slice.date) ? sliceSum + slice.amount : sliceSum,
            0,
          );

          if (isLongTerm) {
            sum.longTermExpense += distributedAmount;
          } else {
            sum.shortTermExpense += distributedAmount;
          }

          return sum;
      }

      const allocationAmount = getAllocationAmount(transaction, focusObjectId);

      if (allocationAmount === 0) {
        return sum;
      }

        const distributedAmount = getDistributedTransactionSlices(
          transaction,
          allocationAmount,
        ).reduce(
          (sliceSum, slice) => (bucket.matcher(slice.date) ? sliceSum + slice.amount : sliceSum),
          0,
        );

        if (isLongTerm) {
          sum.longTermExpense += distributedAmount;
        } else {
          sum.shortTermExpense += distributedAmount;
        }

        return sum;
      },
      { shortTermExpense: 0, longTermExpense: 0 },
    );

    return {
      label: bucket.label,
      expense: bucketTotals.shortTermExpense + bucketTotals.longTermExpense,
      income: 0,
      shortTermExpense: bucketTotals.shortTermExpense,
      longTermExpense: bucketTotals.longTermExpense,
    };
  });
}

function createCurrencyFormatter() {
  const cacheKey = `${activeLocale}:${activeCurrency}`;

  if (currencyFormatter && currencyFormatterCacheKey === cacheKey) {
    return currencyFormatter;
  }

  currencyFormatterCacheKey = cacheKey;
  currencyFormatter = new Intl.NumberFormat(activeLocale, {
    style: "currency",
    currency: activeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return currencyFormatter;
}

function createCompactCurrencyFormatter() {
  const cacheKey = `${activeLocale}:${activeCurrency}`;

  if (compactCurrencyFormatter && compactCurrencyFormatterCacheKey === cacheKey) {
    return compactCurrencyFormatter;
  }

  compactCurrencyFormatterCacheKey = cacheKey;
  compactCurrencyFormatter = new Intl.NumberFormat(activeLocale, {
    style: "currency",
    currency: activeCurrency,
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return compactCurrencyFormatter;
}

function createShortDateFormatter() {
  if (shortDateFormatter && shortDateFormatterCacheKey === activeLocale) {
    return shortDateFormatter;
  }

  shortDateFormatterCacheKey = activeLocale;
  shortDateFormatter = new Intl.DateTimeFormat(activeLocale, {
    month: "short",
    day: "numeric",
  });

  return shortDateFormatter;
}

function createDateTimeFormatter() {
  if (dateTimeFormatter && dateTimeFormatterCacheKey === activeLocale) {
    return dateTimeFormatter;
  }

  dateTimeFormatterCacheKey = activeLocale;
  dateTimeFormatter = new Intl.DateTimeFormat(activeLocale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return dateTimeFormatter;
}

function createMonthFormatter() {
  if (monthFormatter && monthFormatterCacheKey === activeLocale) {
    return monthFormatter;
  }

  monthFormatterCacheKey = activeLocale;
  monthFormatter = new Intl.DateTimeFormat(activeLocale, {
    month: "short",
  });

  return monthFormatter;
}

function createWeekFormatter() {
  return new Intl.DateTimeFormat(activeLocale, {
    month: "numeric",
    day: "numeric",
  });
}

export function getObjectSummaries(state: BillbookState): ObjectSummary[] {
  return state.objects
    .map((ledgerObject) => getObjectSummary(state, ledgerObject.id))
    .filter((summary): summary is ObjectSummary => Boolean(summary))
    .sort((left, right) => right.expense - left.expense);
}

export function getObjectSummary(
  state: BillbookState,
  objectId: string,
): ObjectSummary | null {
  const ledgerObject = state.objects.find((item) => item.id === objectId);

  if (!ledgerObject) {
    return null;
  }

  let expense = 0;
  let transactionCount = 0;
  let sharedTransactionCount = 0;
  let lastActivity: string | undefined;
  const categoryTotals = new Map<string, number>();

  state.transactions.forEach((transaction) => {
    if (transaction.kind !== "expense") {
      return;
    }

    const allocationAmount = getAllocationAmount(transaction, objectId);

    if (allocationAmount === 0) {
      return;
    }

    transactionCount += 1;
    lastActivity = lastActivity ?? transaction.date;

    if (transaction.allocations.length > 1 && transaction.kind === "expense") {
      sharedTransactionCount += 1;
    }

    expense += allocationAmount;
    categoryTotals.set(
      transaction.categoryId,
      (categoryTotals.get(transaction.categoryId) ?? 0) + allocationAmount,
    );
  });

  const dominantCategory = [...categoryTotals.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0]?.[0];
  const dominantCategoryName =
    state.categories.find((category) => category.id === dominantCategory)?.name ??
    "暂无";

  return {
    object: ledgerObject,
    expense,
    income: 0,
    balance: -expense,
    remainingBudget: ledgerObject.monthlyBudget - expense,
    budgetUsage:
      ledgerObject.monthlyBudget === 0 ? 0 : expense / ledgerObject.monthlyBudget,
    transactionCount,
    sharedTransactionCount,
    dominantCategory: dominantCategoryName,
    lastActivity,
  };
}

export function getCategoryBreakdown(
  state: BillbookState,
  focusObjectId?: string,
): CategoryBreakdownItem[] {
  const longTermCategoryIds = new Set(
    state.advancedSettings.longTermCategories.map((setting) => setting.categoryId),
  );
  const totals = new Map<
    string,
    {
      amount: number;
      shortTermAmount: number;
      longTermAmount: number;
    }
  >();

  state.transactions.forEach((transaction) => {
    if (transaction.kind !== "expense") {
      return;
    }

    const amount = focusObjectId
      ? getAllocationAmount(transaction, focusObjectId)
      : transaction.amount;

    if (amount === 0) {
      return;
    }

    const current = totals.get(transaction.categoryId) ?? {
      amount: 0,
      shortTermAmount: 0,
      longTermAmount: 0,
    };

    current.amount += amount;

    if (longTermCategoryIds.has(transaction.categoryId)) {
      current.longTermAmount += amount;
    } else {
      current.shortTermAmount += amount;
    }

    totals.set(transaction.categoryId, current);
  });

  const totalExpense = [...totals.values()].reduce((sum, item) => sum + item.amount, 0);

  return [...totals.entries()]
    .map(([categoryId, totalsByMode]) => ({
      categoryId,
      categoryName:
        state.categories.find((category) => category.id === categoryId)?.name ?? categoryId,
      amount: totalsByMode.amount,
      share: totalExpense === 0 ? 0 : totalsByMode.amount / totalExpense,
      shortTermAmount: totalsByMode.shortTermAmount,
      longTermAmount: totalsByMode.longTermAmount,
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 5);
}

export function getObjectConnections(
  state: BillbookState,
  focusObjectId: string,
): ObjectConnection[] {
  const connections = new Map<
    string,
    {
      sharedTransactions: number;
      sharedSpend: number;
    }
  >();

  state.transactions.forEach((transaction) => {
    const focusAmount = getAllocationAmount(transaction, focusObjectId);

    if (
      transaction.kind !== "expense" ||
      focusAmount === 0 ||
      transaction.allocations.length < 2
    ) {
      return;
    }

    transaction.allocations.forEach((allocation) => {
      if (allocation.objectId === focusObjectId) {
        return;
      }

      const current = connections.get(allocation.objectId) ?? {
        sharedTransactions: 0,
        sharedSpend: 0,
      };

      connections.set(allocation.objectId, {
        sharedTransactions: current.sharedTransactions + 1,
        sharedSpend: current.sharedSpend + allocation.amount,
      });
    });
  });

  return [...connections.entries()]
    .map(([objectId, connection]) => ({
      objectId,
      objectName:
        state.objects.find((ledgerObject) => ledgerObject.id === objectId)?.name ?? objectId,
      sharedTransactions: connection.sharedTransactions,
      sharedSpend: connection.sharedSpend,
    }))
    .sort((left, right) => right.sharedTransactions - left.sharedTransactions);
}

export function getObjectTransactions(state: BillbookState, focusObjectId: string) {
  return getSortedTransactions(state).filter(
    (transaction) =>
      transaction.kind === "expense" && getAllocationAmount(transaction, focusObjectId) > 0,
  );
}

export function getTransactionHistoryInsight(
  state: BillbookState,
  transaction: Transaction,
  focusObjectId: string,
  periodDays: number,
): TransactionHistoryInsight | null {
  if (transaction.kind !== "expense") {
    return null;
  }

  const normalizedPeriodDays = Math.max(1, Math.round(periodDays));
  const relatedTransactions = getObjectTransactions(state, focusObjectId).filter(
    (item) => item.categoryId === transaction.categoryId,
  );
  const currentIndex = relatedTransactions.findIndex((item) => item.id === transaction.id);

  if (currentIndex < 0) {
    return null;
  }

  const anchorDate = parseIsoDate(transaction.date);
  const startDate = getStartOfDay(anchorDate);
  startDate.setDate(startDate.getDate() - normalizedPeriodDays + 1);
  const periodTransactions = relatedTransactions.filter((item) => {
    const candidateDate = getStartOfDay(parseIsoDate(item.date));
    return candidateDate >= startDate && candidateDate <= anchorDate;
  });
  const averageAmount =
    periodTransactions.length > 0
      ? periodTransactions.reduce((sum, item) => sum + item.amount, 0) /
        periodTransactions.length
      : null;

  return {
    categoryName:
      state.categories.find((category) => category.id === transaction.categoryId)?.name ??
      transaction.title,
    previousAmount: relatedTransactions[currentIndex + 1]?.amount ?? null,
    averageAmount,
    periodDays: normalizedPeriodDays,
  };
}

export function getAllocationAmount(transaction: Transaction, focusObjectId: string) {
  return transaction.allocations
    .filter((allocation) => allocation.objectId === focusObjectId)
    .reduce((sum, allocation) => sum + allocation.amount, 0);
}

export function getObjectNames(state: BillbookState, transaction: Transaction) {
  return transaction.allocations
    .map(
      (allocation) =>
        state.objects.find((ledgerObject) => ledgerObject.id === allocation.objectId)?.name ??
        allocation.objectId,
    )
    .join(" / ");
}

export function getUpcomingPlans(state: BillbookState) {
  return [...state.recurringPlans].sort((left, right) =>
    left.nextDate.localeCompare(right.nextDate),
  );
}

export function getHistoryEntries(state: BillbookState, limit?: number) {
  const entries = [...state.history].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

  return typeof limit === "number" ? entries.slice(0, limit) : entries;
}

export function getHistoryActorName(entry: HistoryItem, teamMembers: TeamMember[]) {
  return teamMembers.find((member) => member.id === entry.actorId)?.name ?? "未知成员";
}

function getSeriesAnchorDate(state: BillbookState, focusObjectId?: string) {
  const relevantTransactions = state.transactions.filter((transaction) => {
    if (transaction.kind !== "expense") {
      return false;
    }

    if (!focusObjectId) {
      return true;
    }

    return getAllocationAmount(transaction, focusObjectId) > 0;
  });

  const latestTransactionDate = relevantTransactions
    .map((transaction) => getTransactionEndDate(transaction))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0];

  return latestTransactionDate ?? new Date();
}

function getTrailingMonths(count: number, anchorDate = new Date()) {
  const months: Array<{
    label: string;
    matcher: (isoDate: string) => boolean;
  }> = [];
  const anchorMonthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);

  for (let index = count - 1; index >= 0; index -= 1) {
    const monthStart = new Date(
      anchorMonthStart.getFullYear(),
      anchorMonthStart.getMonth() - index,
      1,
    );
    const monthKey = monthStart.toISOString().slice(0, 7);

    months.push({
      label: createMonthFormatter().format(monthStart),
      matcher: (isoDate: string) => isoDate.startsWith(monthKey),
    });
  }

  return months;
}

function getTrailingWeeks(count: number, anchorDate = new Date()) {
  const weeks: Array<{
    label: string;
    matcher: (isoDate: string) => boolean;
  }> = [];
  const anchorWeekStart = getStartOfDay(anchorDate);
  anchorWeekStart.setDate(anchorWeekStart.getDate() - anchorWeekStart.getDay());

  for (let index = count - 1; index >= 0; index -= 1) {
    const weekStart = new Date(anchorWeekStart);
    weekStart.setDate(anchorWeekStart.getDate() - index * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    weeks.push({
      label: createWeekFormatter().format(weekStart),
      matcher: (isoDate: string) => {
        const transactionDate = parseIsoDate(isoDate);
        const normalizedDate = getStartOfDay(transactionDate);
        return normalizedDate >= weekStart && normalizedDate <= weekEnd;
      },
    });
  }

  return weeks;
}

function getTrailingDays(count: number, anchorDate = new Date()) {
  const days: Array<{
    label: string;
    matcher: (isoDate: string) => boolean;
  }> = [];
  const anchorDay = getStartOfDay(anchorDate);

  for (let index = count - 1; index >= 0; index -= 1) {
    const day = new Date(anchorDay);
    day.setDate(anchorDay.getDate() - index);
    const dayKey = day.toISOString().slice(0, 10);

    days.push({
      label: `${day.getDate()}日`,
      matcher: (isoDate: string) => isoDate.slice(0, 10) === dayKey,
    });
  }

  return days;
}

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDistributedTransactionSlices(transaction: Transaction, amount: number) {
  const spreadDays = Math.max(1, Math.round(transaction.spreadDays ?? 1));
  const anchorDate = getStartOfDay(parseIsoDate(transaction.date));

  return Array.from({ length: spreadDays }, (_, index) => {
    const nextDate = new Date(anchorDate);
    nextDate.setDate(anchorDate.getDate() + index);

    return {
      date: formatDateKey(nextDate),
      amount: amount / spreadDays,
    };
  });
}

function getTransactionEndDate(transaction: Transaction) {
  const anchorDate = getStartOfDay(parseIsoDate(transaction.date));
  const spreadDays = Math.max(1, Math.round(transaction.spreadDays ?? 1));
  anchorDate.setDate(anchorDate.getDate() + spreadDays - 1);
  return anchorDate;
}

function parseIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map((value) => Number.parseInt(value, 10));

  if (!year || !month || !day) {
    return new Date(isoDate);
  }

  return new Date(year, month - 1, day);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
