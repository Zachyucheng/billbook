"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Panel } from "@/components/workspace-ui";
import { BillbookProvider, useBillbook } from "@/components/billbook-provider";
import { useI18n } from "@/lib/i18n";
import { workspaceRoutes } from "@/lib/routes";

const workspaceRouteKeys = [
  { href: workspaceRoutes.home, key: "nav.overview" },
  { href: workspaceRoutes.ledger, key: "nav.ledger" },
  { href: workspaceRoutes.settings, key: "nav.settings" },
  { href: workspaceRoutes.advanced, key: "nav.advanced" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWorkspaceSurface = pathname === "/workspace" || pathname.startsWith("/workspace/");

  if (!isWorkspaceSurface) {
    return <MarketingFrame>{children}</MarketingFrame>;
  }

  return (
    <BillbookProvider>
      <WorkspaceFrame>{children}</WorkspaceFrame>
    </BillbookProvider>
  );
}

function MarketingFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, lang, toggleLang } = useI18n();

  return (
    <BillbookProvider>
        <div className="min-h-screen text-foreground flex flex-col">
          <div className="flex-1 px-3 py-3 md:px-4 md:py-4">
            <div className="mx-auto max-w-[1480px]">
              <header className="panel panel-strong rounded-[30px] px-4 py-4 md:px-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <Link href="/" className="flex items-center gap-2.5">
                    <div className="surface-solid flex h-10 w-10 items-center justify-center rounded-[12px] border border-[color:var(--line)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/brand-mark.png" alt="Billbook 标识" className="h-6 w-6 object-contain" />
                    </div>
                    <div>
                      <p className="type-kicker">Billbook</p>
                      <p className="font-display text-xl font-semibold tracking-tight">
                        Billbook
                      </p>
                    </div>
                  </Link>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href="/legal"
                      className={`ui-chip inline-flex items-center border ${
                        pathname === "/legal"
                          ? "border-transparent btn-accent"
                          : "border-[color:var(--line)] bg-[color:var(--surface-strong)] text-[color:var(--muted)]"
                      }`}
                    >
                      {lang === "zh" ? "法律 / 许可" : "Legal / License"}
                    </Link>
                    <button
                      type="button"
                      onClick={toggleLang}
                      className="ui-chip border border-[color:var(--line)] bg-[color:var(--surface-strong)] text-[color:var(--muted)] hover:bg-[color:var(--surface-solid)] hover:text-[color:var(--foreground)] transition-colors duration-300"
                    >
                      {lang === "zh" ? "EN" : "中文"}
                    </button>
                  </div>
                </div>
              </header>

              <main className="mt-4">{children}</main>
            </div>
          </div>

          <MarketingFooter />
        </div>
    </BillbookProvider>
  );
}

/* ─── Extracted footer for MarketingFrame ─── */
function MarketingFooter() {
  const { t, lang } = useI18n();

  return (
    <footer className="bg-[#0f1a17] px-5 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-[1480px]">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="font-display text-lg font-semibold text-white">Billbook</p>
            <p className="mt-2 text-sm leading-6 text-white/50 max-w-[260px]">
              一款围绕消费对象、长期消费与 AI 智能录入打造的桌面账本应用。数据本地存储，隐私安全。
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/50">
              <a href="mailto:zachavery125@gmail.com" className="text-white/70 hover:text-white underline underline-offset-2 transition-colors">zachavery125@gmail.com</a>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-white/80">产品</p>
            <ul className="mt-3 space-y-2 text-sm text-white/50">
              <li><a href="/" className="hover:text-white transition-colors">首页</a></li>
              <li><a href="/mcp-guide" className="hover:text-white transition-colors">MCP 记账教程</a></li>
              <li><span className="text-white/30">{t["cta.download.github"]}</span></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white/80">{lang === "zh" ? "法律" : "Legal"}</p>
            <ul className="mt-3 space-y-2 text-sm text-white/50">
              <li><Link href="/legal" className="hover:text-white transition-colors">{t["header.privacy"]} & {t["header.terms"]}</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-white/10 pt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-white/30">{t["footer.copyright"]}</p>
          <p className="text-xs text-white/20">{t["footer.tagline"]}</p>
        </div>
      </div>
    </footer>
  );
}

