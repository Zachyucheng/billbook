import { BillbookState } from "@/lib/types";

export const objectPalette = [
  "#155f53",
  "#c26840",
  "#3c6ca8",
  "#8b5cc5",
  "#b7821e",
  "#2d8f55",
];

export const defaultWorkspaceMember = {
  id: "user-local-owner",
  name: "本地工作区",
  email: "local@billbook.app",
  role: "owner" as const,
  accent: objectPalette[0],
  lastActive: "2026-04-24T09:10:00+08:00",
};

export const sampleState: BillbookState = {
  workspaceName: "Billbook 生活账本",
  workspaceDescription: "围绕消费对象、长期消费与稳定复盘建立的个人账本空间。",
  preferences: {
    theme: "fern",
    language: "zh-CN",
    currency: "CNY",
    storagePath: "browser://localStorage/billbook-local-preferences",
  },
  objects: [
    {
      id: "obj-self",
      name: "我自己",
      kind: "self",
      accent: objectPalette[0],
      monthlyBudget: 3000,
      categoryIds: ["cat-food", "cat-grocery", "cat-transport", "cat-learning", "cat-other"],
      note: "默认个人消费对象，可在此基础上继续扩展家庭、宠物、车辆或项目账本。",
      goal: "先建立一套稳定、清晰、能长期复用的记录方式。",
      status: "active",
    },
  ],
  accounts: [
    {
      id: "acc-bank",
      name: "银行卡",
      type: "bank",
      balance: 12800,
    },
    {
      id: "acc-wallet",
      name: "电子钱包",
      type: "wallet",
      balance: 2600,
    },
    {
      id: "acc-credit",
      name: "信用卡",
      type: "credit",
      balance: -800,
    },
  ],
  categories: [
    { id: "cat-salary", name: "工资", kind: "income", group: "salary" },
    { id: "cat-bonus", name: "奖金", kind: "income", group: "bonus" },
    { id: "cat-food", name: "餐饮", kind: "expense", group: "daily" },
    { id: "cat-grocery", name: "日用", kind: "expense", group: "daily" },
    { id: "cat-transport", name: "出行", kind: "expense", group: "transport" },
    { id: "cat-fuel", name: "油费", kind: "expense", group: "transport" },
    { id: "cat-parking", name: "停车费", kind: "expense", group: "transport" },
    { id: "cat-gift", name: "礼物娱乐", kind: "expense", group: "family" },
    { id: "cat-pet", name: "宠物护理", kind: "expense", group: "pet-care" },
    { id: "cat-home", name: "居家开销", kind: "expense", group: "housing" },
    { id: "cat-learning", name: "学习成长", kind: "expense", group: "growth" },
    { id: "cat-other", name: "其他", kind: "expense", group: "daily" },
  ],
  transactions: [],
  recurringPlans: [],
  teamMembers: [defaultWorkspaceMember],
  history: [
    {
      id: "hist-bootstrap-workspace",
      action: "update_settings",
      title: "初始化账本",
      detail: "系统已为当前工作区准备好默认对象、账户和分类。",
      actorId: defaultWorkspaceMember.id,
      createdAt: "2026-04-24T09:10:00+08:00",
    },
  ],
  advancedSettings: {
    historyDisplay: {
      enabled: false,
      periodDays: 30,
    },
    longTermCategories: [],
  },
};
