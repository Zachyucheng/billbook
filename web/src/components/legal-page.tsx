import Link from "next/link";

type LegalSection = {
  title: string;
  body: string[];
};

export function LegalPage({
  kicker,
  title,
  summary,
  effectiveDate,
  sections,
}: {
  kicker: string;
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
}) {
  return (
    <div className="space-y-5">
      <section className="panel panel-strong rounded-[32px] p-6 lg:p-8">
        <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
          <div>
            <p className="type-kicker">{kicker}</p>
            <h1 className="type-page-title mt-3">{title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--muted)]">
              {summary}
            </p>
          </div>
          <div className="surface-soft rounded-[24px] border border-[color:var(--line)] p-4 lg:p-5">
            <p className="type-kicker">Policy Notes</p>
            <div className="mt-4 space-y-3">
              <MetaRow label="生效日期" value={effectiveDate} />
              <MetaRow label="部署形态" value="Cloudflare Pages + Pages Functions" />
              <MetaRow label="会话策略" value="HttpOnly Cookie" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/" className="ui-button btn-accent">
                返回首页
              </Link>
              <span className="ui-button inline-flex items-center border border-[color:var(--line)] bg-[color:var(--surface-strong)] text-[color:var(--muted)]">
                桌面端内提供完整工作区
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel rounded-[32px] p-6 lg:p-8">
        <div className="legal-prose space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="type-section-title">{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-[color:var(--surface-strong)] px-4 py-3 text-sm">
      <span className="text-[color:var(--muted)]">{label}</span>
      <span className="text-right font-medium text-[color:var(--foreground)]">{value}</span>
    </div>
  );
}
