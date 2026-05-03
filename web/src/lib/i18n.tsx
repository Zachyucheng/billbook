"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "zh" | "en";

type I18nContextType = {
  lang: Lang;
  toggleLang: () => void;
  t: Record<string, string>;
};

const translations: Record<Lang, Record<string, string>> = {
  zh: {
    "brand.tagline": "Billbook Desktop — 桌面账本，长期可用",
    "hero.line1": "不只是记账，",
    "hero.line2": "更是理解消费。",
    "hero.subtitle": "AI 智能录入 · 消费对象追踪 · 长期成本分析 · 本地数据隐私。桌面端专为日常高频使用设计，把流水变成洞察。",
    "hero.download.github": "去 GitHub 中查看 →",
    "stats.model": "记账模型",
    "stats.storage": "数据存储",
    "stats.input": "录入方式",
    "stats.platform": "运行平台",
    "features.title": "桌面账本的核心能力",
    "feature.1.title": "Hermes MCP 智能记账",
    "feature.1.desc": "说一句话就能记账。Hermes 把自然语言转成结构化记录，自动归类、落账、补充上下文。不用再手动填表单。",
    "feature.2.title": "消费对象管理",
    "feature.2.desc": "不只是分类，而是按「谁花了」来记账。自己、伴侣、宠物、车辆、项目——每笔消费都有真实的归属对象。",
    "feature.3.title": "长期消费追踪",
    "feature.3.desc": "保险、课程、订阅、保养——这些周期性支出常被流水淹没。Billbook 给你独立的长期消费视图，看清持续的财务压力。",
    "feature.4.title": "可视化分析",
    "feature.4.desc": "趋势图、分类占比、对象对比——所有数据自动生成可视化面板，一眼看清花钱的模式和变化。",
    "feature.5.title": "本地优先，隐私安全",
    "feature.5.desc": "所有账本数据存储在本地，账号仅用于云同步。HttpOnly Cookie 认证，不暴露敏感 token 到前端。",
    "feature.6.title": "桌面原生体验",
    "feature.6.desc": "Electron 桌面应用，本地 SQLite + MCP 服务。比网页更快、更稳定、更适合长期日常使用。",
    "steps.title": "三步开始记账",
    "step.1.title": "访问 GitHub",
    "step.1.desc": "前往 GitHub 发布页获取对应系统的桌面版。Windows 和 macOS 都支持，无需额外配置。",
    "step.2.title": "创建账号",
    "step.2.desc": "用邮箱注册 Billbook 账号，登录后即可在桌面端开始记账。数据存储在本地，安全可控。",
    "step.3.title": "开始记账",
    "step.3.desc": "创建消费对象、添加交易记录。也可以用 Hermes 说一句话，AI 自动帮你录入。",
    "cta.title": "准备好更清晰地理解消费了吗？",
    "cta.subtitle": "前往 GitHub 获取 Billbook Desktop，把 AI 智能记账、消费对象追踪和长期成本分析放进你的日常工具里。",
    "cta.download.github": "去 GitHub 中查看",
    "footer.tagline": "AI 智能记账 · 消费对象追踪 · 桌面原生体验",
    "footer.contact": "联系：",
    "footer.copyright": "© 2026 本作品采用 AGPL-3.0 协议 · 详见许可条款",
    "header.login": "登录 / 注册",
    "header.privacy": "隐私政策",
    "header.terms": "使用条款",
    "auth.login": "登录",
    "auth.register": "注册",
    "auth.login.title": "登录账号",
    "auth.register.title": "注册账号",
    "auth.email": "邮箱",
    "auth.password": "密码",
    "auth.confirmPassword": "确认密码",
    "auth.code": "邮箱验证码",
    "auth.sendCode": "发送验证码",
    "auth.submit.login": "立即登录",
    "auth.submit.register": "完成注册",
    "auth.loggedIn": "已登录 · 会话由 HttpOnly Cookie 维持",
    "auth.enterWorkspace": "进入工作区",
    "auth.logout": "退出登录",
    "auth.logoutSuccess": "已退出。刷新后将回到登录页。",
    "auth.switchAccount": "切换账号",
    "auth.accountMenu": "账户管理",
  },
  en: {
    "brand.tagline": "Billbook Desktop · Long-term bookkeeping",
    "hero.line1": "More than tracking,",
    "hero.line2": "understand your spending.",
    "hero.subtitle": "AI-powered entry · Spending object tracking · Long-term cost analysis · Local data privacy. Designed for daily high-frequency use, turning transactions into insights.",
    "hero.download.github": "View on GitHub →",
    "stats.model": "Bookkeeping Model",
    "stats.storage": "Data Storage",
    "stats.input": "Entry Method",
    "stats.platform": "Platform",
    "features.title": "Core Desktop Capabilities",
    "feature.1.title": "Hermes MCP AI Bookkeeping",
    "feature.1.desc": "Just say it and it's recorded. Hermes converts natural language into structured entries, auto-categorizing and adding context. No more manual forms.",
    "feature.2.title": "Spending Object Management",
    "feature.2.desc": "Track by who spends, not just categories. Yourself, partner, pets, vehicles, projects -- every expense has a real owner.",
    "feature.3.title": "Long-term Spending Tracking",
    "feature.3.desc": "Insurance, courses, subscriptions, maintenance: recurring costs that often get lost in the flow. Billbook tracks them in a dedicated long-term view.",
    "feature.4.title": "Visual Analytics",
    "feature.4.desc": "Trend charts, category breakdowns, and object comparisons. All data auto-generates visual dashboards that show your spending patterns clearly.",
    "feature.5.title": "Local-first, Privacy Safe",
    "feature.5.desc": "All ledger data stored locally. Accounts are only for cloud sync. HttpOnly Cookie authentication keeps sensitive tokens off the frontend.",
    "feature.6.title": "Native Desktop Experience",
    "feature.6.desc": "Electron desktop app with local SQLite + MCP service. Faster, more stable, and better suited for daily long-term use than a web app.",
    "steps.title": "Start in Three Steps",
    "step.1.title": "Visit GitHub",
    "step.1.desc": "Get the desktop app from the GitHub releases page. Windows and macOS supported, no extra setup needed.",
    "step.2.title": "Create Account",
    "step.2.desc": "Register a Billbook account with your email. Log in and start recording. Your data stays local, under your control.",
    "step.3.title": "Start Bookkeeping",
    "step.3.desc": "Create spending objects, add transactions. Or just tell Hermes what you spent -- the AI auto-records it.",
    "cta.title": "Ready to understand your spending better?",
    "cta.subtitle": "Get Billbook Desktop on GitHub and put AI bookkeeping, spending object tracking, and long-term cost analysis into your daily toolkit.",
    "cta.download.github": "View on GitHub",
    "footer.tagline": "AI Bookkeeping · Spending Objects · Desktop Native",
    "footer.contact": "Contact: ",
    "footer.copyright": "© 2026 Licensed under AGPL-3.0 · See LICENSE",
    "header.login": "Log in / Sign up",
    "header.privacy": "Privacy",
    "header.terms": "Terms",
    "auth.login": "Log in",
    "auth.register": "Sign up",
    "auth.login.title": "Log in",
    "auth.register.title": "Sign up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.confirmPassword": "Confirm Password",
    "auth.code": "Verification Code",
    "auth.sendCode": "Send Code",
    "auth.submit.login": "Log in",
    "auth.submit.register": "Create Account",
    "auth.loggedIn": "Logged in · Session via HttpOnly Cookie",
    "auth.enterWorkspace": "Enter Workspace",
    "auth.logout": "Log out",
    "auth.logoutSuccess": "Logged out. Refresh to return to login.",
    "auth.switchAccount": "Switch Account",
    "auth.accountMenu": "Account",
  },
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh");

  const toggleLang = () => setLang((prev) => (prev === "zh" ? "en" : "zh"));

  const t = translations[lang];

  return (
    <I18nContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
