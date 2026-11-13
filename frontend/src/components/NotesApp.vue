<script setup lang="ts">
import { notes } from '../data/notes';
</script>

<template>
  <template v-for="note in notes" :key="note.href">
    <a class="note-card" :href="note.href">
      <span class="note-type">{{ note.type }}</span>
      <h3>{{ note.title }}</h3>
      <p>{{ note.description }}</p>
      <span class="note-link">阅读文章 →</span>
    </a>
  </template>
</template>
