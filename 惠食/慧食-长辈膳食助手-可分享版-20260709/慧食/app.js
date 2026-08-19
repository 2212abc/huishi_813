const STORAGE_KEY = "huishi_local_pilot_v2";
const TODAY = new Date();
const COMMON_CONDITION_IDS = ["hypertension", "diabetes", "fat", "gout", "kidney", "chewing"];
const PORTION_OPTIONS = [
  { id: "small", label: "小份", factor: 0.7 },
  { id: "medium", label: "中份", factor: 1 },
  { id: "large", label: "大份", factor: 1.4 },
];

const CONDITIONS = [
  { id: "hypertension", name: "高血压", rule: "一天盐少于 5 克", food: ["咸菜", "火锅", "热干面", "方便面", "牛肉面", "烧烤", "腊肉香肠"] },
  { id: "diabetes", name: "2 型糖尿病", rule: "主食定量，少甜饮", food: ["米饭", "热干面", "甜饮料", "奶茶", "蛋糕", "炒饭", "方便面"] },
  { id: "gout", name: "痛风", rule: "避开高嘌呤", food: ["虾", "海鲜", "动物内脏", "火锅", "烧烤"] },
  { id: "kidney", name: "慢性肾病", rule: "盐和蛋白质听医嘱", food: ["咸菜", "加工肉", "方便面", "火锅", "腊肉香肠"] },
  { id: "fat", name: "高血脂", rule: "少油少肥肉", food: ["红烧肉", "油炸食物", "油条", "烧烤", "腊肉香肠", "蛋糕", "炒饭"] },
  { id: "chewing", name: "咀嚼困难", rule: "软烂小块，少呛咳", food: [] },
];

const ACTIVITIES = [
  { id: "low", name: "少于 15 分钟", desc: "大多坐着，偶尔走动", factor: 1.2 },
  { id: "light", name: "15-30 分钟", desc: "慢走、买菜或轻家务", factor: 1.3 },
  { id: "mid", name: "30-60 分钟", desc: "每天散步，能微微出汗", factor: 1.38 },
  { id: "high", name: "60 分钟以上", desc: "活动较多或规律锻炼", factor: 1.5 },
];

const GOALS = [
  { id: "glucose", name: "我想控糖" },
  { id: "pressure", name: "我想稳血压" },
  { id: "protein", name: "我想补蛋白" },
  { id: "weight", name: "我想控体重" },
];

const FOODS = [
  { name: "热干面", salt: 3.2, carb: "高", tags: ["高盐", "主食偏多"] },
  { name: "面条", salt: 1.6, carb: "高", tags: ["主食偏多"] },
  { name: "牛肉面", salt: 2.6, carb: "高", tags: ["高盐", "汤汁", "主食偏多", "优质蛋白"] },
  { name: "方便面", salt: 4.4, carb: "高", tags: ["高盐", "汤汁", "主食偏多", "油脂偏高"] },
  { name: "豆浆", salt: 0.2, carb: "中", tags: ["豆制品", "优质蛋白"] },
  { name: "米饭", salt: 0, carb: "高", tags: ["主食"] },
  { name: "杂粮饭", salt: 0, carb: "中", tags: ["主食", "膳食纤维"] },
  { name: "粥", salt: 0.1, carb: "中", tags: ["主食", "软烂"] },
  { name: "馒头", salt: 0.3, carb: "高", tags: ["主食"] },
  { name: "包子", salt: 0.9, carb: "高", tags: ["主食偏多", "油脂偏高"] },
  { name: "饺子", salt: 1.3, carb: "高", tags: ["主食偏多", "油脂偏高"] },
  { name: "馄饨", salt: 1.7, carb: "高", tags: ["主食偏多", "汤汁"] },
  { name: "炒饭", salt: 1.8, carb: "高", tags: ["主食偏多", "油脂偏高"] },
  { name: "红薯", salt: 0, carb: "中", tags: ["主食", "膳食纤维"] },
  { name: "玉米", salt: 0, carb: "中", tags: ["主食", "膳食纤维"] },
  { name: "青菜", salt: 0.2, carb: "低", tags: ["蔬菜"] },
  { name: "西兰花", salt: 0.2, carb: "低", tags: ["蔬菜", "膳食纤维"] },
  { name: "黄瓜", salt: 0.1, carb: "低", tags: ["蔬菜", "膳食纤维"] },
  { name: "土豆", salt: 0.2, carb: "高", tags: ["主食偏多"] },
  { name: "豆腐", salt: 0.4, carb: "低", tags: ["豆制品", "优质蛋白"] },
  { name: "鸡蛋", salt: 0.2, carb: "低", tags: ["优质蛋白"] },
  { name: "番茄炒蛋", salt: 0.8, carb: "低", tags: ["优质蛋白"] },
  { name: "牛奶", salt: 0.2, carb: "中", tags: ["优质蛋白", "钙"] },
  { name: "清蒸鱼", salt: 0.5, carb: "低", tags: ["优质蛋白"] },
  { name: "鸡胸肉", salt: 0.4, carb: "低", tags: ["优质蛋白"] },
  { name: "牛肉", salt: 0.6, carb: "低", tags: ["优质蛋白"] },
  { name: "鸡腿", salt: 0.7, carb: "低", tags: ["优质蛋白", "油脂偏高"] },
  { name: "排骨汤", salt: 1.8, carb: "低", tags: ["汤汁", "油脂偏高"] },
  { name: "红烧肉", salt: 1.1, carb: "低", tags: ["油脂偏高"] },
  { name: "虾", salt: 0.7, carb: "低", tags: ["海鲜", "高嘌呤"] },
  { name: "海鲜", salt: 0.9, carb: "低", tags: ["海鲜", "高嘌呤"] },
  { name: "花生", salt: 0.3, carb: "中", tags: ["坚果", "油脂偏高"] },
  { name: "火锅", salt: 5.2, carb: "中", tags: ["高盐", "油脂偏高", "高嘌呤"] },
  { name: "动物内脏", salt: 0.8, carb: "低", tags: ["高嘌呤"] },
  { name: "咸菜", salt: 2.6, carb: "低", tags: ["高盐"] },
  { name: "腊肉香肠", salt: 2.2, carb: "低", tags: ["高盐", "油脂偏高", "加工肉"] },
  { name: "烧烤", salt: 2.4, carb: "中", tags: ["高盐", "油脂偏高", "高嘌呤"] },
  { name: "外卖快餐", salt: 2.1, carb: "中", tags: ["高盐", "油脂偏高"] },
  { name: "甜饮料", salt: 0.1, carb: "高", tags: ["甜饮"] },
  { name: "奶茶", salt: 0.2, carb: "高", tags: ["甜饮", "甜食"] },
  { name: "蛋糕", salt: 0.3, carb: "高", tags: ["甜食", "油脂偏高"] },
  { name: "面包", salt: 0.5, carb: "高", tags: ["主食偏多"] },
  { name: "汉堡", salt: 1.5, carb: "高", tags: ["高盐", "油脂偏高", "主食偏多"] },
  { name: "薯条", salt: 1.0, carb: "高", tags: ["油脂偏高", "主食偏多"] },
  { name: "披萨", salt: 1.8, carb: "高", tags: ["高盐", "油脂偏高", "主食偏多"] },
  { name: "苹果", salt: 0, carb: "中", tags: ["水果"] },
  { name: "香蕉", salt: 0, carb: "中", tags: ["水果"] },
  { name: "水果", salt: 0, carb: "中", tags: ["水果"] },
  { name: "油条", salt: 1.4, carb: "高", tags: ["油脂偏高", "主食偏多"] },
];

const FOOD_ALIASES = [
  { food: "热干面", terms: ["热干面", "干面", "拌面"] },
  { food: "面条", terms: ["面条", "汤面", "一碗面", "半碗面"] },
  { food: "牛肉面", terms: ["牛肉面", "红烧牛肉面"] },
  { food: "方便面", terms: ["方便面", "泡面", "桶面"] },
  { food: "米饭", terms: ["米饭", "白米饭", "白饭", "一碗饭", "半碗饭", "两碗饭"] },
  { food: "杂粮饭", terms: ["杂粮饭", "糙米饭", "杂粮"] },
  { food: "粥", terms: ["粥", "稀饭"] },
  { food: "馒头", terms: ["馒头"] },
  { food: "包子", terms: ["包子", "小笼包"] },
  { food: "饺子", terms: ["饺子", "水饺"] },
  { food: "馄饨", terms: ["馄饨", "云吞", "抄手"] },
  { food: "炒饭", terms: ["炒饭", "蛋炒饭"] },
  { food: "红薯", terms: ["红薯", "地瓜"] },
  { food: "玉米", terms: ["玉米"] },
  { food: "青菜", terms: ["青菜", "绿叶菜", "蔬菜", "白菜", "菠菜", "生菜"] },
  { food: "西兰花", terms: ["西兰花", "花菜"] },
  { food: "黄瓜", terms: ["黄瓜"] },
  { food: "土豆", terms: ["土豆", "马铃薯"] },
  { food: "豆腐", terms: ["豆腐", "豆制品"] },
  { food: "豆浆", terms: ["豆浆"] },
  { food: "鸡蛋", terms: ["鸡蛋", "水煮蛋", "煎蛋", "一个蛋"] },
  { food: "番茄炒蛋", terms: ["番茄炒蛋", "西红柿炒蛋", "炒蛋"] },
  { food: "牛奶", terms: ["牛奶", "低脂奶", "一杯奶"] },
  { food: "清蒸鱼", terms: ["清蒸鱼", "鲈鱼", "鱼"] },
  { food: "鸡胸肉", terms: ["鸡胸肉", "鸡肉"] },
  { food: "牛肉", terms: ["牛肉"] },
  { food: "鸡腿", terms: ["鸡腿"] },
  { food: "排骨汤", terms: ["排骨汤", "排骨"] },
  { food: "红烧肉", terms: ["红烧肉", "五花肉", "肥肉"] },
  { food: "虾", terms: ["虾", "海鲜"] },
  { food: "海鲜", terms: ["海鲜", "螃蟹", "蟹", "贝类", "蛤蜊", "生蚝"] },
  { food: "花生", terms: ["花生"] },
  { food: "火锅", terms: ["火锅", "麻辣烫"] },
  { food: "动物内脏", terms: ["动物内脏", "内脏", "猪肝", "鸭肠"] },
  { food: "咸菜", terms: ["咸菜", "腌菜", "榨菜"] },
  { food: "腊肉香肠", terms: ["腊肉", "香肠", "腊肠", "加工肉"] },
  { food: "烧烤", terms: ["烧烤", "烤串", "烤肉"] },
  { food: "外卖快餐", terms: ["外卖", "快餐", "盒饭", "盖浇饭"] },
  { food: "甜饮料", terms: ["甜饮料", "奶茶", "可乐", "汽水", "饮料"] },
  { food: "奶茶", terms: ["奶茶"] },
  { food: "蛋糕", terms: ["蛋糕", "甜品", "点心", "饼干"] },
  { food: "面包", terms: ["面包", "吐司"] },
  { food: "汉堡", terms: ["汉堡"] },
  { food: "薯条", terms: ["薯条"] },
  { food: "披萨", terms: ["披萨", "比萨"] },
  { food: "苹果", terms: ["苹果"] },
  { food: "香蕉", terms: ["香蕉"] },
  { food: "水果", terms: ["水果", "梨", "橙子", "橘子", "葡萄"] },
  { food: "油条", terms: ["油条", "油饼"] },
];

const COMPOUND_SUPPRESSIONS = {
  "牛肉面": ["牛肉", "面条"],
  "方便面": ["面条"],
  "炒饭": ["米饭"],
  "番茄炒蛋": ["鸡蛋"],
  "排骨汤": ["牛肉"],
  "外卖快餐": ["米饭"],
  "汉堡": ["面包", "牛肉"],
  "奶茶": ["甜饮料", "牛奶"],
};

const MEAL_INTENT_TERMS = ["吃", "喝", "早餐", "早饭", "午餐", "午饭", "晚餐", "晚饭", "加餐", "宵夜", "饭", "菜", "汤", "今天", "刚刚"];
const NON_MEAL_TERMS = ["天气", "股票", "新闻", "打车", "买票", "照片", "截图", "报告", "密码", "地址", "电话"];
const TEXT_HIGH_SALT_TERMS = ["咸", "酱", "卤", "腌", "榨菜", "咸菜", "火锅", "麻辣烫", "方便面", "泡面", "烧烤"];
const TEXT_HIGH_OIL_TERMS = ["炸", "油炸", "煎", "红烧", "肥肉", "烧烤", "炒饭"];
const TEXT_SWEET_TERMS = ["甜", "糖", "奶茶", "可乐", "汽水", "饮料", "蛋糕", "甜品", "点心", "饼干"];
const TEXT_PURINE_TERMS = ["内脏", "猪肝", "鸭肠", "海鲜", "虾", "蟹", "火锅", "烧烤"];

const STEPS = [
  { id: "basic", kicker: "第 1 步", title: "先填写基础信息", text: "年龄、身高和体重会用于估算 BMI 和每日能量。" },
  { id: "activity", kicker: "第 2 步", title: "选择每天活动时间", text: "用时间量化活动量，长辈更容易判断。" },
  { id: "conditions", kicker: "第 3 步", title: "勾选慢病与红线", text: "每次餐食判断都会优先看这些红线。" },
  { id: "allergy", kicker: "第 4 步", title: "添加过敏黑名单", text: "过敏项会被当作最高优先级，推荐中自动避开。" },
  { id: "goals", kicker: "第 5 步", title: "选择当前目标", text: "系统会按目标调整下一餐建议的优先级。" },
  { id: "personal", kicker: "第 6 步", title: "补充个性化情况", text: "医生交代、牙口、胃口和家人提醒都可以写在这里。" },
];

