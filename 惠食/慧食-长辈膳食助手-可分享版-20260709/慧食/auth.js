const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const SMS_PURPOSES = new Set(["register", "password_reset"]);
const SESSION_COOKIE = "huishi_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SMS_TTL_MS = 5 * 60 * 1000;
const SMS_COOLDOWN_MS = 60 * 1000;
const FAMILY_INVITE_TTL_MS = 10 * 60 * 1000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

class AuthError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function createAuthService(options = {}) {
  const environment = options.environment || process.env;
  const nodeEnv = environment.NODE_ENV || "development";
  const now = options.now || (() => Date.now());
  const randomBytes = options.randomBytes || crypto.randomBytes;
  const secret = getAuthSecret(environment, nodeEnv, options.secret);
  const dbPath = options.dbPath || environment.AUTH_DB_PATH || path.join(__dirname, "data", "huishi.sqlite");
  const database = options.database || openDatabase(dbPath);
  const smsProvider = options.smsProvider || createSmsProvider(environment, nodeEnv);
  const identityProvider = options.identityProvider || createIdentityProvider(environment, nodeEnv);
  const identityRequired = parseBoolean(environment.IDENTITY_VERIFICATION_REQUIRED, false);
  const registrationSmsRequired = !(nodeEnv !== "production" && parseBoolean(environment.AUTH_DEV_MODE, false));
  const passwordResetSmsRequired = true;
  const secureCookies = environment.COOKIE_SECURE === "false" ? false : environment.COOKIE_SECURE === "true" ? true : "auto";

  migrate(database);
  const fakePasswordRecord = hashPassword("not-a-real-password", randomBytes);

  function hmac(value) {
    return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
  }

  function hashSmsCode(phone, purpose, code, nonce) {
    return hmac(`sms:${phone}:${purpose}:${code}:${nonce}`);
  }

  function getConfig() {
    return {
      smsReady: Boolean(smsProvider.ready),
      smsMode: smsProvider.mode || "disabled",
      smsVerificationRequired: registrationSmsRequired,
      registrationSmsRequired,
      passwordResetSmsRequired,
      identityReady: Boolean(identityProvider.ready),
      identityRequired,
    };
  }

  function getCookiePolicy() {
    return secureCookies;
  }

