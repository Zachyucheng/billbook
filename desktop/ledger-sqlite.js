/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const initSqlJs = require("sql.js");

const DEFAULT_DB_PATH = path.join(process.cwd(), "desktop", "state", "billbook.sqlite");

let sqlPromise = null;

function getDefaultDatabasePath() {
  return process.env.BILLBOOK_DESKTOP_DB_PATH || DEFAULT_DB_PATH;
}

function getSqlModule() {
  if (!sqlPromise) {
    const wasmPath = require.resolve("sql.js/dist/sql-wasm.wasm");
    sqlPromise = initSqlJs({
      locateFile: (file) => (file.endsWith(".wasm") ? wasmPath : file),
    });
  }

  return sqlPromise;
}

function readValue(row, key) {
  return row?.[key] ?? null;
}

class LedgerSqliteStore {
  constructor(options = {}) {
    this.dbPath = options.dbPath || getDefaultDatabasePath();
  }

  async openDatabase() {
    const SQL = await getSqlModule();
    await fsp.mkdir(path.dirname(this.dbPath), { recursive: true });

    let db;

    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = await fsp.readFile(this.dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }

    this.applySchema(db);

    return db;
  }

  applySchema(db) {
    db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workspace_snapshot (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        state_json TEXT NOT NULL,
        synced_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS objects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        accent TEXT NOT NULL,
        monthly_budget REAL NOT NULL,
        note TEXT NOT NULL,
        goal TEXT NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        balance REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        group_name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        kind TEXT NOT NULL,
        category_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        note TEXT NOT NULL,
        spread_days INTEGER NOT NULL,
        tags_json TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );

      CREATE TABLE IF NOT EXISTS transaction_allocations (
        transaction_id TEXT NOT NULL,
        object_id TEXT NOT NULL,
        amount REAL NOT NULL,
        PRIMARY KEY (transaction_id, object_id),
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (object_id) REFERENCES objects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS recurring_plans (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        cycle TEXT NOT NULL,
        next_date TEXT NOT NULL,
        object_id TEXT,
        category_id TEXT NOT NULL,
        autopay INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS long_term_categories (
        id TEXT PRIMARY KEY,
        object_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        cycle_days INTEGER NOT NULL,
        color TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
      CREATE INDEX IF NOT EXISTS idx_allocations_object ON transaction_allocations(object_id);
    `);
  }

  async persist(db) {
    const bytes = db.export();
    await fsp.writeFile(this.dbPath, Buffer.from(bytes));
  }

  async withDatabase(callback) {
    const db = await this.openDatabase();

    try {
      const result = await callback(db);
      await this.persist(db);
      return result;
    } finally {
      db.close();
    }
  }

  async queryDatabase(callback) {
    const db = await this.openDatabase();

    try {
      return await callback(db);
    } finally {
      db.close();
    }
  }

  getRows(db, sql, params = []) {
    const statement = db.prepare(sql);

    try {
      statement.bind(params);
      const rows = [];

      while (statement.step()) {
        rows.push(statement.getAsObject());
      }

      return rows;
    } finally {
      statement.free();
    }
  }

  setMetadata(db, key, value) {
    const statement = db.prepare(`
      INSERT INTO metadata (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    try {
      statement.run([key, value]);
    } finally {
      statement.free();
    }
  }

  getMetadataMap(db) {
    const metadataRows = this.getRows(db, "SELECT key, value FROM metadata");
    return Object.fromEntries(metadataRows.map((row) => [row.key, row.value]));
  }

  getWorkspaceSnapshotState(db) {
    const snapshotRow = this.getRows(
      db,
      "SELECT state_json FROM workspace_snapshot WHERE id = 1 LIMIT 1",
    )[0];

    if (!snapshotRow?.state_json) {
      return null;
    }

    try {
      return JSON.parse(String(snapshotRow.state_json));
    } catch {
      return null;
    }
  }

  replaceWorkspaceState(db, payload) {
    db.exec("BEGIN");

    try {
      db.exec(`
        DELETE FROM transaction_allocations;
        DELETE FROM transactions;
        DELETE FROM recurring_plans;
        DELETE FROM long_term_categories;
        DELETE FROM objects;
        DELETE FROM categories;
        DELETE FROM accounts;
      `);

      const syncedAt = payload.syncedAt || new Date().toISOString();
      const stateJson = JSON.stringify(payload.state);

      this.setMetadata(db, "workspace_name", payload.state.workspaceName);
      this.setMetadata(db, "workspace_description", payload.state.workspaceDescription);
      this.setMetadata(db, "currency", payload.state.preferences.currency);
      this.setMetadata(db, "theme", payload.state.preferences.theme);
      this.setMetadata(db, "language", payload.state.preferences.language);
      this.setMetadata(db, "storage_path", payload.state.preferences.storagePath);
      this.setMetadata(db, "synced_at", syncedAt);
      this.setMetadata(db, "workspace_user_name", payload.workspaceUserName || "");

      const snapshotStatement = db.prepare(`
        INSERT INTO workspace_snapshot (id, state_json, synced_at)
        VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          state_json = excluded.state_json,
          synced_at = excluded.synced_at
      `);

      snapshotStatement.run([stateJson, syncedAt]);
      snapshotStatement.free();

      const objectStatement = db.prepare(`
        INSERT INTO objects (id, name, kind, accent, monthly_budget, note, goal, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const objectItem of payload.state.objects) {
        objectStatement.run([
          objectItem.id,
          objectItem.name,
          objectItem.kind,
          objectItem.accent,
          objectItem.monthlyBudget,
          objectItem.note,
          objectItem.goal,
          objectItem.status,
        ]);
      }
      objectStatement.free();

      const categoryStatement = db.prepare(`
        INSERT INTO categories (id, name, kind, group_name)
        VALUES (?, ?, ?, ?)
      `);
      for (const category of payload.state.categories) {
        categoryStatement.run([category.id, category.name, category.kind, category.group]);
      }
      categoryStatement.free();

      const accountStatement = db.prepare(`
        INSERT INTO accounts (id, name, type, balance)
        VALUES (?, ?, ?, ?)
      `);
      for (const account of payload.state.accounts) {
        accountStatement.run([account.id, account.name, account.type, account.balance]);
      }
      accountStatement.free();

      const transactionStatement = db.prepare(`
        INSERT INTO transactions (
          id, title, amount, date, kind, category_id, account_id, note, spread_days, tags_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const allocationStatement = db.prepare(`
        INSERT INTO transaction_allocations (transaction_id, object_id, amount)
        VALUES (?, ?, ?)
      `);

      for (const transaction of payload.state.transactions) {
        transactionStatement.run([
          transaction.id,
          transaction.title,
          transaction.amount,
          transaction.date,
          transaction.kind,
          transaction.categoryId,
          transaction.accountId,
          transaction.note,
          transaction.spreadDays ?? 1,
          JSON.stringify(transaction.tags ?? []),
        ]);

        for (const allocation of transaction.allocations) {
          allocationStatement.run([transaction.id, allocation.objectId, allocation.amount]);
        }
      }

      transactionStatement.free();
      allocationStatement.free();

      const recurringPlanStatement = db.prepare(`
        INSERT INTO recurring_plans (
          id, title, amount, cycle, next_date, object_id, category_id, autopay
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const plan of payload.state.recurringPlans) {
        recurringPlanStatement.run([
          plan.id,
          plan.title,
          plan.amount,
          plan.cycle,
          plan.nextDate,
          plan.objectId ?? null,
          plan.categoryId,
          plan.autopay ? 1 : 0,
        ]);
      }
      recurringPlanStatement.free();

      const longTermStatement = db.prepare(`
        INSERT INTO long_term_categories (id, object_id, category_id, cycle_days, color)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const item of payload.state.advancedSettings.longTermCategories) {
        longTermStatement.run([
          item.id,
          item.objectId,
          item.categoryId,
          item.cycleDays,
          item.color,
        ]);
      }
      longTermStatement.free();

      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    return this.getDatabaseStatusFromDb(db);
  }

  async syncWorkspace(payload) {
    if (!payload || !payload.state) {
      throw new Error("桌面账本同步失败：缺少状态数据。");
    }

    return this.withDatabase(async (db) => this.replaceWorkspaceState(db, payload));
  }

  async createTransaction(input = {}) {
    return this.withDatabase(async (db) => {
      const state = this.getWorkspaceSnapshotState(db);

      if (!state) {
        throw new Error("Billbook desktop database has no workspace snapshot yet.");
      }

      const objectItem = Array.isArray(state.objects)
        ? state.objects.find((item) => item.id === input.objectId)
        : null;
      if (!objectItem) {
        throw new Error("Unknown Billbook object.");
      }

      const entryKind = input.kind || "expense";
      const categoryItem = Array.isArray(state.categories)
        ? state.categories.find((item) => item.id === input.categoryId && item.kind === entryKind)
        : null;
      if (!categoryItem) {
        throw new Error("Unknown Billbook category.");
      }

      const accounts = Array.isArray(state.accounts) ? state.accounts : [];
      const accountItem = accounts.find((item) => item.id === input.accountId) ?? accounts[0] ?? null;
      if (!accountItem) {
        throw new Error("No Billbook account is available for this transaction.");
      }

      const amount = roundAmount(Number(input.amount));
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Transaction amount must be greater than 0.");
      }

      const date = normalizeDateInput(input.date);
      const longTermSetting = Array.isArray(state.advancedSettings?.longTermCategories)
        ? state.advancedSettings.longTermCategories.find(
            (item) => item.objectId === objectItem.id && item.categoryId === categoryItem.id,
          )
        : null;
      const spreadDays = normalizeSpreadDays(input.spreadDays ?? longTermSetting?.cycleDays ?? 1);
      const nextTransaction = {
        id: createId("txn"),
        title:
          typeof input.title === "string" && input.title.trim()
            ? input.title.trim()
            : categoryItem.name,
        amount,
        date,
        kind: entryKind,
        categoryId: categoryItem.id,
        accountId: accountItem.id,
        allocations: [{ objectId: objectItem.id, amount }],
        note: typeof input.note === "string" ? input.note.trim() : "",
        tags: ["single-object"],
        spreadDays,
      };
      const mutationTimestamp = new Date().toISOString();
      const actorId =
        Array.isArray(state.teamMembers) && state.teamMembers[0]?.id
          ? state.teamMembers[0].id
          : "desktop-mcp";
      const nextState = {
        ...state,
        transactions: [nextTransaction, ...(Array.isArray(state.transactions) ? state.transactions : [])],
        accounts: accounts.map((account) =>
          account.id === accountItem.id
            ? {
                ...account,
                balance: roundAmount(Number(account.balance || 0) - amount),
              }
            : account,
        ),
        history: appendHistoryEntry(
          Array.isArray(state.history) ? state.history : [],
          {
            action: "create_transaction",
            title: "Create transaction",
            detail: `Recorded ${nextTransaction.title}.`,
            actorId,
          },
          mutationTimestamp,
        ),
        teamMembers: touchTeamMembers(
          Array.isArray(state.teamMembers) ? state.teamMembers : [],
          actorId,
          mutationTimestamp,
        ),
      };

      const metadata = this.getMetadataMap(db);
      this.replaceWorkspaceState(db, {
        state: nextState,
        syncedAt: mutationTimestamp,
        workspaceUserName: metadata.workspace_user_name || "",
      });

      return {
        transaction: {
          id: nextTransaction.id,
          title: nextTransaction.title,
          amount: nextTransaction.amount,
          date: nextTransaction.date,
          kind: nextTransaction.kind,
          categoryId: categoryItem.id,
          categoryName: categoryItem.name,
          objectId: objectItem.id,
          objectName: objectItem.name,
          note: nextTransaction.note,
          spreadDays: nextTransaction.spreadDays,
        },
        historyDisplay: buildHistoryDisplayFeedback(nextState, nextTransaction, objectItem.id),
      };
    });
  }

  async readWorkspaceSnapshot() {
    return this.queryDatabase(async (db) => {
      return this.getWorkspaceSnapshotState(db);
    });
  }

  async createCategory(input = {}) {
    return this.withDatabase(async (db) => {
      const state = this.getWorkspaceSnapshotState(db);
      if (!state) throw new Error("Billbook desktop database has no workspace snapshot yet.");

      const name = (typeof input.name === "string" ? input.name : "").trim();
      if (!name) throw new Error("Category name is required.");

      const kind = input.kind || "expense";
      if (!["expense", "income"].includes(kind)) throw new Error("Category kind must be expense or income.");

      const categories = Array.isArray(state.categories) ? state.categories : [];
      if (categories.some((c) => c.name === name && c.kind === kind)) {
        throw new Error(`Category "${name}" already exists.`);
      }

      const categoryId = input.id || createId("cat");
      const group = (typeof input.group === "string" ? input.group : "daily").trim() || "daily";

      const newCategory = { id: categoryId, name, kind, group };

      // Auto-authorize: add this category to all existing objects
      const nextObjects = Array.isArray(state.objects)
        ? state.objects.map((obj) => ({
            ...obj,
            categoryIds: Array.isArray(obj.categoryIds)
              ? obj.categoryIds.includes(categoryId)
                ? obj.categoryIds
                : [...obj.categoryIds, categoryId]
              : [categoryId],
          }))
        : state.objects;

      const nextState = {
        ...state,
        categories: [...categories, newCategory],
        objects: nextObjects,
      };

      const mutationTimestamp = new Date().toISOString();
      const metadata = this.getMetadataMap(db);
      this.replaceWorkspaceState(db, {
        state: nextState,
        syncedAt: mutationTimestamp,
        workspaceUserName: metadata.workspace_user_name || "",
      });

      return {
        category: newCategory,
        message: `Created ${kind === "expense" ? "expense" : "income"} category "${name}".`,
      };
    });
  }

  async createObject(input = {}) {
    return this.withDatabase(async (db) => {
      const state = this.getWorkspaceSnapshotState(db);
      if (!state) throw new Error("Billbook desktop database has no workspace snapshot yet.");

      const name = (typeof input.name === "string" ? input.name : "").trim();
      if (!name) throw new Error("Object name is required.");

      const objects = Array.isArray(state.objects) ? state.objects : [];
      if (objects.some((o) => o.name === name)) {
        throw new Error(`Object "${name}" already exists.`);
      }

      const objectId = input.id || createId("obj");
      const kind = input.kind || "other";
      const accent = input.accent || "#155f53";
      const monthlyBudget = Number.isFinite(Number(input.monthlyBudget)) ? Number(input.monthlyBudget) : 0;
      const categoryIds = Array.isArray(input.categoryIds) ? input.categoryIds : [];
      const note = typeof input.note === "string" ? input.note : "";
      const goal = typeof input.goal === "string" ? input.goal : "";

      const newObject = {
        id: objectId,
        name,
        kind,
        accent,
        monthlyBudget,
        categoryIds,
        note,
        goal,
        status: "active",
      };

      const nextState = {
        ...state,
        objects: [...objects, newObject],
      };

      const mutationTimestamp = new Date().toISOString();
      const metadata = this.getMetadataMap(db);
      this.replaceWorkspaceState(db, {
        state: nextState,
        syncedAt: mutationTimestamp,
        workspaceUserName: metadata.workspace_user_name || "",
      });

      return {
        object: newObject,
        message: `Created object "${name}".`,
      };
    });
  }

  async updateObject(input = {}) {
    return this.withDatabase(async (db) => {
      const state = this.getWorkspaceSnapshotState(db);
      if (!state) throw new Error("Billbook desktop database has no workspace snapshot yet.");

      const objectId = input.id;
      if (!objectId) throw new Error("Object ID is required.");

      const objects = Array.isArray(state.objects) ? state.objects : [];
      const objectIndex = objects.findIndex((o) => o.id === objectId);
      if (objectIndex === -1) {
        throw new Error(`Object with ID "${objectId}" not found.`);
      }

      const existing = objects[objectIndex];
      const updated = { ...existing };

      if (input.name !== undefined) updated.name = String(input.name).trim();
      if (input.kind !== undefined) updated.kind = input.kind;
      if (input.note !== undefined) updated.note = String(input.note);
      if (input.goal !== undefined) updated.goal = String(input.goal);
      if (input.monthlyBudget !== undefined) updated.monthlyBudget = Number(input.monthlyBudget);
      if (input.categoryIds !== undefined) {
        updated.categoryIds = Array.isArray(input.categoryIds) ? input.categoryIds : [];
      }

      const nextObjects = [...objects];
      nextObjects[objectIndex] = updated;

      const nextState = {
        ...state,
        objects: nextObjects,
      };

      const mutationTimestamp = new Date().toISOString();
      const metadata = this.getMetadataMap(db);
      this.replaceWorkspaceState(db, {
        state: nextState,
        syncedAt: mutationTimestamp,
        workspaceUserName: metadata.workspace_user_name || "",
      });

      return {
        object: updated,
        message: `Updated object "${updated.name}".`,
      };
    });
  }

  getDatabaseStatusFromDb(db) {
    const metadataRows = this.getRows(db, "SELECT key, value FROM metadata");
    const metadata = Object.fromEntries(metadataRows.map((row) => [row.key, row.value]));

    const objectCount = Number(
      readValue(this.getRows(db, "SELECT COUNT(*) AS count FROM objects")[0], "count") || 0,
    );
    const transactionCount = Number(
      readValue(this.getRows(db, "SELECT COUNT(*) AS count FROM transactions")[0], "count") || 0,
    );
    const categoryCount = Number(
      readValue(this.getRows(db, "SELECT COUNT(*) AS count FROM categories")[0], "count") || 0,
    );

    return {
      path: this.dbPath,
      exists: fs.existsSync(this.dbPath),
      workspaceName: metadata.workspace_name || "",
      syncedAt: metadata.synced_at || null,
      objectCount,
      transactionCount,
      categoryCount,
    };
  }

  async getDatabaseStatus() {
    return this.queryDatabase(async (db) => this.getDatabaseStatusFromDb(db));
  }

  async listCategories(input = {}) {
    return this.queryDatabase(async (db) => {
      const where = [];
      const params = [];

      if (input.kind) {
        where.push("c.kind = ?");
        params.push(input.kind);
      }

      const rows = this.getRows(
        db,
        `
          SELECT
            c.id,
            c.name,
            c.kind,
            c.group_name,
            COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN a.amount ELSE 0 END), 0) AS expense_total,
            COUNT(DISTINCT t.id) AS transaction_count
          FROM categories c
          LEFT JOIN transactions t ON t.category_id = c.id
          LEFT JOIN transaction_allocations a ON a.transaction_id = t.id
          ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
          GROUP BY c.id, c.name, c.kind, c.group_name
          ORDER BY expense_total DESC, c.name ASC
        `,
        params,
      );

      const filteredRows = input.objectId
        ? rows.filter((row) => this.objectUsesCategory(db, input.objectId, String(row.id)))
        : rows;

      return filteredRows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        kind: String(row.kind),
        group: String(row.group_name),
        expenseTotal: Number(row.expense_total || 0),
        transactionCount: Number(row.transaction_count || 0),
      }));
    });
  }

  resolveCategoryMatches(db, input = {}) {
    if (!input.categoryId && !input.categoryName) {
      throw new Error("categoryId or categoryName is required.");
    }

    const where = [];
    const params = [];

    if (input.categoryId) {
      where.push("id = ?");
      params.push(input.categoryId);
    }

    if (input.categoryName) {
      where.push("LOWER(name) LIKE LOWER(?)");
      params.push(`%${input.categoryName}%`);
    }

    if (input.kind) {
      where.push("kind = ?");
      params.push(input.kind);
    }

    const rows = this.getRows(
      db,
      `
        SELECT id, name, kind, group_name
        FROM categories
        WHERE ${where.join(" AND ")}
        ORDER BY name ASC, id ASC
      `,
      params,
    );

    if (rows.length === 0) {
      throw new Error("No Billbook category matched the provided input.");
    }

    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      kind: String(row.kind),
      group: String(row.group_name),
    }));
  }

