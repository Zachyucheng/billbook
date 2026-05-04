# Billbook MCP

> AI 智能记账 · 开源桌面应用 · 连接 Hermes Agent

[GitHub 仓库](https://github.com/Zachyucheng/billbook-mcp) | [官网 billbook.top](https://billbook.top)

---

## 什么是 Billbook MCP？

Billbook MCP 是一款**个人记账桌面应用**，基于 Electron + Next.js 16 构建。通过 MCP 协议与 Hermes AI Agent 集成，实现一句话记账、智能查询和数据分析。

## ✨ 核心功能

### 🤖 AI 智能记账
通过 Hermes Agent 一句话完成记账：
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

## 🚀 快速开始

### 1. 安装与运行

```bash
git clone https://github.com/Zachyucheng/billbook-mcp.git
cd billbook-mcp
npm install
npm run desktop:dev
```

### 2. 连接 Hermes Agent

在 Hermes `config.yaml` 中添加：

```yaml
mcp:
  servers:
    billbook:
      command: node
      args: ["desktop/mcp/billbook-server.mjs"]
      cwd: "/path/to/billbook-mcp"
```

重启 Hermes 即可使用 AI 记账功能。

## 🛠️ MCP 工具

| 类别 | 工具数 | 功能 |
|:----|:-----:|:-----|
| 记账 | 3 | 创建、修改、删除交易 |
| 对象管理 | 3 | 创建/更新消费对象 |
| 分类管理 | 2 | 创建/查询消费分类 |
| 智能查询 | 2 | 搜索交易、查找最近一笔 |
| 数据分析 | 3 | 分类汇总、对象汇总、周期对比 |
| 报表导出 | 2 | 导出 JSON / CSV |
| 系统工具 | 3+ | 数据库状态、项目信息等 |

## 📄 许可

**AGPL-3.0** — 禁止商业用途。个人学习、使用完全免费。

---

🌐 [官网 billbook.top](https://billbook.top) · [GitHub](https://github.com/Zachyucheng/billbook-mcp)
