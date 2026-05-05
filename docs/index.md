# Billbook MCP

> AI 智能记账 · 开源桌面应用 · 标准 MCP 服务

[GitHub 仓库](https://github.com/Zachyucheng/billbook-mcp) | [官网 billbook.top](https://billbook.top)

---

## 什么是 Billbook MCP？

Billbook MCP 是一款**个人记账桌面应用**，基于 Electron + Next.js 16 构建。通过标准 **MCP 协议**（Model Context Protocol）提供 AI 智能记账能力，兼容 OpenClaw、Hermes Agent、Claude Desktop、Cursor、Continue.dev 等任意支持 MCP 的客户端。

## ✨ 核心功能

### 🤖 AI 智能记账
一句话完成记账，支持任意 MCP 客户端：
- 「午饭吃了 35 块」
- 「给猫买粮 200」
- 「昨天交通费 6 块」

### 🧑 多对象追踪
支持按人、宠物、项目等对象分别记账：
- **我自己** — 个人日常消费
- **伴侣** — 共同开销追踪
- **宠物** — 宠物用品统计
- **项目** — 专项预算管理

### 📊 数据分析
- 分类消费统计
- 周期对比（本月 vs 上月）
- 长期分摊（猫粮分60天、订阅分30天）
- 报表导出（JSON / CSV）

### 💾 本地存储
所有数据存储于本地 SQLite 数据库，无需注册账号，无需联网，隐私安全。

### 🔌 标准 MCP 协议
兼容所有支持 stdio 传输的 MCP 客户端：
`OpenClaw` · `Hermes Agent` · `Claude Desktop` · `Cursor` · `Continue.dev` · ...

## 🚀 快速开始

### 方式一：仅使用 MCP 服务（无需桌面端）

```bash
git clone https://github.com/Zachyucheng/billbook-mcp.git
cd billbook-mcp
npm install
npm run setup:mcp
```

然后在你的 MCP 客户端中配置：

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

**OpenClaw 配置**（`openclaw.yaml`）：

```yaml
mcp_servers:
  billbook:
    command: node
    args: [desktop/mcp/billbook-server.mjs]
    cwd: /path/to/billbook-mcp
```

数据库将在首次启动时自动创建。

### 方式二：桌面端 + MCP

```bash
npm run desktop:dev
```

桌面端自带 MCP 服务器，启动后在「桌面运行时」中开启 MCP 访问即可。

## 🛠️ MCP 工具（共 21 个）

| 类别 | 工具数 | 功能 |
|:----|:-----:|:-----|
| 记账 | 3 | 创建、修改、删除交易 |
| 对象管理 | 3 | 创建/更新消费对象 |
| 分类管理 | 2 | 创建/查询消费分类 |
| 智能查询 | 2 | 搜索交易、查找最近一笔 |
| 数据分析 | 4 | 分类汇总、对象汇总、周期对比、定期计划 |
| 报表导出 | 2 | 导出 JSON / CSV |
| 系统工具 | 5 | 数据库状态、项目信息、环境自检、运行时说明、文档读取 |

## 📄 许可

**AGPL-3.0** — 禁止商业用途。个人学习、使用完全免费。

---

🌐 [官网 billbook.top](https://billbook.top) · [GitHub](https://github.com/Zachyucheng/billbook-mcp)
