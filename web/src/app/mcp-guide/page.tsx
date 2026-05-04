import type { Metadata } from "next";
import { McpGuideContent } from "./content";

export const metadata: Metadata = {
  title: "MCP 记账教程",
  description:
    "详细教程：在 OpenClaw、Hermes Agent、Claude Desktop 等 MCP 客户端中配置 Billbook MCP 服务，实现一句话 AI 记账。",
  openGraph: {
    title: "MCP 记账教程 · Billbook",
    description:
      "详细教程：在 OpenClaw、Hermes Agent、Claude Desktop 等 MCP 客户端中配置 Billbook MCP 服务，实现一句话 AI 记账。",
  },
};

export default function McpGuidePage() {
  return <McpGuideContent />;
}
