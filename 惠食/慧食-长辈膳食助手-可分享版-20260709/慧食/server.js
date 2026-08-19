const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { createAuthService, handleAuthRequest } = require("./auth");

const ROOT = __dirname;
loadEnvFile();

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8787);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_PHOTO_MEAL_MODEL = process.env.OPENAI_PHOTO_MEAL_MODEL || "gpt-4o";
const OMNI_API_KEY = process.env.OMINIGATE_API_KEY || process.env.OMNIGATE_API_KEY;
const OMNI_BASE_URL = process.env.OMINIGATE_BASE_URL || process.env.OMNIGATE_BASE_URL || "https://api.ominigate.ai/v1";
const OMNI_TEXT_MODEL = process.env.OMINIGATE_TEXT_MODEL || process.env.OMNIGATE_TEXT_MODEL || "openai/gpt-4o-mini";
const OMNI_VISION_MODEL = process.env.OMINIGATE_VISION_MODEL || process.env.OMNIGATE_VISION_MODEL || "openai/gpt-4o";
const OMNI_PHOTO_MEAL_MODEL = process.env.OMINIGATE_PHOTO_MEAL_MODEL || process.env.OMNIGATE_PHOTO_MEAL_MODEL || OMNI_VISION_MODEL;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_PHOTO_MEAL_MODEL = process.env.OPENROUTER_PHOTO_MEAL_MODEL || "google/gemma-4-26b-a4b-it:free";
const LOCAL_MODEL_BASE_URL = process.env.LOCAL_MODEL_BASE_URL || "";
const LOCAL_MODEL = process.env.LOCAL_MODEL || "qwen3-vl:8b";
const WHISPER_COMMAND = process.env.WHISPER_COMMAND || "";
const WHISPER_MODEL = process.env.WHISPER_MODEL || "";
const WHISPER_LIBRARY_PATH = process.env.WHISPER_LIBRARY_PATH || "";
const FFMPEG_COMMAND = process.env.FFMPEG_COMMAND || "/usr/bin/ffmpeg";
const execFileAsync = promisify(execFile);
const AUTH_API_PATHS = new Set([
  "/api/auth/status",
  "/api/auth/me",
  "/api/auth/sms/request",
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/password-reset/request",
  "/api/auth/password-reset/confirm",
  "/api/auth/role",
  "/api/auth/profile",
  "/api/auth/health-data",
  "/api/auth/health-profile",
  "/api/auth/health-import",
  "/api/auth/meal-record",
  "/api/auth/meal-handled",
  "/api/auth/family/status",
  "/api/auth/family/invite",
  "/api/auth/family/bind",
  "/api/auth/family/unbind",
  "/api/auth/family/permissions",
  "/api/auth/identity/verify",
]);
const API_PATHS = new Set([
  "/api/status",
  "/api/transcribe-speech",
  "/api/analyze-photo",
  "/api/analyze-voice-meal",
  "/api/analyze-photo-meal",
  ...AUTH_API_PATHS,
]);
const PUBLIC_FILES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/app.js", "app.js"],
  ["/styles.css", "styles.css"],
  ["/assets/logo.png", path.join("assets", "logo.png")],
]);
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = Number(process.env.API_RATE_LIMIT || 30);
const TRUST_PROXY = ["1", "true", "yes", "on"].includes(String(process.env.TRUST_PROXY || "").toLowerCase());
const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 18_000);
const rateLimits = new Map();
let activeTranscriptions = 0;
let authService = null;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res);
  let pathname;
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    pathname = decodeURIComponent(url.pathname);
  } catch {
    sendJson(res, 400, { error: "invalid_request", message: "请求地址无效。" });
    return;
  }

  if (API_PATHS.has(pathname)) {
    if (!isSameOriginRequest(req)) {
      sendJson(res, 403, { error: "origin_not_allowed", message: "请求来源不受信任。" });
      return;
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (!consumeRateLimit(req)) {
      res.setHeader("Retry-After", "60");
      sendJson(res, 429, { error: "rate_limited", message: "请求过于频繁，请稍后再试。" });
      return;
    }
    if (AUTH_API_PATHS.has(pathname)) {
      try {
        await handleAuthRequest(getAuthService(), req, res, pathname, { getClientIp, sendJson, readJsonBody });
      } catch (error) {
        process.stderr.write(`[auth_startup] ${String(error?.message || error).slice(0, 180)}\n`);
        sendJson(res, 503, { error: "auth_not_configured", message: "账号服务正在配置，请稍后再试。" });
      }
      return;
    }
    if (pathname === "/api/status") handleStatus(req, res);
    if (pathname === "/api/transcribe-speech") await handleTranscribeSpeech(req, res);
    if (pathname === "/api/analyze-photo") await handleAnalyzePhoto(req, res);
    if (pathname === "/api/analyze-voice-meal") await handleAnalyzeVoiceMeal(req, res);
    if (pathname === "/api/analyze-photo-meal") await handleAnalyzePhotoMeal(req, res);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "method_not_allowed", message: "请求方法不受支持。" });
    return;
  }
  const publicPath = PUBLIC_FILES.get(pathname);
  if (!publicPath) {
    sendJson(res, 404, { error: "not_found", message: "页面不存在。" });
    return;
  }
  const filePath = path.join(ROOT, publicPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendJson(res, 404, { error: "not_found", message: "页面不存在。" });
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream" });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
});