const DEFAULT_STATE = {
  auth: {
    loggedIn: false,
    userId: "",
    authMode: "login",
    role: "elder",
    name: "",
    phone: "",
    identityStatus: "unverified",
    onboardingComplete: false,
  },
  ui: {
    fontSize: "standard",
  },
  mealMode: "before",
  mode: "elder",
  screen: "login",
  setupComplete: false,
  wizardStep: 0,
  wizardOpen: false,
  reportYear: TODAY.getFullYear(),
  reportMonth: TODAY.getMonth(),
  selectedReportDay: TODAY.getDate(),
  latestMealAlert: null,
  latestMealRecord: null,
  mealHistory: [],
  privacy: {
    accepted: false,
    acceptedAt: null,
  },
  profile: {
    nickname: "",
    age: "",
    sex: "female",
    height: "",
    weight: "",
    activity: "",
    conditions: [],
    customConditions: [],
    allergies: [],
    goals: [],
    customGoals: [],
    personal: "",
    familyGuard: false,
  },
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

let state = loadState();
let toastTimer = null;
let recognition = null;
let mediaRecorder = null;
let mediaStream = null;
let recordedAudioChunks = [];
let listening = false;
let speechStopTimer = null;
let voicePreviewTimer = null;
let speechHadError = false;
let currentSpeechText = "";
let speechPaused = false;
let pendingVoiceMeal = null;
let currentMealResult = null;
let lastFocusedElement = null;
let roleLastFocusedElement = null;
let lastPhotoFile = null;
let largestViewportHeight = window.visualViewport?.height || window.innerHeight;
let serviceStatus = {
  photoAnalysis: false,
  textAnalysis: true,
  textModelAvailable: false,
  textAnalysisMode: "client-rules",
  speechRecognition: "browser",
  checked: false,
};
let authConfig = { smsReady: false, smsMode: "disabled", registrationSmsRequired: true, passwordResetSmsRequired: true, identityReady: false, identityRequired: false, checked: false };
let authBusy = false;
let authCodeCooldown = 0;
let authCodeTimer = null;
let roleBusy = false;
let pendingRole = "elder";
let lastSyncedNickname = "";
let familyBinding = { loaded: false, linked: [], hasActiveInvite: false, inviteExpiresAt: null };
let familyBindingBusy = false;
let activeFamilyInvite = null;
let sharedHealthData = { loaded: false, elder: null, profile: null, setupComplete: false, meals: [], permissions: null, error: "" };
let healthProfileSyncTimer = null;
let healthDataHydrating = false;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  state.auth = { ...state.auth, loggedIn: false };
  state.screen = "login";
  buildChoices();
  bindEvents();
  syncForm();
  normalizeStartupRoute();
  renderAll();
  goToScreen(state.screen, false);
  await refreshAuthSession();
  refreshServiceStatus();
  updateKeyboardLayout();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const profile = { ...DEFAULT_STATE.profile, ...(saved.profile || {}) };
    profile.customConditions = Array.isArray(profile.customConditions) ? profile.customConditions : [];
    profile.customGoals = Array.isArray(profile.customGoals) ? profile.customGoals : [];
    profile.allergies = Array.isArray(profile.allergies) ? profile.allergies : [];
    profile.conditions = Array.isArray(profile.conditions) ? profile.conditions : [];
    profile.goals = Array.isArray(profile.goals) ? profile.goals : [];
    const auth = { ...DEFAULT_STATE.auth, ...(saved.auth || {}) };
    const ui = { ...DEFAULT_STATE.ui, ...(saved.ui || {}) };
    const privacy = { ...DEFAULT_STATE.privacy, ...(saved.privacy || {}) };
    return {
      ...DEFAULT_STATE,
      ...saved,
      auth,
      ui,
      privacy,
      profile,
      latestMealAlert: saved.latestMealAlert && typeof saved.latestMealAlert === "object" ? saved.latestMealAlert : null,
      latestMealRecord: saved.latestMealRecord && typeof saved.latestMealRecord === "object" ? saved.latestMealRecord : null,
      mealHistory: Array.isArray(saved.mealHistory) ? saved.mealHistory.slice(-200) : [],
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeStartupRoute() {
  state.auth = { ...DEFAULT_STATE.auth, ...(state.auth || {}) };
  state.ui = { ...DEFAULT_STATE.ui, ...(state.ui || {}) };
  if (!state.auth.loggedIn) {
    state.screen = "login";
    state.wizardOpen = false;
    state.mode = state.auth.role === "family" ? "family" : "elder";
    return;
  }
  if (state.screen === "login") {
    state.screen = state.auth.role === "family" ? "family" : "home";
  }
  if (state.screen === "family" || state.screen === "report") {
    state.mode = "family";
  } else if (state.screen === "home" || state.screen === "voice" || state.screen === "photo") {
    state.mode = "elder";
  }
}

function buildChoices() {
  $("#activityChoices").innerHTML = ACTIVITIES.map((item) => `
    <button class="choice-tile" type="button" data-choice-group="activity" data-choice-value="${item.id}" aria-pressed="false">
      <span class="choice-dot" aria-hidden="true"></span>
      <span>${item.name}<small>${item.desc}</small></span>
    </button>
  `).join("");

  $("#conditionChoices").innerHTML = CONDITIONS.filter((item) => COMMON_CONDITION_IDS.includes(item.id)).map((item) => `
    <button class="choice-tile" type="button" data-choice-group="condition" data-choice-value="${item.id}" aria-pressed="false">
      <span class="choice-dot" aria-hidden="true"></span>
      <span>${item.name}<small>${item.rule}</small></span>
    </button>
  `).join("");

  $("#goalChoices").innerHTML = GOALS.map((item) => `
    <button class="choice-tile" type="button" data-choice-group="goal" data-choice-value="${item.id}" aria-pressed="false">
      <span class="choice-dot" aria-hidden="true"></span>
      <span>${item.name}</span>
    </button>
  `).join("");
  bindChoiceTiles();
}

function bindChoiceTiles() {
  $$(".choice-tile").forEach((tile) => {
    bindPress(tile, () => selectChoiceTile(tile));
  });
}

function selectChoiceTile(tile) {
  const group = tile.dataset.choiceGroup;
  const value = tile.dataset.choiceValue;
  if (!group || !value) return;
  if (group === "activity") {
    state.profile.activity = value;
  } else if (group === "condition") {
    state.profile.conditions = toggleArrayValue(state.profile.conditions, value);
  } else if (group === "goal") {
    state.profile.goals = toggleArrayValue(state.profile.goals, value);
  } else {
    return;
  }
  syncChoiceButtons();
  updateProfileFromForm();
}

function toggleArrayValue(list = [], value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function syncChoiceButtons() {
  $$("[data-choice-group]").forEach((button) => {
    const group = button.dataset.choiceGroup;
    const value = button.dataset.choiceValue;
    const selected = group === "activity"
      ? state.profile.activity === value
      : group === "condition"
        ? state.profile.conditions.includes(value)
        : group === "goal"
          ? state.profile.goals.includes(value)
          : false;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function bindEvents() {
  $("#authForm").addEventListener("submit", handleAuthSubmit);
  $("#authSubmit").addEventListener("click", handleAuthSubmit);
  $$("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      setAuthMode(button.dataset.authMode);
    });
  });
  $("#forgotPassword").addEventListener("click", () => setAuthMode(state.auth.authMode === "reset" ? "login" : "reset"));
  $("#sendAuthCode").addEventListener("click", requestAuthCode);
  $$("[data-session-role]").forEach((button) => {
    button.addEventListener("click", () => selectPendingRole(button.dataset.sessionRole));
  });
  $("#confirmRole").addEventListener("click", confirmRoleSelection);
  $("#closeRoleModal").addEventListener("click", closeRoleModal);
  $("#roleModal").addEventListener("click", (event) => {
    if (event.target === $("#roleModal")) closeRoleModal();
  });
  $("#roleLogout").addEventListener("click", async () => {
    closeRoleModal(false);
    await handleLogout();
  });
  const clearLocalDataButton = $("#clearLocalData");
  if (clearLocalDataButton) clearLocalDataButton.addEventListener("click", clearLocalData);
  const privacyConsentButton = $("#privacyConsent");
  if (privacyConsentButton) privacyConsentButton.addEventListener("click", () => {
    setPrivacyConsent(privacyConsentButton.getAttribute("aria-checked") !== "true");
  });

  $("#modeSwitch").addEventListener("click", () => openRoleModal(state.auth.role));

  $$("[data-go]").forEach((button) => button.addEventListener("click", () => goToScreen(button.dataset.go)));
  $$(".bottom-nav button").forEach((button) => button.addEventListener("click", () => goToScreen(button.dataset.screen)));
  $$("[data-meal-mode]").forEach((button) => {
    button.addEventListener("click", () => setMealMode(button.dataset.mealMode));
  });

  $("#profileWizard").addEventListener("input", updateProfileFromForm);
  $("#profileWizard").addEventListener("change", updateProfileFromForm);
  $("#addAllergy").addEventListener("click", addAllergy);
  $("#addCondition").addEventListener("click", addCustomCondition);
  $("#addGoal").addEventListener("click", addCustomGoal);
  $("#allergyInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addAllergy();
    }
  });
  $("#conditionCustomInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomCondition();
    }
  });
  $("#goalCustomInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomGoal();
    }
  });
  $("#stepBack").addEventListener("click", previousStep);
  $("#stepNext").addEventListener("click", nextStep);
  $("#stepClose").addEventListener("click", closeWizard);

  $("#recordButton").addEventListener("click", toggleSpeech);
  $("#voiceAnalyze").addEventListener("click", analyzeVoiceMeal);
  const photoInput = $("#photoInput");
  if (photoInput) photoInput.addEventListener("change", handlePhoto);
  $$("[data-photo-picker]").forEach((button) => {
    button.addEventListener("click", () => openPhotoPicker(button.dataset.photoPicker));
  });
  $$("[data-photo-picker-label]").forEach((label) => {
    label.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openPhotoPicker(label.dataset.photoPickerLabel);
    });
  });
  const photoReset = $("#photoReset");
  if (photoReset) photoReset.addEventListener("click", () => showToast("请选择一张饭菜照片"));
  const familyProfileHelp = $("#familyProfileHelp");
  if (familyProfileHelp) familyProfileHelp.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void openBindModal();
  });
  $("#bindFamily").addEventListener("click", openBindModal);
  $("#closeBindModal").addEventListener("click", closeBindModal);
  $("#bindModal").addEventListener("click", (event) => {
    if (event.target === $("#bindModal")) closeBindModal();
  });
  $("#bindSheet").addEventListener("click", handleBindModalClick);
  $("#bindSheet").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches("#familyBindCode")) {
      event.preventDefault();
      void submitFamilyBinding();
    }
  });
  $("#mealResultModal").addEventListener("click", (event) => {
    if (event.target === $("#mealResultModal")) closeMealResultModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!$("#roleModal").hidden) {
      closeRoleModal();
      return;
    }
    if (!$("#mealResultModal").hidden) closeMealResultModal();
    if (!$("#bindModal").hidden) closeBindModal();
  });
  document.addEventListener("click", (event) => {
    const portionSelect = event.target.closest("[data-portion-select]");
    if (portionSelect) return;
    const removeFood = event.target.closest("[data-remove-pending-food]");
    if (removeFood) {
      removePendingFood(removeFood.dataset.removePendingFood);
      return;
    }
    const addFood = event.target.closest("[data-add-pending-food]");
    if (addFood) {
      addPendingFood();
      return;
    }
    const confirmMeal = event.target.closest("[data-confirm-meal]");
    if (confirmMeal) {
      confirmPendingMeal();
      return;
    }
    const photoRetry = event.target.closest("[data-photo-retry]");
    if (photoRetry) {
      retryLastPhoto();
      return;
    }
    const photoToText = event.target.closest("[data-photo-to-text]");
    if (photoToText) {
      goToScreen("voice");
      requestAnimationFrame(() => $("#voiceText")?.focus());
      return;
    }
    const modalAction = event.target.closest("[data-meal-result-action]");
    if (modalAction) {
      handleMealResultAction(modalAction.dataset.mealResultAction);
      return;
    }
    const speechButton = event.target.closest("[data-speech-toggle]");
    if (speechButton) toggleSpeechPlayback();
    const familyButton = event.target.closest("[data-family-action]");
    if (familyButton) handleFamilyAction(familyButton.dataset.familyAction);
  });
  $("#prevMonth").addEventListener("click", () => changeMonth(-1));
  $("#nextMonth").addEventListener("click", () => changeMonth(1));
  document.addEventListener("change", (event) => {
    const select = event.target.closest("[data-portion-select]");
    if (select) updatePendingPortion(select.dataset.portionSelect, select.value);
  });
  document.addEventListener("focusin", (event) => {
    if (event.target.matches("input, textarea, select")) hideToast();
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateKeyboardLayout);
    window.visualViewport.addEventListener("scroll", updateKeyboardLayout);
  }
}

function openPhotoPicker(inputId) {
  const input = $(`#${inputId}`);
  if (!input) return;
  try {
    input.value = "";
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.click();
    }
    showToast("请选择一张饭菜照片");
  } catch {
    try {
      input.click();
      showToast("请选择一张饭菜照片");
    } catch {
      showToast("请使用下方的系统选择文件按钮");
    }
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (authBusy) return;
  setAuthError("");
  const mode = ["login", "register", "reset"].includes(state.auth.authMode) ? state.auth.authMode : "login";
  const phone = $("#authPhone").value.trim();
  const password = $("#authPassword").value;
  const code = $("#authCode").value.trim();
  const confirmPassword = $("#authPasswordConfirm").value;
  if (mode !== "login" && password !== confirmPassword) {
    setAuthError("两次输入的密码不一致。");
    return;
  }
  if (mode === "register" && $("#privacyConsent")?.getAttribute("aria-checked") !== "true") {
    setAuthError("请先阅读并确认数据说明。");
    return;
  }
  setAuthBusy(true);
  try {
    if (mode === "login") {
      const result = await authApi("/api/auth/login", { phone, password });
      completeAuthentication(result.user, false, true);
      showToast("登录成功");
      return;
    }
    if (mode === "register") {
      const payload = {
        phone,
        code,
        password,
      };
      const result = await authApi("/api/auth/register", payload);
      completeAuthentication(result.user, true, true);
      showToast("注册成功");
      return;
    }
    await authApi("/api/auth/password-reset/confirm", { phone, code, password });
    setAuthMode("login");
    $("#authPassword").value = "";
    $("#authPasswordConfirm").value = "";
    $("#authCode").value = "";
    showToast("密码已更新，请重新登录");
  } catch (error) {
    setAuthError(error.message || "账号服务暂时不可用，请稍后再试。");
  } finally {
    setAuthBusy(false);
  }
}

function renderAuth() {
  const isAuthScreen = state.screen === "login" || !state.auth?.loggedIn;
  $(".app-shell").classList.toggle("is-auth-screen", isAuthScreen);
  const mode = ["login", "register", "reset"].includes(state.auth?.authMode) ? state.auth.authMode : "login";
  const needsSms = mode === "register"
    ? (authConfig.registrationSmsRequired ?? authConfig.smsVerificationRequired) !== false
    : mode === "reset" ? authConfig.passwordResetSmsRequired !== false : false;
  $$("[data-auth-mode]").forEach((button) => button.classList.toggle("is-active", button.dataset.authMode === mode));
  $$("[data-auth-register]").forEach((node) => { node.hidden = mode !== "register"; });
  $$("[data-auth-code]").forEach((node) => { node.hidden = !needsSms; });
  $$("[data-auth-new-password]").forEach((node) => { node.hidden = mode === "login"; });
  const consent = $("#privacyConsent");
  if (consent) {
    const accepted = Boolean(state.privacy?.accepted);
    consent.setAttribute("aria-checked", accepted ? "true" : "false");
    consent.classList.toggle("is-checked", accepted);
  }
  $("#loginTitle").textContent = mode === "register" ? "创建慧食账号" : mode === "reset" ? "找回密码" : "手机号登录";
  $("#loginIntro").textContent = mode === "register"
    ? needsSms ? "验证手机号并设置密码，之后可在这台设备安全登录。" : "测试期间直接使用手机号设置密码。"
    : mode === "reset"
      ? "通过短信验证码设置新密码。"
      : "登录后继续使用语音记餐、拍照识别和健康提醒。";
  $("#authPasswordLabel").textContent = mode === "login" ? "密码" : "设置新密码";
  $("#authPassword").autocomplete = mode === "login" ? "current-password" : "new-password";
  $("#authPassword").placeholder = mode === "login" ? "请输入密码" : "8 至 72 个字符";
  $("#authSubmit").textContent = mode === "register" ? "完成注册" : mode === "reset" ? "更新密码" : "登录";
  $("#forgotPassword").hidden = mode === "register";
  $("#forgotPassword").textContent = mode === "reset" ? "返回登录" : "忘记密码";
  $("#authHelper").textContent = mode === "login"
    ? "账号密码经过安全哈希处理，服务器不会保存明文密码。"
    : mode === "register" && !needsSms
      ? "当前为测试模式，无需短信验证码；密码请勿使用连续或重复数字。"
      : mode === "register"
        ? "短信验证码 5 分钟内有效；密码请勿使用连续或重复数字。"
        : "更新密码后，其他设备上的登录会自动失效。";
  const serviceNotice = $("#authServiceNotice");
  if (serviceNotice) {
    serviceNotice.hidden = mode === "login" || (authConfig.checked && needsSms && authConfig.smsReady && authConfig.smsMode !== "debug");
    serviceNotice.textContent = !authConfig.checked
      ? "正在检查账号服务…"
      : !needsSms
        ? "当前为测试注册模式：无需短信验证码，手机号会作为账号唯一标识。找回密码仍需短信验证。"
      : !authConfig.smsReady
        ? "短信服务正在配置，暂时不能注册或找回密码。"
        : authConfig.smsMode === "debug"
          ? "当前是本地调试模式：验证码不会发送到手机，获取后会自动填入。"
          : "验证码将发送到该手机号，5 分钟内有效。";
  }
  updateAuthCodeButton();
  $("#authSubmit").disabled = authBusy || (needsSms && authConfig.checked && !authConfig.smsReady);
}

function setAuthMode(mode) {
  state.auth.authMode = ["login", "register", "reset"].includes(mode) ? mode : "login";
  setAuthError("");
  $("#authCode").value = "";
  $("#authPassword").value = "";
  $("#authPasswordConfirm").value = "";
  renderAuth();
  saveState();
}

async function requestAuthCode() {
  if (authBusy || authCodeCooldown > 0) return;
  const mode = state.auth.authMode;
  if (mode !== "register" && mode !== "reset") return;
  setAuthError("");
  setAuthBusy(true);
  try {
    const endpoint = mode === "reset" ? "/api/auth/password-reset/request" : "/api/auth/sms/request";
    const payload = mode === "reset"
      ? { phone: $("#authPhone").value.trim() }
      : { phone: $("#authPhone").value.trim(), purpose: "register" };
    const result = await authApi(endpoint, payload);
    startAuthCodeCooldown(Number(result.retryAfter || 60));
    if (result.delivery === "debug" && result.debugCode) {
      $("#authCode").value = result.debugCode;
      showToast("本地调试验证码已自动填入");
    } else {
      showToast("验证码已发送，请查看短信");
    }
  } catch (error) {
    setAuthError(error.message || "验证码发送失败，请稍后再试。");
  } finally {
    setAuthBusy(false);
  }
}

function startAuthCodeCooldown(seconds) {
  clearInterval(authCodeTimer);
  authCodeCooldown = Math.max(1, Math.min(120, Math.floor(seconds)));
  updateAuthCodeButton();
  authCodeTimer = setInterval(() => {
    authCodeCooldown -= 1;
    updateAuthCodeButton();
    if (authCodeCooldown <= 0) clearInterval(authCodeTimer);
  }, 1000);
}

function updateAuthCodeButton() {
  const button = $("#sendAuthCode");
  if (!button) return;
  button.textContent = authCodeCooldown > 0 ? `${authCodeCooldown} 秒后重发` : "获取验证码";
  button.disabled = authBusy || authCodeCooldown > 0 || (authConfig.checked && !authConfig.smsReady);
}

function setAuthBusy(busy) {
  authBusy = Boolean(busy);
  $("#authForm")?.setAttribute("aria-busy", authBusy ? "true" : "false");
  renderAuth();
}

function setAuthError(message) {
  const error = $("#authError");
  if (!error) return;
  error.textContent = message;
  error.hidden = !message;
}

async function authApi(pathname, body) {
  let response;
  try {
    response = await fetch(pathname, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("无法连接账号服务，请检查网络后重试。");
  }
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.message || "账号服务暂时不可用，请稍后再试。");
  return data;
}

async function hydrateOwnHealthData() {
  if (!state.auth.loggedIn || state.auth.role !== "elder" || healthDataHydrating) return;
  healthDataHydrating = true;
  try {
    let cloud = await authApi("/api/auth/health-data");
    if (!cloud.profile && (hasMeaningfulLocalHealthData() || state.mealHistory.length)) {
      cloud = await authApi("/api/auth/health-import", {
        profile: state.profile,
        setupComplete: state.setupComplete,
        meals: state.mealHistory,
      });
    }
    applyOwnHealthData(cloud);
  } catch (error) {
    showToast(error.message || "云端健康数据读取失败，已保留本机副本");
  } finally {
    healthDataHydrating = false;
  }
}

function applyOwnHealthData(cloud) {
  if (!cloud || typeof cloud !== "object") return;
  if (cloud.profile) {
    const localFamilyGuard = Boolean(state.profile.familyGuard);
    state.profile = { ...structuredClone(DEFAULT_STATE.profile), ...cloud.profile, familyGuard: localFamilyGuard };
    state.setupComplete = Boolean(cloud.setupComplete);
  }
  if (Array.isArray(cloud.meals)) applyMealHistory(cloud.meals);
  syncForm();
  saveState();
  renderAll();
}

function applyMealHistory(records) {
  state.mealHistory = records.slice(-500);
  state.latestMealRecord = state.mealHistory.at(-1) || null;
  state.latestMealAlert = [...state.mealHistory].reverse().find((record) => record.level !== "green" && !record.handled) || null;
}

function hasMeaningfulLocalHealthData() {
  const profile = state.profile || {};
  return Boolean(
    state.setupComplete
    || profile.nickname
    || profile.age
    || profile.height
    || profile.weight
    || profile.activity
    || profile.personal
    || profile.conditions?.length
    || profile.customConditions?.length
    || profile.allergies?.length
    || profile.goals?.length
    || profile.customGoals?.length
  );
}

function scheduleHealthProfileSync() {
  if (!state.auth.loggedIn || state.auth.role !== "elder") return;
  clearTimeout(healthProfileSyncTimer);
  healthProfileSyncTimer = setTimeout(() => void syncHealthProfile(), 450);
}

async function syncHealthProfile() {
  if (!state.auth.loggedIn || state.auth.role !== "elder") return;
  try {
    await authApi("/api/auth/health-profile", {
      profile: state.profile,
      setupComplete: state.setupComplete,
    });
  } catch (error) {
    showToast(error.message || "档案已保存在本机，云端同步稍后重试");
  }
}

async function syncMealRecord(record) {
  if (!state.auth.loggedIn || state.auth.role !== "elder" || !record) return;
  try {
    await authApi("/api/auth/meal-record", { record });
  } catch (error) {
    showToast(error.message || "餐食已保存在本机，云端同步稍后重试");
  }
}

