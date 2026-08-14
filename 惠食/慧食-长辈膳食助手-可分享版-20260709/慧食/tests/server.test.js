const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const {
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
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("only allowlisted frontend files are public", async () => {
  const home = await fetch(`${baseUrl}/`);
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-security-policy"), /default-src 'self'/);
  assert.equal(home.headers.get("x-frame-options"), "DENY");

  for (const pathname of ["/.env", "/server.js", "/README.md", "/assets/demo-meal.jpg"]) {
    const response = await fetch(`${baseUrl}${pathname}`);
    assert.equal(response.status, 404, pathname);
  }
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
    photoAnalysis: false,
    textAnalysis: false,
    speechRecognition: "browser",
  });
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
  assert.match(stylesSource, /html\.keyboard-open \.bottom-nav/);
});
