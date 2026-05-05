import type { Metadata } from "next";
import Link from "next/link";
import { legalDocuments } from "@/lib/legal-documents";

export const metadata: Metadata = {
  title: "法律与许可",
  description: "查看 Billbook 的隐私政策、使用条款与安全说明。",
};

export default function LegalIndexPage() {
  return (
    <div className="space-y-5">
      <section className="panel panel-strong rounded-[32px] p-6 lg:p-8">
        <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
          <div>
            <p className="type-kicker">Legal</p>
            <h1 className="type-page-title mt-3">法律与许可</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--muted)]">
              Billbook 的公开站点、桌面端和本地 MCP 服务共享同一套产品边界。
              这里集中说明隐私处理方式、使用条款和当前安全基线，方便你在接入前快速确认风险与责任边界。
            </p>
          </div>
          <div className="surface-soft rounded-[24px] border border-[color:var(--line)] p-4 lg:p-5">
            <p className="type-kicker">Included</p>
            <div className="mt-4 space-y-3 text-sm text-[color:var(--muted)]">
              <p>• 隐私政策：本地账本、认证 Cookie 与最少必要数据</p>
              <p>• 使用条款：许可证、使用范围与责任边界</p>
              <p>• 安全说明：桌面隔离、访问控制与披露方式</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/" className="ui-button btn-accent">
                返回首页
              </Link>
              <a
                href="https://github.com/Zachyucheng/billbook-mcp/blob/main/LICENSE"
                className="ui-button inline-flex items-center border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
              >
                查看许可证
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {legalDocuments.map((doc) => (
          <Link
            key={doc.path}
            href={doc.path}
            className="panel rounded-[28px] p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0px_8px_32px_rgba(0,0,0,0.04)]"
          >
            <p className="type-kicker">{doc.kicker}</p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight">{doc.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{doc.summary}</p>
            <p className="mt-4 text-sm font-medium text-[color:var(--accent)]">查看全文 →</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
