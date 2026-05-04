"use client";

import Link from "next/link";

const codeBlock = (code: string, lang = "json") =>
  `<pre class="overflow-x-auto rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4 text-sm leading-6"><code class="language-${lang}">${code}</code></pre>`;

const steps = [
  {
    title: "克隆项目 & 安装依赖",
    content: (
      <>
        <p className="mb-3 text-sm leading-7 text-[color:var(--muted)]">
          首先从 GitHub 克隆 billbook-mcp 仓库，并安装依赖：
        </p>
        <div className="overflow-x-auto rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
          <pre className="text-sm leading-6"><code className="language-bash">git clone https://github.com/Zachyucheng/billbook-mcp.git
cd billbook-mcp
npm install
npm run setup:mcp</code></pre>
        </div>
        <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
          <code>setup:mcp</code> 脚本会安装依赖、验证 MCP 入口文件，并初始化空白数据库。首次启动 MCP 服务时数据库自动创建。
        </p>
      </>
    ),
  },
  {
    title: "配置 OpenClaw",
    content: (
      <>
        <p className="mb-3 text-sm leading-7 text-[color:var(--muted)]">
          OpenClaw 使用 <code>openclaw.yaml</code> 配置 MCP 服务。在配置文件中添加以下内容：
        </p>
        <div className="overflow-x-auto rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
          <pre className="text-sm leading-6"><code className="language-yaml">mcp_servers:
  billbook:
    command: node
    args: [desktop/mcp/billbook-server.mjs]
    cwd: /path/to/your/billbook-mcp</code></pre>
        </div>
        <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
          配置完成后重启 OpenClaw，MCP 工具会自动加载。你可以在聊天中输入「记一笔午饭 35 块」开始记账。
        </p>
      </>
    ),
  },
  {
    title: "配置 Hermes Agent",
    content: (
      <>
        <p className="mb-3 text-sm leading-7 text-[color:var(--muted)]">
          Hermes Agent 使用 YAML 配置。编辑 <code>config.yaml</code> 添加 MCP 服务：
        </p>
        <div className="overflow-x-auto rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
          <pre className="text-sm leading-6"><code className="language-yaml">mcp_servers:
  billbook:
    command: node
    args: [desktop/mcp/billbook-server.mjs]
    cwd: /path/to/your/billbook-mcp</code></pre>
        </div>
        <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
          重启 Hermes 后，你可以让 Hermes 帮你记账：「给猫买粮 200，从宠物对象记账」。
        </p>
      </>
    ),
  },
  {
    title: "配置 Claude Desktop",
    content: <ClaudeDesktopSection />,
  },
  {
    title: "通用 MCP 配置",
    content: <GenericMcpSection />,
  },
  {
    title: "可用 MCP 工具一览",
    content: (
      <>
        <p className="mb-3 text-sm leading-7 text-[color:var(--muted)]">
          配置完成后，你的 MCP 客户端会自动注册以下工具（共 25+ 个）：
        </p>
        <div className="overflow-x-auto rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--line)]">
                <th className="pb-2 pr-4 text-left font-semibold">类别</th>
                <th className="pb-2 pr-4 text-left font-semibold">工具数</th>
                <th className="pb-2 text-left font-semibold">功能</th>
              </tr>
            </thead>
            <tbody className="text-[color:var(--muted)]">
              <tr className="border-b border-[color:var(--line-soft)]">
                <td className="py-2 pr-4">记账</td>
                <td className="py-2 pr-4">3</td>
                <td className="py-2">创建、修改、删除交易</td>
              </tr>
              <tr className="border-b border-[color:var(--line-soft)]">
                <td className="py-2 pr-4">对象管理</td>
                <td className="py-2 pr-4">3</td>
                <td className="py-2">创建/更新消费对象</td>
              </tr>
              <tr className="border-b border-[color:var(--line-soft)]">
                <td className="py-2 pr-4">分类管理</td>
                <td className="py-2 pr-4">2</td>
                <td className="py-2">创建/查询消费分类</td>
              </tr>
              <tr className="border-b border-[color:var(--line-soft)]">
                <td className="py-2 pr-4">智能查询</td>
                <td className="py-2 pr-4">2</td>
                <td className="py-2">搜索交易、查找最近一笔</td>
              </tr>
              <tr className="border-b border-[color:var(--line-soft)]">
                <td className="py-2 pr-4">数据分析</td>
                <td className="py-2 pr-4">3</td>
                <td className="py-2">分类汇总、对象汇总、周期对比</td>
              </tr>
              <tr className="border-b border-[color:var(--line-soft)]">
                <td className="py-2 pr-4">报表导出</td>
                <td className="py-2 pr-4">2</td>
                <td className="py-2">导出 JSON / CSV</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">系统工具</td>
                <td className="py-2 pr-4">10+</td>
                <td className="py-2">数据库状态、项目信息、环境查询等</td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    title: "快速上手指南",
    content: (
      <>
        <p className="mb-3 text-sm leading-7 text-[color:var(--muted)]">
          配置好 MCP 后，可以试试这些记账指令：
        </p>
        <div className="space-y-3">
          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
            <p className="font-medium text-sm">🍜 记录一笔午餐</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              对 MCP 客户端说：<br />
              <code className="text-[color:var(--accent)]">「午饭吃了 35 块」</code>
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
            <p className="font-medium text-sm">🐱 给宠物买猫粮（分摊 60 天）</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              对 MCP 客户端说：<br />
              <code className="text-[color:var(--accent)]">「给猫买粮 200，从宠物对象记账，分 60 天」</code>
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
            <p className="font-medium text-sm">🚌 记录交通费</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              对 MCP 客户端说：<br />
              <code className="text-[color:var(--accent)]">「昨天交通费 6 块」</code>
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
            <p className="font-medium text-sm">📊 查询支出统计</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              对 MCP 客户端说：<br />
              <code className="text-[color:var(--accent)]">「这个月花了多少钱？」</code>
            </p>
          </div>
        </div>
      </>
    ),
  },
];

const claudeJson = `{
  "mcpServers": {
    "billbook": {
      "command": "node",
      "args": ["desktop/mcp/billbook-server.mjs"],
      "cwd": "/path/to/your/billbook-mcp"
    }
  }
}`;

const genericJson = `{
  "mcpServers": {
    "billbook": {
      "command": "node",
      "args": ["desktop/mcp/billbook-server.mjs"],
      "cwd": "/path/to/your/billbook-mcp"
    }
  }
}`;

function ClaudeDesktopSection() {
  return (
    <>
      <p className="mb-3 text-sm leading-7 text-[color:var(--muted)]">
        Claude Desktop 使用 <code>claude_desktop_config.json</code> 配置文件：
      </p>
      <div className="overflow-x-auto rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
        <pre className="text-sm leading-6"><code className="language-json">{claudeJson}</code></pre>
      </div>
      <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
        保存后重启 Claude Desktop，即可通过对话让 Claude 帮你记账。
      </p>
    </>
  );
}

function GenericMcpSection() {
  return (
    <>
      <p className="mb-3 text-sm leading-7 text-[color:var(--muted)]">
        任意支持 stdio 传输的 MCP 客户端（Cursor、Continue.dev 等）都可以用以下通用格式配置：
      </p>
      <div className="overflow-x-auto rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
        <pre className="text-sm leading-6"><code className="language-json">{genericJson}</code></pre>
      </div>
      <div className="mt-4 rounded-2xl border border-[color:var(--warning-soft)] bg-[color:var(--accent-soft)] p-4 text-sm leading-7">
        <p className="font-semibold">💡 首次启动小提示：</p>
        <p className="mt-1 text-[color:var(--muted)]">
          数据库会在 MCP 服务器首次启动时自动创建并初始化。如果遇到权限问题，确保 <code>cwd</code> 路径正确且项目已执行过 <code>npm install</code>。
        </p>
      </div>
    </>
  );
}

export function McpGuideContent() {
  return (
    <div className="pb-14 lg:pb-20">
      {/* Page Header */}
      <section className="relative overflow-hidden rounded-[40px] bg-[linear-gradient(160deg,var(--surface-strong),var(--surface-soft))] px-5 py-10 lg:px-10 lg:py-16">
        <div className="relative z-10 mx-auto max-w-[800px]">
          <p className="type-kicker text-center">Tutorial</p>
          <h1 className="mt-4 text-center font-display text-[clamp(32px,6vw,56px)] font-semibold leading-[1.08] tracking-[-0.03em]">
            MCP 记账配置教程
          </h1>
          <p className="mt-4 mx-auto max-w-[600px] text-center text-base leading-8 text-[color:var(--muted)]">
            手把手教你配置 Billbook MCP 服务，在 OpenClaw、Hermes Agent、Claude Desktop 等客户端中实现一句话 AI 记账。
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1.5 text-xs font-medium backdrop-blur">
              ⏱ 预计 5 分钟
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1.5 text-xs font-medium backdrop-blur">
              🛠 需要 Node.js 18+
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1.5 text-xs font-medium backdrop-blur">
              🔌 支持 OpenClaw / Hermes / Claude Desktop / Cursor / Continue.dev
            </span>
          </div>
        </div>

        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(21,95,83,0.10),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(21,95,83,0.06),transparent_70%)] blur-3xl" />
      </section>

      {/* Steps */}
      <div className="mt-6 space-y-4">
        {steps.map((step, index) => (
          <section
            key={index}
            className="panel rounded-[28px] p-5 lg:p-6 transition duration-300 hover:shadow-[0px_8px_32px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent)] text-sm font-semibold text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">{step.title}</h2>
                <div className="mt-3">{step.content}</div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <section className="mt-6 rounded-[36px] bg-[color:var(--accent)] p-8 text-center text-white lg:p-12">
        <h2 className="font-display text-[clamp(28px,4vw,40px)] font-semibold leading-tight tracking-[-0.02em]">
          配置完成？开始记账吧！
        </h2>
        <p className="mt-4 mx-auto max-w-[520px] text-base leading-8 text-white/90">
          现在你可以打开你的 MCP 客户端，试试说「午饭吃了 35 块」—— 账单自动生成！
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-transparent hover:text-white border border-transparent hover:border-white/40 px-6 py-3 text-[15px] font-semibold text-[color:var(--accent)] transition-colors duration-300"
          >
            ← 返回首页
          </Link>
          <a
            href="https://github.com/Zachyucheng/billbook-mcp"
            className="inline-flex items-center gap-2 rounded-full border border-white/40 hover:bg-white hover:text-[color:var(--accent)] px-6 py-3 text-[15px] font-semibold transition-colors duration-300"
          >
            仓库主页
          </a>
        </div>
      </section>
    </div>
  );
}