  async function requestSms({ phone, purpose, ipAddress = "unknown" }) {
    const normalizedPhone = normalizePhone(phone);
    if (!SMS_PURPOSES.has(purpose)) throw new AuthError(400, "invalid_sms_purpose", "验证码用途无效。");
    if (!smsProvider.ready) throw new AuthError(503, "sms_not_configured", "短信服务正在配置，请稍后再试。");

    const currentTime = now();
    const latest = database.prepare(`
      SELECT created_at FROM sms_codes
      WHERE phone = ? AND purpose = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(normalizedPhone, purpose);
    if (latest && currentTime - latest.created_at < SMS_COOLDOWN_MS) {
      const retryAfter = Math.ceil((SMS_COOLDOWN_MS - (currentTime - latest.created_at)) / 1000);
      throw new AuthError(429, "sms_too_frequent", `请等待 ${retryAfter} 秒后再获取验证码。`);
    }
    const recentPhoneCount = database.prepare(`
      SELECT COUNT(*) AS count FROM sms_codes WHERE phone = ? AND created_at >= ?
    `).get(normalizedPhone, currentTime - 60 * 60 * 1000).count;
    const recentIpCount = database.prepare(`
      SELECT COUNT(*) AS count FROM sms_codes WHERE request_ip_hash = ? AND created_at >= ?
    `).get(hmac(`ip:${ipAddress}`), currentTime - 60 * 60 * 1000).count;
    if (recentPhoneCount >= 5 || recentIpCount >= 20) {
      throw new AuthError(429, "sms_rate_limited", "验证码请求过多，请一小时后再试。");
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const nonce = randomBytes(16).toString("hex");
    const codeId = crypto.randomUUID();
    database.prepare(`
      INSERT INTO sms_codes
      (id, phone, purpose, code_hash, nonce, expires_at, attempts, consumed_at, request_ip_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
    `).run(
      codeId,
      normalizedPhone,
      purpose,
      hashSmsCode(normalizedPhone, purpose, code, nonce),
      nonce,
      currentTime + SMS_TTL_MS,
      hmac(`ip:${ipAddress}`),
      currentTime,
    );

    try {
      await smsProvider.send({ phone: normalizedPhone, code, purpose, expiresInMinutes: 5 });
    } catch (error) {
      database.prepare("DELETE FROM sms_codes WHERE id = ?").run(codeId);
      process.stderr.write(`[auth_sms] ${String(error?.message || error).slice(0, 180)}\n`);
      throw new AuthError(502, "sms_send_failed", "验证码发送失败，请稍后再试。");
    }
    cleanupExpired(currentTime);
    return {
      accepted: true,
      expiresIn: 300,
      retryAfter: 60,
      delivery: smsProvider.mode || "live",
      ...(smsProvider.mode === "debug" ? { debugCode: code } : {}),
    };
  }

  function findValidSms(phone, purpose, code) {
    const normalizedCode = String(code || "").trim();
    if (!/^\d{6}$/.test(normalizedCode)) throw new AuthError(400, "invalid_sms_code", "请输入 6 位短信验证码。");
    const record = database.prepare(`
      SELECT * FROM sms_codes
      WHERE phone = ? AND purpose = ? AND consumed_at IS NULL
      ORDER BY created_at DESC LIMIT 1
    `).get(phone, purpose);
    if (!record || record.expires_at < now()) throw new AuthError(400, "sms_code_expired", "验证码已失效，请重新获取。");
    if (record.attempts >= 5) throw new AuthError(429, "sms_code_locked", "验证码错误次数过多，请重新获取。");
    const expected = Buffer.from(record.code_hash, "hex");
    const actual = Buffer.from(hashSmsCode(phone, purpose, normalizedCode, record.nonce), "hex");
    if (!safeEqual(expected, actual)) {
      database.prepare("UPDATE sms_codes SET attempts = attempts + 1 WHERE id = ?").run(record.id);
      throw new AuthError(400, "invalid_sms_code", "验证码不正确，请重新输入。");
    }
    return record;
  }

  async function register(input, context = {}) {
    const phone = normalizePhone(input.phone);
    const password = validatePassword(input.password, phone);
    if (database.prepare("SELECT 1 FROM users WHERE phone = ?").get(phone)) {
      throw new AuthError(409, "phone_already_registered", "该手机号已经注册，请直接登录。");
    }
    const sms = registrationSmsRequired ? findValidSms(phone, "register", input.code) : null;
    const passwordRecord = hashPassword(password, randomBytes);
    const userId = crypto.randomUUID();
    const currentTime = now();

    runTransaction(database, () => {
      database.prepare(`
        INSERT INTO users
        (id, phone, password_hash, password_salt, password_params, nickname, role, active_mode, onboarding_completed,
         identity_status, identity_name_masked, identity_subject_hash, identity_provider,
         identity_reference, identity_verified_at, failed_login_attempts, locked_until,
         created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, '', 'elder', 'elder', 0, 'unverified', NULL, NULL, NULL, NULL, NULL, 0, NULL, ?, ?)
      `).run(
        userId,
        phone,
        passwordRecord.hash,
        passwordRecord.salt,
        JSON.stringify(passwordRecord.params),
        currentTime,
        currentTime,
      );
      if (sms) database.prepare("UPDATE sms_codes SET consumed_at = ? WHERE id = ?").run(currentTime, sms.id);
    });
    const session = createSession(userId, context);
    return { user: getPublicUser(userId), ...session };
  }

  function login(input, context = {}) {
    const phone = normalizePhone(input.phone);
    const password = String(input.password || "");
    const user = database.prepare("SELECT * FROM users WHERE phone = ?").get(phone);
    const record = user || fakePasswordRecord;
    const passwordMatches = verifyPassword(password, record);
    const currentTime = now();
    if (!user || !passwordMatches || (user.locked_until && user.locked_until > currentTime)) {
      if (user) {
        const attempts = Number(user.failed_login_attempts || 0) + 1;
        const lockedUntil = attempts >= 8 ? currentTime + 15 * 60 * 1000 : null;
        database.prepare(`
          UPDATE users SET failed_login_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?
        `).run(lockedUntil ? 0 : attempts, lockedUntil, currentTime, user.id);
      }
      throw new AuthError(401, "invalid_credentials", "手机号或密码不正确。");
    }
    database.prepare(`
      UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?
    `).run(currentTime, user.id);
    return { user: toPublicUser(user), ...createSession(user.id, context) };
  }

  async function requestPasswordReset(input, context = {}) {
    return requestSms({ phone: input.phone, purpose: "password_reset", ipAddress: context.ipAddress });
  }

  function resetPassword(input) {
    const phone = normalizePhone(input.phone);
    const password = validatePassword(input.password, phone);
    const sms = passwordResetSmsRequired ? findValidSms(phone, "password_reset", input.code) : null;
    const user = database.prepare("SELECT id FROM users WHERE phone = ?").get(phone);
    const currentTime = now();
    if (!user) {
      if (sms) database.prepare("UPDATE sms_codes SET consumed_at = ? WHERE id = ?").run(currentTime, sms.id);
      throw new AuthError(400, "reset_not_available", "无法重置该账号，请确认手机号后再试。");
    }
    const passwordRecord = hashPassword(password, randomBytes);
    runTransaction(database, () => {
      database.prepare(`
        UPDATE users SET password_hash = ?, password_salt = ?, password_params = ?,
          failed_login_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?
      `).run(passwordRecord.hash, passwordRecord.salt, JSON.stringify(passwordRecord.params), currentTime, user.id);
      if (sms) database.prepare("UPDATE sms_codes SET consumed_at = ? WHERE id = ?").run(currentTime, sms.id);
      database.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
    });
    return { reset: true };
  }

  function updateRole(userId, input) {
    const role = input.role === "family" ? "family" : input.role === "elder" ? "elder" : null;
    if (!role) throw new AuthError(400, "invalid_role", "请选择本人使用或照护家人模式。");
    const result = database.prepare(`
      UPDATE users SET active_mode = ?, onboarding_completed = 1, updated_at = ? WHERE id = ?
    `).run(role, now(), userId);
    if (!result.changes) throw new AuthError(401, "not_authenticated", "请先登录。");
    return getPublicUser(userId);
  }

  function updateProfile(userId, input) {
    const nickname = normalizeNickname(input.nickname);
    const result = database.prepare("UPDATE users SET nickname = ?, updated_at = ? WHERE id = ?").run(nickname, now(), userId);
    if (!result.changes) throw new AuthError(401, "not_authenticated", "请先登录。");
    return getPublicUser(userId);
  }

  function getHealthData(viewerUserId, requestedElderUserId) {
    const access = resolveHealthDataAccess(viewerUserId, requestedElderUserId);
    const { elderUserId, permissions } = access;
    const elder = database.prepare("SELECT id, nickname, phone FROM users WHERE id = ?").get(elderUserId);
    const storedProfile = permissions.canViewProfile ? database.prepare(`
      SELECT profile_json, setup_complete, version, updated_at
      FROM health_profiles WHERE elder_user_id = ?
    `).get(elderUserId) : null;
    const meals = permissions.canViewMeals ? database.prepare(`
      SELECT * FROM meal_records
      WHERE elder_user_id = ?
      ORDER BY recorded_at ASC, created_at ASC
      LIMIT 500
    `).all(elderUserId).map(toPublicMealRecord) : [];
    return {
      elder: {
        id: elder.id,
        nickname: elder.nickname,
        phone: maskPhone(elder.phone),
      },
      profile: storedProfile ? parseStoredJson(storedProfile.profile_json, null) : null,
      setupComplete: Boolean(storedProfile?.setup_complete),
      profileVersion: Number(storedProfile?.version || 0),
      profileUpdatedAt: storedProfile?.updated_at || null,
      meals,
      permissions,
    };
  }

  function saveHealthProfile(userId, input) {
    const profile = sanitizeHealthProfile(input.profile);
    const setupComplete = input.setupComplete ? 1 : 0;
    const currentTime = now();
    database.prepare(`
      INSERT INTO health_profiles (elder_user_id, profile_json, setup_complete, version, updated_at)
      VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(elder_user_id) DO UPDATE SET
        profile_json = excluded.profile_json,
        setup_complete = excluded.setup_complete,
        version = health_profiles.version + 1,
        updated_at = excluded.updated_at
    `).run(userId, JSON.stringify(profile), setupComplete, currentTime);
    return getHealthData(userId, userId);
  }

  function saveMealRecord(userId, input) {
    const record = sanitizeMealRecord(input.record);
    const currentTime = now();
    database.prepare(`
      INSERT INTO meal_records
      (id, elder_user_id, recorded_at, date_key, meal_period, level, title, message,
       advice, source, foods_json, handled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        recorded_at = excluded.recorded_at,
        date_key = excluded.date_key,
        meal_period = excluded.meal_period,
        level = excluded.level,
        title = excluded.title,
        message = excluded.message,
        advice = excluded.advice,
        source = excluded.source,
        foods_json = excluded.foods_json,
        handled = excluded.handled,
        updated_at = excluded.updated_at
      WHERE meal_records.elder_user_id = excluded.elder_user_id
    `).run(
      record.id,
      userId,
      record.recordedAt,
      record.dateKey,
      record.mealPeriod,
      record.level,
      record.title,
      record.message,
      record.advice,
      record.source,
      JSON.stringify(record.foods),
      record.handled ? 1 : 0,
      currentTime,
      currentTime,
    );
    database.prepare(`
      DELETE FROM meal_records
      WHERE elder_user_id = ? AND id NOT IN (
        SELECT id FROM meal_records WHERE elder_user_id = ?
        ORDER BY recorded_at DESC, created_at DESC LIMIT 500
      )
    `).run(userId, userId);
    return { record: getMealRecordForViewer(userId, userId, record.id) };
  }

  function importHealthData(userId, input) {
    if (input.profile) saveHealthProfile(userId, input);
    const records = Array.isArray(input.meals) ? input.meals.slice(-200) : [];
    records.forEach((record) => saveMealRecord(userId, { record }));
    return getHealthData(userId, userId);
  }

  function markMealHandled(viewerUserId, input) {
    const access = resolveHealthDataAccess(viewerUserId, input.elderUserId);
    const { elderUserId, permissions } = access;
    if (!permissions.canViewMeals || !permissions.canAcknowledgeAlerts) {
      throw new AuthError(403, "alert_acknowledgement_not_shared", "长辈尚未授权当前账号确认提醒。");
    }
    const recordId = normalizeRecordId(input.recordId);
    const result = database.prepare(`
      UPDATE meal_records SET handled = 1, updated_at = ?
      WHERE id = ? AND elder_user_id = ?
    `).run(now(), recordId, elderUserId);
    if (!result.changes) throw new AuthError(404, "meal_not_found", "没有找到这条餐食提醒。");
    return { record: getMealRecordForViewer(viewerUserId, elderUserId, recordId) };
  }

  function resolveHealthDataAccess(viewerUserId, requestedElderUserId) {
    const viewer = database.prepare("SELECT id FROM users WHERE id = ?").get(viewerUserId);
    if (!viewer) throw new AuthError(401, "not_authenticated", "请先登录。");
    const elderUserId = String(requestedElderUserId || viewerUserId).trim();
    if (elderUserId === viewerUserId) {
      return {
        elderUserId,
        owner: true,
        permissions: { canViewProfile: true, canViewMeals: true, canAcknowledgeAlerts: true },
      };
    }
    const relation = database.prepare(`
      SELECT can_view_profile, can_view_meals, can_acknowledge_alerts FROM family_relations
      WHERE elder_user_id = ? AND family_user_id = ?
    `).get(elderUserId, viewerUserId);
    if (!relation) throw new AuthError(403, "health_data_not_shared", "长辈尚未向当前账号共享健康数据。");
    return {
      elderUserId,
      owner: false,
      permissions: {
        canViewProfile: Boolean(relation.can_view_profile),
        canViewMeals: Boolean(relation.can_view_meals),
        canAcknowledgeAlerts: Boolean(relation.can_acknowledge_alerts),
      },
    };
  }

  function getMealRecordForViewer(viewerUserId, elderUserId, recordId) {
    const access = resolveHealthDataAccess(viewerUserId, elderUserId);
    if (!access.permissions.canViewMeals) throw new AuthError(403, "meal_data_not_shared", "长辈尚未授权当前账号查看餐食记录。");
    const record = database.prepare("SELECT * FROM meal_records WHERE id = ? AND elder_user_id = ?").get(recordId, elderUserId);
    if (!record) throw new AuthError(404, "meal_not_found", "没有找到这条餐食记录。");
    return toPublicMealRecord(record);
  }

  function getFamilyStatus(userId) {
    const user = database.prepare("SELECT id, active_mode FROM users WHERE id = ?").get(userId);
    if (!user) throw new AuthError(401, "not_authenticated", "请先登录。");
    const linked = database.prepare(`
      SELECT family_relations.id, family_relations.elder_user_id, family_relations.family_user_id,
        family_relations.created_at, family_relations.can_view_profile,
        family_relations.can_view_meals, family_relations.can_acknowledge_alerts,
        elder.nickname AS elder_nickname, elder.phone AS elder_phone,
        family.nickname AS family_nickname, family.phone AS family_phone
      FROM family_relations
      JOIN users AS elder ON elder.id = family_relations.elder_user_id
      JOIN users AS family ON family.id = family_relations.family_user_id
      WHERE family_relations.elder_user_id = ? OR family_relations.family_user_id = ?
      ORDER BY family_relations.created_at DESC
    `).all(userId, userId).map((relation) => {
      const viewingAsElder = relation.elder_user_id === userId;
      return {
        id: relation.id,
        relationship: viewingAsElder ? "family" : "elder",
        user: {
          id: viewingAsElder ? relation.family_user_id : relation.elder_user_id,
          nickname: viewingAsElder ? relation.family_nickname : relation.elder_nickname,
          phone: maskPhone(viewingAsElder ? relation.family_phone : relation.elder_phone),
        },
        createdAt: relation.created_at,
        permissions: {
          canViewProfile: Boolean(relation.can_view_profile),
          canViewMeals: Boolean(relation.can_view_meals),
          canAcknowledgeAlerts: Boolean(relation.can_acknowledge_alerts),
        },
      };
    });
    const activeInvite = database.prepare(`
      SELECT expires_at FROM family_invites
      WHERE elder_user_id = ? AND consumed_at IS NULL AND expires_at > ?
      ORDER BY created_at DESC LIMIT 1
    `).get(userId, now());
    return {
      role: user.active_mode,
      activeMode: user.active_mode,
      linked,
      hasActiveInvite: Boolean(activeInvite),
      inviteExpiresAt: activeInvite?.expires_at || null,
    };
  }

  function createFamilyInvite(userId) {
    const user = database.prepare("SELECT id FROM users WHERE id = ?").get(userId);
    if (!user) throw new AuthError(401, "not_authenticated", "请先登录。");
    const currentTime = now();
    database.prepare("DELETE FROM family_invites WHERE expires_at <= ? OR consumed_at IS NOT NULL").run(currentTime);
    database.prepare("DELETE FROM family_invites WHERE elder_user_id = ? AND consumed_at IS NULL").run(userId);
    let code;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = String(crypto.randomInt(100000, 1000000));
      const existing = database.prepare("SELECT 1 FROM family_invites WHERE code_hash = ?").get(hmac(`family-invite:${candidate}`));
      if (!existing) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new AuthError(503, "invite_unavailable", "暂时无法生成绑定码，请稍后重试。");
    const expiresAt = currentTime + FAMILY_INVITE_TTL_MS;
    database.prepare(`
      INSERT INTO family_invites (id, elder_user_id, code_hash, expires_at, consumed_at, created_at)
      VALUES (?, ?, ?, ?, NULL, ?)
    `).run(crypto.randomUUID(), userId, hmac(`family-invite:${code}`), expiresAt, currentTime);
    return { code, expiresAt, expiresIn: 600 };
  }

  function bindFamily(userId, input) {
    const user = database.prepare("SELECT id FROM users WHERE id = ?").get(userId);
    if (!user) throw new AuthError(401, "not_authenticated", "请先登录。");
    const code = String(input.code || "").trim();
    if (!/^\d{6}$/.test(code)) throw new AuthError(400, "invalid_family_code", "请输入 6 位家人绑定码。");
    const currentTime = now();
    const invite = database.prepare(`
      SELECT * FROM family_invites
      WHERE code_hash = ? AND consumed_at IS NULL AND expires_at > ?
    `).get(hmac(`family-invite:${code}`), currentTime);
    if (!invite) throw new AuthError(400, "family_code_expired", "绑定码无效或已过期，请让长辈重新生成。");
    if (invite.elder_user_id === userId) throw new AuthError(400, "cannot_bind_self", "不能绑定自己的账号。");
    runTransaction(database, () => {
      database.prepare(`
        INSERT OR IGNORE INTO family_relations (id, elder_user_id, family_user_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run(crypto.randomUUID(), invite.elder_user_id, userId, currentTime);
      database.prepare("UPDATE family_invites SET consumed_at = ? WHERE id = ?").run(currentTime, invite.id);
    });
    return getFamilyStatus(userId);
  }

  function unbindFamily(userId, input) {
    const relationId = String(input.relationId || "").trim();
    if (!relationId) throw new AuthError(400, "relation_required", "请选择要解除的家人关系。");
    const result = database.prepare(`
      DELETE FROM family_relations
      WHERE id = ? AND (elder_user_id = ? OR family_user_id = ?)
    `).run(relationId, userId, userId);
    if (!result.changes) throw new AuthError(404, "relation_not_found", "没有找到该家人关系。");
    return getFamilyStatus(userId);
  }

  function updateFamilyPermissions(userId, input) {
    const relationId = String(input.relationId || "").trim();
    if (!relationId) throw new AuthError(400, "relation_required", "请选择要设置的家人关系。");
    const canViewProfile = input.canViewProfile !== false;
    const canViewMeals = input.canViewMeals !== false;
    const canAcknowledgeAlerts = canViewMeals && input.canAcknowledgeAlerts !== false;
    const result = database.prepare(`
      UPDATE family_relations
      SET can_view_profile = ?, can_view_meals = ?, can_acknowledge_alerts = ?
      WHERE id = ? AND elder_user_id = ?
    `).run(canViewProfile ? 1 : 0, canViewMeals ? 1 : 0, canAcknowledgeAlerts ? 1 : 0, relationId, userId);
    if (!result.changes) throw new AuthError(403, "permission_change_not_allowed", "只有长辈账号可以调整共享范围。");
    return getFamilyStatus(userId);
  }

  async function verifyCurrentIdentity(userId, input) {
    const user = database.prepare("SELECT id, phone FROM users WHERE id = ?").get(userId);
    if (!user) throw new AuthError(401, "not_authenticated", "请先登录。");
    const identity = await verifyIdentityInput({
      phone: user.phone,
      realName: input.realName,
      idNumber: input.idNumber,
      required: true,
    });
    database.prepare(`
      UPDATE users SET identity_status = ?, identity_name_masked = ?, identity_subject_hash = ?,
        identity_provider = ?, identity_reference = ?, identity_verified_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      identity.status,
      identity.maskedName,
      hmac(`identity:${identity.subjectHash}`),
      identity.provider,
      identity.reference,
      identity.verifiedAt,
      now(),
      userId,
    );
    return getPublicUser(userId);
  }

  async function verifyIdentityInput({ phone, realName, idNumber, required }) {
    const hasInput = String(realName || "").trim() || String(idNumber || "").trim();
    if (!required && !hasInput) {
      return { status: "unverified", maskedName: null, subjectHash: null, provider: null, reference: null, verifiedAt: null };
    }
    if (!identityProvider.ready) throw new AuthError(503, "identity_not_configured", "实名认证服务正在配置，请稍后再试。");
    const name = normalizeRealName(realName);
    const identityNumber = normalizeChineseIdNumber(idNumber);
    let result;
    try {
      result = await identityProvider.verify({ phone, realName: name, idNumber: identityNumber });
    } catch (error) {
      process.stderr.write(`[auth_identity] ${String(error?.message || error).slice(0, 180)}\n`);
      throw new AuthError(502, "identity_service_failed", "实名认证服务暂时不可用，请稍后再试。");
    }
    if (!result?.verified) throw new AuthError(422, "identity_not_matched", "姓名、身份证号与手机号信息不一致。");
    return {
      status: "verified",
      maskedName: maskRealName(name),
      subjectHash: identityNumber,
      provider: String(result.provider || identityProvider.name || "webhook").slice(0, 40),
      reference: String(result.reference || "").slice(0, 120) || null,
      verifiedAt: now(),
    };
  }

  function createSession(userId, context = {}) {
    const token = randomBytes(32).toString("base64url");
    const currentTime = now();
    database.prepare(`
      INSERT INTO sessions
      (token_hash, user_id, expires_at, created_at, last_seen_at, ip_hash, user_agent_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      sha256(token),
      userId,
      currentTime + SESSION_TTL_MS,
      currentTime,
      currentTime,
      hmac(`ip:${context.ipAddress || "unknown"}`),
      hmac(`ua:${context.userAgent || "unknown"}`),
    );
    return { token, expiresAt: currentTime + SESSION_TTL_MS };
  }

  function getSession(token) {
    if (!token || token.length > 128) return null;
    const currentTime = now();
    const session = database.prepare(`
      SELECT sessions.token_hash, sessions.expires_at, users.*
      FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    `).get(sha256(token), currentTime);
    if (!session) return null;
    database.prepare("UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?").run(currentTime, session.token_hash);
    return { user: toPublicUser(session), tokenHash: session.token_hash };
  }

  function logout(token) {
    if (token) database.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
  }

  function getPublicUser(userId) {
    const user = database.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) return null;
    return toPublicUser(user);
  }

  function cleanupExpired(currentTime = now()) {
    database.prepare("DELETE FROM sms_codes WHERE expires_at < ? OR consumed_at < ?").run(currentTime - 24 * 60 * 60 * 1000, currentTime - 24 * 60 * 60 * 1000);
    database.prepare("DELETE FROM sessions WHERE expires_at < ?").run(currentTime);
  }

  function close() {
    database.close();
  }

  return {
    close,
    getCookiePolicy,
    getConfig,
    getFamilyStatus,
    getHealthData,
    getSession,
    login,
    logout,
    register,
    bindFamily,
    createFamilyInvite,
    requestPasswordReset,
    requestSms,
    resetPassword,
    importHealthData,
    saveHealthProfile,
    saveMealRecord,
    markMealHandled,
    updateProfile,
    updateRole,
    updateFamilyPermissions,
    unbindFamily,
    verifyCurrentIdentity,
  };
}

async function handleAuthRequest(service, req, res, pathname, helpers) {
  const { sendJson, readJsonBody } = helpers;
  const token = parseCookies(req.headers.cookie || "")[SESSION_COOKIE];
  const context = {
    ipAddress: helpers.getClientIp ? helpers.getClientIp(req) : (req.socket?.remoteAddress || "unknown"),
    userAgent: req.headers["user-agent"] || "unknown",
  };
  try {
    if ((pathname === "/api/auth/status" || pathname === "/api/auth/me") && req.method === "GET") {
      const session = service.getSession(token);
      sendJson(res, 200, { authenticated: Boolean(session), user: session?.user || null, config: service.getConfig() });
      return;
    }
    if (pathname === "/api/auth/family/status" && req.method === "GET") {
      const session = service.getSession(token);
      if (!session) throw new AuthError(401, "not_authenticated", "请先登录。");
      sendJson(res, 200, service.getFamilyStatus(session.user.id));
      return;
    }
    if (pathname === "/api/auth/health-data" && req.method === "GET") {
      const session = service.getSession(token);
      if (!session) throw new AuthError(401, "not_authenticated", "请先登录。");
      const url = new URL(req.url || pathname, "http://localhost");
      sendJson(res, 200, service.getHealthData(session.user.id, url.searchParams.get("elderUserId")));
      return;
    }
    if (req.method !== "POST") throw new AuthError(405, "method_not_allowed", "请求方法不受支持。");
    requireJsonRequest(req);
    const body = await readJsonBody(req, pathname === "/api/auth/health-import" ? 512 * 1024 : 32 * 1024);
    if (pathname === "/api/auth/sms/request") {
      sendJson(res, 200, await service.requestSms({ ...body, ipAddress: context.ipAddress }));
      return;
    }
    if (pathname === "/api/auth/register") {
      const result = await service.register(body, context);
      setSessionCookie(req, res, result.token, result.expiresAt, service.getCookiePolicy());
      sendJson(res, 201, { authenticated: true, user: result.user });
      return;
    }
    if (pathname === "/api/auth/login") {
      const result = service.login(body, context);
      setSessionCookie(req, res, result.token, result.expiresAt, service.getCookiePolicy());
      sendJson(res, 200, { authenticated: true, user: result.user });
      return;
    }
    if (pathname === "/api/auth/logout") {
      service.logout(token);
      clearSessionCookie(req, res, service.getCookiePolicy());
      sendJson(res, 200, { authenticated: false });
      return;
    }
    if (pathname === "/api/auth/password-reset/request") {
      sendJson(res, 200, await service.requestPasswordReset(body, context));
      return;
    }
    if (pathname === "/api/auth/password-reset/confirm") {
      sendJson(res, 200, service.resetPassword(body));
      return;
    }
    if (pathname === "/api/auth/role") {
      const session = service.getSession(token);
      if (!session) throw new AuthError(401, "not_authenticated", "请先登录。");
      sendJson(res, 200, { user: service.updateRole(session.user.id, body) });
      return;
    }
    if (pathname === "/api/auth/profile") {
      const session = service.getSession(token);
      if (!session) throw new AuthError(401, "not_authenticated", "请先登录。");
      sendJson(res, 200, { user: service.updateProfile(session.user.id, body) });
      return;
    }
    if (pathname === "/api/auth/health-profile") {
      const session = service.getSession(token);
      if (!session) throw new AuthError(401, "not_authenticated", "请先登录。");
      sendJson(res, 200, service.saveHealthProfile(session.user.id, body));
      return;
    }
    if (pathname === "/api/auth/health-import") {
      const session = service.getSession(token);
      if (!session) throw new AuthError(401, "not_authenticated", "请先登录。");
      sendJson(res, 200, service.importHealthData(session.user.id, body));
      return;
    }
    if (pathname === "/api/auth/meal-record") {
      const session = service.getSession(token);
      if (!session) throw new AuthError(401, "not_authenticated", "请先登录。");
      sendJson(res, 201, service.saveMealRecord(session.user.id, body));
      return;
    }
    if (pathname === "/api/auth/meal-handled") {
      const session = service.getSession(token);
      if (!session) throw new AuthError(401, "not_authenticated", "请先登录。");
      sendJson(res, 200, service.markMealHandled(session.user.id, body));
      return;
    }
    if (pathname === "/api/auth/family/invite") {
      const session = service.getSession(token);
      if (!session) throw new AuthError(401, "not_authenticated", "请先登录。");
      sendJson(res, 201, service.createFamilyInvite(session.user.id));
      return;
    }
    if (pathname === "/api/auth/family/bind") {
      const session = service.getSession(token);
      if (!session) throw new AuthError(401, "not_authenticated", "请先登录。");
      sendJson(res, 200, service.bindFamily(session.user.id, body));
      return;
    }
    if (pathname === "/api/auth/family/unbind") {
      const session = service.getSession(token);
      if (!session) throw new AuthError(401, "not_authenticated", "请先登录。");
      sendJson(res, 200, service.unbindFamily(session.user.id, body));
      return;
    }
    if (pathname === "/api/auth/family/permissions") {
      const session = service.getSession(token);
      if (!session) throw new AuthError(401, "not_authenticated", "请先登录。");
      sendJson(res, 200, service.updateFamilyPermissions(session.user.id, body));
      return;
    }
    if (pathname === "/api/auth/identity/verify") {
      const session = service.getSession(token);
      if (!session) throw new AuthError(401, "not_authenticated", "请先登录。");
      sendJson(res, 200, { user: await service.verifyCurrentIdentity(session.user.id, body) });
      return;
    }
    throw new AuthError(404, "not_found", "接口不存在。");
  } catch (error) {
    if (error instanceof AuthError) {
      sendJson(res, error.status, { error: error.code, message: error.message });
      return;
    }
    process.stderr.write(`[auth_api] ${String(error?.message || error).slice(0, 180)}\n`);
    sendJson(res, 500, { error: "auth_internal_error", message: "账号服务暂时不可用，请稍后再试。" });
  }
}

function openDatabase(dbPath) {
  const directory = path.dirname(dbPath);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(directory, 0o700); } catch {}
  const database = new DatabaseSync(dbPath);
  database.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  try { fs.chmodSync(dbPath, 0o600); } catch {}
  return database;
}

function migrate(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_params TEXT NOT NULL,
      nickname TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('elder', 'family')),
      active_mode TEXT NOT NULL DEFAULT 'elder' CHECK (active_mode IN ('elder', 'family')),
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      identity_status TEXT NOT NULL DEFAULT 'unverified',
      identity_name_masked TEXT,
      identity_subject_hash TEXT,
      identity_provider TEXT,
      identity_reference TEXT,
      identity_verified_at INTEGER,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sms_codes (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      purpose TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      nonce TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      consumed_at INTEGER,
      request_ip_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sms_phone_purpose_created ON sms_codes(phone, purpose, created_at DESC);
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      ip_hash TEXT NOT NULL,
      user_agent_hash TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS family_invites (
      id TEXT PRIMARY KEY,
      elder_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      consumed_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_family_invites_elder ON family_invites(elder_user_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS family_relations (
      id TEXT PRIMARY KEY,
      elder_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      family_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      can_view_profile INTEGER NOT NULL DEFAULT 1,
      can_view_meals INTEGER NOT NULL DEFAULT 1,
      can_acknowledge_alerts INTEGER NOT NULL DEFAULT 1,
      UNIQUE(elder_user_id, family_user_id),
      CHECK(elder_user_id <> family_user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_family_relations_elder ON family_relations(elder_user_id);
    CREATE INDEX IF NOT EXISTS idx_family_relations_family ON family_relations(family_user_id);
    CREATE TABLE IF NOT EXISTS health_profiles (
      elder_user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      profile_json TEXT NOT NULL,
      setup_complete INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meal_records (
      id TEXT PRIMARY KEY,
      elder_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recorded_at TEXT NOT NULL,
      date_key TEXT NOT NULL,
      meal_period TEXT NOT NULL,
      level TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      advice TEXT NOT NULL,
      source TEXT NOT NULL,
      foods_json TEXT NOT NULL,
      handled INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_meal_records_elder_time ON meal_records(elder_user_id, recorded_at DESC);
  `);
  const userColumns = database.prepare("PRAGMA table_info(users)").all();
  if (!userColumns.some((column) => column.name === "onboarding_completed")) {
    database.exec("ALTER TABLE users ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0");
  }
  if (!userColumns.some((column) => column.name === "active_mode")) {
    database.exec("ALTER TABLE users ADD COLUMN active_mode TEXT NOT NULL DEFAULT 'elder'");
    database.exec("UPDATE users SET active_mode = role WHERE role IN ('elder', 'family')");
  }
  const relationColumns = database.prepare("PRAGMA table_info(family_relations)").all();
  if (!relationColumns.some((column) => column.name === "can_view_profile")) {
    database.exec("ALTER TABLE family_relations ADD COLUMN can_view_profile INTEGER NOT NULL DEFAULT 1");
  }
  if (!relationColumns.some((column) => column.name === "can_view_meals")) {
    database.exec("ALTER TABLE family_relations ADD COLUMN can_view_meals INTEGER NOT NULL DEFAULT 1");
  }
  if (!relationColumns.some((column) => column.name === "can_acknowledge_alerts")) {
    database.exec("ALTER TABLE family_relations ADD COLUMN can_acknowledge_alerts INTEGER NOT NULL DEFAULT 1");
  }
}

function createSmsProvider(environment, nodeEnv) {
  const provider = String(environment.SMS_PROVIDER || "disabled").toLowerCase();
  if (provider === "console" && nodeEnv !== "production" && parseBoolean(environment.AUTH_DEV_MODE, false)) {
    return {
      name: "console",
      ready: true,
      mode: "debug",
      async send({ phone, code, purpose }) {
        process.stdout.write(`[auth_dev_sms] ${phone} ${purpose} ${code}\n`);
      },
    };
  }
  if (provider === "webhook" && isAllowedWebhookUrl(environment.SMS_WEBHOOK_URL, nodeEnv)) {
    return {
      name: "webhook",
      ready: true,
      mode: "live",
      async send(payload) {
        const response = await fetchWithTimeout(environment.SMS_WEBHOOK_URL, {
          method: "POST",
          headers: buildWebhookHeaders(environment.SMS_WEBHOOK_TOKEN),
          body: JSON.stringify({ ...payload, app: "huishi" }),
        });
        if (!response.ok) throw new Error(`SMS webhook returned ${response.status}`);
      },
    };
  }
  return { name: "disabled", ready: false, mode: "disabled", async send() { throw new Error("SMS provider is disabled"); } };
}

function createIdentityProvider(environment, nodeEnv) {
  if (String(environment.IDENTITY_PROVIDER || "disabled").toLowerCase() === "webhook" && isAllowedWebhookUrl(environment.IDENTITY_WEBHOOK_URL, nodeEnv)) {
    return {
      name: "webhook",
      ready: true,
      async verify(payload) {
        const response = await fetchWithTimeout(environment.IDENTITY_WEBHOOK_URL, {
          method: "POST",
          headers: buildWebhookHeaders(environment.IDENTITY_WEBHOOK_TOKEN),
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Identity webhook returned ${response.status}`);
        const data = await response.json();
        return { verified: data.verified === true, reference: data.reference || data.requestId, provider: data.provider || "webhook" };
      },
    };
  }
  return { name: "disabled", ready: false, async verify() { throw new Error("Identity provider is disabled"); } };
}

function buildWebhookHeaders(token) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function isAllowedWebhookUrl(value, nodeEnv) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return nodeEnv !== "production" && url.protocol === "http:" && ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url, options, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function hashPassword(password, randomBytes = crypto.randomBytes) {
  const salt = randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(password, salt, PASSWORD_KEY_LENGTH, PASSWORD_SCRYPT_OPTIONS).toString("base64url");
  return { hash, salt, params: { algorithm: "scrypt", ...PASSWORD_SCRYPT_OPTIONS } };
}

function verifyPassword(password, record) {
  try {
    const params = typeof record.password_params === "string" ? JSON.parse(record.password_params) : record.params;
    const expected = Buffer.from(record.password_hash || record.hash, "base64url");
    const actual = crypto.scryptSync(String(password || ""), record.password_salt || record.salt, expected.length, {
      N: Number(params.N), r: Number(params.r), p: Number(params.p), maxmem: Number(params.maxmem || 64 * 1024 * 1024),
    });
    return safeEqual(expected, actual);
  } catch {
    return false;
  }
}

function validatePassword(password, phone) {
  const value = String(password || "");
  if (value.length < 8 || value.length > 72) throw new AuthError(400, "weak_password", "密码需为 8 至 72 个字符。");
  if (/^(.)\1+$/.test(value) || /^\d+$/.test(value) || phone.includes(value)) {
    throw new AuthError(400, "weak_password", "密码过于简单，请混合使用文字、字母或数字。");
  }
  return value;
}

function normalizePhone(value) {
  const phone = String(value || "").replace(/[\s-]/g, "").replace(/^\+86/, "");
  if (!/^1[3-9]\d{9}$/.test(phone)) throw new AuthError(400, "invalid_phone", "请输入正确的中国大陆手机号。");
  return phone;
}

function normalizeNickname(value) {
  const nickname = String(value || "").trim().replace(/\s+/g, " ").slice(0, 30);
  if (!nickname) throw new AuthError(400, "nickname_required", "请填写姓名或昵称。");
  return nickname;
}

function sanitizeHealthProfile(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const boundedNumber = (input, min, max) => {
    if (input === "" || input == null) return "";
    const number = Number(input);
    return Number.isFinite(number) && number >= min && number <= max ? number : "";
  };
  const cleanList = (input, maximum = 20) => Array.from(new Set(
    (Array.isArray(input) ? input : [])
      .map((item) => String(item || "").trim().replace(/\s+/g, " ").slice(0, 40))
      .filter(Boolean),
  )).slice(0, maximum);
  return {
    nickname: String(source.nickname || "").trim().replace(/\s+/g, " ").slice(0, 30),
    age: boundedNumber(source.age, 45, 110),
    sex: ["female", "male", "other"].includes(source.sex) ? source.sex : "female",
    height: boundedNumber(source.height, 120, 210),
    weight: boundedNumber(source.weight, 35, 130),
    activity: ["", "low", "light", "mid", "high"].includes(source.activity) ? source.activity : "",
    conditions: cleanList(source.conditions, 12),
    customConditions: cleanList(source.customConditions, 12),
    allergies: cleanList(source.allergies, 30),
    goals: cleanList(source.goals, 12),
    customGoals: cleanList(source.customGoals, 12),
    personal: String(source.personal || "").trim().replace(/\s+/g, " ").slice(0, 240),
  };
}

function sanitizeMealRecord(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const recordedAt = String(source.recordedAt || "");
  if (!Number.isFinite(Date.parse(recordedAt))) throw new AuthError(400, "invalid_meal_time", "餐食记录时间无效。");
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(String(source.dateKey || "")) ? String(source.dateKey) : null;
  if (!dateKey) throw new AuthError(400, "invalid_meal_date", "餐食记录日期无效。");
  const cleanText = (input, maximum) => String(input || "").trim().replace(/\s+/g, " ").slice(0, maximum);
  return {
    id: normalizeRecordId(source.id),
    recordedAt: new Date(recordedAt).toISOString(),
    dateKey,
    mealPeriod: ["breakfast", "lunch", "dinner"].includes(source.mealPeriod) ? source.mealPeriod : "dinner",
    level: ["red", "yellow", "green"].includes(source.level) ? source.level : "yellow",
    title: cleanText(source.title, 120) || "饮食提醒",
    message: cleanText(source.message, 800),
    advice: cleanText(source.advice, 800),
    source: cleanText(source.source, 80) || "餐食记录",
    foods: Array.from(new Set((Array.isArray(source.foods) ? source.foods : [])
      .map((item) => cleanText(item, 80))
      .filter(Boolean))).slice(0, 20),
    handled: Boolean(source.handled),
  };
}

function normalizeRecordId(value) {
  const id = String(value || "").trim();
  if (!/^[A-Za-z0-9._:-]{1,100}$/.test(id)) throw new AuthError(400, "invalid_meal_id", "餐食记录编号无效。");
  return id;
}

function toPublicMealRecord(record) {
  const recordedAt = new Date(record.recorded_at);
  return {
    id: record.id,
    recordedAt: recordedAt.toISOString(),
    dateKey: record.date_key,
    mealPeriod: record.meal_period,
    level: record.level,
    title: record.title,
    message: record.message,
    advice: record.advice,
    source: record.source,
    foods: parseStoredJson(record.foods_json, []),
    handled: Boolean(record.handled),
    updated: new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(recordedAt),
  };
}

function parseStoredJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeRealName(value) {
  const name = String(value || "").trim().replace(/\s+/g, "");
  if (!/^[\u3400-\u9fff·]{2,30}$/.test(name)) throw new AuthError(400, "invalid_real_name", "请输入身份证上的真实姓名。");
  return name;
}

function normalizeChineseIdNumber(value) {
  const id = String(value || "").trim().toUpperCase();
  if (!/^\d{17}[\dX]$/.test(id) || !isValidChineseIdChecksum(id)) {
    throw new AuthError(400, "invalid_id_number", "请输入正确的 18 位身份证号。");
  }
  return id;
}

function isValidChineseIdChecksum(id) {
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checks = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];
  const total = weights.reduce((sum, weight, index) => sum + Number(id[index]) * weight, 0);
  return checks[total % 11] === id[17];
}

function maskRealName(name) {
  return name.length <= 2 ? `${name[0]}*` : `${name[0]}${"*".repeat(Math.min(4, name.length - 2))}${name.at(-1)}`;
}

function toPublicUser(user) {
  return {
    id: user.id,
    phone: maskPhone(user.phone),
    nickname: user.nickname,
    role: user.active_mode || user.role,
    activeMode: user.active_mode || user.role,
    onboardingComplete: Boolean(user.onboarding_completed),
    identityStatus: user.identity_status,
    identityName: user.identity_name_masked || null,
    identityVerifiedAt: user.identity_verified_at || null,
  };
}

function maskPhone(phone) {
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function getAuthSecret(environment, nodeEnv, providedSecret) {
  const value = providedSecret || environment.AUTH_SECRET;
  if (value && String(value).length >= 32) return String(value);
  if (nodeEnv === "production") throw new Error("AUTH_SECRET must contain at least 32 characters in production");
  process.stderr.write("[auth] AUTH_SECRET is not configured; using an ephemeral development secret.\n");
  return crypto.randomBytes(32).toString("base64url");
}

function requireJsonRequest(req) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw new AuthError(415, "json_required", "请求格式必须为 JSON。");
}

function parseCookies(header) {
  return String(header).split(";").reduce((cookies, part) => {
    const separator = part.indexOf("=");
    if (separator < 1) return cookies;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try { cookies[name] = decodeURIComponent(value); } catch {}
    return cookies;
  }, {});
}

function setSessionCookie(req, res, token, expiresAt, secureCookies = "auto") {
  const secure = secureCookies === true || (secureCookies === "auto" && isSecureRequest(req));
  const parts = [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, "Path=/", "HttpOnly", "SameSite=Strict", `Expires=${new Date(expiresAt).toUTCString()}`];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(req, res, secureCookies = "auto") {
  const secure = secureCookies === true || (secureCookies === "auto" && isSecureRequest(req));
  const parts = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=0"];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

function isSecureRequest(req) {
  return req.socket?.encrypted === true || String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
}

function runTransaction(database, action) {
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = action();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function safeEqual(left, right) {
  return Buffer.isBuffer(left) && Buffer.isBuffer(right) && left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function parseBoolean(value, fallback) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

module.exports = {
  AuthError,
  SESSION_COOKIE,
  createAuthService,
  handleAuthRequest,
  hashPassword,
  isValidChineseIdChecksum,
  normalizePhone,
  verifyPassword,
};
