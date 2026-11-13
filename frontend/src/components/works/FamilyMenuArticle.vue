<template>
<section class="project-section">
      <h3>问题</h3>
      <p>
        家庭成员每天要在群聊里反复商量吃什么、买什么、冰箱还剩什么，信息不同步，
        食材经常放到过期。目标是把这些集中到一处，并且让 AI 助手能按现有食材给建议。
      </p>
    </section>

    <section class="project-section">
      <h3>做法</h3>
      <div class="dlg-items">
        <div class="dlg-item">
          <h4>多端交付</h4>
          <p>一套 UniApp + Vue 3 代码交付 H5 / 微信小程序 / App，统一请求层处理令牌与跨端差异；
             管理后台是独立的 Vue 3 工程。H5 与小程序已上线，App 已打包、待上架。</p>
        </div>
        <div class="dlg-item">
          <h4>后端与数据完整性</h4>
          <p>FastAPI + SQLAlchemy 2 异步栈，JWT 鉴权与家庭级数据隔离；
             并发加入家庭的上限竞态用 <code>SELECT … FOR UPDATE</code> 行锁收敛，
             成员唯一约束保证邀请码加入幂等；Alembic 管理 33 条迁移，库存增减包在事务里。</p>
        </div>
        <div class="dlg-item">
          <h4>手写 ReAct 与 MCP</h4>
          <p>不依赖 LangChain，手写 ReAct 循环：5 个只读工具、最多 4 步强制收口，
             写入一律由用户确认后走业务接口。经 MCP 接入《中国食物成分表》，按来源标注可信度。</p>
        </div>
        <div class="dlg-item">
          <h4>平台治理与成本</h4>
          <p>管理后台做内容审核、通知去重、审计留痕与三级角色逐接口校验；
             Redis Lua 原子计数限每人每日 50 次 AI 调用；对话历史按 6 轮 / 300 字符 / 工具 50 条裁剪；
             SSE 断连即取消后台任务。</p>
        </div>
      </div>
    </section>

    <section class="project-section">
      <h3>关键取舍</h3>

      <details class="qa">
        <summary>为什么手写 ReAct，不用现成框架？</summary>
        <div class="qa-body">
          <p>这个场景只需要 5 个只读工具、最多 4 步，引入一套 Agent 框架的抽象成本高于收益。
             手写能精确控制停止条件——步数满了怎么收、工具报错怎么退、什么时候必须把决定权交回用户。</p>
        </div>
      </details>

      <details class="qa">
        <summary>两个人同时用邀请码加入，会不会超员？</summary>
        <div class="qa-body">
          <p>会。计数和写入如果分两步查再做，中间就有竞态窗口。
             所以加入家庭时用 <code>SELECT … FOR UPDATE</code> 锁住家庭行再计数，
             配合成员唯一约束，重复提交也不会产生第二条成员记录。</p>
        </div>
      </details>

      <details class="qa">
        <summary>为什么只给 AI 只读工具？</summary>
        <div class="qa-body">
          <p>模型可以建议「把这袋食材标记为用完」，但不能自己改库存。
             写操作全部回到业务接口、由用户点确认，AI 只负责查和提议。
             这样即使模型判断错了，也不会留下不可撤销的脏数据。</p>
        </div>
      </details>

      <details class="qa">
        <summary>限流为什么用 Redis Lua？</summary>
        <div class="qa-body">
          <p>「读计数 → 判断 → 写回」三步如果分开执行，并发请求会同时通过。
             Lua 脚本在 Redis 里原子执行，计数与判定不会被打断，配额才是真的 50 次。</p>
        </div>
      </details>
    </section>

    <section class="project-section">
      <h3>结果</h3>
      <div class="dlg-metrics">
        <div><b>50+</b><span>核心用户（按实际使用人数）</span></div>
        <div><b>59.6 → 6.0s</b><span>MCP 首次调用</span></div>
        <div><b>381 + 12</b><span>后端 / 管理后台测试</span></div>
      </div>
      <p class="dlg-footnote">
        已上线：<a href="https://menu.zmeety.cn" target="_blank" rel="noopener">menu.zmeety.cn</a>（H5 与微信小程序）。
        家庭成员常共用一个账号，用户数按实际使用人数统计。
      </p>
    </section>

    <section class="project-section">
      <h3>技术栈</h3>
      <ul class="chips chips-lg">
        <li>UniApp</li><li>Vue 3</li><li>TypeScript</li><li>FastAPI</li><li>SQLAlchemy 2</li>
        <li>PostgreSQL</li><li>Redis</li><li>MCP</li><li>Docker Compose</li><li>Nginx</li>
      </ul>
    </section>
</template>