  objectUsesCategory(db, objectId, categoryId) {
    const snapshotRow = this.getRows(
      db,
      "SELECT state_json FROM workspace_snapshot WHERE id = 1 LIMIT 1",
    )[0];

    if (!snapshotRow?.state_json) {
      return false;
    }

    try {
      const snapshot = JSON.parse(String(snapshotRow.state_json));
      const objectItem = Array.isArray(snapshot.objects)
        ? snapshot.objects.find((item) => item.id === objectId)
        : null;

      return Array.isArray(objectItem?.categoryIds)
        ? objectItem.categoryIds.includes(categoryId)
        : false;
    } catch {
      return false;
    }
  }

  async listLedgers() {
    return this.queryDatabase(async (db) => {
      const rows = this.getRows(
        db,
        `
          SELECT
            o.id,
            o.name,
            o.kind,
            o.status,
            o.note,
            o.goal,
            COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN a.amount ELSE 0 END), 0) AS expense_total,
            COUNT(DISTINCT a.transaction_id) AS transaction_count,
            MAX(t.date) AS last_transaction_date
          FROM objects o
          LEFT JOIN transaction_allocations a ON a.object_id = o.id
          LEFT JOIN transactions t ON t.id = a.transaction_id
          GROUP BY o.id, o.name, o.kind, o.status, o.note, o.goal
          ORDER BY expense_total DESC, o.name ASC
        `,
      );

      return rows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        kind: String(row.kind),
        status: String(row.status),
        note: String(row.note),
        goal: String(row.goal),
        expenseTotal: Number(row.expense_total || 0),
        transactionCount: Number(row.transaction_count || 0),
        lastTransactionDate: row.last_transaction_date ? String(row.last_transaction_date) : null,
      }));
    });
  }

  async searchTransactions(input = {}) {
    return this.queryDatabase(async (db) => {
      const where = [];
      const params = [];

      if (input.query) {
        where.push(`
          (
            LOWER(t.title) LIKE LOWER(?)
            OR LOWER(COALESCE(t.note, '')) LIKE LOWER(?)
            OR LOWER(c.name) LIKE LOWER(?)
            OR LOWER(COALESCE(o.name, '')) LIKE LOWER(?)
          )
        `);
        const pattern = `%${input.query}%`;
        params.push(pattern, pattern, pattern, pattern);
      }

      if (input.objectId) {
        where.push("a.object_id = ?");
        params.push(input.objectId);
      }

      if (input.startDate) {
        where.push("t.date >= ?");
        params.push(input.startDate);
      }

      if (input.endDate) {
        where.push("t.date <= ?");
        params.push(input.endDate);
      }

      if (input.kind) {
        where.push("t.kind = ?");
        params.push(input.kind);
      }

      const limit = Math.max(1, Math.min(Number(input.limit || 20), 200));
      params.push(limit);

      const sql = `
        SELECT
          t.id,
          t.title,
          t.amount,
          t.date,
          t.kind,
          t.note,
          t.spread_days,
          c.name AS category_name,
          GROUP_CONCAT(DISTINCT o.name) AS object_names
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        LEFT JOIN transaction_allocations a ON a.transaction_id = t.id
        LEFT JOIN objects o ON o.id = a.object_id
        ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
        GROUP BY t.id, t.title, t.amount, t.date, t.kind, t.note, t.spread_days, c.name
        ORDER BY t.date DESC, t.id DESC
        LIMIT ?
      `;

      const rows = this.getRows(db, sql, params);

      return rows.map((row) => ({
        id: String(row.id),
        title: String(row.title),
        amount: Number(row.amount || 0),
        date: String(row.date),
        kind: String(row.kind),
        note: String(row.note || ""),
        spreadDays: Number(row.spread_days || 1),
        categoryName: String(row.category_name || ""),
        objectNames: row.object_names
          ? String(row.object_names)
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
      }));
    });
  }

  async exportReport(input = {}) {
    return this.queryDatabase(async (db) => {
      const month = input.month || new Date().toISOString().slice(0, 7);
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;
      const params = [startDate, endDate];
      let objectFilter = "";

      if (input.objectId) {
        objectFilter = "AND a.object_id = ?";
        params.push(input.objectId);
      }

      const summaryRow = this.getRows(
        db,
        `
          SELECT
            COUNT(DISTINCT t.id) AS transaction_count,
            COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN a.amount ELSE 0 END), 0) AS expense_total
          FROM transactions t
          LEFT JOIN transaction_allocations a ON a.transaction_id = t.id
          WHERE t.date >= ? AND t.date <= ?
          ${objectFilter}
        `,
        params,
      )[0];

      const categoryRows = this.getRows(
        db,
        `
          SELECT
            c.name AS category_name,
            COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN a.amount ELSE 0 END), 0) AS expense_total
          FROM transactions t
          LEFT JOIN transaction_allocations a ON a.transaction_id = t.id
          LEFT JOIN categories c ON c.id = t.category_id
          WHERE t.date >= ? AND t.date <= ?
          ${objectFilter}
          GROUP BY c.name
          ORDER BY expense_total DESC, c.name ASC
        `,
        params,
      );

      const objectRows = this.getRows(
        db,
        `
          SELECT
            o.id,
            o.name,
            COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN a.amount ELSE 0 END), 0) AS expense_total
          FROM transactions t
          LEFT JOIN transaction_allocations a ON a.transaction_id = t.id
          LEFT JOIN objects o ON o.id = a.object_id
          WHERE t.date >= ? AND t.date <= ?
          ${objectFilter}
          GROUP BY o.id, o.name
          ORDER BY expense_total DESC, o.name ASC
        `,
        params,
      );

      return {
        month,
        transactionCount: Number(summaryRow?.transaction_count || 0),
        expenseTotal: Number(summaryRow?.expense_total || 0),
        categories: categoryRows.map((row) => ({
          name: String(row.category_name || ""),
          expenseTotal: Number(row.expense_total || 0),
        })),
        objects: objectRows.map((row) => ({
          id: String(row.id || ""),
          name: String(row.name || ""),
          expenseTotal: Number(row.expense_total || 0),
        })),
      };
    });
  }

  async findLastTransaction(input = {}) {
    return this.queryDatabase(async (db) => {
      const normalizedQuery =
        typeof input.query === "string" ? input.query.trim() : "";

      if (!normalizedQuery) {
        throw new Error("A query string is required.");
      }

      const where = [
        `(
          LOWER(t.title) LIKE LOWER(?)
          OR LOWER(COALESCE(t.note, '')) LIKE LOWER(?)
          OR LOWER(c.name) LIKE LOWER(?)
          OR LOWER(COALESCE(o.name, '')) LIKE LOWER(?)
        )`,
      ];
      const pattern = `%${normalizedQuery}%`;
      const params = [pattern, pattern, pattern, pattern];

      if (input.objectId) {
        where.push("a.object_id = ?");
        params.push(input.objectId);
      }

      if (input.kind) {
        where.push("t.kind = ?");
        params.push(input.kind);
      }

      const row = this.getRows(
        db,
        `
          SELECT
            t.id,
            t.title,
            t.amount,
            t.date,
            t.kind,
            t.note,
            t.spread_days,
            c.id AS category_id,
            c.name AS category_name,
            GROUP_CONCAT(DISTINCT o.name) AS object_names
          FROM transactions t
          LEFT JOIN categories c ON c.id = t.category_id
          LEFT JOIN transaction_allocations a ON a.transaction_id = t.id
          LEFT JOIN objects o ON o.id = a.object_id
          WHERE ${where.join(" AND ")}
          GROUP BY
            t.id,
            t.title,
            t.amount,
            t.date,
            t.kind,
            t.note,
            t.spread_days,
            c.id,
            c.name
          ORDER BY t.date DESC, t.id DESC
          LIMIT 1
        `,
        params,
      )[0];

      if (!row) {
        return {
          found: false,
          query: normalizedQuery,
          transaction: null,
          summary: `No Billbook transaction matched "${normalizedQuery}".`,
        };
      }

      const transaction = {
        id: String(row.id),
        title: String(row.title || ""),
        amount: Number(row.amount || 0),
        date: String(row.date || ""),
        kind: String(row.kind || ""),
        note: String(row.note || ""),
        spreadDays: Number(row.spread_days || 1),
        categoryId: String(row.category_id || ""),
        categoryName: String(row.category_name || ""),
        objectNames: row.object_names
          ? String(row.object_names)
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
      };

      return {
        found: true,
        query: normalizedQuery,
        transaction,
        summary: `Last matching transaction: ${transaction.title} on ${transaction.date}.`,
      };
    });
  }

  async summarizeCategory(input = {}) {
    return this.queryDatabase(async (db) => {
      const matchedCategories = this.resolveCategoryMatches(db, input);
      const categoryIds = matchedCategories.map((item) => item.id);
      const month = input.month || null;
      const periodDays =
        typeof input.periodDays === "number" && Number.isFinite(input.periodDays)
          ? Math.max(1, Math.round(input.periodDays))
          : null;
      const range = month
        ? getMonthDateRange(month)
        : periodDays
          ? getTrailingDateRange(periodDays, input.anchorDate)
          : null;
      const where = [`t.category_id IN (${categoryIds.map(() => "?").join(", ")})`];
      const params = [...categoryIds];

      if (input.objectId) {
        where.push("a.object_id = ?");
        params.push(input.objectId);
      }

      if (range) {
        where.push("t.date >= ?");
        where.push("t.date <= ?");
        params.push(range.startDate, range.endDate);
      }

      const summaryRow = this.getRows(
        db,
        `
          SELECT
            COUNT(DISTINCT t.id) AS transaction_count,
            COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN a.amount ELSE 0 END), 0) AS expense_total,
            MAX(t.date) AS last_transaction_date
          FROM transactions t
          LEFT JOIN transaction_allocations a ON a.transaction_id = t.id
          WHERE ${where.join(" AND ")}
        `,
        params,
      )[0];

      const objectRows = this.getRows(
        db,
        `
          SELECT
            o.id,
            o.name,
            COUNT(DISTINCT t.id) AS transaction_count,
            COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN a.amount ELSE 0 END), 0) AS expense_total
          FROM transactions t
          LEFT JOIN transaction_allocations a ON a.transaction_id = t.id
          LEFT JOIN objects o ON o.id = a.object_id
          WHERE ${where.join(" AND ")}
          GROUP BY o.id, o.name
          ORDER BY expense_total DESC, o.name ASC
        `,
        params,
      );

      const recentRows = this.getRows(
        db,
        `
          SELECT
            t.id,
            t.title,
            t.amount,
            t.date,
            t.note,
            t.spread_days,
            c.id AS category_id,
            c.name AS category_name,
            GROUP_CONCAT(DISTINCT o.name) AS object_names
          FROM transactions t
          LEFT JOIN categories c ON c.id = t.category_id
          LEFT JOIN transaction_allocations a ON a.transaction_id = t.id
          LEFT JOIN objects o ON o.id = a.object_id
          WHERE ${where.join(" AND ")}
          GROUP BY
            t.id,
            t.title,
            t.amount,
            t.date,
            t.note,
            t.spread_days,
            c.id,
            c.name
          ORDER BY t.date DESC, t.id DESC
          LIMIT 8
        `,
        params,
      );

      const longTermRows = this.getRows(
        db,
        `
          SELECT
            ltc.id,
            ltc.object_id,
            ltc.category_id,
            ltc.cycle_days,
            ltc.color,
            o.name AS object_name
          FROM long_term_categories ltc
          LEFT JOIN objects o ON o.id = ltc.object_id
          WHERE ltc.category_id IN (${categoryIds.map(() => "?").join(", ")})
          ORDER BY o.name ASC, ltc.category_id ASC
        `,
        categoryIds,
      );

      const recentTransactions = recentRows.map((row) => ({
        id: String(row.id || ""),
        title: String(row.title || ""),
        amount: Number(row.amount || 0),
        date: String(row.date || ""),
        note: String(row.note || ""),
        spreadDays: Number(row.spread_days || 1),
        categoryId: String(row.category_id || ""),
        categoryName: String(row.category_name || ""),
        objectNames: row.object_names
          ? String(row.object_names)
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
      }));

      return {
        categories: matchedCategories,
        range: range
          ? {
              label: range.label,
              startDate: range.startDate,
              endDate: range.endDate,
            }
          : {
              label: "all-time",
              startDate: null,
              endDate: null,
            },
        summary: {
          transactionCount: Number(summaryRow?.transaction_count || 0),
          expenseTotal: Number(summaryRow?.expense_total || 0),
          lastTransactionDate: summaryRow?.last_transaction_date
            ? String(summaryRow.last_transaction_date)
            : null,
        },
        objectBreakdown: objectRows.map((row) => ({
          id: String(row.id || ""),
          name: String(row.name || ""),
          transactionCount: Number(row.transaction_count || 0),
          expenseTotal: Number(row.expense_total || 0),
        })),
        longTermSettings: longTermRows.map((row) => ({
          id: String(row.id || ""),
          objectId: String(row.object_id || ""),
          objectName: String(row.object_name || ""),
          categoryId: String(row.category_id || ""),
          cycleDays: Number(row.cycle_days || 1),
          color: String(row.color || ""),
        })),
        intervalInsight: buildTransactionIntervalInsight(recentTransactions),
        recentTransactions,
      };
    });
  }

  async listRecurringPlans(input = {}) {
    return this.queryDatabase(async (db) => {
      const dateRange =
        input.startDate || input.endDate
          ? {
              startDate: input.startDate || "0000-01-01",
              endDate: input.endDate || "9999-12-31",
              label: "custom-range",
            }
          : typeof input.dueWithinDays === "number"
            ? getTrailingFutureDateRange(Math.max(1, Math.round(input.dueWithinDays)))
            : null;
      const where = [];
      const params = [];

      if (input.objectId) {
        where.push("p.object_id = ?");
        params.push(input.objectId);
      }

      if (typeof input.autopay === "boolean") {
        where.push("p.autopay = ?");
        params.push(input.autopay ? 1 : 0);
      }

      if (dateRange) {
        where.push("p.next_date >= ?");
        where.push("p.next_date <= ?");
        params.push(dateRange.startDate, dateRange.endDate);
      }

      const rows = this.getRows(
        db,
        `
          SELECT
            p.id,
            p.title,
            p.amount,
            p.cycle,
            p.next_date,
            p.object_id,
            p.category_id,
            p.autopay,
            o.name AS object_name,
            c.name AS category_name
          FROM recurring_plans p
          LEFT JOIN objects o ON o.id = p.object_id
          LEFT JOIN categories c ON c.id = p.category_id
          ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
          ORDER BY p.next_date ASC, p.title ASC
        `,
        params,
      );

      return {
        range: dateRange
          ? {
              label: dateRange.label,
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
            }
          : null,
        summary: {
          count: rows.length,
          amountTotal: roundAmount(
            rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
          ),
        },
        plans: rows.map((row) => ({
          id: String(row.id || ""),
          title: String(row.title || ""),
          amount: Number(row.amount || 0),
          cycle: String(row.cycle || ""),
          nextDate: String(row.next_date || ""),
          objectId: row.object_id ? String(row.object_id) : null,
          objectName: row.object_name ? String(row.object_name) : null,
          categoryId: String(row.category_id || ""),
          categoryName: String(row.category_name || ""),
          autopay: Number(row.autopay || 0) === 1,
        })),
      };
    });
  }

  async compareCategoryPeriods(input = {}) {
    return this.queryDatabase(async (db) => {
      const matchedCategories = this.resolveCategoryMatches(db, input);
      const categoryIds = matchedCategories.map((item) => item.id);
      const currentPeriodDays = Math.max(1, Math.round(Number(input.currentPeriodDays || 30)));
      const previousPeriodDays = Math.max(
        1,
        Math.round(Number(input.previousPeriodDays || currentPeriodDays)),
      );
      const currentRange = getTrailingDateRange(currentPeriodDays, input.anchorDate);
      const previousRange = getPreviousDateRange(currentRange.startDate, previousPeriodDays);
      const current = this.getCategoryPeriodAggregate(db, {
        categoryIds,
        objectId: input.objectId,
        startDate: currentRange.startDate,
        endDate: currentRange.endDate,
      });
      const previous = this.getCategoryPeriodAggregate(db, {
        categoryIds,
        objectId: input.objectId,
        startDate: previousRange.startDate,
        endDate: previousRange.endDate,
      });
      const changeAmount = roundAmount(current.expenseTotal - previous.expenseTotal);
      const changeRate =
        previous.expenseTotal === 0
          ? null
          : roundAmount((changeAmount / previous.expenseTotal) * 100);

      return {
        categories: matchedCategories,
        currentPeriod: current,
        previousPeriod: previous,
        delta: {
          amount: changeAmount,
          ratePercent: changeRate,
          transactionCount: current.transactionCount - previous.transactionCount,
        },
        summary: buildCategoryComparisonSummary(
          matchedCategories.map((item) => item.name).join(", "),
          current,
          previous,
          changeAmount,
          changeRate,
        ),
      };
    });
  }

  getCategoryPeriodAggregate(
    db,
    { categoryIds, objectId, startDate, endDate },
  ) {
    const where = [`t.category_id IN (${categoryIds.map(() => "?").join(", ")})`];
    const params = [...categoryIds];

    if (objectId) {
      where.push("a.object_id = ?");
      params.push(objectId);
    }

    where.push("t.date >= ?");
    where.push("t.date <= ?");
    params.push(startDate, endDate);

    const row = this.getRows(
      db,
      `
        SELECT
          COUNT(DISTINCT t.id) AS transaction_count,
          COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN a.amount ELSE 0 END), 0) AS expense_total
        FROM transactions t
        LEFT JOIN transaction_allocations a ON a.transaction_id = t.id
        WHERE ${where.join(" AND ")}
      `,
      params,
    )[0];

    return {
      startDate,
      endDate,
      transactionCount: Number(row?.transaction_count || 0),
      expenseTotal: Number(row?.expense_total || 0),
    };
  }

  async summarizeObject(input = {}) {
    return this.queryDatabase(async (db) => {
      if (!input.objectId) {
        throw new Error("缺少 objectId。");
      }

      const objectRow = this.getRows(
        db,
        `
          SELECT
            o.id,
            o.name,
            o.kind,
            o.status,
            o.note,
            o.goal,
            o.monthly_budget
          FROM objects o
          WHERE o.id = ?
          LIMIT 1
        `,
        [input.objectId],
      )[0];

      if (!objectRow) {
        throw new Error("未找到指定对象。");
      }

      const month = input.month || new Date().toISOString().slice(0, 7);
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;

      const summaryRow = this.getRows(
        db,
        `
          SELECT
            COUNT(DISTINCT t.id) AS transaction_count,
            COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN a.amount ELSE 0 END), 0) AS expense_total,
            MAX(t.date) AS last_transaction_date
          FROM transaction_allocations a
          LEFT JOIN transactions t ON t.id = a.transaction_id
          WHERE a.object_id = ?
            AND t.date >= ?
            AND t.date <= ?
        `,
        [input.objectId, startDate, endDate],
      )[0];

      const categoryRows = this.getRows(
        db,
        `
          SELECT
            c.id,
            c.name,
            COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN a.amount ELSE 0 END), 0) AS expense_total
          FROM transaction_allocations a
          LEFT JOIN transactions t ON t.id = a.transaction_id
          LEFT JOIN categories c ON c.id = t.category_id
          WHERE a.object_id = ?
            AND t.date >= ?
            AND t.date <= ?
          GROUP BY c.id, c.name
          ORDER BY expense_total DESC, c.name ASC
        `,
        [input.objectId, startDate, endDate],
      );

      const recentTransactions = this.getRows(
        db,
        `
          SELECT
            t.id,
            t.title,
            t.amount,
            t.date,
            c.name AS category_name
          FROM transaction_allocations a
          LEFT JOIN transactions t ON t.id = a.transaction_id
          LEFT JOIN categories c ON c.id = t.category_id
          WHERE a.object_id = ?
          ORDER BY t.date DESC, t.id DESC
          LIMIT 8
        `,
        [input.objectId],
      );

      return {
        month,
        object: {
          id: String(objectRow.id),
          name: String(objectRow.name),
          kind: String(objectRow.kind),
          status: String(objectRow.status),
          note: String(objectRow.note || ""),
          goal: String(objectRow.goal || ""),
          monthlyBudget: Number(objectRow.monthly_budget || 0),
        },
        summary: {
          transactionCount: Number(summaryRow?.transaction_count || 0),
          expenseTotal: Number(summaryRow?.expense_total || 0),
          lastTransactionDate: summaryRow?.last_transaction_date
            ? String(summaryRow.last_transaction_date)
            : null,
        },
        categories: categoryRows.map((row) => ({
          id: String(row.id || ""),
          name: String(row.name || ""),
          expenseTotal: Number(row.expense_total || 0),
        })),
        recentTransactions: recentTransactions.map((row) => ({
          id: String(row.id || ""),
          title: String(row.title || ""),
          amount: Number(row.amount || 0),
          date: String(row.date || ""),
          categoryName: String(row.category_name || ""),
        })),
      };
    });
  }

  async deleteTransaction(input = {}) {
    return this.withDatabase(async (db) => {
      const state = this.getWorkspaceSnapshotState(db);
      if (!state) throw new Error("Billbook desktop database has no workspace snapshot yet.");

      const transactionId = typeof input.transactionId === "string" ? input.transactionId.trim() : "";
      if (!transactionId) throw new Error("Transaction ID is required.");

      const transactions = Array.isArray(state.transactions) ? state.transactions : [];
      const targetIndex = transactions.findIndex((t) => t.id === transactionId);
      if (targetIndex === -1) throw new Error(`Transaction "${transactionId}" not found.`);

      const targetTransaction = transactions[targetIndex];

      // Remove from snapshot state
      const nextState = {
        ...state,
        transactions: [...transactions.slice(0, targetIndex), ...transactions.slice(targetIndex + 1)],
        accounts: Array.isArray(state.accounts)
          ? state.accounts.map((account) =>
              account.id === targetTransaction.accountId
                ? { ...account, balance: roundAmount(Number(account.balance || 0) + Number(targetTransaction.amount || 0)) }
                : account,
            )
          : [],
      };

      const mutationTimestamp = new Date().toISOString();
      const actorId =
        Array.isArray(state.teamMembers) && state.teamMembers[0]?.id
          ? state.teamMembers[0].id
          : "desktop-mcp";

      nextState.history = appendHistoryEntry(
        Array.isArray(state.history) ? state.history : [],
        {
          action: "delete_transaction",
          title: "Delete transaction",
          detail: `Deleted ${targetTransaction.title}.`,
          actorId,
        },
        mutationTimestamp,
      );
      nextState.teamMembers = touchTeamMembers(
        Array.isArray(state.teamMembers) ? state.teamMembers : [],
        actorId,
        mutationTimestamp,
      );

      // Update snapshot and SQLite tables
      const metadata = this.getMetadataMap(db);
      this.replaceWorkspaceState(db, {
        state: nextState,
        syncedAt: mutationTimestamp,
        workspaceUserName: metadata.workspace_user_name || "",
      });

      return {
        deleted: {
          id: targetTransaction.id,
          title: targetTransaction.title,
          amount: targetTransaction.amount,
        },
        message: `Deleted transaction "${targetTransaction.title}".`,
      };
    });
  }

  async updateTransaction(input = {}) {
    return this.withDatabase(async (db) => {
      const state = this.getWorkspaceSnapshotState(db);
      if (!state) throw new Error("Billbook desktop database has no workspace snapshot yet.");

      const transactionId = typeof input.transactionId === "string" ? input.transactionId.trim() : "";
      if (!transactionId) throw new Error("Transaction ID is required.");

      const transactions = Array.isArray(state.transactions) ? state.transactions : [];
      const targetIndex = transactions.findIndex((t) => t.id === transactionId);
      if (targetIndex === -1) throw new Error(`Transaction "${transactionId}" not found.`);

      const oldTx = transactions[targetIndex];
      const oldAmount = roundAmount(Number(oldTx.amount || 0));

      // Resolve category if provided
      let resolvedCategoryId = oldTx.categoryId;
      let resolvedCategoryName = null;
      if (typeof input.categoryId === "string" && input.categoryId.trim()) {
        const entryKind = oldTx.kind || "expense";
        const categoryItem = Array.isArray(state.categories)
          ? state.categories.find((c) => c.id === input.categoryId && c.kind === entryKind)
          : null;
        if (!categoryItem) throw new Error(`Unknown category "${input.categoryId}".`);
        resolvedCategoryId = categoryItem.id;
        resolvedCategoryName = categoryItem.name;
      }

      // Resolve amount
      const newAmount = typeof input.amount === "number" && Number.isFinite(input.amount)
        ? roundAmount(input.amount)
        : oldAmount;
      if (newAmount <= 0) throw new Error("Transaction amount must be greater than 0.");

      const amountDiff = roundAmount(newAmount - oldAmount);

      // Resolve date
      const newDate = input.date ? normalizeDateInput(input.date) : oldTx.date;

      // Resolve title
      const newTitle = typeof input.title === "string" && input.title.trim()
        ? input.title.trim()
        : oldTx.title;

      // Resolve note
      const newNote = typeof input.note === "string" ? input.note.trim() : oldTx.note;

      // Resolve spreadDays
      const newSpreadDays = input.spreadDays != null
        ? normalizeSpreadDays(input.spreadDays)
        : oldTx.spreadDays;

      const updatedTransaction = {
        ...oldTx,
        title: newTitle,
        amount: newAmount,
        date: newDate,
        categoryId: resolvedCategoryId,
        note: newNote,
        spreadDays: newSpreadDays,
        allocations: oldTx.allocations.map((a) => ({ ...a, amount: newAmount / (oldTx.allocations.length || 1) })),
      };

      const accounts = Array.isArray(state.accounts) ? state.accounts : [];
      const accountId = oldTx.accountId || (accounts[0]?.id ?? "acc-default");
      const updatedAccounts = accounts.map((account) => {
        if (account.id !== accountId) return account;
        const accountBalance = roundAmount(Number(account.balance || 0));
        // Reverse old amount, apply new amount (expense reduces balance)
        return { ...account, balance: roundAmount(accountBalance + amountDiff) };
      });

      const mutationTimestamp = new Date().toISOString();
      const actorId =
        Array.isArray(state.teamMembers) && state.teamMembers[0]?.id
          ? state.teamMembers[0].id
          : "desktop-mcp";

      const nextTransactions = [...transactions];
      nextTransactions[targetIndex] = updatedTransaction;

      const nextState = {
        ...state,
        transactions: nextTransactions,
        accounts: updatedAccounts,
      };

      nextState.history = appendHistoryEntry(
        Array.isArray(state.history) ? state.history : [],
        {
          action: "update_transaction",
          title: "Update transaction",
          detail: `Updated ${oldTx.title}.`,
          actorId,
        },
        mutationTimestamp,
      );
      nextState.teamMembers = touchTeamMembers(
        Array.isArray(state.teamMembers) ? state.teamMembers : [],
        actorId,
        mutationTimestamp,
      );

      // Update snapshot and SQLite tables
      const metadata = this.getMetadataMap(db);
      this.replaceWorkspaceState(db, {
        state: nextState,
        syncedAt: mutationTimestamp,
        workspaceUserName: metadata.workspace_user_name || "",
      });

      return {
        transaction: {
          id: updatedTransaction.id,
          title: updatedTransaction.title,
          amount: updatedTransaction.amount,
          date: updatedTransaction.date,
          categoryId: resolvedCategoryId,
          categoryName: resolvedCategoryName,
          note: updatedTransaction.note,
          spreadDays: updatedTransaction.spreadDays,
        },
        changes: {
          title: newTitle !== oldTx.title,
          amount: newAmount !== oldAmount,
          date: newDate !== oldTx.date,
          category: resolvedCategoryId !== oldTx.categoryId,
          note: newNote !== oldTx.note,
          spreadDays: newSpreadDays !== oldTx.spreadDays,
        },
        message: `Updated transaction "${newTitle}".`,
      };
    });
  }
}

