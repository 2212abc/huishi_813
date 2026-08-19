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
COOKIE_SECURE=auto
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

本地联调可显式设置 `AUTH_DEV_MODE=true`，此时注册和找回密码不要求短信验证码，手机号仍由数据库唯一约束保证一号一用户。该绕过在生产环境强制失效。若要单独联调短信链路，可同时设置 `SMS_PROVIDER=console`，验证码会写入服务器终端；正式环境的 HTTP 响应不会返回验证码。

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

账号接口位于 `/api/auth/*`，包括状态、短信、注册、登录、退出、密码找回与实名认证。

## 家人绑定

长辈在“家人绑定”中生成 10 分钟有效的一次性 6 位码，家人登录自己的账号、切换到家人身份后输入该码。绑定关系保存在 `family_relations` 表，双方都可以查看脱敏账号信息并解除绑定；绑定码只保存 HMAC 摘要，使用一次后立即失效。当前版本的账号关系支持跨设备持久化，餐食记录仍明确保存在产生记录的本机，尚未伪装为跨设备同步。

## 检查与测试

```bash
npm run check
npm test
```

测试覆盖静态文件白名单、跨来源拒绝、AI 结果失败关闭、语音与图片载荷边界、手机号与身份证格式、验证码限流、密码哈希、会话和密码找回。

## 文件说明

- `index.html`：页面结构
- `styles.css`：视觉样式
- `app.js`：交互、本地餐食记录和健康安全规则
- `server.js`：静态服务、AI 代理与 API 路由
- `auth.js`：账号、SQLite、安全凭证与服务商适配层
- `tests/`：安全和行为回归测试
- `.env.example`：配置模板