async function refreshSharedHealthData() {
  if (!state.auth.loggedIn || state.auth.role !== "family") return;
  const relation = (familyBinding.linked || []).find((item) => item.relationship === "elder");
  if (!relation?.user?.id) {
    sharedHealthData = { loaded: true, elder: null, profile: null, setupComplete: false, meals: [], permissions: null, error: "" };
    renderFamily();
    return;
  }
  sharedHealthData = { loaded: false, elder: relation.user, profile: null, setupComplete: false, meals: [], permissions: relation.permissions || null, error: "" };
  renderFamily();
  try {
    const data = await authApi(`/api/auth/health-data?elderUserId=${encodeURIComponent(relation.user.id)}`);
    sharedHealthData = { ...data, loaded: true, error: "" };
  } catch (error) {
    sharedHealthData = { loaded: true, elder: relation.user, profile: null, setupComplete: false, meals: [], permissions: relation.permissions || null, error: error.message || "共享数据读取失败" };
  }
  renderFamily();
  if (state.screen === "report") {
    renderCalendar();
    renderSelectedDayScore();
  }
}

function completeAuthentication(user, acceptedPrivacy, promptForRole = false) {
  const role = user?.role === "family" ? "family" : "elder";
  const previousUserId = state.auth?.userId || "";
  const previousPhone = state.auth?.phone || "";
  const sameKnownAccount = previousUserId === user?.id || (!previousUserId && previousPhone && previousPhone === user?.phone);
  if (acceptedPrivacy) {
    resetLocalHealthData();
  } else if (!sameKnownAccount) {
    resetLocalHealthData();
  }
  state.auth = {
    ...state.auth,
    loggedIn: true,
    userId: user?.id || "",
    authMode: "login",
    role,
    name: user?.nickname || (role === "family" ? "家人" : "长辈"),
    phone: user?.phone || "",
    identityStatus: user?.identityStatus || "unverified",
    onboardingComplete: Boolean(user?.onboardingComplete),
  };
  state.profile.nickname = user?.nickname || "";
  lastSyncedNickname = user?.nickname || "";
  if (acceptedPrivacy) state.privacy = { accepted: true, acceptedAt: new Date().toISOString() };
  state.mode = role;
  state.wizardOpen = false;
  state.screen = role === "family" ? "family" : "home";
  $("#authPassword").value = "";
  $("#authPasswordConfirm").value = "";
  $("#authCode").value = "";
  $("#nicknameInput").value = state.profile.nickname;
  saveState();
  renderAll();
  goToScreen(state.screen, false);
  familyBinding = { loaded: false, linked: [], hasActiveInvite: false, inviteExpiresAt: null };
  sharedHealthData = { loaded: false, elder: null, profile: null, setupComplete: false, meals: [], permissions: null, error: "" };
  activeFamilyInvite = null;
  void refreshFamilyBindingStatus();
  if (role === "elder") void hydrateOwnHealthData();
  if (promptForRole) openRoleModal(role);
}

function resetLocalHealthData() {
  state.profile = structuredClone(DEFAULT_STATE.profile);
  state.setupComplete = false;
  state.mealHistory = [];
  state.latestMealAlert = null;
  state.latestMealRecord = null;
}

function openRoleModal(role = state.auth.role) {
  if (!state.auth.loggedIn) return;
  roleLastFocusedElement = document.activeElement;
  pendingRole = role === "family" ? "family" : "elder";
  $("#roleError").hidden = true;
  $("#roleError").textContent = "";
  $(".app-shell").inert = true;
  $("#roleModal").hidden = false;
  renderRoleSelection();
  requestAnimationFrame(() => $("[data-session-role].is-active")?.focus());
}

function closeRoleModal(restoreFocus = true) {
  $("#roleModal").hidden = true;
  $(".app-shell").inert = false;
  if (restoreFocus) roleLastFocusedElement?.focus({ preventScroll: true });
  roleLastFocusedElement = null;
}

function selectPendingRole(role) {
  if (roleBusy) return;
  pendingRole = role === "family" ? "family" : "elder";
  renderRoleSelection();
}

function renderRoleSelection() {
  $$("[data-session-role]").forEach((button) => {
    const selected = button.dataset.sessionRole === pendingRole;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-checked", selected ? "true" : "false");
  });
  $("#confirmRole").disabled = roleBusy;
  $("#confirmRole").textContent = roleBusy ? "正在保存…" : "确认使用方式";
}

async function confirmRoleSelection() {
  if (roleBusy) return;
  roleBusy = true;
  renderRoleSelection();
  try {
    const result = await authApi("/api/auth/role", { role: pendingRole });
    closeRoleModal(false);
    completeAuthentication(result.user, false, false);
    showToast(pendingRole === "family" ? "已进入家人照护" : "已进入本人记录");
  } catch (error) {
    $("#roleError").textContent = error.message || "使用方式保存失败，请重试。";
    $("#roleError").hidden = false;
  } finally {
    roleBusy = false;
    renderRoleSelection();
  }
}

async function refreshAuthSession() {
  try {
    const result = await authApi("/api/auth/status");
    authConfig = { ...authConfig, ...(result.config || {}), checked: true };
    if (result.authenticated && result.user) {
      completeAuthentication(result.user, false, !result.user.onboardingComplete);
      return;
    }
  } catch {
    authConfig.checked = true;
  }
  state.auth = { ...DEFAULT_STATE.auth, authMode: state.auth?.authMode || "login" };
  state.screen = "login";
  normalizeStartupRoute();
  renderAll();
  goToScreen("login", false);
}

async function handleLogout() {
  try { await authApi("/api/auth/logout", {}); } catch {}
  state.auth = { ...DEFAULT_STATE.auth, role: state.auth?.role === "family" ? "family" : "elder" };
  state.screen = "login";
  state.wizardOpen = false;
  familyBinding = { loaded: false, linked: [], hasActiveInvite: false, inviteExpiresAt: null };
  sharedHealthData = { loaded: false, elder: null, profile: null, setupComplete: false, meals: [], permissions: null, error: "" };
  activeFamilyInvite = null;
  saveState();
  renderAll();
  goToScreen("login", false);
  showToast("已退出登录");
}

function setPrivacyConsent(accepted) {
  state.privacy = {
    accepted,
    acceptedAt: accepted ? (state.privacy?.acceptedAt || new Date().toISOString()) : null,
  };
  const consent = $("#privacyConsent");
  consent?.setAttribute("aria-checked", accepted ? "true" : "false");
  consent?.classList.toggle("is-checked", accepted);
  saveState();
}

function clearLocalData() {
  if (!window.confirm("确定清除这台设备上的健康档案和餐食记录吗？此操作不能撤销。")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = structuredClone(DEFAULT_STATE);
  window.location.reload();
}

function renderAll() {
  applyFontSize();
  renderAuth();
  renderMealMode();
  renderMode();
  renderPhotoAccessHint();
  renderRiskStrip();
  renderHomeTimeline();
  renderProfile();
  renderWizard();
  renderCalendar();
  renderSelectedDayScore();
  renderFamily();
  renderNav();
}

function renderPhotoAccessHint() {
  const hint = $("#photoAccessHint");
  if (!hint) return;
  hint.textContent = location.protocol === "file:"
    ? "当前是文件打开模式，如不能打开相册，请用本地服务地址访问。"
    : serviceStatus.photoAnalysis
      ? "照片会由当前服务器分析，完成后请核对识别出的食物。"
      : serviceStatus.checked
        ? "当前服务器未配置照片识别，所选照片不会上传。请先改用文字记录。"
        : "正在检查照片识别服务。";
}

function renderMode() {
  const isFamily = state.mode === "family";
  $("#modeLabel").textContent = isFamily ? "家人照护" : "本人记录";
  $("#modeSwitch").textContent = "切换方式";
}

function setMealMode(mode) {
  state.mealMode = mode === "after" ? "after" : "before";
  pendingVoiceMeal = null;
  $("#voiceConfirm").hidden = true;
  $("#voiceConfirm").innerHTML = "";
  $("#voiceResult").innerHTML = "";
  renderMealMode();
  saveState();
}

function renderMealMode() {
  const mode = state.mealMode === "after" ? "after" : "before";
  const isBefore = mode === "before";
  $$("[data-meal-mode]").forEach((button) => {
    const active = button.dataset.mealMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  const title = $("#voiceTitle");
  const hint = $("#voiceModeHint");
  const recordHint = $("#recordHint");
  const text = $("#voiceText");
  const analyze = $("#voiceAnalyze");
  const recorder = $(".voice-recorder");
  const recordButton = $("#recordButton");
  if (!title || !hint || !recordHint || !text || !analyze || !recorder || !recordButton) return;
  const canUseServerSpeech = serviceStatus.speechRecognition === "server"
    && navigator.mediaDevices?.getUserMedia
    && window.MediaRecorder;
  const canRecognizeSpeech = Boolean(window.isSecureContext && (canUseServerSpeech || window.SpeechRecognition || window.webkitSpeechRecognition));
  recorder.classList.toggle("is-unavailable", !canRecognizeSpeech);
  recordButton.hidden = false;
  title.textContent = isBefore ? "饭前先问问" : "饭后记一记";
  hint.textContent = isBefore ? "没听清可以打字，或改一改。" : "吃完可以补记，系统会顺手给下次建议。";
  recordHint.textContent = isBefore ? "比如：“这碗热干面我能吃吗？”" : "比如：“我吃了半碗米饭、一个鸡蛋、一份青菜。”";
  analyze.textContent = isBefore ? "帮我看看" : "帮我记录并判断";
  text.placeholder = isBefore ? "这碗热干面我能吃吗？" : "我吃了半碗米饭、一个鸡蛋、一份青菜";
  if (!listening) $("#recordLabel").textContent = "点一下，开口说";
  if (!canRecognizeSpeech) {
    recordHint.textContent = "当前测试地址不是安全连接，接入 HTTPS 后即可使用麦克风。文字输入仅作备用。";
  }
}

function applyFontSize() {
  const size = ["standard", "large", "xlarge"].includes(state.ui?.fontSize) ? state.ui.fontSize : "standard";
  document.documentElement.dataset.fontSize = size;
}

function setFontSize(size) {
  if (!["standard", "large", "xlarge"].includes(size)) return;
  const currentSize = state.ui?.fontSize || "standard";
  if (currentSize === size) {
    applyFontSize();
    return;
  }
  state.ui.fontSize = size;
  applyFontSize();
  renderProfile();
  saveState();
  const label = size === "standard" ? "标准" : size === "large" ? "大" : "特大";
  showToast(`字号已切换为${label}`);
}

function goToScreen(screen, persist = true) {
  const requested = $(`#screen-${screen}`) ? screen : "home";
  const target = state.auth?.loggedIn || requested === "login" ? requested : "login";
  state.screen = target;
  if (target === "family" || target === "report") state.mode = "family";
  if (target === "home" || target === "voice" || target === "photo") state.mode = "elder";
  $$(".screen").forEach((node) => node.classList.toggle("is-active", node.id === `screen-${target}`));
  renderAuth();
  renderMode();
  renderNav();
  if (target === "profile") {
    renderProfile();
    renderWizard();
  }
  if (target === "report") {
    renderCalendar();
    renderSelectedDayScore();
  }
  if (target === "family") renderFamily();
  if (persist) saveState();
  window.scrollTo({ top: 0, behavior: "auto" });
  $("#main").focus({ preventScroll: true });
}

function renderNav() {
  const nav = $(".bottom-nav");
  if (state.screen === "login" || !state.auth?.loggedIn) {
    nav.hidden = true;
    return;
  }
  nav.hidden = false;
  let visibleCount = 0;
  $$(".bottom-nav button").forEach((button) => {
    const role = button.dataset.role;
    button.hidden = Boolean(role && role !== state.mode);
    if (!button.hidden) visibleCount += 1;
    const active = button.dataset.screen === state.screen;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  $(".bottom-nav").style.gridTemplateColumns = `repeat(${Math.max(1, visibleCount)}, 1fr)`;
}

function renderRiskStrip() {
  const conditions = [
    ...state.profile.conditions.map((id) => CONDITIONS.find((item) => item.id === id)?.name).filter(Boolean),
    ...state.profile.customConditions,
  ];
  const allergies = state.profile.allergies;
  const parts = [...conditions.slice(0, 2), ...allergies.map((item) => `过敏：${item}`).slice(0, 2)];
  $("#riskStrip").innerHTML = `
    <div>需注意：${parts.length ? escapeHtml(parts.join("、")) : "暂无慢病或过敏黑名单"}</div>
    <small>${state.profile.familyGuard ? "本机家人视图已开启，可在这台设备查看记录。" : "可在档案中开启本机家人视图。"}</small>
  `;
}

function renderHomeTimeline() {
  const timeline = $("#todayTimeline");
  const summary = $("#todayRecordSummary");
  if (!timeline || !summary) return;
  const todayKey = formatLocalDateKey(new Date());
  const todayRecords = (Array.isArray(state.mealHistory) ? state.mealHistory : [])
    .filter((record) => record?.dateKey === todayKey);
  const periods = [
    { id: "breakfast", label: "早餐" },
    { id: "lunch", label: "午餐" },
    { id: "dinner", label: "晚餐" },
  ];
  summary.textContent = todayRecords.length ? `今日已记录 ${todayRecords.length} 条` : "仅显示真实记录";
  timeline.innerHTML = periods.map((period) => {
    const records = todayRecords.filter((record) => getMealPeriod(record) === period.id);
    const foods = Array.from(new Set(records.flatMap((record) => Array.isArray(record.foods) ? record.foods : []))).slice(0, 3);
    const detail = records.length
      ? `已记录${records.length > 1 ? ` ${records.length} 条` : ""}${foods.length ? ` · ${foods.join("、")}` : ""}`
      : "尚未记录";
    return `
      <div class="timeline-row ${records.length ? "has-record" : "muted"}">
        <strong>${period.label}</strong>
        <span>${escapeHtml(detail)}</span>
      </div>
    `;
  }).join("");
}

function getMealPeriod(record) {
  if (["breakfast", "lunch", "dinner"].includes(record?.mealPeriod)) return record.mealPeriod;
  const recordedAt = record?.recordedAt ? new Date(record.recordedAt) : null;
  let hour = recordedAt && !Number.isNaN(recordedAt.getTime()) ? recordedAt.getHours() : NaN;
  if (!Number.isFinite(hour)) {
    const match = String(record?.updated || "").match(/(\d{1,2}):\d{2}/);
    hour = match ? Number(match[1]) : 12;
  }
  if (hour < 10) return "breakfast";
  if (hour < 16) return "lunch";
  return "dinner";
}

function renderProfile() {
  $("#profileTitle").textContent = state.mode === "family" ? "长辈健康档案" : "我的健康档案";
  const activity = ACTIVITIES.find((item) => item.id === state.profile.activity) || { name: "未填写", desc: "请补充每天活动时间" };
  const conditionNames = [
    ...state.profile.conditions.map((id) => CONDITIONS.find((item) => item.id === id)?.name).filter(Boolean),
    ...state.profile.customConditions,
  ];
  const goalNames = [
    ...state.profile.goals.map((id) => GOALS.find((item) => item.id === id)?.name).filter(Boolean),
    ...state.profile.customGoals,
  ];
  const cards = [
    { step: "basic", title: "基础信息", value: state.profile.nickname || "未填写姓名", text: state.profile.age ? `${state.profile.age} 岁 · ${state.profile.sex === "male" ? "男" : "女"} · ${state.profile.height || "--"} cm / ${state.profile.weight || "--"} kg` : "请补充姓名、年龄、身高和体重", tone: "blue" },
    { step: "activity", title: "活动时间", value: activity.name, text: activity.desc, tone: "green" },
    { step: "conditions", title: "慢病红线", value: conditionNames.length ? `${conditionNames.length} 项` : "未选择", text: conditionNames.join("、") || "补充高血压、糖尿病等", tone: "red" },
    { step: "allergy", title: "过敏黑名单", value: state.profile.allergies.length ? `${state.profile.allergies.length} 项` : "暂无", text: state.profile.allergies.join("、") || "可添加花生、虾等", tone: "yellow" },
    { step: "goals", title: "目标设定", value: goalNames.length ? `${goalNames.length} 个` : "未设置", text: goalNames.join("、") || "控糖、稳血压、补蛋白", tone: "blue" },
    { step: "personal", title: "个性化与本机视图", value: state.profile.familyGuard ? "本机可见" : "未开启", text: state.profile.personal || "可补充医生交代", tone: "green" },
  ];
  const [primaryCards, extraCards] = [cards.slice(0, 4), cards.slice(4)];

  $("#profileCards").innerHTML = `
    <section class="profile-compact-panel" aria-label="档案摘要">
      <div class="profile-compact-head">
        <div>
          <span>${state.mode === "family" ? "家人协助填写" : "档案摘要"}</span>
          <strong>${state.mode === "family" ? "帮长辈把红线填准确" : "点击一行即可修改"}</strong>
        </div>
        <button class="compact-edit-all" type="button" data-edit-step="basic">逐步修改</button>
      </div>
      <div class="profile-summary-list">
        ${primaryCards.map(renderProfileRow).join("")}
      </div>
      <details class="profile-extra-details">
        <summary>展开目标和个性化</summary>
        <div class="profile-summary-list">
          ${extraCards.map(renderProfileRow).join("")}
        </div>
      </details>
    </section>
  `;

  $$("[data-edit-step]").forEach((button) => {
    button.addEventListener("click", () => openWizard(STEPS.findIndex((step) => step.id === button.dataset.editStep)));
  });

  $("#profileInsights").innerHTML = renderProfileInsights();
  applyBmiMeterPosition();
  bindProfileSettingEvents();
}

function renderProfileRow(card) {
  return `
    <button class="profile-summary-card ${escapeHtml(card.tone || "")}" type="button" data-edit-step="${card.step}">
      <span>${escapeHtml(card.title)}</span>
      <strong>${escapeHtml(card.value)}</strong>
      <small>${escapeHtml(card.text)}</small>
    </button>
  `;
}

function renderProfileInsights() {
  const bmi = calculateBmi();
  const bmiNumber = Number(bmi.value);
  const marker = Number.isFinite(bmiNumber)
    ? Math.min(100, Math.max(0, ((bmiNumber - 15) / 25) * 100))
    : 0;
  const tone = bmi.label === "正常" ? "green" : bmi.label === "偏瘦" ? "blue" : "yellow";
  const fontSize = state.ui?.fontSize || "standard";
  const fontOptions = [
    { id: "standard", label: "标准" },
    { id: "large", label: "大" },
    { id: "xlarge", label: "特大" },
  ];

  return `
    <section class="bmi-card" aria-label="当前 BMI">
      <div class="bmi-head">
        <h3>当前 BMI</h3>
        <span class="bmi-tag ${tone}">${escapeHtml(bmi.label)}</span>
      </div>
      <div class="bmi-main">
        <strong>${escapeHtml(bmi.value)}</strong>
        <div class="bmi-meter" aria-label="BMI 从 15 到 40，当前 ${escapeHtml(bmi.value)}，${escapeHtml(bmi.label)}">
          <div class="bmi-track">
            <span class="bmi-marker" data-position="${marker}"></span>
          </div>
          <div class="bmi-axis" aria-hidden="true">
            <span class="is-first">15</span>
            <span class="axis-underweight">18.5</span>
            <span class="axis-overweight">24</span>
            <span class="axis-obese">28</span>
            <span class="is-last">40</span>
          </div>
        </div>
      </div>
      <div class="calorie-row">
        <span>估算日需能量</span>
        <strong>${bmi.calories} 千卡</strong>
      </div>
    </section>

    <section class="profile-settings-card" aria-label="档案设置">
      <div class="settings-row">
        <div>
          <strong>全局字号</strong>
          <small>整个界面一起变大</small>
        </div>
        <div class="font-segment" role="group" aria-label="全局字号">
          ${fontOptions.map((item) => `
            <button class="${fontSize === item.id ? "is-active" : ""}" type="button" data-font-size="${item.id}" aria-pressed="${fontSize === item.id ? "true" : "false"}">${item.label}</button>
          `).join("")}
        </div>
      </div>
      <button class="settings-row settings-row-button" type="button" data-profile-guard-toggle aria-pressed="${state.profile.familyGuard ? "true" : "false"}">
        <div>
          <strong>本机家人视图</strong>
          <small>${state.profile.familyGuard ? "已开启，只在这台设备展示记录" : "已关闭，不展示家人入口"}</small>
        </div>
        <span class="profile-switch ${state.profile.familyGuard ? "is-on" : ""}" aria-hidden="true"><span></span></span>
      </button>
      <button class="settings-link" type="button" data-profile-bind>
        <span>了解家庭绑定状态</span>
        <strong>›</strong>
      </button>
    </section>
    <p class="profile-footnote">慧食建议仅供参考，不能替代医生诊断。慢性肾病等复杂情况请遵医嘱。</p>
  `;
}

function applyBmiMeterPosition() {
  const marker = $(".bmi-marker[data-position]");
  if (!marker) return;
  const position = Number(marker.dataset.position);
  marker.style.left = `${Number.isFinite(position) ? position : 0}%`;
}

function bindProfileSettingEvents() {
  $$("[data-font-size]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setFontSize(button.dataset.fontSize);
    });
  });
  $$("[data-profile-guard-toggle]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleFamilyGuard();
    });
  });
  $$("[data-profile-bind]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openBindModal();
    });
  });
}

