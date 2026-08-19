const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const { AuthError, createAuthService, handleAuthRequest, isValidChineseIdChecksum, normalizePhone } = require("../auth");

let service;
let dbPath;
let testDirectory;
let currentTime = Date.UTC(2026, 7, 14, 12, 0, 0);
const sentCodes = new Map();

before(() => {
  testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "huishi-auth-"));
  dbPath = path.join(testDirectory, "users.sqlite");
  service = createAuthService({
    dbPath,
    secret: "test-secret-with-more-than-thirty-two-characters",
    now: () => currentTime,
    environment: {
      NODE_ENV: "test",
      IDENTITY_VERIFICATION_REQUIRED: "true",
    },
    smsProvider: {
      ready: true,
      async send({ phone, code, purpose }) {
        sentCodes.set(`${phone}:${purpose}`, code);
      },
    },
    identityProvider: {
      name: "test-provider",
      ready: true,
      async verify() {
        return { verified: true, reference: "test-reference" };
      },
    },
  });
});

after(() => {
  service?.close();
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

test("phone and Chinese ID validation reject malformed values", () => {
  assert.equal(normalizePhone("+86 138-0013-8000"), "13800138000");
  assert.throws(() => normalizePhone("123"), (error) => error instanceof AuthError && error.code === "invalid_phone");
  assert.equal(isValidChineseIdChecksum("11010519491231002X"), true);
  assert.equal(isValidChineseIdChecksum("110105194912310021"), false);
});

test("registration stores hashes and defers role, nickname, and identity until after signup", async () => {
  const phone = "13800138000";
  await service.requestSms({ phone, purpose: "register", ipAddress: "127.0.0.1" });
  const result = await service.register({
    phone,
    code: sentCodes.get(`${phone}:register`),
    password: "meal-safe-2026",
  }, { ipAddress: "127.0.0.1", userAgent: "test" });

  assert.equal(result.user.nickname, "");
  assert.equal(result.user.onboardingComplete, false);
  assert.equal(result.user.phone, "138****8000");
  assert.equal(result.user.identityStatus, "unverified");
  assert.equal(service.getSession(result.token).user.id, result.user.id);

  const roleUser = service.updateRole(result.user.id, { role: "family" });
  assert.equal(roleUser.role, "family");
  assert.equal(roleUser.onboardingComplete, true);
  const profileUser = service.updateProfile(result.user.id, { nickname: "王阿姨" });
  assert.equal(profileUser.nickname, "王阿姨");
  const verifiedUser = await service.verifyCurrentIdentity(result.user.id, {
    realName: "王敏",
    idNumber: "11010519491231002X",
  });
  assert.equal(verifiedUser.identityStatus, "verified");

  const db = new DatabaseSync(dbPath, { readOnly: true });
  const stored = db.prepare("SELECT * FROM users WHERE id = ?").get(result.user.id);
  db.close();
  assert.notEqual(stored.password_hash, "meal-safe-2026");
  assert.notEqual(stored.password_salt, "");
  assert.equal(stored.identity_name_masked, "王*");
  assert.doesNotMatch(JSON.stringify(stored), /11010519491231002X/);
});

test("SMS codes are single-use and requests are throttled", async () => {
  const phone = "13900139000";
  await service.requestSms({ phone, purpose: "register", ipAddress: "127.0.0.2" });
  await assert.rejects(
    service.requestSms({ phone, purpose: "register", ipAddress: "127.0.0.2" }),
    (error) => error.code === "sms_too_frequent",
  );
  currentTime += 61_000;
  await service.requestSms({ phone, purpose: "register", ipAddress: "127.0.0.2" });
  const code = sentCodes.get(`${phone}:register`);
  await service.register({
    phone,
    code,
    password: "safe-password-139",
  });
  await assert.rejects(
    service.register({
      phone: "13700137000",
      code,
      password: "safe-password-137",
    }),
    (error) => ["sms_code_expired", "invalid_sms_code"].includes(error.code),
  );
});

test("password reset rejects the old password and invalidates previous sessions", async () => {
  const phone = "13800138000";
  const login = service.login({ phone, password: "meal-safe-2026" }, { ipAddress: "127.0.0.1", userAgent: "test" });
  assert.ok(service.getSession(login.token));
  assert.throws(
    () => service.login({ phone, password: "wrong-password" }),
    (error) => error.code === "invalid_credentials",
  );

  currentTime += 61_000;
  await service.requestPasswordReset({ phone }, { ipAddress: "127.0.0.1" });
  service.resetPassword({
    phone,
    code: sentCodes.get(`${phone}:password_reset`),
    password: "new-meal-safe-2026",
  });
  assert.equal(service.getSession(login.token), null);
  assert.throws(
    () => service.login({ phone, password: "meal-safe-2026" }),
    (error) => error.code === "invalid_credentials",
  );
  assert.equal(service.login({ phone, password: "new-meal-safe-2026" }).user.nickname, "王阿姨");
});

test("HTTP auth handler issues a secure cookie and restores the session", async () => {
  const phone = "13600136000";
  currentTime += 61_000;
  await service.requestSms({ phone, purpose: "register", ipAddress: "127.0.0.3" });
  const register = await callAuthHandler("/api/auth/register", "POST", {
    phone,
    code: sentCodes.get(`${phone}:register`),
    password: "safe-password-136",
  }, { "x-forwarded-proto": "https" });
  assert.equal(register.status, 201);
  assert.match(register.headers["Set-Cookie"], /^huishi_session=/);
  assert.match(register.headers["Set-Cookie"], /HttpOnly/);
  assert.match(register.headers["Set-Cookie"], /SameSite=Strict/);
  assert.match(register.headers["Set-Cookie"], /Secure/);

  const cookieHeaders = { cookie: register.headers["Set-Cookie"] };
  const role = await callAuthHandler("/api/auth/role", "POST", { role: "family" }, cookieHeaders);
  assert.equal(role.status, 200);
  assert.equal(role.body.user.role, "family");
  assert.equal(role.body.user.onboardingComplete, true);
  const profile = await callAuthHandler("/api/auth/profile", "POST", { nickname: "照护人" }, cookieHeaders);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.nickname, "照护人");

  const status = await callAuthHandler("/api/auth/status", "GET", undefined, {
    cookie: register.headers["Set-Cookie"],
  });
  assert.equal(status.status, 200);
  assert.equal(status.body.authenticated, true);
  assert.equal(status.body.user.nickname, "照护人");
});

test("family invite codes create a persistent relation and are single-use", () => {
  const elder = service.login({ phone: "13900139000", password: "safe-password-139" }).user;
  const family = service.login({ phone: "13600136000", password: "safe-password-136" }).user;
  service.updateRole(elder.id, { role: "elder" });
  service.updateRole(family.id, { role: "family" });
  service.updateProfile(elder.id, { nickname: "张叔" });

  const invite = service.createFamilyInvite(elder.id);
  assert.match(invite.code, /^\d{6}$/);
  assert.equal(invite.expiresIn, 600);
  const bound = service.bindFamily(family.id, { code: invite.code });
  assert.equal(bound.linked.length, 1);
  assert.equal(bound.linked[0].relationship, "elder");
  assert.equal(bound.linked[0].user.nickname, "张叔");
  assert.equal(service.getFamilyStatus(elder.id).linked[0].relationship, "family");
  assert.throws(
    () => service.bindFamily(family.id, { code: invite.code }),
    (error) => error.code === "family_code_expired",
  );

  const db = new DatabaseSync(dbPath, { readOnly: true });
  const storedInvite = db.prepare("SELECT code_hash FROM family_invites WHERE elder_user_id = ?").get(elder.id);
  db.close();
  assert.notEqual(storedInvite.code_hash, invite.code);

  const unbound = service.unbindFamily(family.id, { relationId: bound.linked[0].id });
  assert.equal(unbound.linked.length, 0);
  assert.equal(service.getFamilyStatus(elder.id).linked.length, 0);
});

test("development mode can register and reset without SMS while keeping phone unique", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "huishi-auth-dev-"));
  const devService = createAuthService({
    dbPath: path.join(directory, "users.sqlite"),
    secret: "development-test-secret-with-thirty-two-characters",
    environment: { NODE_ENV: "development", AUTH_DEV_MODE: "true" },
  });
  try {
    assert.equal(devService.getConfig().smsVerificationRequired, false);
    const registered = await devService.register({ phone: "13500135000", password: "dev-password-135" });
    assert.equal(registered.user.phone, "135****5000");
    await assert.rejects(
      devService.register({ phone: "13500135000", password: "another-password-135" }),
      (error) => error.code === "phone_already_registered",
    );
    devService.resetPassword({ phone: "13500135000", password: "reset-password-135" });
    assert.equal(devService.login({ phone: "13500135000", password: "reset-password-135" }).user.id, registered.user.id);
  } finally {
    devService.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

async function callAuthHandler(pathname, method, body, extraHeaders = {}) {
  const response = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
  };
  const request = {
    method,
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...extraHeaders },
    socket: { remoteAddress: "127.0.0.10" },
    testBody: body,
  };
  await handleAuthRequest(service, request, response, pathname, {
    readJsonBody: async (req) => req.testBody,
    sendJson(res, status, data) {
      res.status = status;
      res.body = data;
    },
  });
  return response;
}
