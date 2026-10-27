# zmeety.cn

技术笔记与作品站。纯静态：无框架、无构建步骤、无外部字体/CDN、无统计脚本。

站点不收录个人信息（姓名、学校、单位、联系方式、社交账号），只放项目与技术内容。

**视觉**：复古纸张底 `#f5e8c9`，墨色文字 `#2b2318`，朱砂强调 `#a3462a`；
标题衬线（Georgia / 宋体），数据与代码等宽。纸纹由 CSS 渐变 + SVG 噪点生成，不用图片。
正文对比度 6.95:1、弱文字 4.91:1、强调字 4.98:1，均过 WCAG AA。

## 一、本地预览

```bash
cd website
python -m http.server 8123
# http://127.0.0.1:8123/
```

- 项目弹层深链：`/#p-devfleet`、`/#p-menu`、`/#p-zhiyuan`
- 文章页：`/posts/why-vector-not-enough.html` 等七篇，列表在首页 `#notes`

## 二、文件结构

```
website/
├── index.html          单页：Hero / 指标 / 作品 / 笔记 / 技能 / 原则 / 关于
├── 404.html
├── robots.txt
├── sitemap.xml
├── nginx.conf.example
├── posts/              七篇文章，独立页面，可单独分享
│   ├── why-vector-not-enough.html      BM25 + RRF 混合检索
│   ├── hitl-three-bugs.html            38 个单测全绿却没触发
│   ├── dimension-mismatch.html         阈值与判据的量纲
│   ├── eval-integrity.html             评测工具的三个静默缺陷
│   ├── bounded-react-agent.html        手写有限 ReAct
│   ├── multi-agent-boundary.html       多 Agent 拆分的边界
│   └── why-not-ragas.html              为什么不用 RAGAS
└── assets/
    ├── styles.css      含文章页样式（.post-*）
    ├── app.js
    ├── favicon.svg
    └── og.png          1200×630 分享图
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
4. 在 `index.html` 的 `.notes-list` 里加一条：

```html
<a class="note-item" href="posts/新文件名.html" data-reveal>
  <span class="note-kicker">分类 / 标签</span>
  <span class="note-body">
    <span class="note-title">标题</span>
    <span class="note-desc">一句话摘要。</span>
  </span>
  <span class="note-arrow" aria-hidden="true">→</span>
</a>
```

5. 把 `index.html` 与所有 `posts/*.html` 里的 `?v=日期` 一起换掉，避免缓存。

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
ssh root@47.114.62.82 "tar -czf /root/backups/zmeety-$(date +%Y%m%d-%H%M).tgz -C /var/www/zmeety ."

# 2. 本地打包（排除 .git）
tar -czf site.tgz --exclude=.git -C website .

# 3. 上传并解包覆盖
scp site.tgz root@47.114.62.82:/tmp/zmeety-site.tgz
ssh root@47.114.62.82 "cd /var/www/zmeety && tar -xzf /tmp/zmeety-site.tgz && rm -f /tmp/zmeety-site.tgz && chmod -R u=rwX,go=rX /var/www/zmeety"
```

解包是**覆盖**，不删旧文件。旧站遗留的多余文件（如 `posts/post.css`）留着无害，
不要用 `rm -rf` 清空目录，避免误删 `.well-known` 导致证书续不上。

### Nginx

```bash
scp website/nginx.conf.example root@47.114.62.82:/etc/nginx/sites-enabled/zmeety.cn.conf
ssh root@47.114.62.82 "nginx -t && systemctl reload nginx"
```

配置里已包含：HTTPS + HSTS、`error_page 404 /404.html`、静态资源 30 天缓存、HTML
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
| 智愿通 | 22.3s → 7.0s（-69%）、误拒答 19/35 → 0/35、忠实度 0.86→0.95→0.92、1,416 条测试、147 条规则 / 213,283 行 | 「已上线」「50+ 用户」「事实错误 0/35」、端到端 38.2s→10.7s |
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
- 不提供简历下载，不放邮箱/电话/社交账号
- 页脚保留 ICP 备案号 `豫ICP备2026035370号-2`，链接指向工信部备案系统