function buildHistoryDisplayFeedback(state, transaction, objectId) {
  const settings = state?.advancedSettings?.historyDisplay ?? {};
  const enabled = settings.enabled === true;
  const periodDays = normalizeSpreadDays(settings.periodDays ?? 30);

  // Compute richer context from state
  const transactions = Array.isArray(state.transactions) ? state.transactions : [];
  const txDate = transaction.date;

  // Today's total for this object
  const todayTotal = transactions
    .filter((t) => t.date === txDate && t.kind === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // This month's total for this category
  const thisMonth = txDate.slice(0, 7);
  const categoryMonthTotal = transactions
    .filter(
      (t) => t.date.startsWith(thisMonth) && t.categoryId === transaction.categoryId && t.kind === "expense",
    )
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Today's transaction count
  const todayCount = transactions.filter((t) => t.date === txDate && t.kind === "expense").length;

  const context = {
    todayTotal: Math.round(todayTotal * 100) / 100,
    todayCount,
    categoryName: transaction.categoryId
      ? (Array.isArray(state.categories)
          ? state.categories.find((c) => c.id === transaction.categoryId)?.name
          : null) || transaction.categoryId
      : null,
    categoryMonthTotal: Math.round(categoryMonthTotal * 100) / 100,
    date: txDate,
  };

  if (!enabled || transaction.kind !== "expense") {
    return {
      enabled,
      periodDays,
      insight: null,
      context,
      summary: enabled
        ? "No history insight is available for this transaction yet."
        : "History display is currently disabled in Billbook advanced settings.",
    };
  }

  const insight = getTransactionHistoryInsightFromState(state, transaction, objectId, periodDays);

  if (!insight) {
    return {
      enabled,
      periodDays,
      insight: null,
      context,
      summary: "No history insight is available for this transaction yet.",
    };
  }

  return {
    enabled,
    periodDays,
    insight,
    context,
    summary: buildHistoryInsightSummary(insight),
  };
}

function getTransactionHistoryInsightFromState(state, transaction, objectId, periodDays) {
  const relatedTransactions = getObjectTransactionsFromState(state, objectId).filter(
    (item) => item.categoryId === transaction.categoryId,
  );
  const currentIndex = relatedTransactions.findIndex((item) => item.id === transaction.id);

  if (currentIndex < 0) {
    return null;
  }

  const anchorDate = parseIsoDate(transaction.date);
  const startDate = getStartOfDay(anchorDate);
  startDate.setDate(startDate.getDate() - periodDays + 1);

  const periodTransactions = relatedTransactions.filter((item) => {
    const candidateDate = getStartOfDay(parseIsoDate(item.date));
    return candidateDate >= startDate && candidateDate <= anchorDate;
  });
  const averageAmount =
    periodTransactions.length > 0
      ? roundAmount(
          periodTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0) /
            periodTransactions.length,
        )
      : null;

  return {
    categoryName:
      Array.isArray(state.categories)
        ? state.categories.find((item) => item.id === transaction.categoryId)?.name ??
          transaction.title
        : transaction.title,
    previousAmount:
      relatedTransactions[currentIndex + 1] &&
      Number.isFinite(Number(relatedTransactions[currentIndex + 1].amount))
        ? roundAmount(Number(relatedTransactions[currentIndex + 1].amount))
        : null,
    averageAmount,
    periodDays,
  };
}

