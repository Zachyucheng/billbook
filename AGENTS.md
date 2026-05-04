# Billbook MCP — AI Agent 接入指引

本仓库提供了一个标准 **MCP 服务器**，兼容任何支持 MCP 协议（stdio 传输）的 AI 客户端。

✅ Hermes Agent · Claude Desktop · Cursor · Continue.dev · OpenClaw · 任意 MCP 客户端

## 📦 一键安装

```bash
git clone <repo-url>
cd billbook-mcp
npm run setup:mcp
```

## 🔌 配置

### Hermes Agent

添加到 `config.yaml`：

```yaml
mcp:
  servers:
    billbook:
      command: node
      args: ["desktop/mcp/billbook-server.mjs"]
      cwd: "/path/to/billbook-mcp"
```

### Claude Desktop / 其他 MCP 客户端

添加到 `claude_desktop_config.json` 或等效配置文件：

```json
{
  "mcpServers": {
    "billbook": {
      "command": "node",
      "args": ["desktop/mcp/billbook-server.mjs"],
      "cwd": "/path/to/billbook-mcp"
    }
  }
}
```

## 🛠️ 可用 MCP 工具（共 25 个）

| 类别 | 工具 |
|:----|:----|
| 记账 | `create_transaction` `update_transaction` `delete_transaction` |
| 对象 | `create_object` `update_object` `list_ledgers` |
| 分类 | `create_category` `list_categories` |
| 查询 | `search_transactions` `find_last_transaction` |
| 分析 | `summarize_category` `summarize_object` `compare_category_periods` |
| 导出 | `export_data` `export_report` |
| 系统 | `get_database_status` `get_project_overview` `get_desktop_environment` |

## 🧭 重要路径

- MCP 服务入口: `desktop/mcp/billbook-server.mjs`
- 数据库: `desktop/state/billbook.sqlite`（首次启动自动创建）
- 数据层: `desktop/ledger-sqlite.js`
- 文档站: `docs/`（GitHub Pages）

## 📝 记账示例

- 「午饭吃了 35 块」→ 记入午餐分类
- 「给猫买粮 200 块」→ 记入猫粮分类
- 「本月花了多少钱？」→ 汇总查询
- 「导出上个月的账单」→ CSV/JSON 导出

## ⚙️ 其他脚本

```bash
npm run mcp:billbook    # 手动启动 MCP 服务（调试用）
npm run desktop:dev     # 启动桌面端（可选，非必须）
npm run build           # 构建前端（需要前端源码）
```
