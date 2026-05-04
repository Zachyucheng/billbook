#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import ledgerModule from "../ledger-sqlite.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..", "..");
const { LedgerSqliteStore, getDefaultDatabasePath } = ledgerModule;
const ledgerStore = new LedgerSqliteStore({
  dbPath: (process.env.BILLBOOK_DESKTOP_DB_PATH || getDefaultDatabasePath()).trim(),
});

// ── Initialization Guide ────────────────────────────────────────────

const INITIALIZATION_GUIDE = `# 🎉 欢迎使用 Billbook

Billbook 是一款个人记账桌面应用，与 Hermes AI Agent 深度集成。

## 🚀 快速开始

### 1️⃣ 创建你的账本对象

\`\`\`
create_object(name="我自己", kind="self")
\`\`\`

### 2️⃣ 创建消费分类

| 分类 | 分组 |
|------|------|
| 餐饮 | daily |
| 日用 | daily |
| 出行 | transport |
| 居家开销 | housing |
| 礼物娱乐 | family |
| 宠物护理 | pet-care |
| 学习成长 | growth |
| 咖啡奶茶 | daily |
| 其他 | daily |

### 3️⃣ 开始记账

直接说：\`今天午饭 35 块\`、\`给猫买粮 200\`

## 📊 常用查询

- "我这个月花了多少？"
- "餐饮类花了多少？"
- "导出数据"
- "对比上月变化"`;

const USER_GUIDE = `# 📖 Billbook 使用指南

### 记账
直接说 "吃了个饭 35块" — Hermes 自动分类

### 查询
- "本月总支出"
- "[分类]花了多少"
- "最近一笔[关键词]"

### 管理
- "修改上一笔"
- "删除那笔[X元]"
- "导出/报表"`;

/** Check if user has disabled Hermes access in the app. Throws if disabled. */
function ensureHermesAccess() {
  const flagPath = path.join(rootDir, "desktop", "state", ".hermes-access");
  if (existsSync(flagPath) && readFileSync(flagPath, "utf8").trim() === "disabled") {
    throw new Error(
      "Hermes 访问已被禁止。请在 Billbook 桌面端「桌面运行时」中开启「允许 Hermes 访问」。 / Hermes access is blocked. Enable it in Billbook Desktop's \"Desktop Runtime\" panel.",
    );
  }
}

async function readText(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  return readFile(absolutePath, "utf8");
}

const server = new McpServer({
  name: "billbook-desktop",
  version: "0.1.1",
});

// ── Prompt / Resource: Initialize Guide ─────────────────────────────

async function getInitGuide() {
  const status = await ledgerStore.getDatabaseStatus();
  const isEmpty = status.objectCount === 0 && status.categoryCount === 0;
  return isEmpty ? INITIALIZATION_GUIDE : USER_GUIDE;
}

server.prompt(
  "initialize-guide",
  {
    description: "Get the Billbook initialization guide on first MCP connection, or the user guide if data already exists.",
  },
  async () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: await getInitGuide(),
        },
      },
    ],
  }),
);

server.resource(
  "billbook://guide",
  "billbook://guide",
  {
    description: "Billbook initialization guide — shown on first connection or when data is empty",
    mimeType: "text/markdown",
  },
  async () => ({
    contents: [
      {
        uri: "billbook://guide",
        mimeType: "text/markdown",
        text: await getInitGuide(),
      },
    ],
  }),
);