function toggleFamilyGuard() {
  state.profile.familyGuard = !state.profile.familyGuard;
  $("#guardInput").checked = state.profile.familyGuard;
  renderProfile();
  renderRiskStrip();
  saveState();
  showToast(state.profile.familyGuard ? "本机家人视图已开启" : "本机家人视图已关闭");
}

function openWizard(index = 0) {
  state.wizardStep = Math.max(0, index);
  state.wizardOpen = true;
  goToScreen("profile", false);
  renderWizard();
  saveState();
}

function closeWizard() {
  updateProfileFromForm();
  void syncAccountNickname();
  state.wizardOpen = false;
  state.setupComplete = true;
  saveState();
  scheduleHealthProfileSync();
  renderAll();
  showToast("健康档案已保存");
}

function renderWizard() {
  $("#profileOverview").hidden = state.wizardOpen;
  $("#profileWizard").hidden = !state.wizardOpen;
  if (!state.wizardOpen) return;

  const step = STEPS[state.wizardStep] || STEPS[0];
  $("#wizardKicker").textContent = step.kicker;
  $("#wizardTitle").textContent = step.title;
  $("#wizardText").textContent = step.text;
  $("#wizardProgress").innerHTML = STEPS.map((_, index) => `<span class="${index === state.wizardStep ? "active" : index < state.wizardStep ? "done" : ""}"></span>`).join("");
  $$(".step-panel").forEach((panel) => {
    panel.hidden = panel.dataset.step !== step.id;
  });
  $("#stepBack").disabled = state.wizardStep === 0;
  $("#stepNext").textContent = state.wizardStep === STEPS.length - 1 ? "完成建档" : "下一步";
  $("#stepClose").hidden = !state.setupComplete;
}

function previousStep() {
  if (state.wizardStep === 0) return;
  updateProfileFromForm();
  state.wizardStep -= 1;
  renderWizard();
  saveState();
}

function nextStep() {
  if (!validateStep()) return;
  const completedStep = STEPS[state.wizardStep]?.id;
  updateProfileFromForm();
  if (completedStep === "basic") void syncAccountNickname();
  if (state.wizardStep < STEPS.length - 1) {
    state.wizardStep += 1;
    renderWizard();
    saveState();
    return;
  }
  closeWizard();
}

function validateStep() {
  if (STEPS[state.wizardStep]?.id !== "basic") return true;
  const nickname = $("#nicknameInput").value.trim();
  const age = Number($("#ageInput").value);
  const height = Number($("#heightInput").value);
  const weight = Number($("#weightInput").value);
  if (!nickname) return showInvalid("请填写姓名或昵称", "#nicknameInput");
  if (age < 45 || age > 110) return showInvalid("请确认年龄是否正确", "#ageInput");
  if (height < 120 || height > 210) return showInvalid("请确认身高是否正确", "#heightInput");
  if (weight < 35 || weight > 130) return showInvalid("请确认体重是否正确", "#weightInput");
  return true;
}

function showInvalid(text, selector) {
  showToast(text);
  $(selector).focus();
  return false;
}

function syncForm() {
  $("#nicknameInput").value = state.profile.nickname;
  $("#ageInput").value = state.profile.age;
  $("#sexInput").value = state.profile.sex;
  $("#heightInput").value = state.profile.height;
  $("#weightInput").value = state.profile.weight;
  $("#personalInput").value = state.profile.personal;
  $("#guardInput").checked = state.profile.familyGuard;
  syncChoiceButtons();
  renderAllergies();
  renderCustomConditions();
  renderCustomGoals();
  renderShareCode();
}

function updateProfileFromForm() {
  state.profile.nickname = $("#nicknameInput").value.trim().replace(/\s+/g, " ").slice(0, 30);
  state.profile.age = Number($("#ageInput").value || state.profile.age);
  state.profile.sex = $("#sexInput").value;
  state.profile.height = Number($("#heightInput").value || state.profile.height);
  state.profile.weight = Number($("#weightInput").value || state.profile.weight);
  state.profile.activity = $("[data-choice-group='activity'].is-selected")?.dataset.choiceValue || state.profile.activity;
  state.profile.conditions = $$("[data-choice-group='condition'].is-selected").map((button) => button.dataset.choiceValue);
  state.profile.goals = $$("[data-choice-group='goal'].is-selected").map((button) => button.dataset.choiceValue);
  state.profile.personal = $("#personalInput").value.trim().slice(0, 240);
  state.profile.familyGuard = $("#guardInput").checked;
  renderShareCode();
  saveState();
  scheduleHealthProfileSync();
}

async function syncAccountNickname() {
  const nickname = state.profile.nickname.trim();
  if (!state.auth.loggedIn || !nickname || nickname === lastSyncedNickname) return;
  try {
    const result = await authApi("/api/auth/profile", { nickname });
    lastSyncedNickname = result.user?.nickname || nickname;
    state.auth.name = lastSyncedNickname;
    saveState();
  } catch (error) {
    showToast(error.message || "姓名保存到账号失败，请稍后重试");
  }
}

function addAllergy() {
  const input = $("#allergyInput");
  const value = input.value.trim();
  if (!value) {
    showToast("请先输入要加入黑名单的食物");
    return;
  }
  const items = value.split(/[、,，\s]+/).map((item) => item.trim()).filter(Boolean);
  state.profile.allergies = Array.from(new Set([...state.profile.allergies, ...items]));
  input.value = "";
  renderAllergies();
  saveState();
  scheduleHealthProfileSync();
  showToast("已加入过敏黑名单");
}

function addCustomCondition() {
  addCustomItem("#conditionCustomInput", "customConditions", renderCustomConditions, "已加入其他疾病");
}

function addCustomGoal() {
  addCustomItem("#goalCustomInput", "customGoals", renderCustomGoals, "已加入其他目标");
}

function addCustomItem(selector, key, render, message) {
  const input = $(selector);
  const value = input.value.trim();
  if (!value) {
    showToast("请先输入内容");
    return;
  }
  const items = value.split(/[、,，\s]+/).map((item) => item.trim()).filter(Boolean);
  state.profile[key] = Array.from(new Set([...(state.profile[key] || []), ...items]));
  input.value = "";
  render();
  saveState();
  scheduleHealthProfileSync();
  showToast(message);
}

function renderCustomConditions() {
  renderChipList("#customConditionChips", state.profile.customConditions, "condition");
}

function renderCustomGoals() {
  renderChipList("#customGoalChips", state.profile.customGoals, "goal");
}

function renderChipList(selector, items, type) {
  $(selector).innerHTML = items.length
    ? items.map((item) => `
      <span class="chip neutral">${escapeHtml(item)}
        <button type="button" aria-label="删除${escapeHtml(item)}" data-remove-${type}="${escapeHtml(item)}"><svg><use href="#i-close"></use></svg></button>
      </span>
    `).join("")
    : `<span class="hint">可按个人情况补充</span>`;
  $$(`[data-remove-${type}]`).forEach((button) => {
    button.addEventListener("click", () => {
      const key = type === "condition" ? "customConditions" : "customGoals";
      state.profile[key] = state.profile[key].filter((item) => item !== button.dataset[`remove${capitalize(type)}`]);
      renderChipList(selector, state.profile[key], type);
      saveState();
      scheduleHealthProfileSync();
    });
  });
}

function renderAllergies() {
  $("#allergyChips").innerHTML = state.profile.allergies.length
    ? state.profile.allergies.map((item) => `
      <span class="chip">${escapeHtml(item)}
        <button type="button" aria-label="删除${escapeHtml(item)}" data-remove-allergy="${escapeHtml(item)}"><svg><use href="#i-close"></use></svg></button>
      </span>
    `).join("")
    : `<span class="hint">暂无黑名单</span>`;
  $$("[data-remove-allergy]").forEach((button) => {
    button.addEventListener("click", () => {
      state.profile.allergies = state.profile.allergies.filter((item) => item !== button.dataset.removeAllergy);
      renderAllergies();
      saveState();
      scheduleHealthProfileSync();
    });
  });
}

function renderShareCode() {
  $("#shareCode").textContent = state.profile.familyGuard
    ? "本机家人视图已开启；跨设备共享请在“家人绑定”中生成一次性绑定码。"
    : "需要家人在另一台手机查看时，请使用“家人绑定”完成跨设备共享。";
}

function calculateBmi() {
  const age = Number(state.profile.age);
  const height = Number(state.profile.height);
  const weight = Number(state.profile.weight);
  if (!Number.isFinite(age) || !Number.isFinite(height) || !Number.isFinite(weight) || age <= 0 || height <= 0 || weight <= 0) {
    return { value: "--", label: "未计算", calories: "--" };
  }
  const meters = height / 100;
  const bmi = weight / (meters * meters);
  const label = bmi < 18.5 ? "偏瘦" : bmi < 24 ? "正常" : bmi < 28 ? "超重" : "偏胖";
  const base = state.profile.sex === "male"
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
  const factor = ACTIVITIES.find((item) => item.id === state.profile.activity)?.factor;
  return { value: bmi.toFixed(1), label, calories: factor ? Math.max(0, Math.round(base * factor)) : "--" };
}

async function toggleSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!window.isSecureContext) {
    const message = !window.isSecureContext
      ? "当前临时地址是 HTTP，浏览器禁止使用麦克风。请通过 HTTPS 正式地址使用语音。"
      : "当前浏览器不支持直接语音识别，请改用系统浏览器打开正式地址。";
    $("#voiceResult").innerHTML = renderResultCard("yellow", "语音入口仍在", message);
    return;
  }
  if (listening) {
    if (mediaRecorder?.state === "recording") mediaRecorder.stop();
    else if (recognition) recognition.stop();
    return;
  }
  const canUseServerSpeech = serviceStatus.speechRecognition === "server"
    && navigator.mediaDevices?.getUserMedia
    && window.MediaRecorder;
  if (canUseServerSpeech) {
    await startServerSpeechRecording();
    return;
  }
  if (!SpeechRecognition) {
    $("#voiceResult").innerHTML = renderResultCard("yellow", "请使用系统浏览器", "当前浏览器不支持麦克风语音识别，请用 Safari 或 Chrome 打开正式地址。 ");
    return;
  }
  startBrowserSpeechRecognition(SpeechRecognition);
}

async function startServerSpeechRecording() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"]
      .find((type) => MediaRecorder.isTypeSupported?.(type));
    const recorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);
    mediaRecorder = recorder;
    recordedAudioChunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data?.size) recordedAudioChunks.push(event.data);
    };
    recorder.onerror = () => {
      if (recorder.state === "recording") recorder.stop();
      else finishServerSpeechRecording(null, "录音没有完成，请再说一次。 ");
    };
    recorder.onstop = async () => {
      const blob = recordedAudioChunks.length
        ? new Blob(recordedAudioChunks, { type: recorder.mimeType || recordedAudioChunks[0].type })
        : null;
      await finishServerSpeechRecording(blob);
    };
    recorder.start(250);
    listening = true;
    speechHadError = false;
    $("#recordButton").classList.add("is-listening");
    $("#recordLabel").textContent = "正在听，再点一下就结束";
    $("#voiceResult").innerHTML = renderResultCard("yellow", "正在听", "请直接说这一餐吃了什么，十秒内说完。 ");
    scheduleSpeechStop(10_000);
  } catch (error) {
    stopMediaStream();
    resetSpeechUi();
    const denied = error?.name === "NotAllowedError" || error?.name === "SecurityError";
    const message = denied ? "没有拿到麦克风权限，请在浏览器设置中允许慧食使用麦克风。" : "麦克风暂时无法使用，请再试一次。";
    $("#voiceResult").innerHTML = renderResultCard("yellow", "无法开始录音", message);
  }
}

async function finishServerSpeechRecording(blob, failureMessage = "") {
  stopMediaStream();
  listening = false;
  clearTimeout(speechStopTimer);
  $("#recordButton").classList.remove("is-listening");
  mediaRecorder = null;
  recordedAudioChunks = [];
  if (!blob || blob.size < 256) {
    renderMealMode();
    $("#voiceResult").innerHTML = renderResultCard("yellow", "没有听清", failureMessage || "录音太短，请靠近手机再说一次。 ");
    return;
  }
  $("#recordLabel").textContent = "正在识别，请稍等";
  $("#voiceResult").innerHTML = renderResultCard("yellow", "正在识别", "语音只发送到当前慧食服务器，识别完成后立即删除。 ");
  try {
    const text = await requestSpeechTranscription(blob);
    $("#voiceText").value = text;
    renderMealMode();
    await analyzeVoiceMeal();
  } catch (error) {
    renderMealMode();
    $("#voiceResult").innerHTML = renderResultCard("yellow", "没有听清", error?.message || "语音识别暂时没有完成，请再说一次。 ");
  }
}

function stopMediaStream() {
  mediaStream?.getTracks?.().forEach((track) => track.stop());
  mediaStream = null;
}

function startBrowserSpeechRecognition(SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "zh-CN";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 3;
  listening = true;
  speechHadError = false;
  $("#recordButton").classList.add("is-listening");
  $("#recordLabel").textContent = "正在听，讲完会自动判断";
  $("#voiceResult").innerHTML = renderResultCard("yellow", "正在听", "您可以直接说：我吃了半碗米饭、一个鸡蛋、一份青菜。");
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results).map((result) => result[0]?.transcript || "").join("").trim();
    if (!transcript) return;
    $("#voiceText").value = transcript;
    clearTimeout(voicePreviewTimer);
    voicePreviewTimer = setTimeout(() => {
      const parsed = parseMealText(transcript);
      if (parsed.status === "food") renderVoiceConfirmation(parsed, false);
    }, 120);
    const hasFinalResult = Array.from(event.results).some((result) => result.isFinal);
    scheduleSpeechStop(hasFinalResult ? 180 : 650);
  };
  recognition.onspeechend = () => scheduleSpeechStop(220);
  recognition.onend = () => {
    if (speechHadError) return;
    resetSpeechUi();
    analyzeVoiceMeal();
  };
  recognition.onerror = (event) => {
    speechHadError = true;
    resetSpeechUi();
    const message = event.error === "not-allowed"
      ? "没有拿到麦克风权限，请在手机浏览器允许麦克风"
      : event.error === "no-speech"
        ? "没有听清楚，请靠近手机再说一次"
        : "语音识别暂时不稳定，可直接修改文字后判断";
    $("#voiceResult").innerHTML = renderResultCard("yellow", "请再说一次", message);
    showToast(message);
  };
  try {
    recognition.start();
    scheduleSpeechStop(5000);
  } catch {
    resetSpeechUi();
    $("#voiceResult").innerHTML = renderResultCard("yellow", "语音暂时不可用", "请直接修改文字后点“马上判断”。");
  }
}

function scheduleSpeechStop(delay) {
  clearTimeout(speechStopTimer);
  speechStopTimer = setTimeout(() => {
    if (!listening) return;
    if (mediaRecorder?.state === "recording") mediaRecorder.stop();
    else if (recognition) recognition.stop();
  }, delay);
}

function resetSpeechUi() {
  listening = false;
  clearTimeout(speechStopTimer);
  clearTimeout(voicePreviewTimer);
  recognition = null;
  stopMediaStream();
  $("#recordButton").classList.remove("is-listening");
  renderMealMode();
}

