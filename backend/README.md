# 联系表单后端集成

个人站 Vue 3 + TypeScript 联系组件调用同源 `POST /api/v1/contact-messages`。
后端补丁用于复用服务器 `/opt/family-menu/backend`，不另起一套数据库。

2026-11-13 只读检查：运行容器尚未包含联系接口与 SMTP 配置。仓库有补丁不等于服务已上线。
本轮仅修补与本地测试，没有对服务器应用补丁、执行迁移或重启服务。

## 文件与集成方式

`overlay/` 是需要增加的模型、参数校验、接口、邮件 outbox 和 Alembic 迁移。
`install.py` 以增量方式修改既有配置、路由、模型注册和 lifespan，默认仅预览修改清单；
加 `--apply` 会先备份受影响的源码。它不读取 SMTP 密钥、不启动服务、不执行数据库迁移。

```powershell
python backend/install.py C:\path\to\family-menu\backend
python backend/install.py C:\path\to\family-menu\backend --apply
```

以服务器真实镜像中的依赖验证后再部署；迁移父版本是 `e8f9a0b1c2d3`。
先备份 `family_menu` 数据库并检查 Alembic 当前版本，再执行新增迁移。不要用 autogenerate 覆盖历史迁移。

## 提交契约

```json
{
  "request_id": "d9cc51c9-1522-4b32-a637-aa590f567156",
  "category": "cooperation",
  "nickname": "访客",
  "contact": "visitor@example.com",
  "content": "希望交流一下项目。",
  "website": ""
}
```

类型为 `cooperation` 或 `suggestion`；邮箱或 7–15 位号码二选一，支持常见国际号码格式。
昵称 1–80 字，联系方式最多 160 字，正文 1–4000 字；后端重新校验，不依赖浏览器。
`request_id` 为 UUID，网络失败重试同一份内容时沿用它，避免重复保存和重复通知。
成功返回 HTTP 202 和 `{ "code": 0, "message": "消息已收到", "data": { "id": "…" } }`。
错误用 403、409、422、429 等状态；公开接口不提供消息列表或任何访客联系方式。

## 消息保存和邮件提醒

新增 `contact_messages` 表，保存表单内容、未读状态、HMAC 来源标识和邮件发送状态。
请求落库后立即返回。后端 lifespan 中的工作协程每 10 秒检查待发送消息，使用独立数据库会话，
以 `FOR UPDATE SKIP LOCKED` 避免多个工作进程同时发送同一行。没有新进程、Redis 队列或额外容器。
SMTP 失败会保留原消息和重试时间，退避上限为一小时；服务重启后继续发送。
SMTP 采用 TLS 校验证书；日志只记错误类型与消息编号，不记邮件正文、联系方式或密码。
邮件 From 始终使用站主邮箱，访客填写邮箱时设为 Reply-To，可在手机邮箱里直接回复。
SMTP 接受邮件与数据库记发送成功之间若进程崩溃，可能产生一次重复提醒；这是至少一次投递，不保证恰好一次。

把 `contact.env.example` 的字段合并到服务器 `.env.server`，SMTP_PASSWORD 填邮箱授权码。
填好的配置只留在服务器或受 Git 忽略的本机私密文件中，不能放在站点静态目录里。
未配置 SMTP 时，消息仍保存，邮件不会被标记成已发送。启用后补发待发送消息。
联调时使用本地 SMTP 捕获器，正式邮箱真实送达另行验证。

## 限流和管理

数据库计数和事务锁保证多进程、重启后仍然限流：每个来源 5 分钟 3 条、全站每小时 60 条。
只对明确配置的可信代理采信 X-Real-IP。Nginx 必须覆盖该头，并把实际 Docker 网关加入可信代理列表。
当前检查到的 Docker 网关为 `172.18.0.1`；正式接入前重新确认，不能对所有网络使用通配信任。
如果带 X-Real-IP 的请求来自未受信任的内部代理，接口返回 503 并记录配置错误，而不是让访客共用该网关的额度。
受信任代理必须提供单个有效 IP；公网未受信任的调用者伪造此头不会改变其限流标识。
Uvicorn/其他代理中间件可能先改写 request.client，接入时还须核对实际代理链和传入地址，不能只看 Docker 网关。

`CONTACT_RATE_LIMIT_SALT` 必须是独立的至少 32 字符随机密钥，不回退到 JWT 密钥。
配置不全会关闭联系提交能力并记录诊断，不能拖垮家庭菜单的其他接口。
生产 Origin 默认只含两个正式域名，拒绝缺失 Origin 的提交。Origin 检查不是身份认证或完整反机器人手段。
本地调试需显式加入测试 origin；`CONTACT_REQUIRE_ORIGIN=false` 仅在非生产环境用于受控测试客户端。
源 IP 仅保存带密钥的 HMAC，不保存原值。机器人蜜罐字段和来源检查提供基础防护；当前没有第三方验证码。
分布式垃圾提交仍可能触发全站限流，后续如出现实际滥用再接 Turnstile。

`GET /api/v1/admin/contact-messages` 和 `POST /api/v1/admin/contact-messages/{id}/read`
仅允许现有最高管理员角色。当前无需打开后台查看，邮件就是主要使用入口，管理接口用于归档和后续扩展。
个人站 Nginx 只代理精确的公开提交路径，其他 `/api/` 路径返回 404；管理 API 使用既有管理域名。

## 部署和回退

静态发布只能使用 `frontend/dist/` 构建产物，
不要把整个仓库（尤其 backend、测试、环境文件）打包进 `/var/www/zmeety`。
新增 API proxy 配置见仓库 nginx.conf.example。部署前先 `nginx -t`，通过后再 reload。
后端构建、数据库迁移、服务重启与前端发布按同一次发布处理，并在发布后分别验收数据库记录和邮件送达。
回退前端时保留 contact_messages 表及数据，避免丢失访客留言；恢复源码备份并重建旧镜像即可停止新功能。
迁移提供 downgrade，但有真实留言后不应执行删表回退。

## 测试与本地联调

`tests/` 使用独立 SQLite 临时库验收校验、权限、持久化、幂等、限流和邮件重试。
SQLite 测试不证明 PostgreSQL 锁语义正确，PostgreSQL 和 Alembic 需在隔离库中单独验证。
测试 SMTP 只使用本地捕获器，不向站主邮箱发送演示邮件。

不依赖完整后端的策略测试：

```powershell
python -m unittest discover -s backend/tests -p test_contact_security.py -v
```

完整接口测试需在与 family-menu 源码集成后的隔离副本运行，安装其兼容依赖和 aiosqlite。
为副本设置 `PYTHONPATH` 后执行 `python -m pytest backend/tests/test_contact.py -q`。
测试使用临时 SQLite 和模拟 SMTP，不读取服务器环境文件；不能用生产库运行测试。
`install.py` 重复应用会补齐新增配置字段，并保留已设置的值；默认仍只输出变更清单。
