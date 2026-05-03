# Billbook

Billbook 是一款面向消费对象追踪的桌面账本应用，基于 Electron + Next.js 16 构建。AI 智能记账、长期消费分析、分类占比，一切数据本地存储。

## 架构

- `desktop/` — Electron 主进程、preload bridge、Hermes 管理器、本地 MCP 服务器
- `web/` — Next.js 16 前端：营销页面 + 工作区 UI（记账 / 总览 / 设置）
- `web/src/components/billbook-provider.tsx` — 本地工作区状态管理层
- `scripts/` — 开发辅助脚本
- `docs/` — 开发与部署文档

## 快速开始

```bash
npm install
npm run desktop:dev     # 启动 Electron 桌面开发环境
```

## 构建打包

```bash
npm run build           # 构建 web 前端
npm run pack:win        # 打包 Windows 安装包
npm run pack:mac        # 打包 macOS 安装包
```

## 部署网页端

静态站点部署到 Cloudflare Pages：

```bash
cd web && npm run build && npx wrangler pages deploy out --project-name billbook
```

## 许可协议

本项目基于 **GNU Affero General Public License v3.0 (AGPL-3.0)** 发布。

简而言之：你可以自由使用、修改和分发本软件，但如果你修改后通过网络向他人提供服务，**你必须公开你的完整修改版源码**。详见 [LICENSE](./LICENSE)。