if (require.main === module) {
  try {
    startServer();
  } catch (error) {
    process.stderr.write(`[startup_blocked] ${String(error?.message || error)}\n`);
    process.exitCode = 1;
  }
}

function startServer() {
  assertSafeRuntimeConfiguration(process.env);
  getAuthService();
  return server.listen(PORT, HOST, () => {
    const displayHost = HOST === "0.0.0.0" ? "127.0.0.1" : HOST;
    process.stdout.write(`HuiShi UI preview running at http://${displayHost}:${PORT}\n`);
  });
}

function assertSafeRuntimeConfiguration(environment = process.env) {
  const nodeEnv = String(environment.NODE_ENV || "development").toLowerCase();
  const host = String(environment.HOST || "127.0.0.1").trim().toLowerCase();
  const production = nodeEnv === "production";
  const configuredDevMode = parseEnvBoolean(environment.AUTH_DEV_MODE, nodeEnv !== "production");
  const devMode = nodeEnv !== "production" && configuredDevMode;
  const errors = [];
  const port = Number(environment.PORT || 8787);
  const rateLimit = Number(environment.API_RATE_LIMIT || 30);
  const upstreamTimeout = Number(environment.UPSTREAM_TIMEOUT_MS || 18_000);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) errors.push("PORT must be an integer between 1 and 65535");
  if (!Number.isInteger(rateLimit) || rateLimit < 1 || rateLimit > 10_000) errors.push("API_RATE_LIMIT must be an integer between 1 and 10000");
  if (!Number.isFinite(upstreamTimeout) || upstreamTimeout < 1_000 || upstreamTimeout > 120_000) errors.push("UPSTREAM_TIMEOUT_MS must be between 1000 and 120000");

  if (!isLoopbackHost(host) && devMode && !parseEnvBoolean(environment.PUBLIC_PILOT_ACKNOWLEDGED, false)) {
    errors.push("public password-only registration requires PUBLIC_PILOT_ACKNOWLEDGED=true");
  }

  if (production) {
    if (configuredDevMode) errors.push("AUTH_DEV_MODE must be false in production");
    if (String(environment.AUTH_SECRET || "").length < 32) errors.push("AUTH_SECRET must contain at least 32 characters in production");
    if (environment.COOKIE_SECURE !== "true") errors.push("COOKIE_SECURE must be true in production");
    if (!parseEnvBoolean(environment.TRUST_PROXY, false)) errors.push("TRUST_PROXY must be true behind the production HTTPS proxy");
    if (!environment.AUTH_DB_PATH || !path.isAbsolute(environment.AUTH_DB_PATH)) errors.push("AUTH_DB_PATH must be an absolute path in production");
    if (String(environment.SMS_PROVIDER || "").toLowerCase() !== "webhook" || !isHttpsUrl(environment.SMS_WEBHOOK_URL)) {
      errors.push("production registration and password recovery require SMS_PROVIDER=webhook with an HTTPS SMS_WEBHOOK_URL");
    }
    if (parseEnvBoolean(environment.IDENTITY_VERIFICATION_REQUIRED, false)
      && (String(environment.IDENTITY_PROVIDER || "").toLowerCase() !== "webhook" || !isHttpsUrl(environment.IDENTITY_WEBHOOK_URL))) {
      errors.push("required identity verification needs IDENTITY_PROVIDER=webhook with an HTTPS IDENTITY_WEBHOOK_URL");
    }
    if (!parseEnvBoolean(environment.ALLOW_PHOTO_DISABLED, false) && !hasConfiguredPhotoProvider(environment)) {
      errors.push("production requires a photo analysis provider unless ALLOW_PHOTO_DISABLED=true");
    }
    if (parseEnvBoolean(environment.REQUIRE_SERVER_SPEECH, false) && !hasConfiguredSpeechProvider(environment)) {
      errors.push("REQUIRE_SERVER_SPEECH=true needs valid WHISPER_COMMAND, WHISPER_MODEL, and FFMPEG_COMMAND files");
    }
  }

  if (errors.length) {
    const error = new Error(`Unsafe runtime configuration:\n- ${errors.join("\n- ")}`);
    error.code = "UNSAFE_RUNTIME_CONFIGURATION";
    throw error;
  }
  return { nodeEnv, host, production };
}

