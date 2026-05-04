# Billbook

🌐 **Website: [billbook.top](https://billbook.top)** | Version **v2.42.0**

Billbook is a desktop bookkeeping application for expense-object tracking, built with Electron + Next.js 16. AI-powered smart recording, long-term expense analysis, category breakdowns — all data stored locally.

> ⚠️ **This software is for personal learning and non-commercial use only. See [NOTICE.md](./NOTICE.md) for details.**

## Architecture

- `desktop/` — Electron main process, preload bridge, Hermes manager, local MCP server
- `scripts/` — Development helper scripts

> 💡 Front-end source code has been removed from this public repository. Contact the author to obtain it.

## Quick Start

```bash
npm install
npm run desktop:dev     # Start Electron desktop dev environment
```

## Build & Package

```bash
npm run build           # Build web frontend (requires frontend source)
npm run pack:win        # Package Windows installer
npm run pack:mac        # Package macOS installer
```

## Connecting Hermes Agent

Billbook has a built-in MCP server that supports AI-powered smart bookkeeping through Hermes Agent.

### Configuration

1. Make sure Billbook desktop is running, and enable "Allow Hermes access" in the Desktop Runtime page
2. Add the following MCP configuration to Hermes `config.yaml`:

```yaml
mcp:
  servers:
    billbook:
      command: node
      args: ["desktop/mcp/billbook-server.mjs"]
      cwd: "/path/to/billbook"
```

3. Restart Hermes Agent, and you're ready to use Billbook tools

### Use Cases

- **One-command recording**: "Just had a coffee for 35" → Hermes automatically creates a transaction entry
- **Spending queries**: "How much did I spend on takeout this month?" → Auto-summarized and returned
- **Long-term analysis**: "What's the average cost of cat litter over the last 30 days?" → Period comparison
- **Report export**: "Help me export last month's bills as CSV" → MCP generates CSV file

## License

This project is released under the **GNU Affero General Public License v3.0 (AGPL-3.0)**, with an additional **Non-Commercial** clause.

- ✅ Personal learning, research, and non-commercial use permitted
- ✅ Non-commercial distribution and modification allowed (must follow AGPL-3.0)
- ❌ **Any form of commercial use is strictly prohibited**
- ❌ Commercial use requires written authorization from the author

See [NOTICE.md](./NOTICE.md) and [LICENSE](./LICENSE) for details.

---

🌐 [中文版](./README.md)

📦 **International Logistics · EU/US DDP Freight Forwarding**
I specialize in EU/US DDP door-to-door shipping (duty-paid & tax-included). If you're in foreign trade or cross-border e-commerce and need shipping, feel free to reach out 👇
**WeChat / Phone: v13025498279**
