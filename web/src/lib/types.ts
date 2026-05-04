export type EntryKind = "expense" | "income";

export type ObjectKind =
  | "self"
  | "partner"
  | "pet"
  | "vehicle"
  | "home"
  | "project"
  | "family"
  | "other";

export type AccountType = "bank" | "wallet" | "credit" | "cash";

export type CategoryGroup =
  | "daily"
  | "transport"
  | "family"
  | "pet-care"
  | "housing"
  | "growth"
  | "salary"
  | "bonus"
  | "other";

export type ObjectAllocation = {
  objectId: string;
  amount: number;
};

export type LedgerObject = {
  id: string;
  name: string;
  kind: ObjectKind;
  accent: string;
  monthlyBudget: number;
  categoryIds: string[];
  note: string;
  goal: string;
  status: "active" | "watch";
};

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
};

export type Category = {
  id: string;
  name: string;
  kind: EntryKind;
  group: CategoryGroup;
};

export type LongTermCategorySetting = {
  id: string;
  objectId: string;
  categoryId: string;
  cycleDays: number;
  color: string;
};

export type HistoryDisplaySettings = {
  enabled: boolean;
  periodDays: number;
};

export type Transaction = {
  id: string;
  title: string;
  amount: number;
  date: string;
  kind: EntryKind;
  categoryId: string;
  accountId: string;
  allocations: ObjectAllocation[];
  note: string;
  tags: string[];
  spreadDays?: number;
};

export type RecurringPlan = {
  id: string;
  title: string;
  amount: number;
  cycle: "weekly" | "monthly" | "yearly";
  nextDate: string;
  objectId?: string;
  categoryId: string;
  autopay: boolean;
};

export type UserRole = "owner" | "editor" | "viewer";

export type ThemePreset = "fern" | "ember" | "ocean" | "berry";

export type WorkspaceLanguage = "zh-CN" | "en-US";

export type CurrencyCode = "CNY" | "USD";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accent: string;
  lastActive: string;
};

export type HistoryAction =
  | "login"
  | "logout"
  | "create_object"
  | "create_transaction"
  | "update_transaction"
  | "delete_transaction"
  | "export"
  | "update_role"
  | "update_settings";

export type HistoryItem = {
  id: string;
  action: HistoryAction;
  title: string;
  detail: string;
  actorId: string;
  createdAt: string;
};

export type BillbookState = {
  workspaceName: string;
  workspaceDescription: string;
  preferences: {
    theme: ThemePreset;
    language: WorkspaceLanguage;
    currency: CurrencyCode;
    storagePath: string;
  };
  objects: LedgerObject[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  recurringPlans: RecurringPlan[];
  teamMembers: TeamMember[];
  history: HistoryItem[];
  advancedSettings: {
    historyDisplay: HistoryDisplaySettings;
    longTermCategories: LongTermCategorySetting[];
  };
};

export type NewObjectInput = {
  name: string;
  kind: ObjectKind;
  note: string;
  categoryIds?: string[];
};

export type NewTransactionInput = {
  title: string;
  amount: number;
  date: string;
  categoryId: string;
  objectId: string;
  note: string;
  spreadDays?: number;
};

export type UpdateTransactionInput = {
  amount: number;
  date: string;
  categoryId: string;
  spreadDays?: number;
};

export type ExportFormat = "json" | "csv" | "excel";

export type PermissionSet = {
  canEdit: boolean;
  canManagePermissions: boolean;
  canExport: boolean;
};
