#!/usr/bin/env node
/**
 * Billbook MCP — 一键初始化脚本
 *
 * 当 AI Agent（Hermes / Claude Code 等）克隆下这个项目后，
 * 运行此脚本即可完成 MCP 服务的安装和初始化。
 *
 * 用法: npm run setup:mcp
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const rootDir = path.resolve(__dirname, "..");
const dbDir = path.join(rootDir, "desktop", "state");
const MCP_SERVER_PATH = path.join(rootDir, "desktop", "mcp", "billbook-server.mjs");

console.log("");
console.log("═══════════════════════════════════════════");
console.log("  Billbook MCP — 一键初始化");
console.log("═══════════════════════════════════════════");
console.log("");

// 1. Install dependencies
console.log("📦 正在安装依赖...");
try {
  execSync("npm install", { cwd: rootDir, stdio: "inherit" });
  console.log("✅ 依赖安装完成");
} catch (e) {
  console.error("❌ 依赖安装失败:", e.message);
  process.exit(1);
}

// 2. Create database directory
console.log("\n📁 正在创建数据库目录...");
fs.mkdirSync(dbDir, { recursive: true });
console.log(`✅ ${dbDir}`);

// 3. Verify MCP server exists
console.log("\n🔍 正在验证 MCP 服务...");
if (fs.existsSync(MCP_SERVER_PATH)) {
  console.log(`✅ MCP 服务入口: ${MCP_SERVER_PATH}`);
} else {
  console.error(`❌ 未找到 MCP 服务: ${MCP_SERVER_PATH}`);
  process.exit(1);
}

// 4. Database auto-initialization (done by MCP server on first run)
console.log("\n⚡ 数据库将在 MCP 服务首次启动时自动初始化。");

console.log("");
console.log("═══════════════════════════════════════════");
console.log("  ✅ 初始化完成！");
console.log("═══════════════════════════════════════════");
console.log("");
console.log("下一步：将以下配置添加到 Hermes config.yaml：");
console.log("");
console.log("  mcp:");
console.log("    servers:");
console.log("      billbook:");
console.log("        command: node");
console.log(`        args: ["desktop/mcp/billbook-server.mjs"]`);
console.log(`        cwd: "${rootDir}"`);
console.log("");
console.log("然后重启 Hermes Agent，即可开始使用 AI 记账！");
console.log("");
