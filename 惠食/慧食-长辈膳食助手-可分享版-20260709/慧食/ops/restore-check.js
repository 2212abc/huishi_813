const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const ROOT = path.resolve(__dirname, "..");
loadEnv(path.join(ROOT, ".env"));
const backupPath = path.resolve(process.argv[2] || "");
const keyPath = resolveConfiguredPath(process.env.BACKUP_KEY_FILE || "");
if (!backupPath || !fs.existsSync(backupPath)) fail("Usage: node ops/restore-check.js /absolute/path/to/backup.sqlite.aesgcm");
if (!keyPath || !fs.existsSync(keyPath)) fail("BACKUP_KEY_FILE is missing");
const key = fs.readFileSync(keyPath);
if (key.length !== 32) fail("Backup key must contain exactly 32 random bytes");

const encrypted = fs.readFileSync(backupPath);
if (encrypted.length < 37 || encrypted.subarray(0, 8).toString() !== "HSHBK01\0") fail("Unsupported or truncated backup");
const iv = encrypted.subarray(8, 20);
const tag = encrypted.subarray(20, 36);
const ciphertext = encrypted.subarray(36);
const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
decipher.setAuthTag(tag);
let plaintext;
try {
  plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
} catch {
  fail("Backup authentication failed: wrong key or corrupted file");
}

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "huishi-restore-check-"));
const restoredPath = path.join(temporaryDirectory, "restored.sqlite");
try {
  fs.writeFileSync(restoredPath, plaintext, { mode: 0o600 });
  const database = new DatabaseSync(restoredPath, { readOnly: true });
  const check = database.prepare("PRAGMA integrity_check").all();
  const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((row) => row.name);
  const users = tables.includes("users") ? Number(database.prepare("SELECT COUNT(*) AS count FROM users").get().count) : null;
  database.close();
  if (check.length !== 1 || Object.values(check[0] || {})[0] !== "ok") fail("Restored database failed integrity_check");
  process.stdout.write(`${JSON.stringify({ ok: true, integrity: "ok", tables, userCount: users })}\n`);
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}

function resolveConfiguredPath(value) {
  if (!value) return "";
  return path.isAbsolute(value) ? value : path.resolve(ROOT, value);
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