function isLoopbackHost(host) {
  return host === "localhost" || host === "::1" || host === "[::1]" || /^127(?:\.\d{1,3}){3}$/.test(host);
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function parseEnvBoolean(value, fallback) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function hasConfiguredPhotoProvider(environment) {
  return Boolean(
    environment.LOCAL_MODEL_BASE_URL
    || environment.OPENAI_API_KEY
    || environment.OPENROUTER_API_KEY
    || environment.OMINIGATE_API_KEY
    || environment.OMNIGATE_API_KEY,
  );
}

function hasConfiguredSpeechProvider(environment) {
  const ffmpeg = environment.FFMPEG_COMMAND || "/usr/bin/ffmpeg";
  return Boolean(
    environment.WHISPER_COMMAND && environment.WHISPER_MODEL
    && fs.existsSync(environment.WHISPER_COMMAND)
    && fs.existsSync(environment.WHISPER_MODEL)
    && fs.existsSync(ffmpeg)
  );
}

function getAuthService() {
  if (!authService) authService = createAuthService();
  return authService;
}

function closeAuthService() {
  if (!authService) return;
  authService.close();
  authService = null;
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function setSecurityHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data: blob:; connect-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=(self)");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
}

function isSameOriginRequest(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers.host;
  return origin === `http://${host}` || origin === `https://${host}`;
}

function consumeRateLimit(req) {
  const now = Date.now();
  const key = getClientIp(req);
  const current = rateLimits.get(key);
  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= RATE_LIMIT_MAX;
}

function getClientIp(req) {
  if (TRUST_PROXY) {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (forwarded && forwarded.length <= 64) return forwarded;
  }
  return req.socket.remoteAddress || "unknown";
}

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function sendApiError(res, error, fallbackCode) {
  if (error instanceof HttpError) {
    sendJson(res, error.status, { error: error.code, message: error.message });
    return;
  }
  if (error?.name === "AbortError") {
    sendJson(res, 504, { error: "upstream_timeout", message: "分析超时，请稍后重试。" });
    return;
  }
  process.stderr.write(`[${fallbackCode}] ${String(error?.message || error).slice(0, 200)}\n`);
  sendJson(res, 502, { error: fallbackCode, message: "分析服务暂时不可用，请稍后重试。" });
}

function loadEnvFile() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separator = trimmed.indexOf("=");
    if (separator === -1) return;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] == null) process.env[key] = value;
  });
}

async function handleAnalyzePhoto(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  if (!OMNI_API_KEY) {
    sendJson(res, 503, { error: "Vision model is not configured" });
    return;
  }
  try {
    const body = await readJsonBody(req, 8 * 1024 * 1024);
    if (!body.image || typeof body.image !== "string") {
      sendJson(res, 400, { error: "Missing image" });
      return;
    }
    validateImagePayload(body);
    const result = await callVisionModel(body.image, sanitizeProfile(body.profile));
    sendJson(res, 200, result);
  } catch (error) {
    sendApiError(res, error, "vision_analysis_failed");
  }
}

async function handleAnalyzeVoiceMeal(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  if (!LOCAL_MODEL_BASE_URL && !OMNI_API_KEY) {
    sendJson(res, 503, { error: "meal_model_not_configured", message: "文字分析服务正在准备中，请稍后再试。" });
    return;
  }
  try {
    const body = await readJsonBody(req, 512 * 1024);
    const text = String(body.text || "").trim();
    if (!text) {
      sendJson(res, 400, { error: "Missing meal text", message: "请先输入或说出这一餐吃了什么。" });
      return;
    }
    const result = LOCAL_MODEL_BASE_URL
      ? await callLocalMealModel(text.slice(0, 500), sanitizeProfile(body.profile))
      : await callVoiceMealModel(text.slice(0, 500), sanitizeProfile(body.profile));
    sendJson(res, 200, result);
  } catch (error) {
    sendApiError(res, error, "voice_analysis_failed");
  }
}

async function handleTranscribeSpeech(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed", message: "请求方法不受支持。" });
    return;
  }
  if (!isSpeechTranscriptionConfigured()) {
    sendJson(res, 503, { error: "speech_model_not_configured", message: "语音转写服务正在准备中。" });
    return;
  }
  if (activeTranscriptions >= 1) {
    res.setHeader("Retry-After", "8");
    sendJson(res, 429, { error: "speech_busy", message: "正在听另一段语音，请稍后再说一次。" });
    return;
  }
  activeTranscriptions += 1;
  try {
    const body = await readJsonBody(req, 7 * 1024 * 1024);
    const audio = validateAudioPayload(body);
    const text = await transcribeSpeechAudio(audio);
    if (!text) {
      sendJson(res, 422, { error: "speech_unclear", message: "没有听清楚，请靠近手机再说一次。" });
      return;
    }
    sendJson(res, 200, { text });
  } catch (error) {
    sendApiError(res, error, "speech_transcription_failed");
  } finally {
    activeTranscriptions -= 1;
  }
}

async function handleAnalyzePhotoMeal(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  if (!LOCAL_MODEL_BASE_URL && !OPENAI_API_KEY && !OPENROUTER_API_KEY && !OMNI_API_KEY) {
    sendJson(res, 503, { error: "photo_model_not_configured", message: "照片识别服务正在准备中，请稍后再试。" });
    return;
  }
  try {
    const body = await readJsonBody(req, 8 * 1024 * 1024);
    if (!body.image || typeof body.image !== "string") {
      sendJson(res, 400, { error: "Missing image", message: "请先上传饭菜照片。" });
      return;
    }
    validateImagePayload(body);
    const result = await callPhotoMealModel(body.image, body.mimeType || "image/jpeg", sanitizeProfile(body.profile));
    sendJson(res, 200, result);
  } catch (error) {
    sendApiError(res, error, "photo_meal_analysis_failed");
  }
}

function handleStatus(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "method_not_allowed", message: "请求方法不受支持。" });
    return;
  }
  const payload = getServiceCapabilities();
  if (req.method === "HEAD") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end();
    return;
  }
  sendJson(res, 200, payload);
}

