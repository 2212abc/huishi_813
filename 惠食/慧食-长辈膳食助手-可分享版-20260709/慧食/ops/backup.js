const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const ROOT = path.resolve(__dirname, "..");
loadEnv(path.join(ROOT, ".env"));

const sourcePath = resolveConfiguredPath(process.env.AUTH_DB_PATH || path.join(ROOT, "data", "huishi.sqlite"));
const backupDirectory = resolveConfiguredPath(process.env.BACKUP_DIR || path.join(ROOT, "backups"));
const keyPath = resolveConfiguredPath(process.env.BACKUP_KEY_FILE || "");
const retentionDays = clampInteger(process.env.BACKUP_RETENTION_DAYS, 7, 365, 30);
const minimumCopies = clampInteger(process.env.BACKUP_MINIMUM_COPIES, 3, 90, 7);

if (!keyPath) fail("BACKUP_KEY_FILE is required");
if (!fs.existsSync(sourcePath)) fail(`Database does not exist: ${sourcePath}`);
const key = fs.readFileSync(keyPath);
if (key.length !== 32) fail("Backup key must contain exactly 32 random bytes");

fs.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
try { fs.chmodSync(backupDirectory, 0o700); } catch {}

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "huishi-backup-"));
const snapshotPath = path.join(temporaryDirectory, "huishi.sqlite");
try {
  const source = new DatabaseSync(sourcePath);
  try {
    source.exec("PRAGMA wal_checkpoint(PASSIVE)");
    source.exec(`VACUUM INTO '${snapshotPath.replaceAll("'", "''")}'`);
  } finally {
    source.close();
  }

  const snapshot = new DatabaseSync(snapshotPath, { readOnly: true });
  const check = snapshot.prepare("PRAGMA integrity_check").all();
  snapshot.close();
  if (check.length !== 1 || Object.values(check[0] || {})[0] !== "ok") fail("Snapshot integrity check failed");

  const plaintext = fs.readFileSync(snapshotPath);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const encrypted = Buffer.concat([Buffer.from("HSHBK01\0"), iv, tag, ciphertext]);
  const timestamp = new Date().toISOString().replaceAll(":", "-").replace(".", "-");
  const outputPath = path.join(backupDirectory, `huishi-${timestamp}.sqlite.aesgcm`);
  fs.writeFileSync(outputPath, encrypted, { flag: "wx", mode: 0o600 });
  const checksum = crypto.createHash("sha256").update(encrypted).digest("hex");
  fs.writeFileSync(`${outputPath}.json`, `${JSON.stringify({
    format: "HSHBK01",
    createdAt: new Date().toISOString(),
    encryptedBytes: encrypted.length,
    sha256: checksum,
  }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  pruneBackups(backupDirectory, retentionDays, minimumCopies);
  process.stdout.write(`${JSON.stringify({ ok: true, outputPath, encryptedBytes: encrypted.length, sha256: checksum })}\n`);
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}

function pruneBackups(directory, days, keepAtLeast) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const backups = fs.readdirSync(directory)
    .filter((name) => /^huishi-\d{4}-\d{2}-\d{2}T.*\.sqlite\.aesgcm$/.test(name))
    .map((name) => ({ name, path: path.join(directory, name), time: fs.statSync(path.join(directory, name)).mtimeMs }))
    .sort((left, right) => right.time - left.time);
  backups.slice(keepAtLeast).filter((item) => item.time < cutoff).forEach((item) => {
    fs.rmSync(item.path, { force: true });
    fs.rmSync(`${item.path}.json`, { force: true });
  });
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

function clampInteger(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
