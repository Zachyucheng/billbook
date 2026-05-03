"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[960px] items-center justify-center p-4">
      <section className="w-full rounded-[32px] border border-[rgba(19,35,28,0.1)] bg-white/88 p-8 shadow-[0_30px_60px_rgba(32,49,41,0.08)]">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#66736c]">Runtime Error</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#13231c]">
          页面遇到了一点意外
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#66736c]">
          这次错误已经被全局边界接住了，不会把你直接丢进空白页。可以先重试一次，再继续看刚刚的操作链路。
        </p>
        <div className="mt-6 rounded-[24px] border border-[rgba(19,35,28,0.1)] bg-[#f8f4ed] p-4 text-sm text-[#66736c]">
          {error.message}
        </div>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-2xl bg-[#17806d] px-4 py-3 text-sm font-semibold text-white"
        >
          重新尝试
        </button>
      </section>
    </div>
  );
}
