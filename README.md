# zmeety.cn

个人作品与技术笔记站，前端采用 Vue 3 + TypeScript + Vite，沿用纸张风格与现有 CSS。
首页项目、笔记分页、技术栈、工作原则、关于区块，以及独立页面的导航和主要交互已迁入 Vue。
文章正文仍使用 posts/ 中的 HTML。联系表单通过同源 API 对接既有家庭菜单后端。

**发布目录只有 `frontend/dist/`**。仓库根目录 HTML 是构建输入和静态回退，不可作为新版发布产物。
详细迁移边界见 [frontend/README.md](frontend/README.md)，后端接入见 [backend/README.md](backend/README.md)。

## 一、本地预览

从仓库根目录执行：

```powershell
cd frontend
npm ci
npm run dev
# http://127.0.0.1:5173/
```

预览正式构建：

```powershell
npm run build
npm test
npm run preview
# http://127.0.0.1:4173/
```

- 项目详情深链接：`/#p-devfleet`、`/#p-menu`、`/#p-zhiyuan`。
- 14 篇笔记位于 `posts/`；首页每页 5 条，共 3 页。
- 本地 API 默认没有代理；真实入库与邮件需要独立接入，不能把静态预览当成后端验收。

## 二、文件结构

```text
who-am-i/
├── frontend/
│   ├── src/                 Vue 组件、TypeScript 数据与业务逻辑
│   ├── scripts/             从根目录生成页面、回退内容与动效资源版本
│   ├── tests/               单元测试及浏览器回归脚本
│   └── dist/                构建产物，唯一正式发布目录，不提交
├── index.html               首页的静态内容与兼容脚本输入
├── about.html               关于页和安全的联系表单回退
├── notes.html
├── works.html
├── skills-principles.html
├── posts/                   14 篇文章正文
├── assets/                  共享样式、旧页面脚本和动效源码
├── backend/                 联系接口补丁、测试和集成说明
├── nginx.conf.example
├── 404.html
├── robots.txt
└── sitemap.xml
```

## 三、怎么加一篇文章

1. 复制一篇现成的：`cp posts/why-not-ragas.html posts/新文件名.html`
2. 改五处：`<title>`、`<meta name="description">`、`.post-kicker`（分类）、`<h1>`、`.post-meta`（日期 · 项目）
3. 正文写在 `.post-body` 里，可用结构：
   - `<p class="lead">` 导语
   - `<h2>` 小节（自带朱砂竖线）
   - `<div class="callout">` 重点块
   - `<div class="quote">` 引用块（配 `<cite>`）
   - `<div class="table-wrap"><table>` 表格（`td.up` 绿色标注提升、`td.dim` 弱化）
4. 在 `frontend/src/data/notes.ts` 添加笔记数据，并同步 `notes.html` 的无 JS 回退及 sitemap.xml。首页 Vue 会自动计算页数；同时在 `index.html` 的 `.notes-list` 里加一条（`data-page` 按顺序每 5 条一页；超过 15 条要在 `.notes-pager` 里再加一个按钮）：

```html
<a class="note-item" data-page="3" href="posts/新文件名.html" data-reveal>
  <span class="note-kicker">分类 / 标签</span>
  <span class="note-body">
    <span class="note-title">标题</span>
    <span class="note-desc">一句话摘要。</span>
  </span>
  <span class="note-arrow" aria-hidden="true">→</span>
</a>
```

5. 把 `index.html`、`404.html`、所有 `posts/*.html` 和对应的 `assets/*.css` / `assets/*.js` 引用里的 `?v=日期` 一起换掉，避免缓存；`sitemap.xml` 也补一条。

## 四、部署

站点目录：`/var/www/zmeety`（注意不是 `zmeety.cn`）
配置文件：`/etc/nginx/sites-enabled/zmeety.cn.conf`

### 首次配置 SSH 免密

```powershell
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub" | ssh root@47.114.62.82 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

### 发布（本机没有 rsync，用 tar + scp）

```powershell
# 1. 服务器先备份
ssh root@47.114.62.82 'mkdir -p /root/backups && tar -czf /root/backups/zmeety-$(date +%Y%m%d-%H%M).tgz -C /var/www/zmeety .'

