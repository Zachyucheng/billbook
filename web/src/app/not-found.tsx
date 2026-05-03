import Link from "next/link";

export default function NotFound() {
  return (
    <section className="panel panel-strong rounded-[32px] p-8">
      <p className="text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted)]">404</p>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
        这个页面不存在
      </h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-[color:var(--muted)]">
        可能是地址写错了，或者这个入口已经被移除。你可以先回到首页。
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex rounded-2xl bg-[color:var(--foreground)] px-4 py-3 text-sm font-semibold text-white"
        >
          返回首页
        </Link>
        <a
          href="#"
          className="inline-flex rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
        >
          去 GitHub 中查看
        </a>
      </div>
    </section>
  );
}
