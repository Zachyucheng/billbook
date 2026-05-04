# Billbook

🌐 **官网: [billbook.top](https://billbook.top)** | Version **v2.42.0**

Billbook 是一款面向消费对象追踪的桌面账本应用，基于 Electron + Next.js 16 构建。AI 智能记账、长期消费分析、分类占比，一切数据本地存储。

> ⚠️ **本软件仅限个人学习与使用，严禁用于任何商业用途。详情见 [NOTICE.md](./NOTICE.md)。**

## 架构

- `desktop/` — Electron 主进程、preload bridge、Hermes 管理器、本地 MCP 服务器
- `scripts/` — 开发辅助脚本

> 💡 前端源码已从公开仓库中移除，如需获取请联系作者。

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

## 连接 Hermes Agent

Billbook 内置 MCP 服务器，支持通过 Hermes Agent 进行 AI 智能记账。

### 配置方法

1. 确保 Billbook 桌面端已运行，并在「桌面运行时」页面中开启「允许 Hermes 访问」
2. 在 Hermes 的 `config.yaml` 中添加 MCP 配置：

```yaml
mcp:
  servers:
    billbook:
      command: node
      args: ["desktop/mcp/billbook-server.mjs"]
      cwd: "/path/to/billbook"
```

3. 重启 Hermes Agent，即可使用 Billbook 相关工具

### 使用场景

- **一句话记账**：「刚刚喝了杯咖啡花了 35」→ Hermes 自动创建交易记录
- **消费查询**：「这个月我在外卖上花了多少钱？」→ 自动汇总返回
- **长期分析**：「猫砂最近 30 天的平均花费是多少？」→ 对比周期数据
- **报表导出**：「帮我把上个月的账单整理成 CSV」→ MCP 生成 CSV 文件

## 许可协议

本项目采用 **GNU Affero General Public License v3.0 (AGPL-3.0)** 发布，并附加「禁止商业用途」条款。

- ✅ 允许个人学习、研究、非商业使用
- ✅ 允许非商业分发和修改（需遵守 AGPL-3.0 协议）
- ❌ **严禁任何形式的商业使用**
- ❌ 商业使用需获得作者书面授权

详见 [NOTICE.md](./NOTICE.md) 和 [LICENSE](./LICENSE)。

---

🌐 [English Version](./README.en.md)

📦 **国际物流 · 欧美DDP货代**
我是做欧美 DDP 双清包税的货代，外贸/跨境电商的朋友有发货需求欢迎联系👇
**微信 / 电话：v13025498279**
