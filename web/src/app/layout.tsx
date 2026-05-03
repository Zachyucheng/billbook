import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { I18nProvider } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: "Billbook 是一款 AI 智能桌面账本，支持 Hermes MCP 一句话记账、消费对象追踪和长期成本分析。数据本地优先，隐私安全。适用于 Windows 和 macOS。",
  applicationName: siteConfig.name,
  keywords: ["Billbook", "记账", "AI 记账", "桌面账本", "Hermes MCP", "长期消费", "消费对象", "个人理财", "bookkeeping", "AI bookkeeping", "desktop ledger"],
  category: "finance",
  authors: [{ name: "Billbook" }],
  openGraph: {
    title: siteConfig.name,
    description: "AI 智能桌面账本 — Hermes MCP 一句话记账，消费对象追踪，数据本地存储。适用于 Windows 和 macOS。",
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "zh_CN",
    type: "website",
    images: [
      {
        url: "/brand-mark.png",
        width: 512,
        height: 512,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: siteConfig.name,
    description: "AI-powered desktop bookkeeping app. One-sentence entry via Hermes MCP, spend tracking, local-first privacy.",
    images: ["/brand-mark.png"],
  },
  icons: {
    icon: "/brand-mark.png",
    shortcut: "/brand-mark.png",
    apple: "/brand-mark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Billbook",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Windows, macOS",
    description: "AI-powered desktop bookkeeping app with Hermes MCP one-sentence entry, spending object tracking, and long-term cost analysis.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Organization",
      name: "Billbook",
    },
  };

  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <I18nProvider>
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
