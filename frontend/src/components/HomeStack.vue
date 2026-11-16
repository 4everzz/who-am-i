<script setup lang="ts">
import { stackGroups } from '../data/skills';
</script>

<template>
  <section class="section page" id="stack">
    <span class="paper-chapter" aria-hidden="true">03</span>
    <div class="wrap">
      <div class="section-head"><div class="section-kicker">03 / Stack</div><h2>技术栈</h2></div>
      <div class="stack-grid">
        <div v-for="group in stackGroups" :key="group.key" class="stack-card">
          <h3><span class="stack-icon" aria-hidden="true">{{ group.key }}</span>{{ group.title }}</h3>
          <dl><template v-for="item in group.items" :key="item[0]"><dt>{{ item[0] }}</dt><dd>{{ item[1] }}</dd></template></dl>
        </div>
      </div>
    </div>
  </section>
</template>
