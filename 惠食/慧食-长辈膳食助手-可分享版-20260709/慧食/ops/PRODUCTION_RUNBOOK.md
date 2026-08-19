# 惠食生产运维手册

## 目标架构

`huishi123.cn -> 阿里云 ESA HTTPS -> PPIO 公开映射端口 -> 127.0.0.1:8787 -> Node/SQLite`

应用只监听 `127.0.0.1:8787`。ESA 回源必须指向 PPIO 当前有效的公开端口，回源协议与 PPIO 入口一致。PPIO 实例重建后域名或端口可能变化，变更后必须同步 ESA 源站。

## 目录与权限

- 代码：`/opt/huishi`，仅 root 可写。
- 环境配置：`/etc/huishi/huishi.env`，`root:huishi` + `0640`。
- 数据库：`/var/lib/huishi/huishi.sqlite`，`huishi:huishi` + `0600`。
- 备份密钥：`/etc/huishi/backup.key`，`root:huishi` + `0640`。
- 加密备份：`/var/backups/huishi`，`huishi:huishi` + `0700`。

备份密钥必须另存一份到离线密码管理器或加密介质。只有备份、没有密钥无法恢复。

## 初次安装

1. 创建系统用户 `huishi`，创建上述目录并设置权限。
2. 将本目录同步到 `/opt/huishi`，将 `.env.example` 复制为 `/etc/huishi/huishi.env` 并填写生产值。
3. 运行 `node /opt/huishi/ops/generate-backup-key.js /etc/huishi/backup.key`，立即保存离线副本。
4. 将 `ops/systemd/*.service` 和 `*.timer` 安装到 `/etc/systemd/system/`。
5. 将 `huishi-journald.conf` 安装到 `/etc/systemd/journald.conf.d/`。
6. 执行 `systemctl daemon-reload` 后启用 `huishi.service`、`huishi-backup.timer`和 `huishi-monitor.timer`。

## 部署验收

1. `curl -fsS http://127.0.0.1:8787/healthz`
2. `curl -fsS http://127.0.0.1:8787/readyz`
3. `curl -fsS https://huishi123.cn/readyz`
4. 确认 HTTP 永久跳转 HTTPS，TLS 证书域名和有效期正确。
5. 在 iOS Safari 和 Android Chrome 实机允许麦克风，完成录音、转写、重新加载和再次登录。
6. 检查会话 Cookie 含 `HttpOnly; Secure; SameSite=Strict`，响应含 HSTS 和 Permissions-Policy。

## 备份与恢复演练

- 立即备份：`systemctl start huishi-backup.service`
- 查看记录：`journalctl -u huishi-backup.service --since today`
- 恢复校验：`node /opt/huishi/ops/restore-check.js /var/backups/huishi/<backup>.sqlite.aesgcm`
- 每月至少选择一份备份在隔离目录完成恢复校验，记录耗时、用户数、表清单和完整性结果。

真正回滚时必须先停止应用，保留当前数据库副本，将经校验的恢复库放到新路径，更新 `AUTH_DB_PATH` 后再启动。不要直接覆盖唯一的生产数据库。

## 监控、告警和日志

- 外部检查每 5 分钟请求 `/readyz`，失败时调用 `ALERT_WEBHOOK_URL`。
- 应用 5xx 和数据库就绪失败也会发送节流后的告警。
- journald 默认最多 500 MB，保留 30 天并压缩。
- SQLite 安全审计事件默认保留 180 天，仅保存事件、结果和不可逆哈希。
- 每周查看 `systemctl --failed`、备份时间和告警测试结果。

## 目前线上故障（2026-08-19）

`https://huishi123.cn` 当前由 ESA 返回 `502 Bad Gateway`，HTTP 返回 `522 Origin Connection Time-out`；PPIO 原始 HTTPS 入口也返回 502。TLS 证书本身有效，故障位于 ESA 到 PPIO 源站或 PPIO 实例服务。恢复 SSH 访问后，先检查 PPIO 实例状态、端口映射和应用进程，再更新 ESA 回源地址。
