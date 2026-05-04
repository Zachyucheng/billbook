/**
 * Build script for Billbook.
 * If web/ exists (developer environment), builds the Next.js frontend.
 * If not (fresh clone from GitHub), uses the pre-built out/ directory.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const WEB_DIR = path.join(ROOT, "web");
const OUT_DIR = path.join(ROOT, "out");

if (fs.existsSync(WEB_DIR)) {
  console.log("[build] web/ found — building frontend...");
  execSync("npm run build", { cwd: WEB_DIR, stdio: "inherit" });

  // Copy web/out/* to root out/
  const webOut = path.join(WEB_DIR, "out");
  if (fs.existsSync(webOut)) {
    console.log("[build] copying build artifacts to root out/...");
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const entries = fs.readdirSync(webOut, { withFileTypes: true });
    for (const entry of entries) {
      const src = path.join(webOut, entry.name);
      const dest = path.join(OUT_DIR, entry.name);
      if (entry.isDirectory()) {
        fs.cpSync(src, dest, { recursive: true });
      } else {
        fs.copyFileSync(src, dest);
      }
    }
  }
  console.log("[build] build complete.");
} else {
  console.log("[build] web/ not found — using pre-built out/ from GitHub.");
  if (!fs.existsSync(path.join(OUT_DIR, "index.html"))) {
    console.error("[build] ERROR: out/index.html not found! Cannot start.");
    process.exit(1);
  }
}
