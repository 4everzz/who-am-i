# Vue 试用阶段

Vue 3 + TypeScript + Vite。目前迁移首页项目罗盘、轮播状态、项目详情弹窗、笔记目录、技能与原则页、作品页和关于页联系表单，外观使用现有 CSS。
正式发布使用 `frontend/dist/`；根目录静态页面仍是过渡期的页面壳、内容回退和旧脚本输入，不能直接用于整站部署。

## 本地预览

```powershell
cd C:\Users\z1\who-am-i\frontend
npm ci
npm run dev
```

打开 http://127.0.0.1:5173/ ，项目区域位于 `/#work`。
使用 Node.js 22.12+。`npm test` 通过 Node 的类型擦除支持运行轮播核心测试；
`npm run typecheck` 单独检查类型，`npm run build` 执行类型检查和生产构建。
`npm run preview` 在 4173 端口预览构建结果。

## 后续换 React 的边界

- `src/types/project.ts`：项目字段与合法项目 ID 的类型定义。
- `src/data/projects.ts`：受类型检查的项目内容，与框架无关，Vue/React 可以共用。
- `src/core/carousel.ts`：独立轮播状态、计时与暂停规则；无 Vue 或 DOM 依赖，可直接复用。
- `src/App.vue`：项目选择、详情深链接、历史导航和关闭后的焦点恢复。
- `src/components/ProjectShowcase.vue`、`ProjectDialog.vue`、`NotesApp.vue`、`SkillsApp.vue`：Vue 模板、响应式绑定和生命周期。换 React 时需重写这一层。
- `src/components/WorksApp.vue`、`works/ProjectArticle.vue`、`works/*Article.vue`：作品页复用项目 ID 和名称，公共文章外壳使用类型化 props，长文保留为模板插槽，原生 `details` 继续支持鼠标和键盘展开。
- `src/components/SiteHeader.vue`、`src/data/navigation.ts`：独立页面共用导航、主题切换和移动菜单；菜单打开时正文设为 inert，Esc 关闭并恢复按钮焦点，桌面断点兼容旧版 `MediaQueryList`。
- `src/components/HomeNotes.vue`：首页技术笔记分页由 Vue 管理，每页 5 篇，保留原按钮、深链接和 `aria-live` 播报；旧首页脚本不再绑定分页事件。
- `src/components/HomeStack.vue`、`HomePrinciples.vue`、`HomeAbout.vue`：首页技术栈、工作原则和关于区块由 Vue 渲染，保持原有 section ID，旧滚动和入场脚本仍可识别这些节点。
- CSS、现有后端 API 不依赖 Vue。新增 API 请求和校验逻辑放到独立模块，避免混入组件。
- `src/core/contact.ts`：独立的表单校验、同源请求、15 秒超时、重复提交保护及重试请求编号；不依赖 Vue，可以复用到 React。
- `src/components/ContactForm.vue`：分类选择、输入状态、错误提示和焦点管理；提交期间锁定输入，失败保留内容，成功清空并聚焦回执。关于页介绍与邮箱备用入口继续保留静态 HTML。

这是渐进迁移，不是全站 SPA。`scripts/prepare-site.mjs` 从当前静态站生成预览壳和公开资源，
去掉旧轮播和弹窗代码后保留导航、整屏滚动等旧交互。弹窗状态通过 Vue 的类型化 props/emits
通知轮播暂停/恢复；打开弹窗时发送一个页面事件取消旧滚动动画。
弹窗长文从仓库根目录 HTML 在构建时提取到 `src/generated/project-details.json`，保持当前文案。
这份 HTML 只允许来自受信任的仓库文件，不能将用户输入或 API 返回值传入 `v-html`。
启动后如果修改根目录旧页面或 CSS，需要重新运行 `npm run dev` 来同步副本。

