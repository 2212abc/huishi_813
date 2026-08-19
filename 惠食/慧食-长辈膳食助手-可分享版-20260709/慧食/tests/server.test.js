const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const authTestDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "huishi-auth-api-"));
process.env.NODE_ENV = "test";
process.env.AUTH_DB_PATH = path.join(authTestDirectory, "users.sqlite");
process.env.AUTH_SECRET = "test-api-secret-with-more-than-thirty-two-characters";
const {
  closeAuthService,
  assertSafeRuntimeConfiguration,
  getServiceCapabilities,
  getLocalModelJsonContent,
  normalizeMealAnalysisJson,
  normalizeStatus,
  sanitizeProfile,
  server,
  validateAudioPayload,
  validateImagePayload,
} = require("../server");

let baseUrl;

before(async () => {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server.listening) {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  closeAuthService();
  fs.rmSync(authTestDirectory, { recursive: true, force: true });
});

test("only allowlisted frontend files are public", async () => {
  const home = await fetch(`${baseUrl}/`);
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-security-policy"), /default-src 'self'/);
  assert.equal(home.headers.get("x-frame-options"), "DENY");
  assert.ok(home.headers.get("x-request-id"));

  for (const pathname of ["/privacy.html", "/terms.html"]) {
    const response = await fetch(`${baseUrl}${pathname}`);
    assert.equal(response.status, 200, pathname);
  }

  for (const pathname of ["/.env", "/server.js", "/README.md", "/assets/demo-meal.jpg"]) {
    const response = await fetch(`${baseUrl}${pathname}`);
    assert.equal(response.status, 404, pathname);
  }
});

test("liveness and readiness distinguish process and database health", async () => {
  const liveness = await fetch(`${baseUrl}/healthz`);
  assert.equal(liveness.status, 200);
  assert.deepEqual(await liveness.json(), { ok: true, service: "huishi", status: "alive" });
  const readiness = await fetch(`${baseUrl}/readyz`);
  assert.equal(readiness.status, 200);
  assert.deepEqual(await readiness.json(), {
    ok: true,
    service: "huishi",
    status: "ready",
    checks: { database: "ok" },
  });
});

