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
  version: "0.1.0",
});

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
      "Create a new Billbook expense or income category. Returns the created category.",
    inputSchema: {
      name: z.string().min(1).describe("Category name, e.g. '游戏充值'"),
      kind: z.enum(["expense", "income"]).optional().describe("Category kind, defaults to expense"),
      group: z.string().optional().describe("Category group, e.g. 'daily', 'entertainment', 'transport'"),
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
      "Create a new Billbook ledger object (e.g. a person, pet, vehicle, or project to track expenses for).",
    inputSchema: {
      name: z.string().min(1).describe("Object name, e.g. '女友', '车子', '公司项目'"),
      kind: z.enum(["self", "partner", "pet", "vehicle", "home", "project", "family", "other"]).optional().describe("Object kind, defaults to 'other'"),
      monthlyBudget: z.number().positive().optional().describe("Monthly budget for this object"),
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
  "create_transaction",
  {
    description:
      "Create a Billbook transaction for Hermes and return history-display insight when enabled.",
    inputSchema: {
      objectId: z.string(),
      categoryId: z.string(),
      amount: z.number().positive(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("YYYY-MM-DD"),
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
}

main().catch((error) => {
  console.error("Fatal error in Billbook desktop MCP server:", error);
  process.exit(1);
});
