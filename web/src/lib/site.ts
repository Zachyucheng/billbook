const baseUrl = "https://billbook.pages.dev";

export const siteConfig = {
  name: "Billbook",
  shortName: "Billbook",
  url: baseUrl,
  description:
    "Billbook 是一款围绕消费对象、长期消费与 Hermes MCP 一键记账打造的桌面账本应用。",
  supportEmail: "support@billbook.local",
  effectiveDate: "2026-05-02",
  githubUrl: "#", // TODO: 替换为实际 GitHub 仓库链接
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
