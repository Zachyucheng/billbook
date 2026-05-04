# Billbook MCP

🌐 **官网: [billbook.top](https://billbook.top)** | 开源个人记账桌面应用

> **Billbook MCP** — 基于 Electron + Next.js 16 的 AI 智能记账工具，通过标准 MCP 协议与 OpenClaw、Hermes Agent 等客户端集成，一句话完成记账、查询、分析。

---

## ✨ 特性

- 🤖 **AI 智能记账** — 对接 OpenClaw / Hermes Agent 等 MCP 客户端，一句话记一笔：「午饭 35 块」「咖啡 18」
- 📊 **多对象追踪** — 按人（自己、伴侣、家人）、宠物、项目等对象分别记账
- 🏷️ **灵活分类** — 自定义消费分类 + 长期分摊（猫粮分60天、订阅服务分30天）
- 🔍 **智能查询** — 「本月花了多少？」「猫粮最近30天平均多少钱？」
- 💾 **数据本地存储** — 所有数据存本地 SQLite，不经过云端
- 📋 **报表导出** — 一键导出 JSON / CSV 格式账单
- 🔌 **多 MCP 客户端兼容** — 支持 OpenClaw、Hermes Agent、Claude Desktop、Cursor、Continue.dev 等
- 🇨🇳 **中文原生** — 全中文界面，专为个人/家庭记账场景设计

## 🏗️ 项目架构

```
billbook-mcp/
├── desktop/                  # Electron 桌面应用
│   ├── main/                 # Electron 主进程
│   ├── mcp/                  # MCP 服务器
│   │   └── billbook-server.mjs   # 本地 MCP Server（25+ 工具）
│   ├── state/                # 本地 SQLite 数据库
│   └── ledger-sqlite.js      # 数据层（CRUD + 快照同步）
├── docs/                     # 文档站（GitHub Pages）
├── scripts/                  # 开发辅助脚本
├── web/                      # 官网（billbook.top）
├── AGENTS.md                 # MCP 客户端接入指南
└── package.json
```

## 🚀 快速开始

### 桌面应用

```bash
npm install
npm run desktop:dev     # 启动 Electron 开发环境
npm run pack:win        # 打包 Windows 安装包
```

### 使用 MCP 服务（无需桌面端）

```bash
git clone https://github.com/Zachyucheng/billbook-mcp.git
cd billbook-mcp
npm install
npm run setup:mcp
```

然后在你使用的 MCP 客户端中添加配置：

```yaml
mcp_servers:
  billbook:
    command: node
    args: [desktop/mcp/billbook-server.mjs]
    cwd: /path/to/your/billbook-mcp
```

**OpenClaw** → 编辑 `openclaw.yaml`，添加上述配置。  
**Hermes Agent** → 编辑 `config.yaml` 的 `mcp_servers` 段。  
**Claude Desktop** → 在 `claude_desktop_config.json` 中配置。  
**Cursor / Continue.dev** → 在对应 MCP 配置文件中添加。

> 数据库会在 MCP 服务器首次启动时自动创建。详见 [MCP 配置教程](https://billbook.top/mcp-guide)。

## 🤖 MCP 工具一览

Billbook MCP 提供 **25+ 个工具**，覆盖完整记账流程：

| 类别 | 工具 | 用途 |
|:----|:----|:----|
| 📝 记账 | `create_transaction` `update_transaction` `delete_transaction` | 增删改账单 |
| 🧑 对象 | `create_object` `update_object` `list_ledgers` | 管理消费对象 |
| 🏷️ 分类 | `create_category` `list_categories` | 管理消费分类 |
| 🔍 查询 | `search_transactions` `find_last_transaction` | 智能搜索 |
| 📊 分析 | `summarize_category` `summarize_object` `compare_category_periods` | 周期对比 |
| 📋 导出 | `export_data` `export_report` | JSON/CSV 导出 |
| ⚙️ 系统 | `get_database_status` `get_project_overview` | 状态检查 |

## 📖 文档

- [MCP 接入指南](https://billbook.top/mcp-guide) — OpenClaw、Hermes Agent、Claude Desktop 等配置详情
- [GitHub Pages 文档站](./docs/index.md) — 项目介绍与入门
- [桌面端路线图](./docs/desktop-roadmap.md) — 功能规划
- [Cloudflare 部署](./docs/cloudflare-deployment.md) — 云端部署

## 📄 许可协议

**GNU Affero General Public License v3.0 (AGPL-3.0)** + 附加禁止商业用途条款

- ✅ 个人学习、研究、非商业使用
- ❌ 严禁任何形式的商业使用

详见 [NOTICE.md](./NOTICE.md) 和 [LICENSE](./LICENSE)。

---

🌐 [English Version](./README.en.md)

> ℹ️ 项目已从 Billbook 迁移至 **Billbook MCP**，名称调整以提升 GitHub 可搜索性。
>
> 仓库地址：`git@github.com:Zachyucheng/billbook-mcp.git`（改名后更新远程地址）

📦 **国际物流 · 欧美 DDP 货代** — 微信 / 电话：v13025498279