`frontend/index.html`、`frontend/notes.html`、`frontend/skills-principles.html`、`frontend/works.html`、`frontend/about.html`、`.legacy-public/`、`src/generated/` 和 `dist/` 都是生成文件，不提交。
笔记、技能和作品页保留原 HTML 内容作为脚本加载前与禁用 JavaScript 时的回退；Vue 挂载后由组件接管。
过渡期改文案需同时更新 Vue 数据/模板与根目录对应的静态回退，保持内容一致。文章正文仍使用 `posts/` 原页面。
作品页支持 `works.html#p-devfleet`、`#p-menu`、`#p-zhiyuan`，挂载后恢复直达位置并避开固定导航。
构建使用固定版本依赖和 `package-lock.json`；部署只发布 `dist/` 中的公开文件。
Vue 入口和生成的兼容脚本使用内容哈希文件名，避免新页面加载旧脚本。
发布时先备份线上目录，上传资源后再替换 HTML；保留旧哈希资源，以便已打开的页面继续加载。
根目录仍是未迁移页面和旧交互的输入，不再直接用于整站部署。
当前未配置联系表单开发代理，本地试用不用于验证真实数据库或邮件投递。
关于页只加载 Vue 表单入口，不再加载 `assets/contact.js`，避免重复注册提交事件。接口仍为 `POST /api/v1/contact-messages`；成功响应须为 HTTP 成功状态、`code: 0` 且 `data.id` 对应本次 `request_id`。
笔记、作品、技能和关于页均只加载 `mount-header` 共享入口，不再加载旧的 `theme.js` / `post.js` 页面脚本；首页继续使用首页专用静态导航和现有轮播兼容脚本。
`npm test` 包含联系表单校验、重试幂等、重复提交、异常响应、超时和卸载取消测试，均使用模拟请求。真实入库与邮件投递需另在集成环境验收。
本阶段不增加 Vue Router、Pinia 或 UI 组件库，先通过一个真实模块确定使用感受。

轮播节奏：首次停留 3 秒，罗盘用 1.4 秒转到下一项，转完后再完整停留 3 秒。

## 审查后的交互与回退

- 键盘焦点进入轮播时暂停；焦点离开且其他暂停原因消失后恢复。只移动鼠标不会清除键盘暂停；明确点击或触摸才切换输入方式。鼠标停留在内容卡片时暂停，触摸沿用独立的 8 秒暂停，之后恢复完整 3 秒停留。
- 首次加载和历史回退没有 hash 时保留浏览器的滚动位置；显式锚点继续执行定位。
- 首页作品回退从根目录三张项目卡片提取，全部可见，详情按钮改为作品页链接。Vue 加载失败时仍可阅读。
- 静态联系表单初始隐藏并使用 disabled fieldset；只有提交处理器就绪才启用。Vue 替换为自己的表单后才隐藏回退说明。
- `assets/taste/` 在生成时复制到按整个目录内容计算哈希的路径。相对 JS 导入与动态 CSS 同时失效，避免只更新入口 query 却使用旧依赖。
- `withVueHeader` 会检查原静态页面的 header 与旧脚本标签。结构变动后若构建报错，应更新适配规则，不能跳过检查并同时加载两套事件。

`tests/browser-regression.mjs` 导出 Playwright 检查函数；在本地 preview 上调用 `checkDesktop(browser)`、
`checkFallbacks(browser)`、`checkPages(browser)`，覆盖实际键鼠、刷新/后退、无脚本回退、四种尺寸和模拟表单提交。
它不在 `npm test` 中自动运行，也不会请求正式 API 或发送邮件。
鼠标点击不保留永久暂停状态；阅读右侧卡片、键盘焦点停留、打开弹窗或页面隐藏时暂停。
鼠标离开卡片后可自动恢复；系统减少动画设置开启时不自动轮播。

## TypeScript 约定

- 新业务代码优先使用 `.ts` 和 `<script setup lang="ts">`；构建辅助脚本暂保留 `.mjs`。
- 开启 `strict`、`noUncheckedIndexedAccess` 和未使用变量/参数检查。
- 组件使用类型化 props/emits，项目 ID、轮播暂停原因采用字面量联合类型。
- 核心逻辑用显式接口约束输入输出；不使用 `any` 绕过类型问题。
- TS 类型不会验证外部数据。未来接 API 时仍需在网络边界校验响应，测试仍需保留。
