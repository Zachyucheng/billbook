"""
Billbook MCP Server — Hermes Agent integration for AI-powered bookkeeping.

Connects to Billbook's local SQLite database and exposes MCP tools
so Hermes Agent can read and write ledger data via natural language.

Requirements: mcp>=1.0.0 (pip install mcp)
Database: Billbook desktop SQLite (desktop/state/billbook.sqlite)
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent, EmbeddedResource

# ── Database path ──────────────────────────────────────────────────

DEFAULT_DB_PATH = (
    Path.cwd() / "desktop" / "state" / "billbook.sqlite"
)


def get_db_path() -> str:
    env_path = os.environ.get("BILLBOOK_DB_PATH")
    if env_path:
        return env_path
    return str(DEFAULT_DB_PATH)


# ── Helpers ────────────────────────────────────────────────────────

def open_db() -> sqlite3.Connection:
    db_path = get_db_path()
    if not os.path.exists(db_path):
        raise FileNotFoundError(
            f"Billbook database not found at: {db_path}\n"
            "Please open the Billbook desktop app and sync your workspace first."
        )
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def rows_to_list(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def get_today() -> str:
    return date.today().isoformat()


def make_id(prefix: str = "mcp") -> str:
    return f"{prefix}-{uuid4().hex[:12]}"


def round_cny(amount: float) -> float:
    return round(amount, 2)


# ── MCP Server ─────────────────────────────────────────────────────

app = Server("billbook")


@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="list_objects",
            description="List all budget objects (e.g. 本人, 家用车, 猫咪) with expense totals",
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["active", "archived"],
                        "description": "Filter by object status",
                    }
                },
            },
        ),
        Tool(
            name="list_categories",
            description="List available expense categories and their spending totals",
            inputSchema={
                "type": "object",
                "properties": {
                    "object_id": {
                        "type": "string",
                        "description": "Only show categories usable by this object",
                    }
                },
            },
        ),
        Tool(
            name="list_transactions",
            description="List recent transactions with optional filters",
            inputSchema={
                "type": "object",
                "properties": {
                    "object_id": {
                        "type": "string",
                        "description": "Filter by object ID",
                    },
                    "category_id": {
                        "type": "string",
                        "description": "Filter by category ID",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max transactions to return (default: 20)",
                        "default": 20,
                    },
                    "days": {
                        "type": "integer",
                        "description": "Only transactions from last N days",
                    },
                },
            },
        ),
        Tool(
            name="get_summary",
            description="Get spending summary — total by object, by category, or overall",
            inputSchema={
                "type": "object",
                "properties": {
                    "object_id": {
                        "type": "string",
                        "description": "Summarize for a specific object",
                    },
                    "days": {
                        "type": "integer",
                        "description": "Look back N days (default: all time)",
                    },
                },
            },
        ),
        Tool(
            name="add_transaction",
            description="Record a new expense transaction. Requires amount, category_name, and object_name.",
            inputSchema={
                "type": "object",
                "properties": {
                    "amount": {
                        "type": "number",
                        "description": "Expense amount in CNY (must be > 0)",
                    },
                    "category_name": {
                        "type": "string",
                        "description": "Category name, e.g. '餐饮', '交通'. Will fuzzy-match.",
                    },
                    "object_name": {
                        "type": "string",
                        "description": "Budget object name, e.g. '本人', '家用车'. Will fuzzy-match.",
                    },
                    "title": {
                        "type": "string",
                        "description": "Optional custom title. Defaults to category name.",
                    },
                    "date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format (default: today)",
                    },
                    "note": {
                        "type": "string",
                        "description": "Optional note for this transaction",
                    },
                },
                "required": ["amount", "category_name", "object_name"],
            },
        ),
        Tool(
            name="get_database_info",
            description="Get Billbook workspace metadata (name, sync status, counts)",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    try:
        conn = open_db()

        if name == "list_objects":
            return await handle_list_objects(conn, arguments)
        elif name == "list_categories":
            return await handle_list_categories(conn, arguments)
        elif name == "list_transactions":
            return await handle_list_transactions(conn, arguments)
        elif name == "get_summary":
            return await handle_get_summary(conn, arguments)
        elif name == "add_transaction":
            result = await handle_add_transaction(conn, arguments)
            return result
        elif name == "get_database_info":
            return await handle_get_database_info(conn)
        else:
            raise ValueError(f"Unknown tool: {name}")
    except FileNotFoundError as e:
        return [TextContent(type="text", text=str(e))]
    except Exception as e:
        return [TextContent(type="text", text=f"Error: {e}")]
    finally:
        try:
            conn.close()
        except Exception:
            pass


# ── Tool Implementations ───────────────────────────────────────────


async def handle_list_objects(
    conn: sqlite3.Connection, args: dict
) -> list[TextContent]:
    query = """
        SELECT
            o.id, o.name, o.kind, o.status, o.note, o.goal,
            COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN a.amount ELSE 0 END), 0) AS expense_total,
            COUNT(DISTINCT a.transaction_id) AS transaction_count,
            MAX(t.date) AS last_transaction_date
        FROM objects o
        LEFT JOIN transaction_allocations a ON a.object_id = o.id
        LEFT JOIN transactions t ON t.id = a.transaction_id
    """
    params = []
    if args.get("status"):
        query += " WHERE o.status = ?"
        params.append(args["status"])
    query += " GROUP BY o.id ORDER BY expense_total DESC, o.name ASC"

    rows = rows_to_list(conn.execute(query, params).fetchall())
    return [TextContent(type="text", text=json.dumps(rows, ensure_ascii=False, indent=2))]


async def handle_list_categories(
    conn: sqlite3.Connection, args: dict
) -> list[TextContent]:
    query = """
        SELECT
            c.id, c.name, c.kind, c.group_name,
            COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN a.amount ELSE 0 END), 0) AS expense_total,
            COUNT(DISTINCT t.id) AS transaction_count
        FROM categories c
        LEFT JOIN transactions t ON t.category_id = c.id
        LEFT JOIN transaction_allocations a ON a.transaction_id = t.id
        GROUP BY c.id
        ORDER BY expense_total DESC, c.name ASC
    """
    rows = rows_to_list(conn.execute(query).fetchall())

    # If object_id is given, filter via workspace_snapshot
    object_id = args.get("object_id")
    if object_id:
        snapshot = _get_snapshot(conn)
        if snapshot:
            obj = next(
                (o for o in snapshot.get("objects", []) if o.get("id") == object_id),
                None,
            )
            if obj:
                allowed_ids = set(obj.get("categoryIds", []))
                rows = [r for r in rows if r["id"] in allowed_ids]

    return [TextContent(type="text", text=json.dumps(rows, ensure_ascii=False, indent=2))]


async def handle_list_transactions(
    conn: sqlite3.Connection, args: dict
) -> list[TextContent]:
    where = ["t.kind = 'expense'"]
    params: list[Any] = []
    limit = min(args.get("limit", 20), 100)

    if args.get("object_id"):
        where.append("a.object_id = ?")
        params.append(args["object_id"])

    if args.get("category_id"):
        where.append("t.category_id = ?")
        params.append(args["category_id"])

    if args.get("days"):
        where.append("t.date >= date('now', ?)")
        params.append(f"-{args['days']} days")

    query = f"""
        SELECT
            t.id, t.title, t.amount, t.date, t.kind,
            t.category_id, c.name AS category_name,
            t.note, t.spread_days,
            a.object_id, o.name AS object_name
        FROM transactions t
        JOIN categories c ON c.id = t.category_id
        JOIN transaction_allocations a ON a.transaction_id = t.id
        JOIN objects o ON o.id = a.object_id
        WHERE {' AND '.join(where)}
        ORDER BY t.date DESC, t.id DESC
        LIMIT ?
    """
    params.append(limit)

    rows = rows_to_list(conn.execute(query, params).fetchall())
    return [TextContent(type="text", text=json.dumps(rows, ensure_ascii=False, indent=2))]


async def handle_get_summary(
    conn: sqlite3.Connection, args: dict
) -> list[TextContent]:
    days_filter = ""
    params: list[Any] = []
    if args.get("days"):
        days_filter = " AND t.date >= date('now', ?)"
        params.append(f"-{args['days']} days")

    # By object
    object_sql = f"""
        SELECT
            o.id, o.name, o.kind,
            COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN a.amount ELSE 0 END), 0) AS total,
            COUNT(DISTINCT a.transaction_id) AS count
        FROM objects o
        LEFT JOIN transaction_allocations a ON a.object_id = o.id
        LEFT JOIN transactions t ON t.id = a.transaction_id {days_filter}
        GROUP BY o.id
        ORDER BY total DESC
    """
    by_object = rows_to_list(
        conn.execute(object_sql, params).fetchall()
    )

    # By category
    cat_sql = f"""
        SELECT
            c.id, c.name, c.group_name,
            COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN a.amount ELSE 0 END), 0) AS total,
            COUNT(DISTINCT a.transaction_id) AS count
        FROM categories c
        LEFT JOIN transactions t ON t.category_id = c.id
        LEFT JOIN transaction_allocations a ON a.transaction_id = t.id {days_filter}
        GROUP BY c.id
        ORDER BY total DESC
    """
    by_category = rows_to_list(
        conn.execute(cat_sql, params).fetchall()
    )

    # Total
    total_sql = f"""
        SELECT
            COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN a.amount ELSE 0 END), 0) AS total,
            COUNT(DISTINCT a.transaction_id) AS count
        FROM transaction_allocations a
        JOIN transactions t ON t.id = a.transaction_id {days_filter}
    """
    totals = rows_to_list(conn.execute(total_sql, params).fetchall())

    result = {
        "total_expense": totals[0]["total"] if totals else 0,
        "total_transactions": totals[0]["count"] if totals else 0,
        "by_object": by_object,
        "by_category": by_category,
    }
    return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]


async def handle_add_transaction(
    conn: sqlite3.Connection, args: dict
) -> list[TextContent]:
    amount = args.get("amount", 0)
    if not isinstance(amount, (int, float)) or amount <= 0:
        return [TextContent(type="text", text="Error: amount must be a positive number.")]

    amount = round_cny(float(amount))
    category_name = (args.get("category_name") or "").strip()
    object_name = (args.get("object_name") or "").strip()

    if not category_name or not object_name:
        return [TextContent(
            type="text",
            text="Error: category_name and object_name are required."
        )]

    # Fuzzy-find object
    objects = rows_to_list(
        conn.execute(
            "SELECT id, name FROM objects WHERE LOWER(name) LIKE LOWER(?)",
            (f"%{object_name}%",),
        ).fetchall()
    )
    if not objects:
        all_objs = rows_to_list(
            conn.execute("SELECT id, name FROM objects").fetchall()
        )
        names = [o["name"] for o in all_objs]
        return [TextContent(type="text", text=(
            f"Object '{object_name}' not found. Available objects: {', '.join(names)}"
        ))]

    obj = objects[0]
    if len(objects) > 1:
        # Multiple matches — pick exact or first
        exact = [o for o in objects if o["name"].lower() == object_name.lower()]
        if exact:
            obj = exact[0]

    # Fuzzy-find category
    categories = rows_to_list(
        conn.execute(
            "SELECT id, name, kind FROM categories WHERE LOWER(name) LIKE LOWER(?) AND kind = 'expense'",
            (f"%{category_name}%",),
        ).fetchall()
    )
    if not categories:
        all_cats = rows_to_list(
            conn.execute(
                "SELECT name FROM categories WHERE kind = 'expense' ORDER BY name"
            ).fetchall()
        )
        names = [c["name"] for c in all_cats]
        return [TextContent(type="text", text=(
            f"Category '{category_name}' not found. Available: {', '.join(names)}"
        ))]

    cat = categories[0]
    if len(categories) > 1:
        exact = [c for c in categories if c["name"].lower() == category_name.lower()]
        if exact:
            cat = exact[0]

    # Verify object can use this category
    snapshot = _get_snapshot(conn)
    can_use = False
    if snapshot:
        sn_obj = next(
            (o for o in snapshot.get("objects", []) if o.get("id") == obj["id"]),
            None,
        )
        if sn_obj and cat["id"] in sn_obj.get("categoryIds", []):
            can_use = True

    if not can_use:
        return [TextContent(type="text", text=(
            f"Error: Object '{obj['name']}' cannot use category '{cat['name']}'. "
            "Configure categories in Billbook settings."
        ))]

    # Find default account
    accounts = rows_to_list(
        conn.execute("SELECT id, name, balance FROM accounts LIMIT 1").fetchall()
    )
    if not accounts:
        return [TextContent(type="text", text="Error: No account found. Set up an account in Billbook first.")]

    account = accounts[0]

    # Build transaction
    tx_date = args.get("date", get_today())
    tx_title = (args.get("title") or "").strip() or cat["name"]
    tx_note = (args.get("note") or "").strip()
    tx_id = make_id("txn")
    tx = {
        "id": tx_id,
        "title": tx_title,
        "amount": amount,
        "date": tx_date,
        "kind": "expense",
        "category_id": cat["id"],
        "account_id": account["id"],
        "note": tx_note,
        "spread_days": 1,
        "tags_json": json.dumps(["mcp"]),
    }

    # Insert transaction
    conn.execute(
        """INSERT INTO transactions (id, title, amount, date, kind, category_id, account_id, note, spread_days, tags_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            tx["id"], tx["title"], tx["amount"], tx["date"],
            tx["kind"], tx["category_id"], tx["account_id"],
            tx["note"], tx["spread_days"], tx["tags_json"],
        ),
    )

    # Insert allocation
    conn.execute(
        "INSERT INTO transaction_allocations (transaction_id, object_id, amount) VALUES (?, ?, ?)",
        (tx_id, obj["id"], amount),
    )

    # Update account balance
    conn.execute(
        "UPDATE accounts SET balance = ROUND(COALESCE(balance, 0) - ?, 2) WHERE id = ?",
        (amount, account["id"]),
    )

    conn.commit()

    result = {
        "status": "ok",
        "transaction_id": tx_id,
        "title": tx_title,
        "amount": amount,
        "date": tx_date,
        "category": cat["name"],
        "object": obj["name"],
        "account": account["name"],
    }
    return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]


