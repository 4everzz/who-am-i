<script setup lang="ts">
import type { Project } from '../../types/project';

defineProps<{
  project: Pick<Project, 'id' | 'name'>;
  index: string;
  subtitle: string;
}>();
</script>

<template>
  <section class="content-block" :id="project.id">
    <div class="block-heading">
      <span class="block-index">{{ index }}</span>
      <h2>{{ project.name }}</h2>
    </div>
    <p class="block-intro">{{ subtitle }}</p>
    <div class="project-article"><slot /></div>
  </section>
</template>

<style scoped>
.content-block {
  scroll-margin-top: calc(var(--post-header-height, 80px) + 16px);
}
</style>
