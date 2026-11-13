# Vue 试用阶段

Vue 3 + TypeScript + Vite。目前迁移首页项目罗盘、轮播状态和项目详情弹窗，外观使用现有 CSS。
生产站仍以仓库根目录的静态页面为准；试用构建不会修改这些文件。

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
- `src/components/ProjectShowcase.vue`、`ProjectDialog.vue`：Vue 模板、响应式绑定和生命周期。换 React 时需重写这一层。
- CSS、现有后端 API 不依赖 Vue。API 请求、校验逻辑后续放到独立模块，避免混入组件。

这是渐进迁移，不是全站 SPA。`scripts/prepare-site.mjs` 从当前静态站生成预览壳和公开资源，
去掉旧轮播和弹窗代码后保留导航、整屏滚动等旧交互。弹窗状态通过 Vue 的类型化 props/emits
通知轮播暂停/恢复；打开弹窗时发送一个页面事件取消旧滚动动画。
弹窗长文从仓库根目录 HTML 在构建时提取到 `src/generated/project-details.json`，保持当前文案。
这份 HTML 只允许来自受信任的仓库文件，不能将用户输入或 API 返回值传入 `v-html`。
启动后如果修改根目录旧页面或 CSS，需要重新运行 `npm run dev` 来同步副本。

`frontend/index.html`、`.legacy-public/`、`src/generated/` 和 `dist/` 都是生成文件，不提交。
构建使用固定版本依赖和 `package-lock.json`；部署只发布 `dist/` 中的公开文件。
Vue 入口和生成的兼容脚本使用内容哈希文件名，避免新页面加载旧脚本。
发布时先备份线上目录，上传资源后再替换 HTML；保留旧哈希资源，以便已打开的页面继续加载。
根目录仍是未迁移页面和旧交互的输入，不再直接用于整站部署。
当前未配置联系表单开发代理，本地试用不用于验证真实数据库或邮件投递。
本阶段不增加 Vue Router、Pinia 或 UI 组件库，先通过一个真实模块确定使用感受。

轮播节奏：首次停留 3 秒，罗盘用 1.4 秒转到下一项，转完后再完整停留 3 秒。
鼠标点击不保留永久暂停状态；阅读右侧卡片、键盘焦点停留、打开弹窗或页面隐藏时暂停。
鼠标离开卡片后可自动恢复；系统减少动画设置开启时不自动轮播。

## TypeScript 约定

- 新业务代码优先使用 `.ts` 和 `<script setup lang="ts">`；构建辅助脚本暂保留 `.mjs`。
- 开启 `strict`、`noUncheckedIndexedAccess` 和未使用变量/参数检查。
- 组件使用类型化 props/emits，项目 ID、轮播暂停原因采用字面量联合类型。
- 核心逻辑用显式接口约束输入输出；不使用 `any` 绕过类型问题。
- TS 类型不会验证外部数据。未来接 API 时仍需在网络边界校验响应，测试仍需保留。