async def handle_get_database_info(conn: sqlite3.Connection) -> list[TextContent]:
    meta = {
        row["key"]: row["value"]
        for row in conn.execute("SELECT key, value FROM metadata").fetchall()
    }
    obj_count = conn.execute("SELECT COUNT(*) AS c FROM objects").fetchone()["c"]
    txn_count = conn.execute("SELECT COUNT(*) AS c FROM transactions").fetchone()["c"]
    cat_count = conn.execute("SELECT COUNT(*) AS c FROM categories").fetchone()["c"]

    info = {
        "workspace_name": meta.get("workspace_name", ""),
        "synced_at": meta.get("synced_at", "never"),
        "account_email": meta.get("account_email", "not logged in"),
        "currency": meta.get("currency", "CNY"),
        "theme": meta.get("theme", "fern"),
        "language": meta.get("language", "zh-CN"),
        "object_count": obj_count,
        "transaction_count": txn_count,
        "category_count": cat_count,
        "database_path": get_db_path(),
    }
    return [TextContent(type="text", text=json.dumps(info, ensure_ascii=False, indent=2))]


# ── Internal helpers ───────────────────────────────────────────────

def _get_snapshot(conn: sqlite3.Connection) -> dict | None:
    row = conn.execute(
        "SELECT state_json FROM workspace_snapshot WHERE id = 1"
    ).fetchone()
    if not row:
        return None
    try:
        return json.loads(row["state_json"])
    except (json.JSONDecodeError, TypeError):
        return None


# ── Entry point ────────────────────────────────────────────────────

async def main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options(),
        )


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
