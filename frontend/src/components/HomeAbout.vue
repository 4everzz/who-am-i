<script setup lang="ts">
import { aboutSite } from '../data/about';
</script>

<template>
  <section class="section contact page page-last" id="about">
    <span class="paper-chapter" aria-hidden="true">05</span>
    <div class="wrap"><div class="contact-inner" data-moment="word-highlight">
      <div class="section-kicker">{{ aboutSite.kicker }}</div><h2>{{ aboutSite.title }}</h2>
      <p class="mo-wh__text">{{ aboutSite.description }}</p>
      <div class="about-contact"><a class="btn btn-primary btn--primary" href="about.html#contact">联系我</a></div>
      <ul class="contact-list about-facts"><li v-for="[label, value] in aboutSite.facts" :key="label"><span>{{ label }}</span><a v-if="label === '在线作品'" href="https://menu.zmeety.cn" target="_blank" rel="noopener">{{ value }}</a><em v-else>{{ value }}</em></li></ul>
    </div></div>
  </section>
</template>