function getServiceCapabilities() {
  const textModelMode = LOCAL_MODEL_BASE_URL ? "local-model" : OMNI_API_KEY ? "cloud-model" : "client-rules";
  const photoMode = LOCAL_MODEL_BASE_URL
    ? "local-model"
    : OPENAI_API_KEY ? "openai-compatible"
      : OPENROUTER_API_KEY ? "openrouter"
        : OMNI_API_KEY ? "cloud-model" : "disabled";
  const serverSpeech = isSpeechTranscriptionConfigured();
  const photoAnalysis = photoMode !== "disabled";
  const textModelAvailable = textModelMode !== "client-rules";
  return {
    ok: true,
    statusVersion: 2,
    photoAnalysis,
    textAnalysis: true,
    textModelAvailable,
    textAnalysisMode: textModelMode,
    speechRecognition: serverSpeech ? "server" : "browser",
    capabilities: {
      text: { available: true, mode: textModelMode },
      photo: { available: photoAnalysis, mode: photoMode, reason: photoAnalysis ? null : "provider_not_configured" },
      speechInput: { available: true, mode: serverSpeech ? "server" : "browser", secureContextRequired: true },
      speechOutput: { available: true, mode: "browser" },
    },
  };
}

function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
      reject(new HttpError(415, "unsupported_media_type", "请求必须使用 JSON 格式。"));
      return;
    }
    const declaredSize = Number(req.headers["content-length"] || 0);
    if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
      reject(new HttpError(413, "payload_too_large", "上传内容过大。"));
      return;
    }
    let size = 0;
    let raw = "";
    let tooLarge = false;
    req.on("data", (chunk) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > maxBytes) {
        tooLarge = true;
        raw = "";
        return;
      }
      raw += chunk;
    });
    req.on("end", () => {
      if (tooLarge) {
        reject(new HttpError(413, "payload_too_large", "上传内容过大。"));
        return;
      }
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        reject(new HttpError(400, "invalid_json", "请求内容不是有效 JSON。"));
      }
    });
    req.on("error", reject);
  });
}

function validateImagePayload(body) {
  if (!body.image || typeof body.image !== "string") {
    throw new HttpError(400, "missing_image", "请先上传饭菜照片。");
  }
  const mimeType = String(body.mimeType || "image/jpeg").toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    throw new HttpError(415, "unsupported_image_type", "仅支持 JPG、PNG 或 WebP 图片。");
  }
  if (body.image.length > 7_500_000) {
    throw new HttpError(413, "image_too_large", "图片过大，请选择较小的照片。");
  }
}

function validateAudioPayload(body) {
  if (!body.audio || typeof body.audio !== "string") {
    throw new HttpError(400, "missing_audio", "没有收到语音，请再说一次。");
  }
  const mimeType = String(body.mimeType || "audio/webm").toLowerCase().split(";")[0];
  const extensions = {
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/mp4": ".m4a",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/x-m4a": ".m4a",
  };
  const extension = extensions[mimeType];
  if (!extension) throw new HttpError(415, "unsupported_audio_type", "当前录音格式不受支持，请换用系统浏览器。 ");
  const encoded = body.audio.startsWith("data:") ? body.audio.slice(body.audio.indexOf(",") + 1) : body.audio;
  const buffer = Buffer.from(encoded, "base64");
  if (buffer.length < 256) throw new HttpError(422, "audio_too_short", "录音太短，请说完整一句话。 ");
  if (buffer.length > 5 * 1024 * 1024) throw new HttpError(413, "audio_too_large", "录音过长，请在十秒内说完。 ");
  return { buffer, extension };
}

function isSpeechTranscriptionConfigured() {
  return Boolean(
    WHISPER_COMMAND && WHISPER_MODEL
    && fs.existsSync(WHISPER_COMMAND)
    && fs.existsSync(WHISPER_MODEL)
    && fs.existsSync(FFMPEG_COMMAND)
  );
}