server.registerTool(
  "get_project_overview",
  {
    description: "Return the current Billbook desktop architecture overview.",
    inputSchema: {},
  },
  async () => {
    const packageJson = JSON.parse(await readText("package.json"));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              name: packageJson.name,
              version: packageJson.version,
              frontend: "Next.js 16 static export",
              backend: "Cloudflare Pages Functions + D1",
              desktop: "Electron shell",
              localAgent: "Hermes sidecar managed by Electron main process",
              mcp: "Local stdio MCP server from desktop/mcp/billbook-server.mjs",
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "get_desktop_runtime_guide",
  {
    description: "Return the desktop runtime instructions and environment variables.",
    inputSchema: {},
  },
  async () => {
    const guide = await readText("desktop/README.md");

    return {
      content: [
        {
          type: "text",
          text: guide,
        },
      ],
    };
  },
);

server.registerTool(
  "read_billbook_doc",
  {
    description: "Read a first-party Billbook desktop or deployment document.",
    inputSchema: {
      topic: z
        .enum(["desktop-roadmap", "cloudflare-deployment", "readme"])
        .describe("Which Billbook document to load"),
    },
  },
  async ({ topic }) => {
    const topicMap = {
      "desktop-roadmap": "docs/desktop-mcp-roadmap.md",
      "cloudflare-deployment": "docs/cloudflare-pages-deployment.md",
      readme: "README.md",
    };

    const relativePath = topicMap[topic];
    const text = await readText(relativePath);

    return {
      content: [
        {
          type: "text",
          text: `# ${relativePath}\n\n${text}`,
        },
      ],
    };
  },
);

server.registerTool(
  "get_desktop_environment",
  {
    description: "Summarize the relevant environment variables for Billbook desktop and Hermes.",
    inputSchema: {},
  },
  async () => {
    const values = {
      BILLBOOK_DESKTOP_APP_URL: process.env.BILLBOOK_DESKTOP_APP_URL ?? null,
      BILLBOOK_DESKTOP_DEV_SERVER_URL: process.env.BILLBOOK_DESKTOP_DEV_SERVER_URL ?? null,
      BILLBOOK_HERMES_COMMAND: process.env.BILLBOOK_HERMES_COMMAND ?? "hermes",
      BILLBOOK_HERMES_ARGS: process.env.BILLBOOK_HERMES_ARGS ?? "agent",
      BILLBOOK_HERMES_CWD: process.env.BILLBOOK_HERMES_CWD ?? process.cwd(),
      BILLBOOK_HERMES_AUTO_START: process.env.BILLBOOK_HERMES_AUTO_START ?? "false",
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(values, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "get_database_status",
  {
    description: "Return the current Billbook desktop SQLite sync status.",
    inputSchema: {},
  },
  async () => {
    ensureHermesAccess();
    const status = await ledgerStore.getDatabaseStatus();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(status, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "list_ledgers",
  {
    description: "List Billbook ledger objects from the synced local SQLite store.",
    inputSchema: {},
  },
  async () => {
    ensureHermesAccess();
    const ledgers = await ledgerStore.listLedgers();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(ledgers, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "list_categories",
  {
    description: "List synced Billbook categories, optionally narrowed by object or entry kind.",
    inputSchema: {
      objectId: z.string().optional(),
      kind: z.enum(["expense"]).optional(),
    },
  },
  async (input) => {
    ensureHermesAccess();
    const categories = await ledgerStore.listCategories(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(categories, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "create_category",
  {
    description:
      "Create a new Billbook expense or income category.\n  name: Category name, e.g. '游戏充值'\n  kind: Category kind ('expense' or 'income', defaults to expense)\n  group: Category group, e.g. 'daily', 'entertainment', 'transport'",
    inputSchema: {
      name: z.string().min(1),
      kind: z.enum(["expense", "income"]).optional(),
      group: z.string().optional(),
    },
  },
  async (input) => {
    ensureHermesAccess();
    const result = await ledgerStore.createCategory(input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.registerTool(
  "create_object",
  {
    description:
      "Create a new Billbook ledger object.\n  name: Object name, e.g. '女友', '车子', '公司项目'\n  kind: Object kind (self, partner, pet, vehicle, home, project, family, other; default: other)\n  monthlyBudget: Monthly budget\n  note: Note about this object\n  goal: Saving goal or purpose",
    inputSchema: {
      name: z.string().min(1),
      kind: z.enum(["self", "partner", "pet", "vehicle", "home", "project", "family", "other"]).optional(),
      monthlyBudget: z.number().positive().optional(),
      note: z.string().optional(),
      goal: z.string().optional(),
    },
  },
  async (input) => {
    ensureHermesAccess();
    const result = await ledgerStore.createObject(input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.registerTool(
  "update_object",
  {
    description:
      "Update a Billbook ledger object. Only provided fields are changed. Use categoryIds to authorize which categories this object can use.\n  id: Object ID (required)\n  name: New object name\n  kind: Object kind\n  note: Note about this object\n  goal: Saving goal or purpose\n  monthlyBudget: Monthly budget\n  categoryIds: Array of category IDs to authorize for this object",
    inputSchema: {
      id: z.string(),
      name: z.string().min(1).optional(),
      kind: z.enum(["self", "partner", "pet", "vehicle", "home", "project", "family", "other"]).optional(),
      monthlyBudget: z.number().positive().optional(),
      note: z.string().optional(),
      goal: z.string().optional(),
      categoryIds: z.array(z.string()).optional(),
    },
  },
  async (input) => {
    ensureHermesAccess();
    const result = await ledgerStore.updateObject(input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.registerTool(
  "create_transaction",
  {
    description:
      "Create a Billbook transaction for Hermes.\n  objectId: Ledger object ID (e.g. 'obj-self')\n  categoryId: Category ID (e.g. 'cat-food')\n  amount: Transaction amount (> 0)\n  date: YYYY-MM-DD (defaults to today)\n  title: Transaction title/description\n  note: Additional note\n  spreadDays: Spread cost across N days (for long-term expenses)\n  kind: Always 'expense'",
    inputSchema: {
      objectId: z.string(),
      categoryId: z.string(),
      amount: z.number().positive(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      title: z.string().optional(),
      note: z.string().optional(),
      spreadDays: z.number().int().positive().optional(),
      kind: z.enum(["expense"]).optional(),
    },
  },
  async (input) => {
    ensureHermesAccess();
    const result = await ledgerStore.createTransaction(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "delete_transaction",
  {
    description:
      "Delete a Billbook transaction by its ID. Removes it from the snapshot, SQLite tables, and restores the account balance.",
    inputSchema: {
      transactionId: z.string().describe("The ID of the transaction to delete"),
    },
  },
  async (input) => {
    ensureHermesAccess();
    const result = await ledgerStore.deleteTransaction(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "update_transaction",
  {
    description:
      "Update a Billbook transaction. Only provided fields are changed; amount changes adjust account balance.\n  transactionId: Transaction ID (required)\n  categoryId: New category ID\n  amount: New amount\n  date: New date (YYYY-MM-DD)\n  title: New title\n  note: New note\n  spreadDays: New spread period in days",
    inputSchema: {
      transactionId: z.string(),
      categoryId: z.string().optional(),
      amount: z.number().positive().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      title: z.string().optional(),
      note: z.string().optional(),
      spreadDays: z.number().int().positive().optional(),
    },
  },
  async (input) => {
    ensureHermesAccess();
    const result = await ledgerStore.updateTransaction(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "search_transactions",
  {
    description: "Search synced Billbook transactions for Hermes workflows.",
    inputSchema: {
      query: z.string().optional(),
      objectId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      kind: z.enum(["expense"]).optional(),
      limit: z.number().int().positive().max(200).optional(),
    },
  },
  async (input) => {
    ensureHermesAccess();
    const transactions = await ledgerStore.searchTransactions(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(transactions, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "find_last_transaction",
  {
    description:
      "Find the most recent Billbook transaction matching a keyword, useful for questions like when the user last bought or ate something.",
    inputSchema: {
      query: z.string().min(1),
      objectId: z.string().optional(),
      kind: z.enum(["expense", "income"]).optional(),
    },
  },
  async (input) => {
    ensureHermesAccess();
    const result = await ledgerStore.findLastTransaction(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "summarize_category",
  {
    description:
      "Summarize a Billbook category for statistics, object breakdown, interval patterns, and recent transactions.",
    inputSchema: {
      categoryId: z.string().optional(),
      categoryName: z.string().optional(),
      objectId: z.string().optional(),
      month: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional()
        .describe("YYYY-MM"),
      periodDays: z.number().int().positive().max(3650).optional(),
      anchorDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("YYYY-MM-DD"),
      kind: z.enum(["expense", "income"]).optional(),
    },
  },
  async (input) => {
    ensureHermesAccess();
    const result = await ledgerStore.summarizeCategory(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "list_recurring_plans",
  {
    description:
      "List upcoming recurring plans for Billbook, useful for subscription renewals and fixed-cost reminders.",
    inputSchema: {
      objectId: z.string().optional(),
      autopay: z.boolean().optional(),
      dueWithinDays: z.number().int().positive().max(365).optional(),
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("YYYY-MM-DD"),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("YYYY-MM-DD"),
    },
  },
  async (input) => {
    ensureHermesAccess();
    const result = await ledgerStore.listRecurringPlans(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "compare_category_periods",
  {
    description:
      "Compare current and previous category spending periods to detect spikes, drops, or unusual changes.",
    inputSchema: {
      categoryId: z.string().optional(),
      categoryName: z.string().optional(),
      objectId: z.string().optional(),
      currentPeriodDays: z.number().int().positive().max(3650).optional(),
      previousPeriodDays: z.number().int().positive().max(3650).optional(),
      anchorDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("YYYY-MM-DD"),
      kind: z.enum(["expense", "income"]).optional(),
    },
  },
  async (input) => {
    ensureHermesAccess();
    const result = await ledgerStore.compareCategoryPeriods(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "export_report",
  {
    description: "Generate a synced monthly expense report from the local SQLite store.",
    inputSchema: {
      month: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional()
        .describe("YYYY-MM"),
      objectId: z.string().optional(),
    },
  },
  async (input) => {
    ensureHermesAccess();
    const report = await ledgerStore.exportReport(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(report, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "summarize_object",
  {
    description:
      "Summarize a synced Billbook object with monthly totals, category breakdown, and recent transactions.",
    inputSchema: {
      objectId: z.string(),
      month: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional()
        .describe("YYYY-MM"),
    },
  },
  async (input) => {
    ensureHermesAccess();
    const summary = await ledgerStore.summarizeObject(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "export_data",
  {
    description: "Export all Billbook data (transactions, objects, categories) as JSON or CSV.",
    inputSchema: {
      format: z.enum(["json", "csv"]).optional().describe("Output format: json (default) or csv"),
      objectId: z.string().optional().describe("Filter data to a specific object"),
    },
  },
  async (input) => {
    ensureHermesAccess();
    const { format = "json", objectId } = input;

    // Fetch all data
    const [transactions, objects, categories] = await Promise.all([
      ledgerStore.searchTransactions({}),
      ledgerStore.listLedgers(),
      ledgerStore.listCategories({}),
    ]);

    // Build lookup maps for resolving IDs to names
    const objectMap = {};
    for (const obj of objects) {
      objectMap[obj.id || obj._id] = obj.name;
    }
    const categoryMap = {};
    for (const cat of categories) {
      categoryMap[cat.id || cat._id] = cat.name;
    }

    // Filter by objectId if provided
    let filteredTransactions = transactions;
    if (objectId) {
      filteredTransactions = transactions.filter(
        (t) => t.objectId === objectId || t.object_id === objectId,
      );
    }

    // Prepare the exported dataset
    const exportData = {
      transactions: filteredTransactions,
      objects,
      categories,
    };

    if (format === "csv") {
      // Build CSV with header: date,title,kind,amount,category,object,note
      const headers = ["date", "title", "kind", "amount", "category", "object", "note"];
      const rows = [headers.join(",")];

      for (const t of filteredTransactions) {
        const date = t.date || t.transaction_date || "";
        const title = (t.title || "").replace(/"/g, '""');
        const kind = t.kind || "expense";
        const amount = t.amount ?? 0;
        const categoryName = categoryMap[t.categoryId || t.category_id] || t.categoryId || "";
        const objectName = objectMap[t.objectId || t.object_id] || t.objectId || "";
        const note = (t.note || "").replace(/"/g, '""');

        const row = [
          date,
          `"${title}"`,
          kind,
          amount,
          `"${categoryName}"`,
          `"${objectName}"`,
          `"${note}"`,
        ];
        rows.push(row.join(","));
      }

      return { content: [{ type: "text", text: rows.join("\n") }] };
    }

    // Default: JSON format
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(exportData, null, 2),
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Billbook desktop MCP server running on stdio");

  // If database is fresh/empty, log initialization hint to stderr
  try {
    const status = await ledgerStore.getDatabaseStatus();
    if (status.objectCount === 0 && status.categoryCount === 0) {
      console.error("═══════════════════════════════════════════════════");
      console.error("  Billbook 账本为空 — 首次使用引导");
      console.error("  Prompt: initialize-guide  |  Resource: billbook://guide");
      console.error("═══════════════════════════════════════════════════");
    }
  } catch {
    // swallow — not critical
  }
}

main().catch((error) => {
  console.error("Fatal error in Billbook desktop MCP server:", error);
  process.exit(1);
});