test("API rejects cross-origin requests before model access", async () => {
  const response = await fetch(`${baseUrl}/api/analyze-photo-meal`, {
    method: "OPTIONS",
    headers: { Origin: "https://attacker.example" },
  });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("status endpoint reports optional analysis capabilities without exposing configuration", async () => {
  const response = await fetch(`${baseUrl}/api/status`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    statusVersion: 2,
    photoAnalysis: false,
    textAnalysis: true,
    textModelAvailable: false,
    textAnalysisMode: "client-rules",
    speechRecognition: "browser",
    capabilities: {
      text: { available: true, mode: "client-rules" },
      photo: { available: false, mode: "disabled", reason: "provider_not_configured" },
      speechInput: { available: true, mode: "browser", secureContextRequired: true },
      speechOutput: { available: true, mode: "browser" },
    },
  });
  assert.deepEqual(getServiceCapabilities().capabilities.photo, {
    available: false,
    mode: "disabled",
    reason: "provider_not_configured",
  });
});

test("auth status is anonymous and never exposes server secrets", async () => {
  const response = await fetch(`${baseUrl}/api/auth/status`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.authenticated, false);
  assert.equal(body.user, null);
  assert.deepEqual(body.config, {
    smsReady: false,
    smsMode: "disabled",
    smsVerificationRequired: false,
    registrationSmsRequired: false,
    passwordResetSmsRequired: true,
    passwordResetAvailable: false,
    testMode: true,
    identityReady: false,
    identityRequired: false,
    privacyVersion: "2026-08-19",
    termsVersion: "2026-08-19",
  });
  assert.doesNotMatch(JSON.stringify(body), /test-api-secret/);
});

test("auth mutations require JSON and validate phone numbers", async () => {
  const wrongContentType = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", body: "phone=13800138000" });
  assert.equal(wrongContentType.status, 415);

  const invalidPhone = await fetch(`${baseUrl}/api/auth/sms/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "123", purpose: "register" }),
  });
  assert.equal(invalidPhone.status, 400);
  assert.equal((await invalidPhone.json()).error, "invalid_phone");
});

test("unsafe public and production runtime configurations fail before startup", () => {
  assert.doesNotThrow(() => assertSafeRuntimeConfiguration({
    NODE_ENV: "development",
    HOST: "127.0.0.1",
    AUTH_DEV_MODE: "true",
  }));
  assert.throws(
    () => assertSafeRuntimeConfiguration({ NODE_ENV: "development", HOST: "0.0.0.0", AUTH_DEV_MODE: "true" }),
    (error) => error.code === "UNSAFE_RUNTIME_CONFIGURATION" && /PUBLIC_PILOT_ACKNOWLEDGED/.test(error.message),
  );
  assert.doesNotThrow(() => assertSafeRuntimeConfiguration({
    NODE_ENV: "development",
    HOST: "0.0.0.0",
    AUTH_DEV_MODE: "true",
    PUBLIC_PILOT_ACKNOWLEDGED: "true",
  }));
  assert.throws(
    () => assertSafeRuntimeConfiguration({ NODE_ENV: "production", HOST: "0.0.0.0", AUTH_DEV_MODE: "true" }),
    (error) => error.code === "UNSAFE_RUNTIME_CONFIGURATION"
      && /AUTH_DEV_MODE/.test(error.message)
      && /COOKIE_SECURE/.test(error.message)
      && /SMS_PROVIDER/.test(error.message),
  );
  assert.doesNotThrow(() => assertSafeRuntimeConfiguration({
    NODE_ENV: "production",
    HOST: "0.0.0.0",
    AUTH_DEV_MODE: "false",
    AUTH_SECRET: "production-secret-with-at-least-32-characters",
    AUTH_DB_PATH: "/var/lib/huishi/huishi.sqlite",
    COOKIE_SECURE: "true",
    TRUST_PROXY: "true",
    SMS_PROVIDER: "webhook",
    SMS_WEBHOOK_URL: "https://sms.example.test/send",
    ALLOW_PHOTO_DISABLED: "true",
    PUBLIC_BASE_URL: "https://huishi123.cn",
    LEGAL_DOCUMENTS_APPROVED: "true",
    LEGAL_OPERATOR_NAME: "Huishi Test Operator",
    LEGAL_CONTACT: "privacy@example.test",
  }));
});

test("AI status and confidence normalization fail closed", () => {
  assert.equal(normalizeStatus("maybe"), "unclear");
  assert.equal(normalizeStatus("food"), "food");
  assert.equal(normalizeStatus("success"), "food");

  const result = normalizeMealAnalysisJson(JSON.stringify({
    status: "food",
    foods: [
      { name: "米饭", confidence: 0.59 },
      { name: "青菜", confidence: 0.8 },
      { name: "肉" },
    ],
  }));
  assert.deepEqual(result.foods.map((food) => food.name), ["青菜"]);

  const noReliableFoods = normalizeMealAnalysisJson(JSON.stringify({
    status: "food",
    foods: [{ name: "米饭", confidence: 0.4 }],
  }));
  assert.equal(noReliableFoods.status, "unclear");

  const notFood = normalizeMealAnalysisJson(JSON.stringify({ status: "food", isFoodPhoto: false }));
  assert.equal(notFood.status, "not-food");
});

test("local model JSON falls back to Ollama reasoning output", () => {
  assert.equal(getLocalModelJsonContent({ content: '{"status":"food"}' }), '{"status":"food"}');
  assert.equal(
    getLocalModelJsonContent({ content: "", reasoning: '{"status":"unclear"}' }),
    '{"status":"unclear"}',
  );
  assert.equal(
    getLocalModelJsonContent({ content: "", thinking: '{"status":"food"}' }),
    '{"status":"food"}',
  );
  assert.equal(getLocalModelJsonContent(null), "{}");
});

test("profile and image payloads are bounded", () => {
  assert.deepEqual(sanitizeProfile({ age: 8, allergies: ["花生", "虾"], personal: "x".repeat(400) }), {
    age: null,
    conditions: [],
    allergies: ["花生", "虾"],
    goals: [],
    personal: "x".repeat(300),
  });

  assert.doesNotThrow(() => validateImagePayload({ image: "AA==", mimeType: "image/jpeg" }));
  assert.throws(
    () => validateImagePayload({ image: "AA==", mimeType: "image/gif" }),
    (error) => error.status === 415 && error.code === "unsupported_image_type",
  );
});

test("speech audio payloads are type and size constrained", () => {
  const audio = validateAudioPayload({
    audio: Buffer.alloc(512, 1).toString("base64"),
    mimeType: "audio/webm;codecs=opus",
  });
  assert.equal(audio.extension, ".webm");
  assert.equal(audio.buffer.length, 512);
  assert.throws(
    () => validateAudioPayload({ audio: Buffer.alloc(512, 1).toString("base64"), mimeType: "audio/aac" }),
    (error) => error.status === 415 && error.code === "unsupported_audio_type",
  );
  assert.throws(
    () => validateAudioPayload({ audio: Buffer.alloc(64, 1).toString("base64"), mimeType: "audio/webm" }),
    (error) => error.status === 422 && error.code === "audio_too_short",
  );
});

test("voice remains the primary action while mobile recovery controls are shipped", () => {
  const appSource = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "app.js"), "utf8");
  const stylesSource = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "styles.css"), "utf8");
  assert.match(appSource, /window\.isSecureContext/);
  assert.match(appSource, /recordButton\.hidden = false/);
  assert.doesNotMatch(appSource, /recordButton\.setAttribute\("aria-disabled"/);
  assert.match(appSource, /MediaRecorder/);
  assert.match(appSource, /\/api\/transcribe-speech/);
  assert.match(appSource, /文字输入仅作备用/);
  assert.match(appSource, /data-photo-retry/);
  assert.match(appSource, /data-photo-to-text/);
  assert.match(appSource, /serviceStatus\.textModelAvailable/);
  assert.match(appSource, /所选照片不会上传/);
  assert.match(stylesSource, /html\.keyboard-open \.bottom-nav/);
});
