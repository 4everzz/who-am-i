<script setup lang="ts">
const principles = [
  ['先问「真的需要 Agent 吗」', '能一次模型调用或固定流程解决的，不加自主循环。上 Agent 意味着引入不确定性、成本和运维负担，它是负债，不是资产。'],
  ['没有停止条件的循环就是事故', '每个自主循环都要有步数上限、Token 预算、墙钟上限和人工接管点。写不出停止条件，就不该上线。'],
  ['约束必须能被验证', '「回答要有出处」不是一句口号，得有代码级校验和评测集去查。说不出怎么检查的约束，等于没有约束。'],
  ['不为了用新技术而上线', '给检索加了一层重排，39 题对照实验里首位命中率只提升不到 0.1 个百分点，每次却要多等 405 毫秒——于是主动关掉，并把这个决定写进默认配置。'],
] as const;
</script>

<template>
  <section class="section section-alt page" id="principles">
    <span class="paper-chapter" aria-hidden="true">04</span>
    <div class="wrap"><div class="section-head"><div class="section-kicker">04 / How I work</div><h2>四条工作原则</h2><p class="section-note">项目之外的一些判断标准，也决定了代码最后长什么样。</p></div>
      <ol class="principles"><li v-for="(principle, index) in principles" :key="principle[0]"><span class="p-num">{{ String(index + 1).padStart(2, '0') }}</span><div><h3>{{ principle[0] }}</h3><p>{{ principle[1] }}</p></div></li></ol>
    </div>
  </section>
</template>