async function analyzeVoiceMeal() {
  const text = $("#voiceText").value.trim();
  const localParsed = parseMealText(text);
  if (localParsed.status === "empty") {
    renderUnclearResult("#voiceResult", "voice", true, localParsed);
    return;
  }
  if (localParsed.status !== "food" && serviceStatus.textModelAvailable) {
    const button = $("#voiceAnalyze");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    $("#voiceResult").innerHTML = renderResultCard("yellow", "正在分析", "正在识别您输入的饭菜，请稍等。 ");
    try {
      const aiResult = await requestAiMealAnalysis(text);
      const normalized = normalizeAiMealAnalysis(aiResult, localParsed);
      if (normalized.status === "food" && normalized.items.length) {
        renderVoiceConfirmation({ status: "food", items: normalized.items, originalText: text });
        showToast("识别好了，请确认食物和份量");
        return;
      }
      renderUnclearResult("#voiceResult", "voice", true, normalized);
      return;
    } catch {
      renderUnclearResult("#voiceResult", "voice", true, localParsed);
      return;
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  }
  if (localParsed.status !== "food") {
    renderUnclearResult("#voiceResult", "voice", true, localParsed);
    return;
  }
  renderVoiceConfirmation(localParsed);
  showToast("先确认食物和份量");
}

function renderVoiceConfirmation(parsed, announce = true) {
  const normalized = normalizeMealInput(parsed, "voice");
  if (normalized.status !== "food" || !normalized.items.length) {
    renderUnclearResult("#voiceResult", "voice", false, normalized);
    return;
  }
  pendingVoiceMeal = {
    mode: state.mealMode === "after" ? "after" : "before",
    originalText: normalized.originalText || $("#voiceText").value.trim(),
    items: dedupeFoodMatches(normalized.items).map(normalizePendingFoodItem),
  };
  renderPendingMealControls();
  $("#voiceResult").innerHTML = "";
  scrollResultIntoView("#voiceConfirm");
  if (announce) showToast("听到了，先确认一下");
}

function normalizePendingFoodItem(item) {
  const option = getPortionOptionFromItem(item);
  return {
    ...item,
    portionSize: option.id,
    portion: option.label,
    portionFactor: option.factor,
  };
}

function getPortionOptionFromItem(item = {}) {
  const text = `${item.portion || ""} ${item.name || ""}`;
  const factor = Number(item.portionFactor || 1);
  if (/半|小|少/.test(text) || factor < 0.85) return PORTION_OPTIONS[0];
  if (/大|多|两|2/.test(text) || factor > 1.2) return PORTION_OPTIONS[2];
  return PORTION_OPTIONS[1];
}

function renderPendingMealControls() {
  const box = $("#voiceConfirm");
  if (!pendingVoiceMeal || !pendingVoiceMeal.items.length) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  const isBefore = pendingVoiceMeal.mode !== "after";
  box.hidden = false;
  box.innerHTML = `
    <h3>${isBefore ? "听到了这些，对吗？" : "这顿饭是这些，对吗？"}</h3>
    <p>${isBefore ? "点份量可以改大小，点 × 可以去掉。" : "确认后会记一餐，并给下次怎么吃的建议。"}</p>
    <div class="pending-food-list">
      ${pendingVoiceMeal.items.map((item, index) => renderPendingFoodChip(item, index)).join("")}
    </div>
    <div class="missing-food-row">
      <input id="missingFoodInput" type="text" placeholder="漏了就补一个，如：青菜" />
      <button type="button" data-add-pending-food aria-label="添加漏掉的食物"><svg><use href="#i-plus"></use></svg></button>
    </div>
    <button class="primary-button" type="button" data-confirm-meal>${isBefore ? "对，帮我看看" : "对，帮我记录并判断"}</button>
  `;
  bindPendingMealControls();
}

function bindPendingMealControls() {
  $$("[data-portion-select]").forEach((select) => {
    select.addEventListener("change", (event) => {
      event.stopPropagation();
      updatePendingPortion(select.dataset.portionSelect, select.value);
    });
  });
  $$("[data-remove-pending-food]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      removePendingFood(button.dataset.removePendingFood);
    });
  });
  $$("[data-add-pending-food]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      addPendingFood();
    });
  });
  $$("[data-confirm-meal]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      confirmPendingMeal();
    });
  });
}

function renderPendingFoodChip(item, index) {
  return `
    <div class="pending-food-chip">
      <strong>${escapeHtml(item.name)}</strong>
      <label>
        <span>份量</span>
        <select data-portion-select="${index}" aria-label="修改${escapeHtml(item.name)}份量">
          ${PORTION_OPTIONS.map((option) => `
            <option value="${option.id}" ${item.portionSize === option.id ? "selected" : ""}>${option.label}</option>
          `).join("")}
        </select>
      </label>
      <button type="button" data-remove-pending-food="${index}" aria-label="删除${escapeHtml(item.name)}"><svg><use href="#i-close"></use></svg></button>
    </div>
  `;
}

function updatePendingPortion(index, size) {
  if (!pendingVoiceMeal?.items[index]) return;
  const option = PORTION_OPTIONS.find((item) => item.id === size) || PORTION_OPTIONS[1];
  pendingVoiceMeal.items[index] = {
    ...pendingVoiceMeal.items[index],
    portionSize: option.id,
    portion: option.label,
    portionFactor: option.factor,
  };
  renderPendingMealControls();
}

function removePendingFood(index) {
  if (!pendingVoiceMeal) return;
  pendingVoiceMeal.items.splice(Number(index), 1);
  renderPendingMealControls();
}

function addPendingFood() {
  const input = $("#missingFoodInput");
  const value = input?.value.trim();
  if (!value) {
    showToast("先写一个漏掉的菜名");
    return;
  }
  const parsed = parseMealText(value);
  const items = parsed.status === "food" && parsed.items.length
    ? parsed.items
    : [{ name: value, salt: 0.5, carb: "中", tags: [], portion: "中份", portionFactor: 1, source: "manual" }];
  if (!pendingVoiceMeal) pendingVoiceMeal = { mode: state.mealMode, originalText: value, items: [] };
  pendingVoiceMeal.items = dedupeFoodMatches([...pendingVoiceMeal.items, ...items.map(normalizePendingFoodItem)]);
  pendingVoiceMeal.originalText = `${pendingVoiceMeal.originalText || ""} ${value}`.trim();
  renderPendingMealControls();
  showToast("已补上这道菜");
}

function confirmPendingMeal() {
  if (!pendingVoiceMeal?.items.length) {
    showToast("请先说出或输入饭菜");
    return;
  }
  const parsed = {
    status: "food",
    items: pendingVoiceMeal.items,
    originalText: pendingVoiceMeal.originalText,
  };
  const evaluation = evaluateMeal(parsed.items, parsed);
  showMealResultModal(evaluation, parsed.items, "voice", pendingVoiceMeal.mode);
}

