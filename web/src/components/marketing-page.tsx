"use client";

import { BrandMark } from "@/components/brand-mark";
import { useI18n } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import { BotIcon, UsersIcon, RecurringIcon, ChartIcon, LockIcon, MonitorIcon } from "@/components/feature-icons";

const stats = [
  { value: "对象化", valueEn: "Object-based", key: "stats.model" },
  { value: "本地优先", valueEn: "Local-first", key: "stats.storage" },
  { value: "AI 驱动", valueEn: "AI-powered", key: "stats.input" },
  { value: "桌面端", valueEn: "Desktop", key: "stats.platform" },
];

export function MarketingPage() {
  const { t, lang } = useI18n();

  const features = [
    { icon: BotIcon, title: t["feature.1.title"], description: t["feature.1.desc"] },
    { icon: UsersIcon, title: t["feature.2.title"], description: t["feature.2.desc"] },
    { icon: RecurringIcon, title: t["feature.3.title"], description: t["feature.3.desc"] },
    { icon: ChartIcon, title: t["feature.4.title"], description: t["feature.4.desc"] },
    { icon: LockIcon, title: t["feature.5.title"], description: t["feature.5.desc"] },
    { icon: MonitorIcon, title: t["feature.6.title"], description: t["feature.6.desc"] },
  ];

  return (
    <div className="pb-14 lg:pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[40px] bg-[linear-gradient(160deg,var(--surface-strong),var(--surface-soft))] px-5 py-10 lg:px-10 lg:py-16">
        <div className="relative z-10 mx-auto max-w-[900px] text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white/80 px-4 py-2 text-sm font-medium backdrop-blur">
            <BrandMark className="h-5 w-5" title="Billbook 标识" />
            {t["brand.tagline"]}
            <span className="ml-1 rounded-full bg-[color:var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--accent)]">
              v2.41
            </span>
          </div>

          <h1 className="mt-8 font-display text-[clamp(42px,7vw,76px)] font-semibold leading-[1.04] tracking-[-0.04em]">
            {t["hero.line1"]}
            <br />
            <span className="text-[color:var(--accent)]">{t["hero.line2"]}</span>
          </h1>

          <p className="mt-6 mx-auto max-w-[560px] text-base leading-8 text-[color:var(--muted)] lg:text-lg">
            {t["hero.subtitle"]}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={siteConfig.githubUrl}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] hover:bg-white hover:text-[color:var(--accent)] border border-transparent hover:border-[color:var(--accent)] px-6 py-3 text-white text-[15px] font-semibold transition-colors duration-300"
            >
              {t["hero.download.github"]}
            </a>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.key} className="rounded-2xl bg-white/60 p-4 backdrop-blur text-center transition duration-300 hover:bg-white/80 hover:shadow-[0px_2px_8px_rgba(0,0,0,0.03)]">
                <p className="font-display text-2xl font-semibold">{lang === "zh" ? stat.value : stat.valueEn}</p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">{t[stat.key]}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(21,95,83,0.12),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(21,95,83,0.08),transparent_70%)] blur-3xl" />
      </section>

      {/* Features Grid */}
      <section className="mt-6">
        <div className="mb-8 text-center">
          <p className="type-kicker">Features</p>
          <h2 className="type-section-title mt-2 tracking-[-0.02em]">{t["features.title"]}</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="panel rounded-[28px] p-5 lg:p-6 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0px_8px_32px_rgba(0,0,0,0.04),0px_4px_12px_rgba(0,0,0,0.02)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="mt-6 panel panel-strong overflow-hidden rounded-[36px] p-5 lg:p-8">
        <p className="type-kicker text-center">How it works</p>
        <h2 className="type-section-title mt-2 text-center tracking-[-0.02em]">{t["steps.title"]}</h2>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {[1, 2, 3].map((step) => (
            <div key={step} className="text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--accent)] text-xl font-semibold text-white">
                {String(step).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{t[`step.${step}.title`]}</h3>
              <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">{t[`step.${step}.desc`]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-6 rounded-[36px] bg-[color:var(--accent)] p-8 text-center text-white lg:p-12">
        <h2 className="font-display text-[clamp(32px,5vw,48px)] font-semibold leading-tight tracking-[-0.02em]">
          {t["cta.title"]}
        </h2>
        <p className="mt-4 mx-auto max-w-[520px] text-base leading-8 text-white/90">
          {t["cta.subtitle"]}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={siteConfig.githubUrl}
            className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-transparent hover:text-white border border-transparent hover:border-white/40 px-6 py-3 text-[15px] font-semibold text-[color:var(--accent)] transition-colors duration-300"
          >
            {t["cta.download.github"]}
          </a>
        </div>
      </section>
    </div>
  );
}
