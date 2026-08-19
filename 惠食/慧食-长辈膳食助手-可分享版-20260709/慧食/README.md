# 慧食·长辈膳食助手

慧食是一个面向长辈和家人的膳食辅助 Web 应用，包含手机号账号、健康档案、语音/文字记餐、饭菜照片分析、真实记录日历和家人视图。

## 产品边界

- 语音、文字或照片分析只有在用户主动发起时才会把对应输入和健康档案发送给当前配置的 AI 服务。
- 照片分析服务不可用或结果不明确时，系统不会按文件名、颜色或样例数据猜测食物。
- AI 结果不能降低本地过敏和慢病红线；所有建议仅供参考，不能替代医生诊断。
- 出现呼吸困难、喉咙发紧、嘴唇或舌头肿、意识异常或明显呛咳时，应立即停止进食并拨打 120。

## 运行

需要 Node.js 22.5 或更高版本。Node 22 的 SQLite 模块会输出实验性提示，服务器使用的 Node 24 不受影响。

```bash
npm start
```

默认地址：`http://127.0.0.1:8787/`。生产环境必须使用 HTTPS，麦克风和安全会话 Cookie 才能可靠工作。

## 账号与数据库

账号数据默认保存在 `data/huishi.sqlite`，目录权限为 `0700`，数据库权限为 `0600`。该目录已被 Git 忽略。

- 密码使用带独立随机盐的 `scrypt` 哈希，数据库不保存明文密码。
- 短信验证码保存 HMAC 摘要，5 分钟过期、限制尝试次数并且只能使用一次。
- 登录令牌由 32 字节安全随机数生成，数据库只保存 SHA-256 摘要；浏览器使用 `HttpOnly`、`SameSite=Strict` Cookie。
- 身份证号只在实名认证请求中瞬时使用，不写入数据库；数据库只保留验证状态、脱敏姓名、不可逆摘要和服务商流水号。
- 密码找回成功后会撤销该账号已有会话。

生产环境至少需要配置：

```dotenv
NODE_ENV=production
AUTH_DB_PATH=/var/lib/huishi/huishi.sqlite
AUTH_SECRET=请使用至少32字符的随机密钥
COOKIE_SECURE=true
TRUST_PROXY=true
```

不要把真实密钥提交到 GitHub。建议将数据库目录放在发布目录之外，并纳入加密备份。
只有在应用确实位于受信任的反向代理之后时才设置 `TRUST_PROXY=true`，用于按真实客户端 IP 限流。

## 短信验证码

生产环境通过私有 HTTPS Webhook 接入短信服务商：

```dotenv
SMS_PROVIDER=webhook
SMS_WEBHOOK_URL=https://your-private-sms-gateway.example/send
SMS_WEBHOOK_TOKEN=
```

慧食会向 Webhook 发送 JSON：

```json
{
  "phone": "13800138000",
  "code": "123456",
  "purpose": "register",
  "expiresInMinutes": 5,
  "app": "huishi"
}
```

Webhook 返回任意 `2xx` 即表示服务商已接受发送。`purpose` 可能为 `register` 或 `password_reset`。

非生产环境默认启用 `AUTH_DEV_MODE=true`：注册只填写手机号和密码，手机号仍由数据库唯一约束保证一号一用户。未配置短信服务时，界面不显示验证码和密码找回入口；后端仍拒绝无验证码重置，不能用测试模式绕过账号归属验证。该注册模式在生产环境强制失效；若在非生产公网试用服务器启用，还必须设置 `PUBLIC_PILOT_ACKNOWLEDGED=true`，明确确认手机号尚未验证归属。若要单独联调短信链路，可设置 `SMS_PROVIDER=console`，验证码只写入服务器终端。

服务启动时会进行生产配置预检。生产环境缺少安全会话密钥、HTTPS 短信 Webhook、绝对数据库路径、安全 Cookie 或可信代理配置时会直接拒绝启动，避免带着测试配置上线。

## 手机号实名认证

需要真实的运营商二/三要素核验服务商。注册只验证手机号和设置密码，实名认证放在登录后的个人资料流程中：

```dotenv
IDENTITY_VERIFICATION_REQUIRED=true
IDENTITY_PROVIDER=webhook
IDENTITY_WEBHOOK_URL=https://your-private-identity-gateway.example/verify
IDENTITY_WEBHOOK_TOKEN=
```

慧食会向 Webhook 发送 `phone`、`realName` 和 `idNumber`。服务商适配层应返回：

```json
{
  "verified": true,
  "reference": "provider-request-id",
  "provider": "provider-name"
}
```

必须在服务商后台完成企业认证、隐私合规、短信签名与模板审核后再启用。手机号短信验证只能证明用户持有该号码，不能代替运营商实名认证。

## AI 与语音配置

根据 `.env.example` 在项目目录创建未提交的 `.env`。主要接口：

- `/api/transcribe-speech`：服务端语音转写
- `/api/analyze-voice-meal`：语音或文字餐食分析
- `/api/analyze-photo-meal`：饭菜照片识别和膳食分析
- `/api/status`：可用能力状态

`/api/status` 会分别报告文字规则/模型增强、照片模型、语音输入和浏览器播报能力。文字规则不依赖云端密钥；照片识别必须配置本地视觉模型或受支持的云端服务。未配置照片模型时，前端只显示本机预览，不会上传图片或猜测食物。

生产环境默认要求照片分析可用；只有业务明确接受暂时关闭该入口时才能设置 `ALLOW_PHOTO_DISABLED=true`。如目标浏览器不具备可靠的语音识别能力，可设置 `REQUIRE_SERVER_SPEECH=true`，启动预检会要求 Whisper、模型文件和 FFmpeg 均已就绪。

账号接口位于 `/api/auth/*`，包括状态、短信、注册、登录、退出、密码找回与实名认证。

## 家人绑定

长辈在“家人绑定”中生成 10 分钟有效的一次性 6 位码，家人登录自己的账号后输入该码。绑定关系保存在 `family_relations` 表，双方都可以查看脱敏账号信息并解除绑定；绑定码只保存 HMAC 摘要，使用一次后立即失效。“本人记录/家人照护”只是界面使用方式，不会改变账号的数据权限。

健康档案保存在 `health_profiles` 表，餐食及红黄绿提醒保存在 `meal_records` 表。长辈可以按绑定关系分别授权健康档案、餐食记录和提醒确认；关闭餐食查看会同时关闭提醒确认。未绑定账号不能指定其他用户编号读取数据，解除绑定后访问权限立即失效。本机 `localStorage` 只作为当前账号的断网副本，登录其他账号时不会沿用上一账号的健康数据。

## 检查与测试

```bash
npm run check
npm test
```

测试覆盖静态文件白名单、跨来源拒绝、AI 结果失败关闭、语音与图片载荷边界、手机号与身份证格式、验证码限流、密码哈希、会话、密码找回、菜品烹饪方式和大字号回归。

## 文件说明

- `index.html`：页面结构
- `styles.css`：视觉样式
- `app.js`：交互、云端同步的本机副本和健康安全规则
- `server.js`：静态服务、AI 代理与 API 路由
- `auth.js`：账号、SQLite、安全凭证与服务商适配层
- `tests/`：安全和行为回归测试
- `.env.example`：配置模板
