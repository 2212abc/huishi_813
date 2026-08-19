const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const target = path.resolve(process.argv[2] || "/etc/huishi/backup.key");
fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
fs.writeFileSync(target, crypto.randomBytes(32), { flag: "wx", mode: 0o600 });
process.stdout.write(`Backup key created at ${target}. Keep an offline copy; never commit it.\n`);