async function requestAiMealAnalysis(text) {
  if (!location.protocol.startsWith("http")) throw new Error("本地文件模式暂不支持 AI 分析");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch("/api/analyze-voice-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, profile: getProfileForAi() }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "AI 饮食分析失败");
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function requestSpeechTranscription(blob) {
  const audio = await fileToDataUrl(blob);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch("/api/transcribe-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio, mimeType: blob.type || "audio/webm" }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "语音识别暂时没有完成，请再说一次。 ");
    const text = String(data.text || "").trim();
    if (!text) throw new Error("没有听清楚，请靠近手机再说一次。 ");
    return text;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("语音识别时间过长，请再说一句短一些的话。 ");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function parseMealText(text) {
  const originalText = String(text || "").trim();
  const normalized = normalizeFoodText(originalText);
  if (!normalized) {
    return {
      status: "empty",
      items: [],
      originalText,
      reason: "请先说一句或输入一句吃了什么，比如：半碗米饭、一个鸡蛋、一份青菜。",
    };
  }
  const directMatches = matchFoodsFromText(originalText);
  const inferredMatches = inferFoodsFromText(originalText, directMatches);
  const items = dedupeFoodMatches([...directMatches, ...inferredMatches]);
  if (items.length) return { status: "food", items, originalText, reason: "" };
  if (looksLikeMealText(normalized)) {
    return {
      status: "unclear",
      items: [],
      originalText,
      reason: "我知道您在记录吃饭，但没有认出具体食物。请补一句菜名或主食名，例如：米饭、鱼、青菜、牛肉面。",
    };
  }
  return {
    status: "not-meal",
    items: [],
    originalText,
    reason: "这句话不像饮食记录。请输入刚才吃了什么，系统再给红黄绿提醒。",
  };
}

function renderMealResult(input, selector, speak = false, source = "meal") {
  const parsed = normalizeMealInput(input, source);
  if (parsed.status !== "food" || !parsed.items.length) {
    renderUnclearResult(selector, source, speak, parsed);
    return;
  }
  const evaluation = evaluateMeal(parsed.items, parsed);
  const speechText = `${evaluation.title}。${evaluation.safety}。${evaluation.nutrition}。${evaluation.advice}`;
  $(selector).innerHTML = `
    ${renderRiskSummary(evaluation)}
    ${renderRecognitionConfirm(parsed.items, source)}
    ${renderResultCard(evaluation.level, evaluation.title, evaluation.safety)}
    ${renderJudgementBasis(evaluation)}
    ${renderResultCard("yellow", "营养评价", evaluation.nutrition)}
    ${renderResultCard("green", "下一餐调整", evaluation.advice)}
    ${speak ? renderSpeechControl() : ""}
  `;
  if (speak) {
    showMealResultModal(evaluation, parsed.items, source, state.mealMode || "before");
  }
}

function renderAiMealResult(result, selector, speak = false, source = "meal", fallbackParsed = null) {
  const normalized = normalizeAiMealAnalysis(result, fallbackParsed);
  if (normalized.status === "not-food" && source === "photo") {
    renderPhotoReupload(normalized.reason || "这张照片不像饭菜照片，请重新上传清楚的饭菜照片。");
    return;
  }
  if (normalized.status !== "food" || !normalized.evaluation) {
    renderUnclearResult(selector, source, speak, normalized);
    return;
  }

  const items = normalized.items.length ? normalized.items : normalizeMealInput(fallbackParsed || {}, source).items;
  const evaluation = normalized.evaluation;
  const speechText = `${evaluation.title}。${evaluation.safety}。${evaluation.nutrition}。${evaluation.advice}`;
  $(selector).innerHTML = `
    ${renderRiskSummary(evaluation)}
    ${items.length ? renderRecognitionConfirm(items, source) : ""}
    ${renderResultCard(evaluation.level, evaluation.title, evaluation.safety)}
    ${renderJudgementBasis(evaluation)}
    ${renderResultCard("yellow", "营养评价", evaluation.nutrition)}
    ${renderResultCard("green", "下一餐调整", evaluation.advice)}
    ${speak ? renderSpeechControl() : ""}
  `;
  if (speak) {
    showMealResultModal(evaluation, items, source, state.mealMode || "before");
  }
}

function normalizeAiMealAnalysis(result, fallbackParsed = null) {
  if (!result || typeof result !== "object") {
    return { status: "unclear", items: [], reason: "AI 没有返回明确结果，请再试一次。" };
  }
  const fallback = normalizeMealInput(fallbackParsed || {}, "meal");
  const status = normalizeAiStatus(result.status, result.isFoodPhoto);
  const items = buildMealItemsFromAiFoods(result.foods || result.items || [], fallback.originalText)
    .concat(Array.isArray(fallback.items) ? fallback.items : []);
  const uniqueItems = dedupeFoodMatches(items);
  if (status === "not-food" || status === "not-meal") {
    return {
      status,
      items: uniqueItems,
      reason: result.message || result.reason || "这不像饮食记录，请重新输入或上传饭菜照片。",
    };
  }
  if (status === "unclear" || (!uniqueItems.length && !hasAiEvaluation(result))) {
    return {
      status: "unclear",
      items: uniqueItems,
      reason: result.message || result.reason || "AI 没有看清具体饭菜，请补充食物名称或重新拍照。",
    };
  }
  const evaluation = normalizeAiEvaluation(result, uniqueItems, fallback);
  return { status: "food", items: uniqueItems, evaluation };
}

function hasAiEvaluation(result) {
  return Boolean(result.evaluation || result.level || result.title || result.safety || result.nutrition || result.advice || Array.isArray(result.cards));
}

function normalizeAiEvaluation(result, items, fallback) {
  const fromCards = normalizeCardsToEvaluation(result.cards);
  const localEvaluation = items.length ? evaluateMeal(items, fallback) : null;
  const evaluation = result.evaluation && typeof result.evaluation === "object" ? result.evaluation : result;
  const aiResult = {
    level: normalizeLevel(evaluation.level || fromCards.level || "yellow"),
    title: evaluation.title || fromCards.title || "饮食提醒",
    safety: evaluation.safety || evaluation.message || fromCards.safety || "请先确认识别出的食物和配料。",
    nutrition: evaluation.nutrition || fromCards.nutrition || "这餐营养还需结合实际份量判断。",
    advice: evaluation.advice || fromCards.advice || "请确认食物和份量后再决定怎么吃。",
    basis: evaluation.basis || result.basis || fromCards.basis || "AI 根据照片和健康档案生成，结果需由您确认。",
  };
  if (!localEvaluation) return aiResult;
  if (localEvaluation.level !== "red" && riskRank(aiResult.level) >= riskRank(localEvaluation.level)) return aiResult;
  return {
    ...aiResult,
    level: localEvaluation.level,
    title: localEvaluation.title,
    safety: localEvaluation.safety,
    advice: localEvaluation.advice,
    basis: `${localEvaluation.basis} AI 结果不得降低本地健康红线。`,
  };
}

function normalizeAiStatus(status, isFoodPhoto) {
  if (isFoodPhoto === false) return "not-food";
  const value = String(status || "").toLowerCase();
  if (["not-food", "not_food", "non-food", "不是食物", "不是饭菜"].some((item) => value.includes(item))) return "not-food";
  if (["not-meal", "not_meal", "不是饮食", "无关"].some((item) => value.includes(item))) return "not-meal";
  if (["unclear", "不清楚", "看不清", "听不清"].some((item) => value.includes(item))) return "unclear";
  if (["food", "meal", "是食物", "是饭菜"].some((item) => value === item || value.includes(item))) return "food";
  return "unclear";
}

function riskRank(level) {
  return level === "red" ? 3 : level === "yellow" ? 2 : 1;
}

function normalizeCardsToEvaluation(cards) {
  if (!Array.isArray(cards) || !cards.length) return {};
  const normalizedCards = cards
    .filter((card) => card && typeof card === "object")
    .map((card) => ({
      level: normalizeLevel(card.level || "yellow"),
      title: String(card.title || "饮食建议"),
      text: String(card.text || card.message || ""),
    }));
  const level = normalizedCards.some((card) => card.level === "red")
    ? "red"
    : normalizedCards.some((card) => card.level === "yellow")
      ? "yellow"
      : "green";
  const safetyCard = normalizedCards.find((card) => /安全|警告|提醒|红色|黄色/.test(card.title)) || normalizedCards[0];
  const nutritionCard = normalizedCards.find((card) => /营养|蛋白|蔬菜|热量|碳水|盐/.test(card.title));
  const adviceCard = normalizedCards.find((card) => /下一|建议|调整|晚餐|明天/.test(card.title));
  return {
    level,
    title: safetyCard?.title || "饮食提醒",
    safety: safetyCard?.text || normalizedCards.map((card) => `${card.title}：${card.text}`).join(" "),
    nutrition: nutritionCard?.text || "AI 已完成营养评价，可结合实际份量再确认。",
    advice: adviceCard?.text || "下一餐建议清淡一点，补充蔬菜和优质蛋白。",
    basis: "由 AI 结合本餐内容和健康档案生成。",
  };
}

function normalizeLevel(level) {
  const value = String(level || "").toLowerCase();
  if (["red", "danger", "error", "高风险", "红色"].some((item) => value.includes(item))) return "red";
  if (["green", "safe", "ok", "低风险", "绿色"].some((item) => value.includes(item))) return "green";
  return "yellow";
}

function buildMealItemsFromAiFoods(foods, text = "") {
  if (!Array.isArray(foods)) return [];
  return foods.slice(0, 8).flatMap((item) => {
    const name = typeof item === "string" ? item : item?.name || item?.alias || "";
    if (!name) return [];
    const matched = matchFoodsFromText(`${name} ${typeof item === "object" ? item.alias || "" : ""}`);
    if (matched.length) {
      return matched.map((food) => ({
        ...food,
        portion: (typeof item === "object" && item.portion) || food.portion,
        caloriesPer100g: Number(item?.caloriesPer100g || item?.kcalPer100g || food.caloriesPer100g || 0),
        estimatedGrams: Number(item?.estimatedGrams || item?.grams || food.estimatedGrams || 0),
        estimatedCalories: Number(item?.estimatedCalories || item?.calories || food.estimatedCalories || 0),
        source: "ai",
      }));
    }
    const tags = Array.isArray(item?.tags) ? item.tags : [];
    const portion = typeof item === "object" ? item.portion || "" : "";
    return [{
      name,
      salt: Number(item?.salt || 0),
      caloriesPer100g: Number(item?.caloriesPer100g || item?.kcalPer100g || 0),
      estimatedGrams: Number(item?.estimatedGrams || item?.grams || 0),
      estimatedCalories: Number(item?.estimatedCalories || item?.calories || 0),
      carb: item?.carb || "中",
      tags,
      portion,
      portionFactor: inferPortionFactor(portion),
      source: "ai",
    }];
  });
}

function normalizeMealInput(input, source = "meal") {
  if (Array.isArray(input)) return { status: input.length ? "food" : "unclear", items: input, originalText: "", reason: "" };
  if (input && typeof input === "object") {
    const items = Array.isArray(input.items) ? input.items : [];
    return { status: input.status || (items.length ? "food" : "unclear"), items, originalText: input.originalText || "", reason: input.reason || "" };
  }
  return parseMealText(String(input || ""));
}

function evaluateMeal(items, parsed = {}) {
  items = dedupeFoodMatches(items);
  const names = items.map((item) => item.name);
  const tags = items.flatMap((item) => item.tags || []);
  const profileConditionNames = getProfileConditionNames();
  const allergyHit = state.profile.allergies.find((item) => hasAllergyConflict(item, items, parsed.originalText));
  const totalSalt = items.reduce((sum, item) => sum + Number(item.salt || 0) * Number(item.portionFactor || 1), 0);
  const saltLimit = hasCondition("hypertension") || hasCondition("kidney") ? 5 : 6;
  const saltShare = totalSalt / saltLimit;
  const hasVegetable = tags.includes("蔬菜");
  const hasProtein = tags.includes("优质蛋白") || tags.includes("豆制品");
  const highCarbItems = items.filter((item) => item.carb === "高").map((item) => item.name);
  const hasSweet = tags.includes("甜饮") || tags.includes("甜食");
  const hasHighOil = tags.includes("油脂偏高");
  const hasHighPurine = tags.includes("高嘌呤");
  const hasSoup = tags.includes("汤汁");

  if (allergyHit) {
    return {
      level: "red",
      title: "安全警告",
      safety: `发现过敏黑名单：${allergyHit}。这类食物建议先停下，不要继续吃。`,
      nutrition: "本餐需要优先处理过敏风险，营养评价放在第二位。",
      advice: "下一餐建议选择清淡软烂的饭菜，如青菜、豆腐、少量杂粮饭。",
      basis: `识别到 ${names.join("、")}。您的档案里把“${allergyHit}”列为过敏或不耐受，所以直接判为红色。`,
    };
  }

  const severeTexts = [];
  const riskTexts = [];
  const directConditionHits = [];

  if ((hasCondition("hypertension") || hasCondition("kidney")) && (saltShare >= 1 || tags.includes("高盐"))) {
    severeTexts.push(`${hasCondition("kidney") ? "慢性肾病" : "高血压"}：这餐盐分很重，按一天 ${saltLimit} 克盐额度算，今天盐额度基本花完了。`);
  } else if ((hasCondition("hypertension") || hasCondition("kidney")) && (saltShare >= 0.5 || hasSoup)) {
    riskTexts.push(`${hasCondition("kidney") ? "慢性肾病" : "高血压"}：这餐盐分占了一天额度的不少，汤汁、酱料和咸菜先少碰。`);
  }

  if (hasCondition("diabetes") && hasSweet) {
    riskTexts.push("2 型糖尿病：这餐有甜饮或甜食，今天后面不要再加含糖饮料和点心。");
  } else if (hasCondition("diabetes") && highCarbItems.length >= 2) {
    riskTexts.push("2 型糖尿病：主食种类偏多，下一餐主食减到半碗左右。");
  } else if (hasCondition("diabetes") && highCarbItems.length) {
    riskTexts.push("2 型糖尿病：有主食，建议定量吃，不要再加面点或甜饮。");
  }

  if (hasCondition("gout") && hasHighPurine) {
    severeTexts.push("痛风：这餐有高嘌呤食物，建议先停下或只尝几口，今天别再吃海鲜、内脏和浓汤。");
  }

  if (hasCondition("fat") && hasHighOil) {
    riskTexts.push("高血脂：油脂偏高，肥肉、油炸和奶油类今天先不加了。");
  }

  state.profile.conditions.forEach((id) => {
    const condition = CONDITIONS.find((item) => item.id === id);
    if (!condition) return;
    const directHit = condition.food.filter((food) => names.includes(food));
    if (directHit.length) directConditionHits.push(`${condition.name}注意${directHit.join("、")}`);
  });

  const basis = buildJudgementBasis({
    names,
    profileConditionNames,
    totalSalt,
    saltLimit,
    highCarbItems,
    hasSweet,
    hasHighOil,
    hasHighPurine,
    directConditionHits,
  });

  if (severeTexts.length) {
    return {
      level: "red",
      title: "先停下确认",
      safety: severeTexts.slice(0, 2).join(" "),
      nutrition: buildNutritionText(items, totalSalt, hasVegetable, hasProtein, highCarbItems, { hasSweet, hasHighOil, hasHighPurine }),
      advice: buildMealAdvice({ tags, hasVegetable, hasProtein, highCarbItems, riskTexts: severeTexts, totalSalt, saltLimit }),
      basis,
    };
  }

  if (riskTexts.length) {
    return {
      level: "yellow",
      title: "需要少吃一点",
      safety: riskTexts.slice(0, 2).join(" "),
      nutrition: buildNutritionText(items, totalSalt, hasVegetable, hasProtein, highCarbItems, { hasSweet, hasHighOil, hasHighPurine }),
      advice: buildMealAdvice({ tags, hasVegetable, hasProtein, highCarbItems, riskTexts, totalSalt, saltLimit }),
      basis,
    };
  }
  return {
    level: "green",
    title: "这顿整体稳妥",
    safety: `没有发现过敏黑名单，也没有明显慢病冲突。按单餐估算，盐分约 ${totalSalt.toFixed(1)} 克。`,
    nutrition: buildNutritionText(items, totalSalt, hasVegetable, hasProtein, highCarbItems, { hasSweet, hasHighOil, hasHighPurine }),
    advice: buildMealAdvice({ tags, hasVegetable, hasProtein, highCarbItems, riskTexts: [], totalSalt, saltLimit }),
    basis,
  };
}

function renderResultCard(level, title, text) {
  const icon = level === "green" ? "i-check" : level === "red" ? "i-alert" : "i-alert";
  return `
    <article class="result-card ${level}">
      <h3><svg><use href="#${icon}"></use></svg> ${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
    </article>
  `;
}

function renderRiskSummary(evaluation) {
  const label = evaluation.level === "red"
    ? "红色警告：先停下"
    : evaluation.level === "yellow"
      ? "黄色提醒：少吃一点"
      : "绿色结果：整体稳妥";
  return `
    <aside class="result-risk-strip ${evaluation.level}" aria-label="本餐风险提醒">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(evaluation.safety)}</span>
    </aside>
  `;
}

function renderJudgementBasis(evaluation) {
  return `
    <section class="judgement-card" aria-label="判断依据">
      <h3>为什么这样提醒</h3>
      <p>${escapeHtml(evaluation.basis || "按您的健康档案、过敏黑名单和本餐食物进行判断。")}</p>
    </section>
  `;
}

function renderRecognitionConfirm(items, source) {
  const label = source === "photo" ? "您上传的照片里看到" : "识别到您说的是";
  const uniqueItems = Array.from(new Map(items.map((item) => [item.name, item])).values());
  return `
    <section class="recognition-confirm" aria-label="识别确认">
      <h3>${label}</h3>
      <div class="food-chip-list">
        ${uniqueItems.map((item) => `
          <span class="food-confirm-chip">${escapeHtml(item.name)}<small>${escapeHtml(item.portion || "份量待确认")}</small></span>
        `).join("")}
      </div>
      <p>${source === "photo" ? "如不准确，请重新拍清楚餐盘，或改用语音补充。" : "如不准确，可以直接修改上方文字后再判断。"}</p>
    </section>
  `;
}

function renderSpeechControl() {
  return `
    <div class="speech-control" aria-label="语音播报控制">
      <span class="speech-status">正在播报结果</span>
      <button class="speech-toggle" type="button" data-speech-toggle aria-label="暂停语音播报">
        <svg><use href="#i-pause"></use></svg>
        <span>暂停播报</span>
      </button>
    </div>
  `;
}

function showMealResultModal(evaluation, items, source = "voice", mode = "before") {
  const modal = $("#mealResultModal");
  const sheet = $("#mealResultSheet");
  const copy = getMealResultCopy(evaluation, mode);
  const saltText = getMealSaltText(items);
  currentMealResult = { evaluation, items, source, mode };
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  sheet.innerHTML = `
    <button class="meal-modal-close" type="button" data-meal-result-action="close" aria-label="关闭判断结果"><svg><use href="#i-close"></use></svg></button>
    <div class="meal-modal-icon ${evaluation.level}">
      <svg><use href="#${evaluation.level === "green" ? "i-check" : "i-alert"}"></use></svg>
    </div>
    <h2 id="mealResultTitle">${escapeHtml(copy.title)}</h2>
    <p class="meal-result-summary">${escapeHtml(copy.summary)}</p>
    ${evaluation.level === "red" ? renderEmergencyGuidance() : ""}
    <div class="meal-result-pill">${escapeHtml(saltText)}</div>
    ${renderMealCaloriesList(items)}
    <section class="meal-next-card">
      <strong>${mode === "after" ? "下次这样吃" : "下一步这样吃"}</strong>
      <p>${escapeHtml(evaluation.advice)}</p>
    </section>
    <div class="meal-result-actions">
      <button class="primary-button meal-record-button ${evaluation.level}" type="button" data-meal-result-action="record">${mode === "after" ? "好，记下这一餐" : "好，记下这次查询"}</button>
      <button class="secondary-button meal-skip-button" type="button" data-meal-result-action="skip">先不记</button>
    </div>
    <div class="meal-modal-speech">${renderSpeechControl()}</div>
    <p class="meal-modal-note">${source === "photo" ? "AI 辅助结果，已由本地健康红线复核；请核对食物与配料。" : "系统辅助判断，请核对实际食物与份量。"} 建议不能替代医生诊断。</p>
  `;
  $(".app-shell").inert = true;
  modal.hidden = false;
  bindMealResultControls(sheet);
  sheet.querySelector("[data-meal-result-action='close']")?.focus();
  if (evaluation.level === "red") warnHighRisk();
  speakResult(`${copy.title}。${copy.summary}。${evaluation.advice}`);
}

function bindMealResultControls(sheet) {
  sheet.querySelectorAll("[data-meal-result-action]").forEach((button) => {
    bindPress(button, () => handleMealResultAction(button.dataset.mealResultAction));
  });
  const speechButton = sheet.querySelector("[data-speech-toggle]");
  if (speechButton) bindPress(speechButton, toggleSpeechPlayback);
}

function bindPress(element, handler) {
  let lastRun = 0;
  const run = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const now = Date.now();
    if (now - lastRun < 300) return;
    lastRun = now;
    handler(event);
  };
  element.addEventListener("pointerup", run);
  element.addEventListener("click", run);
}

function renderMealCaloriesList(items = []) {
  const rows = dedupeFoodMatches(items)
    .filter((item) => item.name)
    .slice(0, 6)
    .map((item) => {
      const per100g = Number(item.caloriesPer100g || 0);
      const grams = Number(item.estimatedGrams || 0);
      const total = Number(item.estimatedCalories || (per100g && grams ? per100g * grams / 100 : 0));
      return {
        name: item.name,
        per100g,
        grams,
        total,
        portion: item.portion || "",
      };
    });
  if (!rows.length || !rows.some((row) => row.per100g || row.total)) return "";
  const totalCalories = rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
  return `
    <section class="meal-calorie-card" aria-label="识别到的食物和热量">
      <strong>识别到的食物</strong>
      <div class="meal-calorie-list">
        ${rows.map((row) => `
          <div class="meal-calorie-row">
            <span>${escapeHtml(row.name)}${row.portion ? ` · ${escapeHtml(row.portion)}` : ""}</span>
            <small>${row.per100g ? `约 ${Math.round(row.per100g)} 千卡/100g` : "热量待确认"}${row.total ? `，本份约 ${Math.round(row.total)} 千卡` : ""}</small>
          </div>
        `).join("")}
      </div>
      ${totalCalories ? `<em>本餐估算约 ${Math.round(totalCalories)} 千卡</em>` : ""}
    </section>
  `;
}

function getMealResultCopy(evaluation, mode = "before") {
  if (evaluation.level === "green") {
    return {
      title: mode === "after" ? "记好了" : "可以吃",
      summary: "没有碰到过敏黑名单，也没有和慢病红线明显冲突。",
    };
  }
  if (evaluation.level === "red") {
    return {
      title: mode === "after" ? "这次要注意" : "先别吃",
      summary: evaluation.safety || "这份饭菜和您的健康红线有冲突，建议先停下确认。",
    };
  }
  return {
    title: mode === "after" ? "记下提醒" : "少吃一点",
    summary: evaluation.safety || "这份饭菜可以少量吃，注意份量和下一餐调整。",
  };
}

function getMealSaltText(items) {
  const totalSalt = dedupeFoodMatches(items).reduce((sum, item) => sum + Number(item.salt || 0) * Number(item.portionFactor || 1), 0);
  const saltLimit = hasCondition("hypertension") || hasCondition("kidney") ? 5 : 6;
  return `这餐盐分约 ${totalSalt.toFixed(1)} 克 · 今日建议不超过 ${saltLimit} 克`;
}

function handleMealResultAction(action) {
  if (action === "close" || action === "skip") {
    closeMealResultModal();
    if (action === "skip") showToast("已跳过记录");
    return;
  }
  if (action !== "record" || !currentMealResult) return;
  const resultMode = currentMealResult.mode;
  const resultSource = currentMealResult.source;
  recordMealAlert(currentMealResult.evaluation, currentMealResult.items, currentMealResult.source);
  closeMealResultModal();
  if (resultSource !== "photo") {
    $("#voiceConfirm").hidden = true;
    $("#voiceConfirm").innerHTML = "";
    $("#voiceResult").innerHTML = "";
    pendingVoiceMeal = null;
  }
  showToast(resultMode === "after" ? "已记下这一餐" : "已记下这次查询");
}

function closeMealResultModal() {
  $("#mealResultModal").hidden = true;
  $("#mealResultSheet").innerHTML = "";
  $(".app-shell").inert = false;
  currentMealResult = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  lastFocusedElement?.focus({ preventScroll: true });
  lastFocusedElement = null;
}

function renderEmergencyGuidance() {
  return `
    <section class="emergency-guidance" aria-label="紧急情况处理">
      <strong>已经不舒服时，不要等待应用判断</strong>
      <p>如出现呼吸困难、喉咙发紧、嘴唇或舌头肿、意识异常或明显呛咳，请立即停止进食并拨打 120。</p>
    </section>
  `;
}

async function handlePhoto(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  await processPhoto(file, event.target);
}

async function processPhoto(file, input = null) {
  const preview = $("#photoPreview");
  const resultPanel = $("#photoResult");
  const reset = $("#photoReset");
  const picker = $("#albumOpenButton");
  if (!state.privacy?.accepted) {
    resultPanel.innerHTML = renderResultCard("red", "需要先确认数据说明", "请返回身份选择页，确认照片与健康档案的使用方式后再分析。");
    if (input) input.value = "";
    return;
  }
  if (!isImageFile(file)) {
    preview.classList.remove("has-image");
    preview.textContent = "请选择 JPG、PNG 或 WebP 饭菜照片";
    resultPanel.innerHTML = renderResultCard("red", "文件格式不支持", "系统只接受 JPG、PNG 或 WebP 图片。");
    if (reset) reset.hidden = false;
    if (input) input.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    preview.classList.remove("has-image");
    preview.textContent = "照片超过 5MB，请选择较小的图片";
    resultPanel.innerHTML = renderResultCard("red", "照片太大", "为保护传输稳定性，请选择不超过 5MB 的饭菜照片。");
    if (reset) reset.hidden = false;
    if (input) input.value = "";
    return;
  }
  lastPhotoFile = file;
  const url = URL.createObjectURL(file);
  preview.classList.add("has-image");
  preview.innerHTML = `<img src="${url}" alt="从相册选择的饭菜照片" />`;
  if (serviceStatus.checked && !serviceStatus.photoAnalysis) {
    renderPhotoUnclear("当前服务器尚未配置照片识别，系统不会上传或猜测照片内容。请改用“问一问”输入食物名称。", "photo_model_not_configured");
    if (reset) reset.hidden = false;
    if (input) input.value = "";
    showToast("照片未上传，请先改用文字记录");
    return;
  }
  resultPanel.innerHTML = renderResultCard("yellow", "正在看照片", "我会先判断是不是饭菜照片，再给出简短提醒。");
  resultPanel.setAttribute("aria-busy", "true");
  if (picker) {
    picker.disabled = true;
    picker.setAttribute("aria-disabled", "true");
  }
  if (reset) reset.hidden = false;
  showToast("已选好照片，正在识别饭菜");
  try {
    const result = await analyzePhoto(file);
    if (result.status === "not-food") {
      renderPhotoReupload(result.reason);
      return;
    }
    if (result.status === "unclear") {
      renderPhotoUnclear(result.reason, result.issue);
      return;
    }
    if (result.evaluation) {
      renderAiMealResult(result, "#photoResult", true, "photo");
      return;
    }
    renderMealResult(result.items, "#photoResult", true, "photo");
  } catch {
    renderPhotoUnclear("照片分析没有完成，系统不会猜测结果。请稍后重试，或用“问一问”输入食物名称。", "service-unavailable");
  } finally {
    resultPanel.removeAttribute("aria-busy");
    if (picker) {
      picker.disabled = false;
      picker.removeAttribute("aria-disabled");
    }
    if (input) input.value = "";
  }
}

function retryLastPhoto() {
  if (!lastPhotoFile) {
    openPhotoPicker("photoInput");
    return;
  }
  processPhoto(lastPhotoFile);
}

function isImageFile(file) {
  return Boolean(file && ["image/jpeg", "image/png", "image/webp"].includes(String(file.type || "").toLowerCase()));
}

function matchFoodsFromText(text) {
  const normalized = normalizeFoodText(text);
  if (!normalized) return [];
  const matches = [];
  FOOD_ALIASES.forEach((entry) => {
    if (entry.terms.some((term) => normalized.includes(normalizeFoodText(term)))) {
      const food = FOODS.find((item) => item.name === entry.food);
      if (food) matches.push(withPortion(food, text));
    }
  });
  FOODS.forEach((food) => {
    if (normalized.includes(normalizeFoodText(food.name))) matches.push(withPortion(food, text));
  });
  return dedupeFoodMatches(matches);
}

function inferFoodsFromText(text, directMatches = []) {
  const normalized = normalizeFoodText(text);
  if (!normalized) return [];
  const inferred = [];
  const directNames = new Set(directMatches.map((item) => item.name));

  const add = (name, portion = "") => {
    if (directNames.has(name) || inferred.some((item) => item.name === name)) return;
    const food = FOODS.find((item) => item.name === name);
    if (food) inferred.push({ ...withPortion(food, text), inferred: true, portion: portion || inferPortion(text, name) || "约一份" });
  };

  if (TEXT_HIGH_SALT_TERMS.some((term) => normalized.includes(normalizeFoodText(term)))) {
    if (normalized.includes("方便面") || normalized.includes("泡面")) add("方便面");
    else if (normalized.includes("火锅") || normalized.includes("麻辣烫")) add("火锅");
    else if (normalized.includes("烧烤") || normalized.includes("烤串")) add("烧烤");
    else if (!directMatches.length) add("外卖快餐");
  }
  if (TEXT_HIGH_OIL_TERMS.some((term) => normalized.includes(normalizeFoodText(term))) && !directMatches.some((item) => item.tags?.includes("油脂偏高"))) {
    add(normalized.includes("炒饭") ? "炒饭" : "外卖快餐");
  }
  if (TEXT_SWEET_TERMS.some((term) => normalized.includes(normalizeFoodText(term)))) {
    if (normalized.includes("奶茶")) add("奶茶", "约一杯");
    else if (normalized.includes("蛋糕") || normalized.includes("甜品") || normalized.includes("点心") || normalized.includes("饼干")) add("蛋糕", "约一份");
    else add("甜饮料", "约一杯");
  }
  if (TEXT_PURINE_TERMS.some((term) => normalized.includes(normalizeFoodText(term))) && !directMatches.some((item) => item.tags?.includes("高嘌呤"))) {
    if (normalized.includes("内脏") || normalized.includes("猪肝") || normalized.includes("鸭肠")) add("动物内脏");
    else if (normalized.includes("海鲜") || normalized.includes("虾") || normalized.includes("蟹")) add("海鲜");
  }
  if (normalized.includes("水果") && !directMatches.some((item) => item.tags?.includes("水果"))) add("水果");
  return inferred;
}

function dedupeFoodMatches(items) {
  const unique = Array.from(new Map(items.filter(Boolean).map((item) => [item.name, item])).values());
  const names = new Set(unique.map((item) => item.name));
  const suppressed = new Set();
  Object.entries(COMPOUND_SUPPRESSIONS).forEach(([compound, parts]) => {
    if (!names.has(compound)) return;
    parts.forEach((part) => suppressed.add(part));
  });
  return unique.filter((item) => !suppressed.has(item.name));
}

function withPortion(food, text) {
  const portion = inferPortion(text, food.name);
  return { ...food, portion, portionFactor: inferPortionFactor(portion) };
}

function inferPortion(text, foodName) {
  const normalized = normalizeFoodText(text);
  const entry = FOOD_ALIASES.find((item) => item.food === foodName);
  const terms = [foodName, ...(entry?.terms || [])].map(normalizeFoodText);
  const portions = ["半碗", "一碗", "两碗", "半杯", "一杯", "一份", "两份", "一个", "两个", "少量", "几口"];
  const hit = portions.find((portion) => {
    const normalizedPortion = normalizeFoodText(portion);
    return terms.some((term) => (
      normalized.includes(`${normalizedPortion}${term}`)
      || normalized.includes(`${term}${normalizedPortion}`)
      || (term.includes(normalizedPortion) && normalized.includes(term))
    ));
  });
  if (hit) return hit;
  if (foodName.includes("牛奶") || foodName.includes("豆浆") || foodName.includes("饮料")) return "约一杯";
  if (foodName.includes("鸡蛋")) return "约一个";
  return "";
}

function inferPortionFactor(portion) {
  if (!portion) return 1;
  if (portion.includes("半")) return 0.5;
  if (portion.includes("两") || portion.includes("二")) return 2;
  if (portion.includes("三")) return 3;
  if (portion.includes("少量") || portion.includes("几口")) return 0.35;
  if (portion.includes("大")) return 1.35;
  return 1;
}

function looksLikeMealText(normalized) {
  const hasMealIntent = MEAL_INTENT_TERMS.some((term) => normalized.includes(normalizeFoodText(term)));
  const hasNonMealIntent = NON_MEAL_TERMS.some((term) => normalized.includes(normalizeFoodText(term)));
  const hasFoodDescriptor = [...TEXT_HIGH_SALT_TERMS, ...TEXT_HIGH_OIL_TERMS, ...TEXT_SWEET_TERMS, ...TEXT_PURINE_TERMS].some((term) => normalized.includes(normalizeFoodText(term)));
  return (hasMealIntent || hasFoodDescriptor) && !hasNonMealIntent;
}

function normalizeFoodText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。！？、,.!?;；:：]/g, "");
}

