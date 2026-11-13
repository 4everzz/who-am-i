<script setup lang="ts">
const groups = [
  { key: 'A', title: 'AI 应用', items: [['Agent', 'Python、FastAPI、LangChain、LangGraph、MCP、手写 ReAct'], ['RAG', '混合检索、RRF、Rerank、引用溯源、忠实度评测']] },
  { key: 'B', title: '后端与数据', items: [['数据层', 'PostgreSQL、pgvector、MySQL、Redis（Lua 原子限流）'], ['工程', 'SQLAlchemy 2 异步 ORM、Alembic、JWT 鉴权、行锁与幂等设计']] },
  { key: 'C', title: '前端与交付', items: [['前端', 'UniApp、Vue 3、TypeScript、React、Next.js'], ['交付', 'Docker Compose、Nginx、Linux、HTTPS 与证书自动续期']] },
  { key: 'D', title: '工程与安全', items: [['质量', 'pytest、自实现忠实度与引用评测、数据质量规则引擎'], ['安全', 'bcrypt、登录防枚举、越权逐接口校验、上传校验']] },
] as const;
</script>

<template>
  <section class="section page" id="stack">
    <span class="paper-chapter" aria-hidden="true">03</span>
    <div class="wrap">
      <div class="section-head"><div class="section-kicker">03 / Stack</div><h2>技术栈</h2></div>
      <div class="stack-grid">
        <div v-for="group in groups" :key="group.key" class="stack-card">
          <h3><span class="stack-icon" aria-hidden="true">{{ group.key }}</span>{{ group.title }}</h3>
          <dl><template v-for="item in group.items" :key="item[0]"><dt>{{ item[0] }}</dt><dd>{{ item[1] }}</dd></template></dl>
        </div>
      </div>
    </div>
  </section>
</template>