function getObjectTransactionsFromState(state, objectId) {
  return [...(Array.isArray(state.transactions) ? state.transactions : [])]
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .filter(
      (transaction) =>
        transaction.kind === "expense" && getAllocationAmount(transaction, objectId) > 0,
    );
}

function getAllocationAmount(transaction, objectId) {
  return (Array.isArray(transaction.allocations) ? transaction.allocations : [])
    .filter((allocation) => allocation.objectId === objectId)
    .reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0);
}

function buildHistoryInsightSummary(insight) {
  if (insight.previousAmount === null && insight.averageAmount === null) {
    return `This is the first ${insight.categoryName} transaction in the last ${insight.periodDays} days.`;
  }

  const previousPart =
    insight.previousAmount === null
      ? `No previous ${insight.categoryName} transaction was found`
      : `Previous ${insight.categoryName} amount: ${insight.previousAmount.toFixed(2)}`;
  const averagePart =
    insight.averageAmount === null
      ? `No ${insight.periodDays}-day average is available yet`
      : `${insight.periodDays}-day average: ${insight.averageAmount.toFixed(2)}`;

  return `${previousPart}. ${averagePart}.`;
}

function buildTransactionIntervalInsight(transactions) {
  if (!Array.isArray(transactions) || transactions.length < 2) {
    return {
      averageIntervalDays: null,
      latestIntervalDays: null,
      intervals: [],
    };
  }

  const sortedDates = transactions
    .map((item) => parseIsoDate(item.date))
    .filter((item) => !Number.isNaN(item.getTime()))
    .sort((left, right) => right.getTime() - left.getTime());
  const intervals = [];

  for (let index = 0; index < sortedDates.length - 1; index += 1) {
    intervals.push(diffInDays(sortedDates[index], sortedDates[index + 1]));
  }

  return {
    averageIntervalDays:
      intervals.length > 0
        ? roundAmount(intervals.reduce((sum, item) => sum + item, 0) / intervals.length)
        : null,
    latestIntervalDays: intervals[0] ?? null,
    intervals,
  };
}

