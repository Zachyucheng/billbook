# Billbook

Billbook 是一款面向消费对象追踪的桌面账本应用，基于 Electron + Next.js 16 构建。AI 智能记账、长期消费分析、分类占比，一切数据本地存储。

> ⚠️ **本软件仅限个人学习与使用，严禁用于任何商业用途。详情见 [NOTICE.md](./NOTICE.md)。**

## 架构

- `desktop/` — Electron 主进程、preload bridge、Hermes 管理器、本地 MCP 服务器
- `scripts/` — 开发辅助脚本

> 💡 前端源码（`web/`）已从公开仓库中移除，如需获取请联系作者。

## 快速开始

```bash
npm install
npm run desktop:dev     # 启动 Electron 桌面开发环境
```

## 构建打包

```bash
npm run build           # 构建 web 前端（需要前端源码）
npm run pack:win        # 打包 Windows 安装包
npm run pack:mac        # 打包 macOS 安装包
```

## 许可协议

本项目采用 **GNU Affero General Public License v3.0 (AGPL-3.0)** 发布，并附加「禁止商业用途」条款。

- ✅ 允许个人学习、研究、非商业使用
- ✅ 允许非商业分发和修改（需遵守 AGPL-3.0 协议）
- ❌ **严禁任何形式的商业使用**
- ❌ 商业使用需获得作者书面授权

详见 [NOTICE.md](./NOTICE.md) 和 [LICENSE](./LICENSE)。

---

📦 **国际物流 · 欧美DDP货代**
我是做欧美 DDP 双清包税的货代，外贸/跨境电商的朋友有发货需求欢迎联系👇
**微信 / 电话：v13025498279**
