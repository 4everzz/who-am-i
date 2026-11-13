<script setup lang="ts">
import { computed, ref } from 'vue';
import { notes } from '../data/notes';

const pageSize = 5;
const page = ref(1);
const pageCount = Math.ceil(notes.length / pageSize);
const visibleNotes = computed(() => notes.slice((page.value - 1) * pageSize, page.value * pageSize));
const live = computed(() => `技术笔记，第 ${page.value} 页，共 ${pageCount} 页`);
</script>

<template>
  <div class="notes-list" id="notesList" :data-active="page">
    <a v-for="note in visibleNotes" :key="note.href" class="note-item" :href="note.href">
      <span class="note-kicker">{{ note.type }}</span>
      <span class="note-body"><span class="note-title">{{ note.title }}</span></span>
      <span class="note-arrow" aria-hidden="true">→</span>
    </a>
  </div>
  <nav class="notes-pager" aria-label="笔记分页">
    <button v-for="number in pageCount" :key="number" type="button" class="page-dot"
      :class="{ 'is-active': page === number }" :aria-label="`第 ${number} 页`"
      :data-page="number" :aria-current="page === number ? 'page' : undefined" @click="page = number">{{ number }}</button>
  </nav>
  <span class="sr-only" role="status" aria-live="polite">{{ live }}</span>
</template>