function buildCategoryComparisonSummary(
  categoryLabel,
  current,
  previous,
  changeAmount,
  changeRate,
) {
  const direction =
    changeAmount > 0 ? "higher" : changeAmount < 0 ? "lower" : "flat";

  if (changeRate === null) {
    return `${categoryLabel} has ${current.transactionCount} transactions and ${current.expenseTotal.toFixed(2)} spend in the current period. There is no comparable previous-period spend yet.`;
  }

  return `${categoryLabel} is ${direction} by ${Math.abs(changeAmount).toFixed(2)} compared with the previous period (${changeRate.toFixed(2)}%).`;
}

function getMonthDateRange(monthValue) {
  if (!/^\d{4}-\d{2}$/.test(String(monthValue))) {
    throw new Error("month must use YYYY-MM format.");
  }

  const [year, month] = String(monthValue).split("-").map((value) => Number.parseInt(value, 10));
  const startDate = formatDateKey(new Date(year, month - 1, 1));
  const endDate = formatDateKey(new Date(year, month, 0));

  return {
    label: `month:${monthValue}`,
    startDate,
    endDate,
  };
}

function getTrailingDateRange(periodDays, anchorDateValue) {
  const anchorDate = getStartOfDay(
    anchorDateValue ? parseIsoDate(anchorDateValue) : new Date(),
  );
  const startDate = new Date(anchorDate);
  startDate.setDate(anchorDate.getDate() - periodDays + 1);

  return {
    label: `last-${periodDays}-days`,
    startDate: formatDateKey(startDate),
    endDate: formatDateKey(anchorDate),
  };
}