async function transcribeSpeechAudio({ buffer, extension }) {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "huishi-speech-"));
  const inputPath = path.join(tempDir, `input${extension}`);
  const wavPath = path.join(tempDir, "audio.wav");
  const outputBase = path.join(tempDir, "transcript");
  try {
    await fs.promises.writeFile(inputPath, buffer, { mode: 0o600 });
    await execFileAsync(FFMPEG_COMMAND, [
      "-hide_banner", "-loglevel", "error", "-y", "-i", inputPath,
      "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wavPath,
    ], { timeout: 15_000, maxBuffer: 512 * 1024 });
    await execFileAsync(WHISPER_COMMAND, [
      "-m", WHISPER_MODEL, "-f", wavPath, "-l", "zh", "-t", "4",
      "-np", "-nt", "-sns", "-otxt", "-of", outputBase,
      "--prompt", "长辈饮食记录：米饭、面条、鸡蛋、青菜、豆腐、鱼、肉、汤。",
    ], {
      timeout: 30_000,
      maxBuffer: 2 * 1024 * 1024,
      env: {
        ...process.env,
        LD_LIBRARY_PATH: [WHISPER_LIBRARY_PATH, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":"),
      },
    });
    const text = await fs.promises.readFile(`${outputBase}.txt`, "utf8");
    return text.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim().slice(0, 500);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

function sanitizeProfile(profile = {}) {
  const source = profile && typeof profile === "object" ? profile : {};
  const cleanList = (value, limit = 10) => Array.isArray(value)
    ? value.map((item) => String(item).trim().slice(0, 40)).filter(Boolean).slice(0, limit)
    : [];
  const age = Number(source.age);
  return {
    age: Number.isFinite(age) && age >= 45 && age <= 110 ? age : null,
    conditions: cleanList(source.conditions),
    allergies: cleanList(source.allergies),
    goals: cleanList(source.goals),
    personal: String(source.personal || "").trim().slice(0, 300),
  };
}

async function callVoiceMealModel(text, profile) {
  const endpoint = `${OMNI_BASE_URL.replace(/\/$/, "")}/chat/completions`;
  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OMNI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OMNI_TEXT_MODEL,
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "你是慧食长辈膳食助手的语音/文字餐食分析模块。",
            "只输出 JSON，不输出 Markdown。",
            "先判断用户输入是否为饮食记录；如果不是饮食记录，status=not-meal，foods=[]，message 用一句中文提示重新输入吃了什么。",
            "如果是饮食记录，请抽取食物、份量，并结合健康档案、慢病、过敏、不耐受、目标和特殊情况给出红黄绿判断。",
            "红色只用于过敏黑名单、明确严重禁忌或明显高风险；黄色用于需要少吃或调整；绿色用于整体稳妥。",
            "不要使用置信度、模型等老人难懂词。建议必须具体可执行。",
            "JSON 字段：status:'food|unclear|not-meal', message:string, foods:[{name:string, alias:string, confidence:number, portion:string, salt:number, carb:string, tags:string[]}], level:'red|yellow|green', title:string, safety:string, nutrition:string, advice:string, basis:string。",
          ].join(""),
        },
        {
          role: "user",
          content: `健康档案：${JSON.stringify(profile)}\n用户说：${text}`,
        },
      ],
    }),
  });
  if (!response.ok) {
    const detail = await readUpstreamError(response);
    throw new Error(`Meal API returned ${response.status}${detail}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  return normalizeMealAnalysisJson(content, { defaultStatus: "food" });
}

async function callLocalMealModel(text, profile) {
  const endpoint = getLocalModelChatEndpoint();
  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LOCAL_MODEL,
      stream: false,
      think: false,
      format: "json",
      options: { temperature: 0.1, num_predict: 700 },
      messages: [
        {
          role: "system",
          content: [
            "你是慧食长辈膳食助手的文字餐食分析模块，只输出一个合法 JSON 对象，不输出 Markdown。",
            "先判断用户输入是否在描述饭菜或询问某种食物能不能吃。无关内容返回 status=not-meal、foods=[]。",
            "能识别饭菜时，列出明确出现的食物，不要编造；每项必须填写 confidence、portion、salt、carb、tags。",
            "confidence 使用 0 到 1；不确定的食物不要输出。",
            "结合健康档案给出简短提醒，但不得降低过敏、慢病等安全红线。",
            "JSON 字段：status:'food|unclear|not-meal',message:string,foods:[{name:string,alias:string,confidence:number,portion:string,salt:number,carb:string,tags:string[]}],level:'red|yellow|green',title:string,safety:string,nutrition:string,advice:string,basis:string。",
          ].join(""),
        },
        {
          role: "user",
          content: `健康档案：${JSON.stringify(profile)}\n用户输入：${text}`,
        },
      ],
    }),
  }, 45_000);
  if (!response.ok) {
    const detail = await readUpstreamError(response);
    throw new Error(`Local meal API returned ${response.status}${detail}`);
  }
  const data = await response.json();
  const content = getLocalModelJsonContent(data.message);
  const result = normalizeMealAnalysisJson(content, { defaultStatus: "food" });
  result.provider = "local";
  result.model = LOCAL_MODEL;
  return result;
}

async function callPhotoMealModel(image, mimeType, profile) {
  const providerErrors = [];
  if (LOCAL_MODEL_BASE_URL) {
    try {
      return await callLocalPhotoMealModel(image, mimeType, profile);
    } catch (error) {
      providerErrors.push(`Local: ${String(error?.message || error).slice(0, 180)}`);
    }
  }
  if (OPENAI_API_KEY) {
    try {
      const result = await callDirectOpenAIPhotoMealModel(image, mimeType, profile);
      if (result.status !== "unclear" || (!OPENROUTER_API_KEY && !OMNI_API_KEY)) return result;
      providerErrors.push("OpenAI returned an unclear result");
    } catch (error) {
      providerErrors.push(`OpenAI: ${String(error?.message || error).slice(0, 180)}`);
    }
  }
  if (OPENROUTER_API_KEY) {
    try {
      const result = await callOpenRouterPhotoMealModel(image, mimeType, profile);
      if (result.status !== "unclear" || !OMNI_API_KEY) return result;
      providerErrors.push("OpenRouter returned an unclear result");
    } catch (error) {
      providerErrors.push(`OpenRouter: ${String(error?.message || error).slice(0, 180)}`);
    }
  }
  if (OMNI_API_KEY) {
    try {
      return await callOmniPhotoMealModel(image, mimeType, profile);
    } catch (error) {
      providerErrors.push(`OmniGate: ${String(error?.message || error).slice(0, 180)}`);
    }
  }
  throw new Error(providerErrors.join(" | ") || "No photo model is configured");
}

async function callLocalPhotoMealModel(image, mimeType, profile) {
  const endpoint = getLocalModelChatEndpoint();
  const imageData = image.startsWith("data:") ? image.slice(image.indexOf(",") + 1) : image;
  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LOCAL_MODEL,
      stream: false,
      think: false,
      format: "json",
      options: { temperature: 0.1, num_predict: 900 },
      messages: [
        {
          role: "system",
          content: [
            "你是慧食长辈膳食助手的饭菜照片识别模块，只输出一个合法 JSON 对象，不输出 Markdown。",
            "先判断图片是否为饭菜、餐盘、餐桌、食物包装或菜单。不是饭菜时返回 status=not-food、isFoodPhoto=false、foods=[]。",
            "能看清饭菜时只列出明确可辨认的食物，不要猜测遮挡或模糊部分。每项 confidence 必须是 0 到 1。",
            "结合健康档案给出简短、可执行的中文提醒，不得降低过敏、慢病等安全红线。",
            "JSON 字段：status:'food|unclear|not-food',isFoodPhoto:boolean,message:string,foods:[{name:string,alias:string,confidence:number,portion:string,caloriesPer100g:number,estimatedGrams:number,estimatedCalories:number,salt:number,carb:string,tags:string[]}],level:'red|yellow|green',title:string,safety:string,nutrition:string,advice:string,basis:string。",
          ].join(""),
        },
        {
          role: "user",
          content: `用户健康档案：${JSON.stringify(profile)}。请识别照片里的饭菜并给出适合长辈的提醒。`,
          images: [imageData],
        },
      ],
    }),
  }, 60_000);
  if (!response.ok) {
    const detail = await readUpstreamError(response);
    throw new Error(`Local photo API returned ${response.status}${detail}`);
  }
  const data = await response.json();
  const content = getLocalModelJsonContent(data.message);
  const result = normalizeMealAnalysisJson(content, { defaultStatus: "food", includeIsFoodPhoto: true });
  result.provider = "local";
  result.model = LOCAL_MODEL;
  return result;
}

async function callDirectOpenAIPhotoMealModel(image, mimeType, profile) {
  const endpoint = `${OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`;
  const imageUrl = image.startsWith("data:")
    ? image
    : `data:${mimeType || "image/jpeg"};base64,${image}`;
  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_PHOTO_MEAL_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "你是慧食长辈膳食助手的多模态饭菜识别模块。",
            "只输出 JSON，不输出 Markdown。",
            "你必须先判断图片是否为饭菜、餐盘、餐桌、食物包装或菜单。",
            "如果不是饭菜相关图片，返回 status=not-food,isFoodPhoto=false,foods=[]，message 用一句中文提示重新上传饭菜照片。",
            "如果像饭菜但看不清具体食物，返回 status=unclear,isFoodPhoto=true,foods=[]，message 提示拍近一点或用语音补充。",
            "如果能看清饭菜，请尽量详细列出所有看清的食物，不要硬猜看不清的部分；每项食物必须填写 0 到 1 的 confidence，无法确认时不要输出该食物。",
            "每个食物必须给出 caloriesPer100g、estimatedGrams、estimatedCalories、portion。",
            "结合健康档案中的疾病史、过敏史、不耐受和目标，输出简短、具体、可执行的饮食建议。",
            "JSON 字段：status:'food|unclear|not-food', isFoodPhoto:boolean, message:string, foods:[{name:string, alias:string,confidence:number,portion:string,caloriesPer100g:number,estimatedGrams:number,estimatedCalories:number,salt:number,carb:string,tags:string[]}], level:'red|yellow|green', title:string, safety:string, nutrition:string, advice:string, basis:string。",
          ].join(""),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `用户健康档案：${JSON.stringify(profile)}\n请识别图片中的饭菜并结合健康档案给出建议。`,
            },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          ],
        },
      ],
    }),
  }, 15_000);
  if (!response.ok) {
    const detail = await readUpstreamError(response);
    throw new Error(`OpenAI photo meal API returned ${response.status}${detail}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  const result = normalizeMealAnalysisJson(content, { defaultStatus: "food", includeIsFoodPhoto: true });
  result.provider = "openai";
  result.model = OPENAI_PHOTO_MEAL_MODEL;
  return result;
}

async function callOmniPhotoMealModel(image, mimeType, profile) {
  const endpoint = `${OMNI_BASE_URL.replace(/\/$/, "")}/chat/completions`;
  const imageUrl = image.startsWith("data:")
    ? image
    : `data:${mimeType || "image/jpeg"};base64,${image}`;
  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OMNI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OMNI_PHOTO_MEAL_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "你是慧食长辈膳食助手的饭菜照片识别与膳食分析模块。",
            "只输出 JSON，不输出 Markdown。",
            "第一步必须判断图片是否为饭菜、餐盘、餐桌或食物包装。",
            "如果不是饭菜相关图片，返回 status=not-food,isFoodPhoto=false,foods=[]，message 用老人听得懂的话提示重新上传饭菜照片。",
            "如果像饭菜但看不清具体食物，返回 status=unclear,isFoodPhoto=true,foods=[]，message 提示拍近一点或用语音补充。",
            "如果能看清饭菜，只列出看清的食物，不要硬猜；每项食物必须填写 0 到 1 的 confidence，无法确认时不要输出该食物。",
            "不要使用置信度、模型等老人难懂词。建议必须具体可执行。",
            "JSON 字段：status:'food|unclear|not-food', isFoodPhoto:boolean, message:string, foods:[{name:string, alias:string, confidence:number, portion:string, salt:number, carb:string, tags:string[]}], level:'red|yellow|green', title:string, safety:string, nutrition:string, advice:string, basis:string。",
          ].join(""),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `健康档案：${JSON.stringify(profile)}。请判断图片是否为饭菜照片，并给出适合长辈的大白话提醒。`,
            },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
  }, 9_000);
  if (!response.ok) {
    const detail = await readUpstreamError(response);
    throw new Error(`Photo meal API returned ${response.status}${detail}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  return normalizeMealAnalysisJson(content, { defaultStatus: "food", includeIsFoodPhoto: true });
}

async function callOpenRouterPhotoMealModel(image, mimeType, profile) {
  const endpoint = `${OPENROUTER_BASE_URL.replace(/\/$/, "")}/chat/completions`;
  const imageUrl = image.startsWith("data:")
    ? image
    : `data:${mimeType || "image/jpeg"};base64,${image}`;
  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://127.0.0.1",
      "X-Title": "HuiShi Elder Meal Assistant",
    },
    body: JSON.stringify({
      model: OPENROUTER_PHOTO_MEAL_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "你是慧食长辈膳食助手的饭菜照片识别模块，只输出一个合法 JSON 对象，不输出 Markdown。",
            "status 只能从 food、unclear、not-food 中选择一个；每个 JSON 键只能出现一次，严禁重复 status 或 foods。",
            "图片中有可辨认饭菜时必须选 food，并在 foods 中列出所有看清的食物；只有确实无法辨认时才选 unclear；与食物无关时选 not-food。",
            "status=food 时每项食物必须包含 name、alias、confidence、portion、caloriesPer100g、estimatedGrams、estimatedCalories、salt、carb、tags。confidence 是 0 到 1 的数字。",
            "status 不是 food 时 foods 必须是空数组。",
            "所有文本、食物名称、份量和建议必须使用简体中文，禁止输出英文句子。",
            "结合健康档案给出简短建议：红色只用于过敏或明确严重禁忌，黄色用于少吃或调整，绿色用于整体可吃。",
            "最终对象必须且只能包含：status、isFoodPhoto、message、foods、level、title、safety、nutrition、advice、basis。输出前检查没有重复键。",
          ].join(""),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `用户健康档案：${JSON.stringify(profile)}`,
                "请识别图片中的饭菜，列出每种食物的每100g热量和估算份量。",
                "再结合用户疾病史、过敏史，给出一句简略的饭前/饭后饮食建议。",
              ].join("\n"),
            },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
  }, 50_000);
  if (!response.ok) {
    const detail = await readUpstreamError(response);
    throw new Error(`OpenRouter photo meal API returned ${response.status}${detail}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  const result = normalizeMealAnalysisJson(content, { defaultStatus: "food", includeIsFoodPhoto: true });
  result.provider = "openrouter";
  result.model = OPENROUTER_PHOTO_MEAL_MODEL;
  return result;
}

async function callVisionModel(image, profile) {
  const endpoint = `${OMNI_BASE_URL.replace(/\/$/, "")}/chat/completions`;
  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OMNI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OMNI_VISION_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "你是长辈膳食助手的食物照片识别模块。",
            "只输出 JSON，不输出 Markdown。",
            "如果图片不是饭菜、餐盘、餐桌或食物包装，请返回 isFoodPhoto=false、foods=[]，并用一句中文说明请重新上传饭菜照片。",
            "如果是饭菜照片，只列出你能看清且置信度不低于0.6的常见食物。看不清就不要猜，不要为了给建议而编造米饭、青菜、肉类。",
            "如果只能确定像餐桌但看不清具体食物，请返回 isFoodPhoto=true、foods=[]，message说明请重拍或语音补充。",
            "JSON 字段：isFoodPhoto:boolean, message:string, foods:[{name:string, alias:string, confidence:number, portion:string}], warnings:string[], advice:string。",
          ].join(""),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `健康档案：${JSON.stringify(profile)}。请先判断是否为饭菜照片，再识别食物。`,
            },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    }),
  });
  if (!response.ok) {
    const detail = await readUpstreamError(response);
    throw new Error(`Vision API returned ${response.status}${detail}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  return normalizeVisionJson(content);
}

async function fetchWithTimeout(url, options, timeoutMs = UPSTREAM_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readUpstreamError(response) {
  try {
    const text = await response.text();
    const trimmed = text.replace(/\s+/g, " ").trim();
    return trimmed ? `: ${trimmed.slice(0, 300)}` : "";
  } catch {
    return "";
  }
}

function normalizeVisionJson(content) {
  const parsed = parseJsonObject(content);
  const foods = Array.isArray(parsed.foods)
    ? parsed.foods
        .filter((item) => item && typeof item.name === "string")
        .filter((item) => Number.isFinite(Number(item.confidence)) && Number(item.confidence) >= 0.6)
        .slice(0, 8)
        .map((item) => ({
          name: item.name,
          alias: item.alias || "",
          confidence: Number(item.confidence),
          portion: item.portion || "",
        }))
    : [];
  return {
    isFoodPhoto: Boolean(parsed.isFoodPhoto),
    message: parsed.message || (foods.length ? "已识别到饭菜。" : "没有看清具体饭菜，请重新上传。"),
    foods,
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 4) : [],
    advice: parsed.advice || "",
  };
}

function normalizeMealAnalysisJson(content, options = {}) {
  const parsed = parseJsonObject(content);
  const cards = Array.isArray(parsed.cards)
    ? parsed.cards
        .filter((card) => card && typeof card === "object")
        .slice(0, 4)
        .map((card) => ({
          level: normalizeLevel(card.level),
          title: String(card.title || "饮食建议").slice(0, 30),
          text: String(card.text || card.message || "").slice(0, 180),
        }))
    : [];
  const foods = Array.isArray(parsed.foods)
    ? parsed.foods
        .filter((item) => item && typeof item.name === "string")
        .filter((item) => Number.isFinite(Number(item.confidence)) && Number(item.confidence) >= 0.6)
        .slice(0, 8)
        .map((item) => ({
          name: String(item.name).slice(0, 24),
          alias: item.alias ? String(item.alias).slice(0, 24) : "",
          confidence: Number(item.confidence),
          portion: item.portion ? String(item.portion).slice(0, 24) : "",
          salt: Number(item.salt || 0),
          caloriesPer100g: Number(item.caloriesPer100g || item.kcalPer100g || item.calories_per_100g || 0),
          estimatedGrams: Number(item.estimatedGrams || item.grams || item.weightGrams || 0),
          estimatedCalories: Number(item.estimatedCalories || item.calories || item.kcal || 0),
          carb: item.carb ? String(item.carb).slice(0, 8) : "",
          tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).slice(0, 12)).slice(0, 6) : [],
        }))
    : [];
  const requestedStatus = parsed.isFoodPhoto === false ? "not-food" : normalizeStatus(parsed.status);
  const status = requestedStatus === "food" && !foods.length ? "unclear" : requestedStatus;
  const isFoodResult = status === "food";
  const message = parsed.message || parsed.reason || "";
  const result = {
    status,
    message,
    foods,
    level: isFoodResult ? normalizeLevel(parsed.level || parsed.riskLevel || cards[0]?.level || "yellow") : "yellow",
    title: parsed.title || cards[0]?.title || (isFoodResult ? "饮食提醒" : "请重新确认"),
    safety: isFoodResult ? (parsed.safety || parsed.warning || cards[0]?.text || message || "已完成安全判断。") : message,
    nutrition: isFoodResult ? (parsed.nutrition || parsed.comment || "这餐营养还需结合实际份量判断。") : "",
    advice: isFoodResult ? (parsed.advice || parsed.suggestion || "请补充更清楚的餐食信息后再给建议。") : "",
    basis: isFoodResult ? (parsed.basis || parsed.reason || "已结合健康档案、慢病红线和本餐内容判断。") : message,
  };
  if (cards.length) result.cards = cards;
  if (options.includeIsFoodPhoto || Object.prototype.hasOwnProperty.call(parsed, "isFoodPhoto")) {
    result.isFoodPhoto = status === "not-food" ? false : Boolean(parsed.isFoodPhoto ?? true);
  }
  return result;
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();
  if (["not-food", "not_food", "non-food", "不是食物", "不是饭菜"].some((item) => value.includes(item))) return "not-food";
  if (["not-meal", "not_meal", "不是饮食", "无关"].some((item) => value.includes(item))) return "not-meal";
  if (["unclear", "不清楚", "看不清", "听不清"].some((item) => value.includes(item))) return "unclear";
  if (["food", "meal", "success", "是食物", "是饭菜"].some((item) => value === item || value.includes(item))) return "food";
  return "unclear";
}

function normalizeLevel(level) {
  const value = String(level || "").toLowerCase();
  if (["red", "danger", "error", "高风险", "红色"].some((item) => value.includes(item))) return "red";
  if (["green", "safe", "ok", "低风险", "绿色"].some((item) => value.includes(item))) return "green";
  return "yellow";
}

function parseJsonObject(content) {
  try {
    return JSON.parse(content);
  } catch {
    const match = String(content).match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

function getLocalModelJsonContent(message) {
  if (typeof message?.content === "string" && message.content.trim()) return message.content;
  if (typeof message?.thinking === "string" && message.thinking.trim()) return message.thinking;
  if (typeof message?.reasoning === "string" && message.reasoning.trim()) return message.reasoning;
  return "{}";
}

function getLocalModelChatEndpoint() {
  return `${LOCAL_MODEL_BASE_URL.replace(/\/v1\/?$/, "").replace(/\/$/, "")}/api/chat`;
}

module.exports = {
  assertSafeRuntimeConfiguration,
  closeAuthService,
  getServiceCapabilities,
  getAuthService,
  getLocalModelJsonContent,
  server,
  normalizeMealAnalysisJson,
  normalizeStatus,
  sanitizeProfile,
  startServer,
  validateAudioPayload,
  validateImagePayload,
};
