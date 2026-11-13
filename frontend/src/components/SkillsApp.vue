<script setup lang="ts">
import { principles, skillGroups } from '../data/skills';
</script>

<template>
  <section class="content-block">
    <div class="block-heading">
      <span class="block-index">03.1 / Built in projects</span>
      <h2>项目中的方法</h2>
    </div>
    <div class="skill-list">
      <div v-for="(group, index) in skillGroups" :key="group.title" class="skill-row">
        <h3 :data-index="String(index + 1).padStart(2, '0')">{{ group.title }}</h3>
        <div>
          <p v-for="paragraph in group.paragraphs" :key="paragraph">{{ paragraph }}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="content-block">
    <div class="block-heading">
      <span class="block-index">03.2 / Working principles</span>
      <h2>四条工作原则</h2>
    </div>
    <div class="principle-list">
      <div v-for="(principle, index) in principles" :key="principle.title" class="principle-row">
        <h3 :data-index="String(index + 1).padStart(2, '0')">{{ principle.title }}</h3>
        <div><p>{{ principle.description }}</p></div>
      </div>
    </div>
    <div class="quote-block">可靠性不是一句态度，而是把边界、证据和回滚路径写进系统。</div>
  </section>
</template>