# 2. 在仓库根目录构建并只打包公开产物
Push-Location frontend
npm ci
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "依赖安装失败" }
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "构建失败" }
Pop-Location
tar -czf site.tgz -C frontend/dist .

# 3. 上传并解包覆盖
scp site.tgz root@47.114.62.82:/tmp/zmeety-site.tgz
ssh root@47.114.62.82 "cd /var/www/zmeety && tar -xzf /tmp/zmeety-site.tgz && rm -f /tmp/zmeety-site.tgz && chmod -R u=rwX,go=rX /var/www/zmeety"
```

解包是**覆盖**，不删旧文件。旧站遗留的多余文件（如 `posts/post.css`）留着无害，
不要用 `rm -rf` 清空目录，避免误删 `.well-known` 导致证书续不上。

### Nginx

```bash
scp nginx.conf.example root@47.114.62.82:/etc/nginx/sites-enabled/zmeety.cn.conf
ssh root@47.114.62.82 "nginx -t && systemctl reload nginx"
```

配置里已包含：HTTPS + HSTS、常见安全响应头、禁止访问运维文档与隐藏文件、`error_page 404 /404.html`、静态资源 30 天缓存、HTML
`expires -1`、gzip。若换域名，改 `server_name`、`root`、证书路径三处。

**配置改错时不要慌**，`nginx -t` 会拦住，回滚：

```bash
cp $(ls -t /root/backups/zmeety.cn.conf.*.bak | head -1) /etc/nginx/sites-enabled/zmeety.cn.conf
```

## 五、验收

```bash
curl -I https://zmeety.cn                              # 200
curl -I https://zmeety.cn/posts/why-not-ragas.html     # 200
curl -I https://zmeety.cn/nope                         # 404 + 自定义页
```

浏览器：1440 / 1024 / 768 / 390 四档无横向滚动；项目弹层可 Esc、点遮罩、点 × 关闭；
`/#p-devfleet` 能直接打开详情；文章页顶部「返回笔记」可回到首页列表。

## 六、内容口径

项目数字与简历同源，**不要自行改写**：

| 项目 | 可写 | 不可写 |
|---|---|---|
| 智愿通 | 22.3s → 7.0s（-69%）、误拒答 19/35 → 0/35、忠实度 0.86→0.95→0.92、1,416 条测试、147 条规则 / 213,283 行 | 「已上线」「50+ 用户」「事实错误率 0/35」、端到端 38.2s→10.7s |
| 小家开饭啦 | H5 + 小程序已上线、50+ 核心用户（按实际使用人数）、59.6s→6.0s、381+12 测试 | 三端全部上线、向量化 / pgvector、一套代码含管理后台 |
| DevFleet | 209 项测试、六类数据、5→1 页面、90s 超时、Milvus 降级 | 43 项测试、14 个工具 |

### 关于「零提升」的写法

**不要写** `全指标 +0.0000`、`零提升`、`收益为 0`。
这类表述读起来像没测、或只测了几道题，反而削弱可信度。

**改成**：`首位命中率提升不到 0.1 个百分点，延迟 P50 +405ms / P95 +625ms`。
同样是"不值得上线"，但给出的是可解释的量级，而不是一个整数零。

完整口径见 `E:\ObsidianVaults\AI学习历程\简历\个人信息与口径.md`。

## 七、旧站迁移说明

2026-10-25 把 `zmeety.cn` 原有站点（个人笔记）迁入本工程：

- 原 5 篇文章正文**原样保留**，只套了新站的纸张模板
- 原 2 个项目页（小家菜单 / 智愿通）内容已并入首页项目弹层，不重复建页
- 旧文件只读备份在工作区 `_extract/old_site_backup/`（8 个文件）
- 唯一改写：Rerank 一节把 `+0.0000` 改为「提升不到 0.1 个百分点」

## 八、隐私与合规

- 站点无统计、无追踪、无第三方请求
- 不公开个人电话号码；关于页保留站主邮箱作为联系表单不可用时的备用入口。
- 访客主动提交的昵称、联系方式和正文只用于本次联系；表单未就绪时禁用，避免默认 GET 把内容写入地址栏。
- 页脚保留 ICP 备案号 `豫ICP备2026035370号-2`，链接指向工信部备案系统
