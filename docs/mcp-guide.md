# Hermes Agent MCP 接入指南

让 Billbook MCP 与 Hermes AI Agent 连接，实现 AI 智能记账。

---

## 前置条件

- Billbook 桌面端已启动
- 已安装 [Hermes Agent](https://hermes-agent.nousresearch.com/)
- 已开启「允许 Hermes 访问」（桌面运行时页面）

## 配置步骤

### 1. 获取 Billbook 路径

```
# Windows 示例
C:\Users\你的用户名\Documents\billbook-mcp

# macOS 示例
/Users/你的用户名/billbook-mcp
```

### 2. 编辑 Hermes 配置

打开 Hermes `config.yaml`，添加 MCP 服务器：

```yaml
mcp:
  servers:
    billbook:
      command: node
      args: ["desktop/mcp/billbook-server.mjs"]
      cwd: "C:/Users/你的用户名/Documents/billbook-mcp"
```

### 3. 重启 Hermes

```bash
hermes agent
```

连接成功后，Hermes 会自动加载 Billbook 的 25 个 MCP 工具。

## 可用工具

连接完成后，Billbook 提供以下工具：

### 交易管理
- `create_transaction` — 创建一笔交易
- `update_transaction` — 修改交易（金额、日期、备注等）
- `delete_transaction` — 删除交易
- `search_transactions` — 搜索交易记录
- `find_last_transaction` — 查找最近一笔匹配的交易

### 对象管理
- `create_object` — 创建消费对象（自己、伴侣、宠物等）
- `update_object` — 更新对象信息
- `list_ledgers` — 列出所有对象

### 分类管理
- `create_category` — 创建消费分类
- `list_categories` — 列出分类

### 数据分析
- `summarize_category` — 分类统计汇总
- `summarize_object` — 对象月度统计
- `compare_category_periods` — 周期对比分析
- `list_recurring_plans` — 查看定期计划

### 导出与系统
- `export_data` — 导出 JSON/CSV
- `export_report` — 月度报表
- `get_database_status` — 数据库状态
- `get_project_overview` — 项目概况

## 使用示例

### 一句话记账

```
用户：午饭吃了 35 块
Hermes：已记录「午餐 35 元 — 我自己」✅
```

### 查询消费

```
用户：这个月我在外卖上花了多少钱？
Hermes：本月外卖支出：共 3 笔，合计 86 元 💰
```

### 修改交易

```
用户：把昨天那笔 35 块的午饭改成 38 块
Hermes：已更新 ✅ 金额 35 → 38
```

## 常见问题

**Q: 连接后工具不显示？**
A: 确保 Billbook 桌面端正在运行，且「允许 Hermes 访问」已开启。尝试重启 Hermes。

**Q: 提示「Hermes 访问已被禁止」？**
A: 在 Billbook 桌面端「桌面运行时」页面中开启开关。

**Q: 数据存在哪里？**
A: 所有数据存储在 `desktop/state/billbook.sqlite`，完全本地，不上传云端。
