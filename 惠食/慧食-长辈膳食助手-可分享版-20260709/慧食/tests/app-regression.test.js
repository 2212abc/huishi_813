const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const serverSource = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const styles = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

function evaluateAppExpression(expression) {
  const context = {
    window: { innerHeight: 800 },
    document: {
      querySelector() { return null; },
      querySelectorAll() { return []; },
      addEventListener() {},
    },
    localStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {},
    },
    history: {},
    structuredClone,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };
  vm.runInNewContext(
    `${appSource}\n;globalThis.__result = (${expression});`,
    context,
  );
  return JSON.parse(JSON.stringify(context.__result));
}

function matchFoodNames(text) {
  return evaluateAppExpression(`matchFoodsFromText(${JSON.stringify(text)}).map((item) => item.name)`);
}

test("fish dishes preserve the cooking method supplied by the user", () => {
  assert.deepEqual(matchFoodNames("红烧鱼"), ["红烧鱼"]);
  assert.deepEqual(matchFoodNames("清蒸鱼"), ["清蒸鱼"]);
  assert.deepEqual(matchFoodNames("今天吃鲫鱼"), ["鱼"]);
});

test("portion editor preserves concrete Chinese weight units", () => {
  assert.deepEqual(evaluateAppExpression("parsePortionMeasurement('1斤')"), { value: 1, unit: "斤" });
  assert.deepEqual(evaluateAppExpression("parsePortionMeasurement('200克')"), { value: 200, unit: "克" });
  assert.deepEqual(evaluateAppExpression("parsePortionMeasurement('半碗')"), { value: 0.5, unit: "碗" });
  assert.equal(evaluateAppExpression("inferPortion('红烧鱼1斤', '红烧鱼')"), "1斤");
  assert.equal(evaluateAppExpression("formatPortionMeasurement(2, '两')"), "2两");
});

test("large text modes provide materially different accessible sizes", () => {
  assert.match(styles, /html\[data-font-size="large"\]\s*\{[^}]*font-size:\s*19px/s);
  assert.match(styles, /html\[data-font-size="xlarge"\]\s*\{[^}]*font-size:\s*22px/s);
  assert.match(styles, /html\[data-font-size="xlarge"\][^{]*\.quick-grid[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(styles, /html\[data-font-size="xlarge"\][^{]*\.legal-document-links[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(indexHtml, /class="skip-link" href="#main"/);
});

test("privacy consent and account rights remain reachable in the frontend", () => {
  assert.match(indexHtml, /id="legalModal"/);
  assert.match(indexHtml, /id="legalDocumentModal"/);
  assert.match(indexHtml, /id="accountDataModal"/);
  assert.match(indexHtml, /data-legal-document="privacy"/);
  assert.match(indexHtml, /data-legal-document="terms"/);
  assert.doesNotMatch(indexHtml, /href="\/?(?:privacy|terms)\.html" target="_blank"/);
  assert.match(indexHtml, /href="\/?privacy\.html"/);
  assert.match(indexHtml, /href="\/?terms\.html"/);
  assert.match(appSource, /\/api\/auth\/legal-consent/);
  assert.match(appSource, /\/api\/auth\/data-export/);
  assert.match(appSource, /\/api\/auth\/account-delete/);
});

test("voice fallback accepts the user's final text and exact unit", () => {
  assert.match(indexHtml, /按这段文字分析/);
  assert.match(indexHtml, /placeholder="例如：红烧鱼 1斤"/);
  assert.match(appSource, /if \(serviceStatus\.textModelAvailable\)/);
  assert.match(appSource, /data-focus-voice-text/);
  assert.match(appSource, /PORTION_UNIT_OPTIONS = \["份", "克", "两", "斤", "碗", "个", "杯"\]/);
  assert.match(appSource, /requestAiMealAnalysis\(finalText\)/);
  assert.match(appSource, /name="meal-missing-food"[^>]*autocomplete="off"/);
  assert.match(serverSource, /不得改成清蒸鱼/);
});

test("meal guidance does not present generic salt estimates as precise measurements", () => {
  assert.doesNotMatch(appSource, /盐分约\s*\$\{totalSalt\.toFixed/);
  assert.match(appSource, /实际以用盐、酱料和份量为准/);
  assert.equal(evaluateAppExpression("describeSaltRisk(1.4, 5, true)"), "偏高");
});
