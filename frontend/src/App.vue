<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import ProjectShowcase from './components/ProjectShowcase.vue';
import ProjectDialog from './components/ProjectDialog.vue';
import { projects } from './data/projects';
import type { Project, ProjectId } from './types/project';

const activeProject = ref<Project | null>(null);
let opener: HTMLElement | null = null;

function openProject(id: ProjectId, trigger?: HTMLElement) {
  const project = projects.find(item => item.id === id);
  if (!project) return;
  opener = trigger ?? null;
  activeProject.value = project;
}
async function closeProject(clearHash = true) {
  const id = activeProject.value?.id;
  if (!id) return;
  const previousOpener = opener;
  activeProject.value = null;
  if (clearHash && location.hash === '#' + id) history.replaceState(null, '', location.pathname + location.search);
  await nextTick();
  const fallback = document.querySelector<HTMLElement>(`[data-open="${id}"]`);
  (previousOpener?.isConnected ? previousOpener : fallback)?.focus({ preventScroll: true });
}
function syncHash() {
  const project = projects.find(item => '#' + item.id === location.hash);
  if (project) {
    if (activeProject.value?.id !== project.id) openProject(project.id);
  } else if (activeProject.value) void closeProject(false);
}
onMounted(() => {
  window.addEventListener('hashchange', syncHash);
  window.addEventListener('popstate', syncHash);
  syncHash();
});
onUnmounted(() => {
  window.removeEventListener('hashchange', syncHash);
  window.removeEventListener('popstate', syncHash);
});
</script>

<template>
  <ProjectShowcase :dialog-project-id="activeProject?.id ?? null" @open="openProject" />
  <ProjectDialog v-if="activeProject" :key="activeProject.id" :project="activeProject" @close="closeProject()" />
</template>