function buildNutritionText(items, totalSalt, hasVegetable, hasProtein, highCarbItems, flags = {}) {
  const notes = [];
  if (totalSalt >= 4) notes.push("盐分偏高");
  else if (totalSalt >= 2.5) notes.push("盐分需要控制");
  else notes.push("盐分看起来不高");
  if (highCarbItems.length >= 2) notes.push("主食偏多");
  else if (highCarbItems.length) notes.push("有主食，注意定量");
  if (flags.hasSweet) notes.push("甜饮或甜食需要留意");
  if (!hasVegetable) notes.push("蔬菜偏少");
  if (!hasProtein) notes.push("优质蛋白不足");
  if (flags.hasHighOil || items.some((item) => item.tags?.includes("油脂偏高"))) notes.push("油脂偏高");
  if (flags.hasHighPurine) notes.push("嘌呤偏高");
  if (items.some((item) => item.tags?.includes("膳食纤维"))) notes.push("膳食纤维不错");
  return `${notes.join("，")}。`;
}

function buildMealAdvice({ tags, hasVegetable, hasProtein, highCarbItems, riskTexts, totalSalt = 0, saltLimit = 6 }) {
  if (riskTexts.some((text) => text.includes("痛风"))) {
    return "下一餐避开海鲜、动物内脏、火锅和浓汤，选青菜、豆腐或鸡蛋，再配少量杂粮饭。";
  }
  if (riskTexts.some((text) => text.includes("糖尿病"))) {
    return "下一餐主食控制在半碗左右，饮料换成白水，搭配一份绿叶菜和鸡蛋或豆腐。";
  }
  if (riskTexts.some((text) => text.includes("高血压") || text.includes("肾病"))) {
    const saltText = totalSalt >= saltLimit * 0.75 ? "今天后面尽量选无盐或少盐做法" : "下一餐少放酱油和盐";
    return `${saltText}，不喝汤汁，加一份绿叶菜。`;
  }
  if (tags.includes("甜饮") || tags.includes("甜食")) {
    return "下一餐不再加甜饮和点心，主食减一点，优先吃蔬菜和蛋白质。";
  }
  if (tags.includes("油脂偏高")) {
    return "下一餐避开油炸、红烧和肥肉，改成清蒸、水煮或炖菜。";
  }
  if (!hasVegetable && !hasProtein) return "下一餐建议加一份绿叶菜，再加鸡蛋、豆腐或鱼肉。";
  if (!hasVegetable) return "下一餐先补一份绿叶菜，做法清淡一点。";
  if (!hasProtein) return "下一餐可以加一个鸡蛋、豆腐或一杯低脂牛奶。";
  if (highCarbItems.length || tags.includes("主食偏多")) return "下一餐主食少一点，多配蔬菜和优质蛋白。";
  return "下一餐继续保持少油少盐，饭菜种类不用太复杂。";
}

function buildJudgementBasis({ names, profileConditionNames, totalSalt, saltLimit, highCarbItems, hasSweet, hasHighOil, hasHighPurine, directConditionHits }) {
  const parts = [
    `识别到：${names.join("、")}`,
    `档案红线：${profileConditionNames.length ? profileConditionNames.join("、") : "暂无慢病红线"}`,
    `盐分约 ${totalSalt.toFixed(1)} 克，按一天 ${saltLimit} 克盐额度看，${describeSaltBudget(totalSalt, saltLimit)}`,
  ];
  if (highCarbItems.length) parts.push(`主食类：${highCarbItems.join("、")}`);
  if (hasSweet) parts.push("含甜饮或甜食");
  if (hasHighOil) parts.push("油脂偏高");
  if (hasHighPurine) parts.push("嘌呤偏高");
  if (directConditionHits.length) parts.push(directConditionHits.slice(0, 2).join("；"));
  return `${parts.join("；")}。`;
}

function describeSaltBudget(totalSalt, saltLimit) {
  const share = totalSalt / saltLimit;
  if (share >= 1) return "今天盐额度基本花完了";
  if (share >= 0.75) return "已经用了大半";
  if (share >= 0.45) return "占了一部分";
  return "占得不多";
}

function getProfileConditionNames() {
  return [
    ...state.profile.conditions.map((id) => CONDITIONS.find((item) => item.id === id)?.name).filter(Boolean),
    ...state.profile.customConditions,
  ];
}

function hasCondition(id) {
  return state.profile.conditions.includes(id);
}

function hasAllergyConflict(allergy, items, originalText = "") {
  const normalizedAllergy = normalizeFoodText(allergy);
  const text = normalizeFoodText(`${originalText} ${items.map((item) => `${item.name} ${(item.tags || []).join(" ")}`).join(" ")}`);
  if (!normalizedAllergy) return false;
  if (text.includes(normalizedAllergy)) return true;
  if (normalizedAllergy.includes("乳糖") && (text.includes("牛奶") || text.includes("奶茶") || text.includes("低脂奶"))) return true;
  if (normalizedAllergy.includes("海鲜") && items.some((item) => item.tags?.includes("海鲜"))) return true;
  return items.some((item) => {
    const foodName = normalizeFoodText(item.name);
    return foodName.includes(normalizedAllergy) || normalizedAllergy.includes(foodName);
  });
}

function renderUnclearResult(selector, source, speak, parsed = {}) {
  const isPhoto = source === "photo";
  let title = isPhoto ? "没看清饭菜" : "还不能判断";
  let text = parsed.reason || (isPhoto
    ? "这张照片没有识别出具体食物。请重新拍清楚餐盘，或用语音补充一句吃了什么。"
    : "请再说一次，尽量说出食物名字，比如：半碗米饭、一个鸡蛋、一份青菜。");
  if (parsed.status === "not-meal") {
    title = "这不像饮食记录";
    text = parsed.reason;
  }
  if (parsed.status === "empty") {
    title = "请先输入吃了什么";
    text = parsed.reason;
  }
  $(selector).innerHTML = `${renderResultCard("yellow", title, text)}${speak ? renderSpeechControl() : ""}`;
  scrollResultIntoView(selector);
  if (speak) speakResult(`${title}。${text}`);
}

function renderPhotoReupload(reason) {
  $("#photoResult").innerHTML = `
    ${renderResultCard("red", "请重新上传饭菜照片", reason)}
    ${renderSpeechControl()}
  `;
  warnHighRisk();
  scrollResultIntoView("#photoResult");
  speakResult(`请重新上传饭菜照片。${reason}`);
}

function renderPhotoUnclear(reason, issue = "") {
  const title = issue === "photo_model_not_configured"
    ? "照片识别尚未配置"
    : issue === "service-unavailable" || issue === "upstream_timeout"
      ? "照片识别暂不可用"
      : "照片内容不够清楚";
  $("#photoResult").innerHTML = `
    ${renderResultCard("yellow", title, reason)}
    <div class="recovery-actions" aria-label="下一步操作">
      <button class="secondary-button" type="button" data-photo-retry>重新识别</button>
      <button class="primary-button" type="button" data-photo-to-text>改用文字</button>
    </div>
    ${renderSpeechControl()}
  `;
  scrollResultIntoView("#photoResult");
  speakResult(`${title}。${reason}`);
}

async function analyzePhoto(file) {
  if (location.protocol.startsWith("http")) {
    const mealAiResult = await analyzePhotoMealWithModel(file);
    if (mealAiResult) return mealAiResult;
  }
  return {
    status: "unclear",
    issue: "service-unavailable",
    reason: "照片识别服务当前不可用，系统不会根据文件名或颜色猜测饭菜。请稍后重试，或改用“问一问”输入食物名称。",
  };
}

async function analyzePhotoMealWithModel(file) {
  if (!location.protocol.startsWith("http")) return null;
  const dataUrl = await fileToDataUrl(file);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch("/api/analyze-photo-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: String(dataUrl).split(",")[1] || dataUrl,
        mimeType: file.type || "image/jpeg",
        profile: getProfileForAi(),
      }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        status: "unclear",
        issue: data.error || "service-unavailable",
        reason: data.message || (response.status === 503
          ? "照片识别服务正在准备中，请稍后重试，或改用文字输入食物名称。"
          : "照片识别服务暂时不可用，请稍后重试。"),
      };
    }
    return normalizeAiMealAnalysis(data, null);
  } catch (error) {
    return {
      status: "unclear",
      issue: error?.name === "AbortError" ? "upstream_timeout" : "service-unavailable",
      reason: error?.name === "AbortError"
        ? "照片识别超过 60 秒仍未完成，系统已停止等待。请稍后重试或改用“问一问”。"
        : "照片识别请求没有完成，请稍后重试，或改用文字输入食物名称。",
    };
  } finally {
    clearTimeout(timer);
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getProfileForAi() {
  const conditions = [
    ...state.profile.conditions.map((id) => CONDITIONS.find((item) => item.id === id)?.name).filter(Boolean),
    ...state.profile.customConditions,
  ];
  return {
    age: state.profile.age,
    conditions,
    allergies: state.profile.allergies,
    goals: [
      ...state.profile.goals.map((id) => GOALS.find((item) => item.id === id)?.name).filter(Boolean),
      ...state.profile.customGoals,
    ],
    personal: state.profile.personal,
  };
}

function speakResult(text) {
  currentSpeechText = text;
  speechPaused = false;
  if (!("speechSynthesis" in window)) {
    updateSpeechControls("浏览器不支持朗读");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 220));
  utterance.lang = "zh-CN";
  utterance.rate = 0.92;
  utterance.onend = () => updateSpeechControls("播报已完成");
  utterance.onerror = () => updateSpeechControls("播报被打断");
  window.speechSynthesis.speak(utterance);
  updateSpeechControls("正在播报结果");
}

function toggleSpeechPlayback() {
  if (!("speechSynthesis" in window)) {
    showToast("当前浏览器不支持语音播报");
    return;
  }
  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
    speechPaused = true;
    updateSpeechControls("已暂停播报");
    return;
  }
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    speechPaused = false;
    updateSpeechControls("继续播报中");
    return;
  }
  if (currentSpeechText) speakResult(currentSpeechText);
}

function updateSpeechControls(statusText = "正在播报结果") {
  const paused = speechPaused || (window.speechSynthesis && window.speechSynthesis.paused);
  const speaking = Boolean(window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending));
  $$(".speech-control").forEach((control) => {
    const status = control.querySelector(".speech-status");
    const button = control.querySelector(".speech-toggle");
    const icon = button?.querySelector("use");
    const label = button?.querySelector("span");
    if (status) status.textContent = statusText;
    if (!button || !icon || !label) return;
    const replay = !speaking && !paused;
    if (status && replay && statusText === "正在播报结果") status.textContent = "可重新播报结果";
    button.classList.toggle("is-paused", paused || replay);
    icon.setAttribute("href", paused || replay ? "#i-play" : "#i-pause");
    label.textContent = replay ? "重播结果" : paused ? "继续播报" : "暂停播报";
    button.setAttribute("aria-label", replay ? "重新语音播报" : paused ? "继续语音播报" : "暂停语音播报");
  });
}

function warnHighRisk() {
  if (navigator.vibrate) navigator.vibrate([90, 40, 90]);
  showToast("发现高风险提醒，请先停下确认");
}

