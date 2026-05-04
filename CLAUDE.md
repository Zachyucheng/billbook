# Billbook MCP — Claude Code 接入指引

本仓库提供了一个 MCP 服务器，让 Claude Code / Hermes Agent 等 AI 工具能够进行 AI 智能记账。

## 快速开始

```bash
# 1. 克隆并安装
git clone <repo-url>
cd billbook-mcp
npm install

# 2. 首次使用会自动初始化数据库（无需桌面端）
# MCP 服务位于 desktop/mcp/billbook-server.mjs

# 3. 手动启动测试
node desktop/mcp/billbook-server.mjs
```

## 配置 Hermes Agent

在 Hermes 的 `config.yaml` 中添加：

```yaml
mcp:
  servers:
    billbook:
      command: node
      args: ["desktop/mcp/billbook-server.mjs"]
      cwd: "/path/to/billbook-mcp"
```

## 作为独立 MCP 服务运行

该项目可以**不依赖桌面端**直接运行 MCP 服务：
- 首次启动自动创建空数据库
- 所有数据存储在 `desktop/state/billbook.sqlite`
- 提供 25 个记账相关的 MCP 工具

## 关键文件

- `desktop/mcp/billbook-server.mjs` — MCP 服务器入口
- `desktop/ledger-sqlite.js` — 数据存取层
- `docs/index.md` — GitHub Pages 文档站

## 注意事项

- 使用 `sql.js`（WebAssembly），无需编译原生模块
- 数据完全本地存储，无需联网
- 如需桌面端界面，运行 `npm run desktop:dev`
