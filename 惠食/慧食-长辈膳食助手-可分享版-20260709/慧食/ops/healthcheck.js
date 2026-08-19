const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
loadEnv(path.join(ROOT, ".env"));
const origin = String(process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
if (!origin.startsWith("https://")) fail("PUBLIC_BASE_URL must use HTTPS");

main().catch((error) => fail(error.message || String(error)));

async function main() {
  try {
    const response = await fetch(`${origin}/readyz`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok !== true || data.status !== "ready") throw new Error(`readyz returned ${response.status}`);
    process.stdout.write(`${JSON.stringify({ ok: true, checkedAt: new Date().toISOString(), origin })}\n`);
  } catch (error) {
    await sendAlert(error);
    throw error;
  }
}

async function sendAlert(error) {
  const webhook = process.env.ALERT_WEBHOOK_URL || "";
  if (!webhook.startsWith("https://")) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.ALERT_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.ALERT_WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify({ service: "huishi", event: "external_healthcheck_failed", message: String(error.message || error).slice(0, 180), timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {}
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, "utf8").split(/\r?\n/).forEach((line) => {
    const value = line.trim();
    if (!value || value.startsWith("#")) return;
    const separator = value.indexOf("=");
    if (separator < 1) return;
    const key = value.slice(0, separator).trim();
    const content = value.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (process.env[key] == null) process.env[key] = content;
  });
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