function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { errorMessage, clearError, hydrated, refreshFromSqlite } = useBillbook();
  const { t, lang, toggleLang } = useI18n();

  const activeWorkspaceRoute = useMemo(
    () =>
      [...workspaceRouteKeys]
        .reverse()
        .find(
          (item) => {
            const p = pathname.replace(/\/$/, "");
            return p === item.href || (item.href !== workspaceRoutes.home && p.startsWith(`${item.href}/`));
          },
        ) ?? workspaceRouteKeys[0],
    [pathname],
  );

  useEffect(() => {
    workspaceRouteKeys.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  if (!hydrated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--surface)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--line)] border-t-[color:var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="workspace-shell hide-scrollbar min-h-screen px-2.5 py-2.5 text-foreground md:px-3 md:py-3">
      <div className="mx-auto max-w-[1440px] md:pl-[248px]">
        <aside className="panel panel-strong hidden rounded-[24px] md:fixed md:bottom-3 md:left-3 md:top-3 md:z-20 md:flex md:h-[calc(100vh-1.5rem)] md:w-[228px] md:flex-col md:overflow-hidden 2xl:left-[max(0.75rem,calc((100vw-1440px)/2+0.75rem))]">
          <div className="flex h-full flex-col p-3">
            <Link
              href={workspaceRoutes.home}
              className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-solid)] px-3 py-3 transition hover:border-[color:var(--line-strong)]"
            >
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand-mark.png" alt="Billbook 标识" className="h-10 w-10 rounded-[14px] object-contain" />
                <div className="min-w-0">
                  <p className="type-kicker">Desktop</p>
                  <p className="truncate font-display text-[19px] font-semibold tracking-tight">
                    Billbook
                  </p>
                </div>
              </div>
            </Link>

            <nav className="mt-4 flex-1 space-y-1">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
                {t["nav.workspace"]}
              </p>
              {workspaceRouteKeys.map((item) => {
              const normalizedPathname = pathname.replace(/\/$/, "");
              return (
                <WorkspaceNavLink
                  key={item.href}
                  href={item.href}
                  active={
                    normalizedPathname === item.href ||
                    (item.href !== workspaceRoutes.home &&
                      normalizedPathname.startsWith(`${item.href}/`))
                  }
                  label={t[item.key]}
                />
              );
            })}
            </nav>

            <button
                type="button"
                onClick={() => refreshFromSqlite()}
                className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-[12px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-2 text-[11px] font-medium text-[color:var(--muted)] transition hover:bg-[color:var(--surface-solid)] hover:text-[color:var(--foreground)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                {t["nav.refresh"]}
              </button>

            <div className="mt-auto border-t shell-divider pt-3">
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/legal"
                  className="text-xs text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
                >
                  {t["nav.legal.license"]}
                </Link>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleLang}
                  className="text-xs text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
                >
                  {lang === "zh" ? "EN" : "中文"}
                </button>
              </div>
              <p className="mt-3 text-xs text-[color:var(--muted)]">Billbook Desktop</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="panel panel-strong rounded-[26px] p-4 lg:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="type-kicker">Workspace</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h1 className="text-lg font-semibold tracking-tight">
                    {t[activeWorkspaceRoute.key]}
                  </h1>
                </div>
              </div>

              <div className="hidden flex-wrap items-center gap-2 md:flex">
                <Link
                  href={workspaceRoutes.ledger}
                  className="ui-button inline-flex items-center border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
                >
                  {t["nav.goLedger"]}
                </Link>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 md:hidden">
              {workspaceRouteKeys.map((item) => (
                <MobileNavLink
                  key={item.href}
                  href={item.href}
                  active={
                    pathname === item.href ||
                    (item.href !== workspaceRoutes.home && pathname.startsWith(`${item.href}/`))
                  }
                >
                  {t[item.key]}
                </MobileNavLink>
              ))}
            </div>

          </header>

          {errorMessage ? (
            <div className="mt-4 rounded-[22px] border border-[color:var(--warning-soft)] bg-[color:var(--accent-soft)] px-4 py-3 text-sm text-[color:var(--warning)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={clearError}
                  className="ui-chip border border-[color:var(--warning-soft)] bg-[color:var(--surface-strong)] text-[12px] font-semibold"
                >
                  {t["nav.close"]}
                </button>
              </div>
            </div>
          ) : null}

          <main className="mt-4 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

function WorkspaceNavLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-[14px] border px-3 py-2.5 transition ${
        active
          ? "border-[color:var(--accent-soft)] bg-[color:var(--surface-solid)]"
          : "border-transparent text-[color:var(--muted)] hover:border-[color:var(--line)] hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--foreground)]"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            active ? "bg-[color:var(--accent)]" : "bg-[color:var(--line-strong)]"
          }`}
        />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </Link>
  );
}

function MobileNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`ui-chip whitespace-nowrap border transition ${
        active
          ? "border-[color:var(--accent-soft)] bg-[color:var(--surface-solid)] text-[color:var(--foreground)]"
          : "border-[color:var(--line)] bg-[color:var(--surface-strong)] text-[color:var(--muted)]"
      }`}
    >
      {children}
    </Link>
  );
}
