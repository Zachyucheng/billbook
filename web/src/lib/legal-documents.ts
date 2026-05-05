export type LegalSection = {
  title: string;
  body: string[];
};

export type LegalDocument = {
  path: string;
  kicker: string;
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
};

const effectiveDate = "2026-05-05";

export const privacyDocument: LegalDocument = {
  path: "/privacy",
  kicker: "Privacy",
  title: "隐私政策",
  summary:
    "Billbook 采用本地优先的数据模型。桌面账本数据默认保存在本机 SQLite 中；如你使用网站登录能力，仅会为会话鉴权处理最少必要的信息。",
  effectiveDate,
  sections: [
    {
      title: "我们收集什么",
      body: [
        "在桌面端和 MCP 记账流程中，账本对象、分类、交易、周期计划和导出内容默认保存在你的本地设备，不会因为记账功能自动上传到 Billbook 服务器。",
        "如果你使用网站的登录、注册或验证码能力，我们会处理电子邮箱、验证码校验结果和必要的会话信息，以便完成身份验证与桌面端会话恢复。",
      ],
    },
    {
      title: "数据存储位置",
      body: [
        "桌面端默认数据库位于本地 SQLite 文件，常见路径为 desktop/state/billbook.sqlite，或由 BILLBOOK_DESKTOP_DB_PATH 指定的自定义位置。",
        "浏览器侧的工作区也可能暂存于本地存储，用于桌面运行时与本地账本体验。同步到桌面后，MCP 客户端读取的是本机 SQLite 快照。",
      ],
    },
    {
      title: "Cookie 与会话",
      body: [
        "网站登录使用 HttpOnly Cookie 维持会话。该 Cookie 由 Cloudflare Pages Functions 写入，旨在避免把会话令牌暴露到 localStorage 或前端脚本环境。",
        "如你仅使用本地 MCP 服务而不使用网站登录，Billbook 的本地账本功能不依赖云端会话即可运行。",
      ],
    },
    {
      title: "我们如何使用这些信息",
      body: [
        "我们仅将必要的身份信息用于登录校验、桌面端会话恢复、验证码发送与基础安全防护。",
        "Billbook 不会为了广告目的分析你的账本消费内容，也不会把本地账本数据出售、出租或共享给第三方营销平台。",
      ],
    },
    {
      title: "你的控制权",
      body: [
        "你可以在桌面端导出、备份或清空本地账本数据，也可以关闭桌面运行时中的外部 MCP 访问开关，阻止外部客户端读取账本。",
        "如需删除网站账户或反馈隐私问题，请通过 supportEmail 或仓库 issue 与项目维护者联系。",
      ],
    },
  ],
};

export const termsDocument: LegalDocument = {
  path: "/terms",
  kicker: "Terms",
  title: "使用条款",
  summary:
    "Billbook 是一个以个人记账、桌面工作区和 MCP 集成为核心的开源项目。使用本项目即表示你同意按照许可证、本文条款和适用法律使用它。",
  effectiveDate,
  sections: [
    {
      title: "许可与使用范围",
      body: [
        "仓库代码按 AGPL-3.0 及项目附加说明提供。你可以在遵守许可证义务的前提下学习、修改和自托管本项目。",
        "如果你分发修改版、提供网络服务或集成本项目能力，应同步遵守 AGPL-3.0 的开源义务，并保留原有版权与许可声明。",
      ],
    },
    {
      title: "使用者责任",
      body: [
        "你应自行核对导入、导出、统计与 AI 记账结果的准确性，尤其是在报销、税务、合同或其他高风险财务场景中。",
        "你不得利用 Billbook 或其 MCP 服务实施违法活动、未授权访问、恶意自动化攻击，或故意破坏他人的本地数据环境。",
      ],
    },
    {
      title: "MCP 与第三方客户端",
      body: [
        "Billbook 可与 OpenClaw、Hermes Agent、Claude Desktop、Cursor、Continue.dev 等支持 MCP 的客户端协作，但这些客户端由各自提供方独立维护。",
        "当你把 Billbook 接入第三方 MCP 客户端时，应自行评估该客户端的权限模型、日志行为和隐私策略。",
      ],
    },
    {
      title: "无担保声明",
      body: [
        "Billbook 按“现状”提供，不对持续可用性、无缺陷、适销性或特定用途适配性作出明示或默示担保。",
        "在适用法律允许的范围内，项目维护者不对因使用或无法使用 Billbook 所造成的直接或间接损失承担责任。",
      ],
    },
    {
      title: "条款更新",
      body: [
        "我们可能随项目架构、部署方式或法律要求调整本文条款。更新后会同步修改站点页面中的生效日期。",
      ],
    },
  ],
};

export const securityDocument: LegalDocument = {
  path: "/security",
  kicker: "Security",
  title: "安全说明",
  summary:
    "Billbook 的安全边界建立在本地优先存储、最少会话暴露和桌面端可控访问之上。以下内容概述了项目目前采用的主要安全实践。",
  effectiveDate,
  sections: [
    {
      title: "本地账本安全",
      body: [
        "桌面账本数据默认写入本地 SQLite 文件，MCP 客户端读取的是同步后的本机快照，而不是远程数据库。",
        "桌面运行时提供外部访问开关；关闭后，MCP 请求会被显式拒绝，避免外部客户端在未授权情况下读取账本。",
      ],
    },
    {
      title: "会话与认证",
      body: [
        "网站认证继续沿用 Cloudflare Pages Functions + D1 + HttpOnly Cookie 模型，尽量避免把登录令牌存入前端可读存储。",
        "同域部署优先，可减少跨域会话复杂度，并降低临时 token 泄露的风险面。",
      ],
    },
    {
      title: "桌面隔离",
      body: [
        "Electron 主窗口启用了 contextIsolation，关闭了 nodeIntegration，并通过 preload 桥接桌面专用能力。",
        "桌面外链会转交系统浏览器打开，避免渲染进程任意跳转到未知来源页面。",
      ],
    },
    {
      title: "安全建议",
      body: [
        "请只在可信 MCP 客户端中接入 Billbook，并定期备份本地数据库文件。",
        "如发现安全漏洞、权限绕过或敏感信息泄露风险，请通过仓库 issue 或维护者联系邮箱进行负责任披露。",
      ],
    },
  ],
};

export const legalDocuments = [privacyDocument, termsDocument, securityDocument];
