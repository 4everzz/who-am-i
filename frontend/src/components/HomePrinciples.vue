<script setup lang="ts">
import { principles } from '../data/skills';
</script>

<template>
  <section class="section section-alt page" id="principles">
    <span class="paper-chapter" aria-hidden="true">04</span>
    <div class="wrap"><div class="section-head"><div class="section-kicker">04 / How I work</div><h2>四条工作原则</h2><p class="section-note">项目之外的一些判断标准，也决定了代码最后长什么样。</p></div>
      <ol class="principles"><li v-for="(principle, index) in principles" :key="principle.title"><span class="p-num">{{ String(index + 1).padStart(2, '0') }}</span><div><h3>{{ principle.title }}</h3><p>{{ principle.description }}</p></div></li></ol>
    </div>
  </section>
</template>