function recordMealAlert(evaluation, items, source) {
  const recordedAt = new Date();
  const now = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(recordedAt);
  const record = {
    id: `${recordedAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    recordedAt: recordedAt.toISOString(),
    dateKey: formatLocalDateKey(recordedAt),
    mealPeriod: getMealPeriod({ recordedAt: recordedAt.toISOString() }),
    level: evaluation.level,
    title: evaluation.title,
    message: evaluation.safety,
    advice: evaluation.advice,
    source: source === "photo" ? "拍照记录" : "语音/文字记录",
    foods: items.map((item) => item.name).slice(0, 5),
    updated: `今天 ${now}`,
    handled: false,
  };
  state.latestMealRecord = record;
  state.mealHistory = [...(Array.isArray(state.mealHistory) ? state.mealHistory : []), record].slice(-200);
  if (evaluation.level !== "green") {
    const existingAlert = state.latestMealAlert || {};
    const keepUnresolvedRed = existingAlert.level === "red" && !existingAlert.handled && evaluation.level !== "red";
    if (!keepUnresolvedRed) state.latestMealAlert = record;
  }
  renderHomeTimeline();
  renderFamily();
  saveState();
  void syncMealRecord(record);
}

function renderFamily() {
  const hero = $("#familyHero");
  const grid = $("#familyGrid");
  const monitor = $("#familyMonitor");
  if (!hero || !grid || !monitor) return;
  const isRemoteFamilyView = state.auth.role === "family";
  const linkedAccount = isRemoteFamilyView
    ? (familyBinding.linked || []).find((item) => item.relationship === "elder")
    : familyBinding.linked?.[0] || null;
  const permissions = isRemoteFamilyView && linkedAccount
    ? (sharedHealthData.permissions || linkedAccount.permissions || { canViewProfile: true, canViewMeals: true, canAcknowledgeAlerts: true })
    : { canViewProfile: true, canViewMeals: true, canAcknowledgeAlerts: true };
  if (isRemoteFamilyView && linkedAccount && !sharedHealthData.loaded) {
    hero.innerHTML = `<div><span>已绑定 · ${escapeHtml(linkedAccount.user?.nickname || linkedAccount.user?.phone || "长辈")}</span><strong>正在同步健康档案</strong><small>请稍候，正在读取长辈设备上传的记录。</small></div><div class="score-badge">同步中</div>`;
    grid.innerHTML = '<div class="mini-card green"><span>今日记录</span><strong>--</strong></div><div class="mini-card red"><span>红色警告</span><strong>--</strong></div><div class="mini-card yellow"><span>黄色提醒</span><strong>--</strong></div><div class="mini-card blue"><span>待查看</span><strong>--</strong></div>';
    monitor.innerHTML = '<div class="monitor-empty"><strong>正在读取云端记录</strong><span>完成后会自动显示，无需重复绑定。</span></div>';
    return;
  }
  if (isRemoteFamilyView && linkedAccount && sharedHealthData.error) {
    hero.innerHTML = `<div><span>已绑定 · ${escapeHtml(linkedAccount.user?.nickname || linkedAccount.user?.phone || "长辈")}</span><strong>共享数据暂时无法读取</strong><small>${escapeHtml(sharedHealthData.error)}</small></div><div class="score-badge">未同步</div>`;
    grid.innerHTML = '<div class="mini-card green"><span>今日记录</span><strong>--</strong></div><div class="mini-card red"><span>红色警告</span><strong>--</strong></div><div class="mini-card yellow"><span>黄色提醒</span><strong>--</strong></div><div class="mini-card blue"><span>待查看</span><strong>--</strong></div>';
    monitor.innerHTML = '<div class="monitor-empty"><strong>请检查网络后重试</strong><span>绑定关系仍然保留，不需要重新绑定。</span></div><button class="secondary-button trend-button" type="button" data-family-action="refresh">重新同步</button>';
    bindFamilyMonitorEvents(monitor);
    return;
  }
  const profile = isRemoteFamilyView
    ? (permissions.canViewProfile ? sharedHealthData.profile : null)
    : state.profile;
  const history = getActiveMealHistory();
  const todayKey = formatLocalDateKey(new Date());
  const todayRecords = history.filter((record) => record?.dateKey === todayKey);
  const redCount = todayRecords.filter((record) => record.level === "red").length;
  const yellowCount = todayRecords.filter((record) => record.level === "yellow").length;
  const unresolvedCount = todayRecords.filter((record) => record.level !== "green" && !record.handled).length;
  const latest = [...history].reverse().find((record) => record.level !== "green" && !record.handled) || history.at(-1) || null;
  const profileLabel = isRemoteFamilyView && linkedAccount && !permissions.canViewProfile
    ? "长辈未授权查看"
    : profile?.age ? `${profile.age} 岁` : "基础信息未完成";
  const linkedName = linkedAccount?.user?.nickname || linkedAccount?.user?.phone || "";
  const bindingLabel = linkedAccount ? `已绑定 · ${linkedName}` : "尚未绑定账号";

  hero.innerHTML = `
    <div>
      <span>${escapeHtml(bindingLabel)}</span>
      <strong>健康档案 · ${escapeHtml(profileLabel)}</strong>
      <small>${!permissions.canViewMeals ? "长辈未授权查看餐食记录" : latest ? `最近记录：${escapeHtml(latest.updated || "时间未知")}` : "尚无真实餐食记录"}</small>
    </div>
    <div class="score-badge">${isRemoteFamilyView && linkedAccount ? "云端" : linkedAccount ? "已绑定" : "本机"}</div>
  `;
  grid.innerHTML = `
    <div class="mini-card green"><span>今日记录</span><strong>${permissions.canViewMeals ? `${todayRecords.length} 餐` : "--"}</strong></div>
    <div class="mini-card red"><span>红色警告</span><strong>${permissions.canViewMeals ? `${redCount} 条` : "--"}</strong></div>
    <div class="mini-card yellow"><span>黄色提醒</span><strong>${permissions.canViewMeals ? `${yellowCount} 次` : "--"}</strong></div>
    <div class="mini-card blue"><span>待查看</span><strong>${permissions.canViewMeals ? `${unresolvedCount} 条` : "--"}</strong></div>
  `;
  if (isRemoteFamilyView && linkedAccount && !permissions.canViewMeals) {
    monitor.innerHTML = `
      <div class="section-title"><h3>真实记录</h3><span>未授权</span></div>
      <div class="monitor-empty">
        <strong>长辈尚未共享餐食记录</strong>
        <span>共享范围由长辈账号控制。绑定关系仍然有效。</span>
      </div>
      <button class="secondary-button trend-button" type="button" data-family-action="profile">查看共享权限</button>
    `;
    bindFamilyMonitorEvents(monitor);
    return;
  }
  if (!latest) {
    monitor.innerHTML = `
      <div class="section-title"><h3>真实记录</h3><span>${isRemoteFamilyView && linkedAccount ? "云端已同步" : "云端保存"}</span></div>
      <div class="monitor-empty">
        <strong>还没有餐食记录</strong>
        <span>${isRemoteFamilyView && linkedAccount ? "长辈在自己的账号完成一次饮食确认后，这里会自动出现。" : "在“问一问”或“拍一拍”完成一次确认后，这里才会出现数据。"}</span>
      </div>
      <button class="secondary-button trend-button" type="button" data-family-action="report">查看记录日历</button>
    `;
    bindFamilyMonitorEvents(monitor);
    return;
  }
  monitor.innerHTML = `
    <div class="section-title">
      <h3>最近一次真实记录</h3>
      <span>${escapeHtml(latest.source || "餐食记录")}</span>
    </div>
    <div class="monitor-row ${escapeHtml(latest.level || "yellow")}">
      <strong>${escapeHtml(latest.title || "饮食提醒")}</strong>
      <span>${escapeHtml(latest.message || "暂无说明")}</span>
    </div>
    <div class="monitor-row">
      <strong>建议行动</strong>
      <span>${escapeHtml(latest.advice || "请结合实际食物和医生建议核对。")}</span>
    </div>
    <div class="family-actions">
      ${latest.level !== "green" && !latest.handled && permissions.canAcknowledgeAlerts ? '<button class="secondary-button action-done" type="button" data-family-action="done">标记已查看</button>' : ""}
    </div>
    <button class="secondary-button trend-button" type="button" data-family-action="report">查看记录日历</button>
  `;
  bindFamilyMonitorEvents(monitor);
}

function bindFamilyMonitorEvents(monitor) {
  monitor.querySelectorAll("[data-family-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void handleFamilyAction(button.dataset.familyAction);
    });
  });
}

async function handleFamilyAction(action) {
  if (action === "refresh") return refreshSharedHealthData();
  if (action === "report") {
    const latestRecord = [...getActiveMealHistory()]
      .reverse()
      .find((record) => /^\d{4}-\d{2}-\d{2}$/.test(record?.dateKey || ""));
    const targetDateKey = latestRecord?.dateKey || formatLocalDateKey(new Date());
    const [year, month, day] = targetDateKey.split("-").map(Number);
    state.reportYear = year;
    state.reportMonth = month - 1;
    state.selectedReportDay = day;
    goToScreen("report");
    showToast("已打开真实记录日历");
    return;
  }
  if (action === "call" || action === "meal") return showToast("当前本机试用尚未启用跨设备联系或推送");
  if (action === "profile") {
    await openBindModal();
    return;
  }
  if (action === "done") {
    const activeAlert = [...getActiveMealHistory()].reverse().find((record) => record.level !== "green" && !record.handled);
    if (!activeAlert) return showToast("当前没有待查看提醒");
    try {
      const elderUserId = state.auth.role === "family" ? sharedHealthData.elder?.id : state.auth.userId;
      await authApi("/api/auth/meal-handled", { recordId: activeAlert.id, elderUserId });
      if (state.auth.role === "family") {
        sharedHealthData.meals = sharedHealthData.meals.map((record) => record.id === activeAlert.id ? { ...record, handled: true } : record);
      } else {
        state.latestMealAlert = { ...activeAlert, handled: true };
        state.mealHistory = state.mealHistory.map((record) => record.id === activeAlert.id ? { ...record, handled: true } : record);
        saveState();
      }
      renderFamily();
      showToast("已同步标记为已查看");
    } catch (error) {
      showToast(error.message || "标记失败，请检查网络后重试");
    }
  }
}

function getActiveMealHistory() {
  if (state.auth.role === "family" && sharedHealthData.loaded) {
    return Array.isArray(sharedHealthData.meals) ? sharedHealthData.meals : [];
  }
  return Array.isArray(state.mealHistory) ? state.mealHistory : [];
}

function openFamilyProfileWizard() {
  state.mode = "family";
  openWizard(0);
  showToast("正在帮长辈完善健康档案");
}

function scrollResultIntoView(selector) {
  const target = $(selector);
  if (!target) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(() => {
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, 80);
}

async function openBindModal() {
  lastFocusedElement = document.activeElement;
  $(".app-shell").inert = true;
  $("#bindModal").hidden = false;
  renderBindModal();
  $("#closeBindModal").focus();
  await refreshFamilyBindingStatus();
}

function closeBindModal() {
  $("#bindModal").hidden = true;
  $(".app-shell").inert = false;
  lastFocusedElement?.focus({ preventScroll: true });
  lastFocusedElement = null;
}

async function refreshFamilyBindingStatus() {
  if (!state.auth.loggedIn) return;
  try {
    const result = await authApi("/api/auth/family/status");
    familyBinding = { ...result, loaded: true };
    if (activeFamilyInvite && activeFamilyInvite.expiresAt <= Date.now()) activeFamilyInvite = null;
    if (state.auth.role === "family") await refreshSharedHealthData();
  } catch (error) {
    familyBinding = { loaded: true, linked: [], error: error.message || "绑定状态读取失败" };
  }
  renderFamily();
  if (!$("#bindModal").hidden) renderBindModal();
}

function renderBindModal() {
  const content = $("#bindContent");
  if (!content) return;
  if (!familyBinding.loaded) {
    content.innerHTML = '<p class="eyebrow">家人绑定</p><h2 id="bindTitle">正在读取绑定状态</h2><p class="bind-hint">请稍候。</p>';
    return;
  }
  if (familyBinding.error) {
    content.innerHTML = `
      <p class="eyebrow">家人绑定</p>
      <h2 id="bindTitle">暂时无法读取</h2>
      <p class="auth-error">${escapeHtml(familyBinding.error)}</p>
      <button class="secondary-button bind-wide-button" type="button" data-bind-action="refresh">重新加载</button>
    `;
    return;
  }
  const isFamily = state.auth.role === "family";
  const linkedMarkup = renderFamilyRelations(familyBinding.linked || []);
  const inviteIsActive = activeFamilyInvite?.code && activeFamilyInvite.expiresAt > Date.now();
  content.innerHTML = isFamily ? `
    <p class="eyebrow">家人绑定</p>
    <h2 id="bindTitle">绑定长辈账号</h2>
    <p class="bind-hint">请向长辈获取 6 位绑定码。绑定关系会安全保存在账号数据库中。</p>
    ${linkedMarkup}
    <label class="bind-code-label" for="familyBindCode">6 位绑定码
      <input id="familyBindCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="请输入绑定码" />
    </label>
    <p class="auth-error" id="bindError" role="alert" hidden></p>
    <button class="primary-button bind-wide-button" type="button" data-bind-action="bind" ${familyBindingBusy ? "disabled" : ""}>${familyBindingBusy ? "正在绑定…" : "确认绑定"}</button>
  ` : `
    <p class="eyebrow">家人绑定</p>
    <h2 id="bindTitle">邀请家人加入</h2>
    <p class="bind-hint">绑定码 10 分钟内有效且只能使用一次。家人登录自己的账号后即可输入，界面使用方式不会影响授权。</p>
    ${linkedMarkup}
    ${inviteIsActive ? `
      <section class="bind-invite" aria-label="当前绑定码">
        <span>当前绑定码</span>
        <strong>${escapeHtml(activeFamilyInvite.code)}</strong>
        <small>有效期至 ${escapeHtml(formatInviteTime(activeFamilyInvite.expiresAt))}</small>
      </section>
    ` : ""}
    <p class="auth-error" id="bindError" role="alert" hidden></p>
    <button class="primary-button bind-wide-button" type="button" data-bind-action="generate" ${familyBindingBusy ? "disabled" : ""}>${familyBindingBusy ? "正在生成…" : inviteIsActive ? "重新生成绑定码" : "生成绑定码"}</button>
  `;
}

function renderFamilyRelations(relations) {
  if (!relations.length) return '<p class="bind-empty">当前还没有绑定账号</p>';
  return `
    <section class="bind-relations" aria-label="已绑定账号">
      <h3>已绑定账号</h3>
      ${relations.map((relation) => {
        const permissions = relation.permissions || { canViewProfile: true, canViewMeals: true, canAcknowledgeAlerts: true };
        const controlsSharing = relation.relationship === "family";
        const permissionSummary = [
          permissions.canViewProfile ? "健康档案" : "",
          permissions.canViewMeals ? "餐食记录" : "",
          permissions.canAcknowledgeAlerts ? "确认提醒" : "",
        ].filter(Boolean).join("、") || "未共享健康数据";
        return `
          <div class="bind-relation-item">
            <div class="bind-relation-row">
              <div><strong>${escapeHtml(relation.user?.nickname || (relation.relationship === "elder" ? "长辈" : "家人"))}</strong><small>${escapeHtml(relation.user?.phone || "")}</small></div>
              <button class="text-button" type="button" data-bind-action="unbind" data-relation-id="${escapeHtml(relation.id)}">解除</button>
            </div>
            ${controlsSharing ? `
              <p class="bind-permission-title">允许这位家人查看</p>
              <div class="bind-permission-grid" aria-label="共享权限">
                ${renderPermissionToggle(relation, "canViewProfile", "健康档案")}
                ${renderPermissionToggle(relation, "canViewMeals", "餐食记录")}
                ${renderPermissionToggle(relation, "canAcknowledgeAlerts", "确认提醒", !permissions.canViewMeals)}
              </div>
            ` : `<p class="bind-permission-summary">长辈已授权：${escapeHtml(permissionSummary)}</p>`}
          </div>
        `;
      }).join("")}
    </section>
  `;
}

function renderPermissionToggle(relation, permission, label, disabled = false) {
  const enabled = relation.permissions ? Boolean(relation.permissions[permission]) : true;
  return `
    <button class="bind-permission-toggle${enabled ? " is-enabled" : ""}" type="button"
      data-bind-action="permission" data-relation-id="${escapeHtml(relation.id)}"
      data-permission="${permission}" aria-pressed="${enabled ? "true" : "false"}" ${disabled ? "disabled" : ""}>
      <span aria-hidden="true">${enabled ? "✓" : ""}</span>${escapeHtml(label)}
    </button>
  `;
}

function formatInviteTime(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}

async function handleBindModalClick(event) {
  const button = event.target.closest("[data-bind-action]");
  if (!button || familyBindingBusy) return;
  const action = button.dataset.bindAction;
  if (action === "refresh") return refreshFamilyBindingStatus();
  if (action === "generate") return generateFamilyInvite();
  if (action === "bind") return submitFamilyBinding();
  if (action === "unbind") return unbindFamilyRelation(button.dataset.relationId);
  if (action === "permission") return updateFamilyPermission(button.dataset.relationId, button.dataset.permission);
}

async function updateFamilyPermission(relationId, permission) {
  const relation = (familyBinding.linked || []).find((item) => item.id === relationId && item.relationship === "family");
  if (!relation || !["canViewProfile", "canViewMeals", "canAcknowledgeAlerts"].includes(permission)) return;
  const current = relation.permissions || { canViewProfile: true, canViewMeals: true, canAcknowledgeAlerts: true };
  const next = { ...current, [permission]: !current[permission] };
  if (!next.canViewMeals) next.canAcknowledgeAlerts = false;
  familyBindingBusy = true;
  renderBindModal();
  let errorMessage = "";
  try {
    familyBinding = { ...(await authApi("/api/auth/family/permissions", { relationId, ...next })), loaded: true };
    showToast("共享权限已更新");
  } catch (error) {
    errorMessage = error.message || "共享权限更新失败，请重试。";
  } finally {
    familyBindingBusy = false;
    renderBindModal();
    renderFamily();
    if (errorMessage) setBindError(errorMessage);
  }
}

async function generateFamilyInvite() {
  familyBindingBusy = true;
  renderBindModal();
  let errorMessage = "";
  try {
    activeFamilyInvite = await authApi("/api/auth/family/invite", {});
    familyBinding = { ...familyBinding, hasActiveInvite: true, inviteExpiresAt: activeFamilyInvite.expiresAt };
    renderBindModal();
  } catch (error) {
    errorMessage = error.message || "绑定码生成失败，请重试。";
  } finally {
    familyBindingBusy = false;
    renderBindModal();
    if (errorMessage) setBindError(errorMessage);
  }
}

async function submitFamilyBinding() {
  const code = $("#familyBindCode")?.value.trim() || "";
  if (!/^\d{6}$/.test(code)) return setBindError("请输入 6 位绑定码。");
  familyBindingBusy = true;
  renderBindModal();
  let errorMessage = "";
  try {
    familyBinding = { ...(await authApi("/api/auth/family/bind", { code })), loaded: true };
    await refreshSharedHealthData();
    renderBindModal();
    renderFamily();
    showToast("家人账号绑定成功");
  } catch (error) {
    errorMessage = error.message || "绑定失败，请核对绑定码。";
  } finally {
    familyBindingBusy = false;
    renderBindModal();
    if (errorMessage) setBindError(errorMessage);
  }
}

async function unbindFamilyRelation(relationId) {
  if (!relationId || !window.confirm("确定解除这个家人绑定吗？")) return;
  familyBindingBusy = true;
  renderBindModal();
  let errorMessage = "";
  try {
    familyBinding = { ...(await authApi("/api/auth/family/unbind", { relationId })), loaded: true };
    sharedHealthData = { loaded: true, elder: null, profile: null, setupComplete: false, meals: [], permissions: null, error: "" };
    renderFamily();
    showToast("家人绑定已解除");
  } catch (error) {
    errorMessage = error.message || "解除绑定失败，请重试。";
  } finally {
    familyBindingBusy = false;
    renderBindModal();
    if (errorMessage) setBindError(errorMessage);
  }
}

function setBindError(message) {
  const error = $("#bindError");
  if (!error) return;
  error.textContent = message;
  error.hidden = !message;
}

function renderCalendar() {
  const year = Number(state.reportYear || TODAY.getFullYear());
  const month = Number.isInteger(state.reportMonth) ? state.reportMonth : TODAY.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  state.selectedReportDay = Math.min(Number(state.selectedReportDay || 1), days);
  const monthText = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(new Date(year, month, 1));
  $("#calendarTitle").textContent = `${monthText}记录`;
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(`<div class="calendar-day blank"></div>`);
  for (let day = 1; day <= days; day += 1) {
    const active = day === Number(state.selectedReportDay || 1) ? "active" : "";
    const dayScore = getDayScore(day);
    const status = !dayScore.count ? "status-empty" : dayScore.red ? "status-red" : dayScore.yellow ? "status-yellow" : "status-green";
    const summary = dayScore.count ? `${dayScore.count}餐，${dayScore.red}次红色，${dayScore.yellow}次黄色` : "无记录";
    cells.push(`<button class="calendar-day ${active} ${status}" type="button" data-report-day="${day}" aria-label="查看${day}日记录，${summary}">${day}</button>`);
  }
  $("#calendarGrid").innerHTML = cells.join("");
  $$("[data-report-day]").forEach((button) => {
    button.addEventListener("click", () => selectReportDay(Number(button.dataset.reportDay)));
  });
}

function selectReportDay(day) {
  state.selectedReportDay = day;
  renderCalendar();
  renderSelectedDayScore();
  saveState();
}

function renderSelectedDayScore() {
  const scoreNode = $("#selectedDayScore");
  if (!scoreNode) return;
  const day = Number(state.selectedReportDay || TODAY.getDate());
  const score = getDayScore(day);
  const year = Number(state.reportYear || TODAY.getFullYear());
  const month = Number.isInteger(state.reportMonth) ? state.reportMonth : TODAY.getMonth();
  const date = new Date(year, month, day);
  const label = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(date);
  scoreNode.textContent = score.count ? `${score.count} 餐` : "--";
  $("#selectedDayLabel").textContent = `${label}真实记录`;
  $("#selectedDayRed").textContent = `${score.red} 次`;
  $("#selectedDayYellow").textContent = `${score.yellow} 次`;
  $("#selectedDayNote").textContent = score.note;
}

function getDayScore(day) {
  const year = Number(state.reportYear || TODAY.getFullYear());
  const month = Number.isInteger(state.reportMonth) ? state.reportMonth : TODAY.getMonth();
  const dateKey = formatLocalDateKey(new Date(year, month, day));
  const records = getActiveMealHistory().filter((record) => record?.dateKey === dateKey);
  const red = records.filter((record) => record.level === "red").length;
  const yellow = records.filter((record) => record.level === "yellow").length;
  const note = !records.length
    ? "当天没有真实餐食记录。"
    : red
    ? "当天有红色警告，建议家人重点查看具体餐食。"
    : yellow
      ? "当天有黄色提醒，下一餐建议清淡并补蔬菜。"
      : "当天已记录餐食，未出现红色或黄色提醒。";
  return { count: records.length, red, yellow, note };
}

function formatLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function changeMonth(offset) {
  const current = new Date(Number(state.reportYear || TODAY.getFullYear()), Number(state.reportMonth || 0) + offset, 1);
  state.reportYear = current.getFullYear();
  state.reportMonth = current.getMonth();
  state.selectedReportDay = 1;
  renderCalendar();
  renderSelectedDayScore();
  saveState();
}

async function refreshServiceStatus() {
  if (!location.protocol.startsWith("http")) {
    serviceStatus.checked = true;
    renderPhotoAccessHint();
    return;
  }
  try {
    const response = await fetch("/api/status", { headers: { Accept: "application/json" } });
    const data = await response.json();
    serviceStatus = {
      photoAnalysis: Boolean(data.photoAnalysis),
      textAnalysis: data.textAnalysis !== false,
      textModelAvailable: Boolean(data.textModelAvailable),
      textAnalysisMode: String(data.textAnalysisMode || "client-rules"),
      speechRecognition: data.speechRecognition === "server" ? "server" : "browser",
      checked: true,
    };
  } catch {
    serviceStatus = { photoAnalysis: false, textAnalysis: true, textModelAvailable: false, textAnalysisMode: "client-rules", speechRecognition: "browser", checked: true };
  }
  renderPhotoAccessHint();
  renderMealMode();
}

function updateKeyboardLayout() {
  if (!window.visualViewport) return;
  largestViewportHeight = Math.max(largestViewportHeight, window.visualViewport.height);
  const keyboardOpen = largestViewportHeight - window.visualViewport.height > 140;
  document.documentElement.classList.toggle("keyboard-open", keyboardOpen);
  if (keyboardOpen) hideToast();
}

function hideToast() {
  clearTimeout(toastTimer);
  const toast = $("#toast");
  if (toast) toast.hidden = true;
}

function showToast(text) {
  const toast = $("#toast");
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    hideToast();
  }, 3000);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