function getTrailingFutureDateRange(periodDays) {
  const today = getStartOfDay(new Date());
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + periodDays - 1);

  return {
    label: `next-${periodDays}-days`,
    startDate: formatDateKey(today),
    endDate: formatDateKey(endDate),
  };
}

function getPreviousDateRange(currentStartDate, previousPeriodDays) {
  const currentStart = parseIsoDate(currentStartDate);
  const previousEnd = new Date(currentStart);
  previousEnd.setDate(currentStart.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousEnd.getDate() - previousPeriodDays + 1);

  return {
    label: `previous-${previousPeriodDays}-days`,
    startDate: formatDateKey(previousStart),
    endDate: formatDateKey(previousEnd),
  };
}

function appendHistoryEntry(history, entry, createdAt) {
  return [
    {
      id: createId("hist"),
      action: entry.action,
      title: entry.title,
      detail: entry.detail,
      actorId: entry.actorId,
      createdAt,
    },
    ...history,
  ].slice(0, 80);
}

function touchTeamMembers(teamMembers, actorId, timestamp) {
  return teamMembers.map((member) =>
    member.id === actorId ? { ...member, lastActive: timestamp } : member,
  );
}

function normalizeDateInput(value) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return String(value);
  }

  throw new Error("Transaction date must use YYYY-MM-DD format.");
}

function normalizeSpreadDays(value) {
  return Math.max(1, Math.round(Number.isFinite(Number(value)) ? Number(value) : 1));
}

function roundAmount(value) {
  return Math.round(Number(value) * 100) / 100;
}

function parseIsoDate(isoDate) {
  const [year, month, day] = String(isoDate)
    .split("-")
    .map((value) => Number.parseInt(value, 10));

  if (!year || !month || !day) {
    return new Date(isoDate);
  }

  return new Date(year, month - 1, day);
}

function getStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffInDays(left, right) {
  const milliseconds = getStartOfDay(left).getTime() - getStartOfDay(right).getTime();
  return Math.round(milliseconds / 86400000);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

module.exports = {
  LedgerSqliteStore,
  getDefaultDatabasePath,
};
