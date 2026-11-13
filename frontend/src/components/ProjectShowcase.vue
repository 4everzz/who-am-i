<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { projects } from '../data/projects';
import { CAROUSEL_TURN_MS, createCarousel } from '../core/carousel';
import type { ProjectId } from '../types/project';

const props = defineProps<{ dialogProjectId: ProjectId | null }>();
const emit = defineEmits<{ open: [id: ProjectId, opener: HTMLElement] }>();
const root = ref<HTMLElement>();
const carousel = createCarousel({ count: projects.length });
const state = ref(carousel.snapshot());
const unsubscribe = carousel.subscribe(value => { state.value = value; });
const live = ref('');
const current = computed(() => projects[state.value.index]!);
const pad = (value: number) => String(value).padStart(2, '0');
const compassStyle = computed(() => ({ '--compass-angle': `${state.value.rotation}deg`, '--compass-return': `${-state.value.rotation}deg`, '--compass-turn-duration': `${CAROUSEL_TURN_MS}ms` }));
let touchTimer: ReturnType<typeof setTimeout> | undefined;
let touchStart: { id: number; x: number; y: number } | undefined;
let touchActive = false;
let keyboardInteraction = false;
const cleanup: (() => void)[] = [];
watch(() => props.dialogProjectId, id => {
  if (id) {
    carousel.pause('dialog');
    const index = projects.findIndex(project => project.id === id);
    if (index >= 0) carousel.select(index);
  } else carousel.resume('dialog');
}, { immediate: true });

function openProject(id: ProjectId, event: MouseEvent) {
  if (event.currentTarget instanceof HTMLElement) emit('open', id, event.currentTarget);
}

function select(index: number) {
  carousel.select(index);
  live.value = `当前项目：${current.value.name}`;
}
async function onKey(event: KeyboardEvent) {
  const control = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-project-index]');
  if (!control || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const index = state.value.index;
  select(event.key === 'Home' ? 0 : event.key === 'End' ? projects.length - 1 : index + (event.key === 'ArrowRight' ? 1 : -1));
  await nextTick();
  const group = control.classList.contains('project-dot') ? '.project-dot' : '.compass-notch';
  root.value?.querySelector<HTMLButtonElement>(`${group}[data-project-index="${state.value.index}"]`)?.focus({ preventScroll: true });
}
function focusOut(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node | null)) carousel.resume('focus');
}
function syncFocus() {
  if (keyboardInteraction && root.value?.contains(document.activeElement)) carousel.pause('focus');
  else carousel.resume('focus');
}
function keyboardInput(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  keyboardInteraction = true;
  syncFocus();
}
function pointerInput() {
  // Only a deliberate click/tap changes input mode. Moving the mouse must
  // not cancel an active keyboard pause; touch retains its own timed pause.
  keyboardInteraction = false;
  carousel.resume('focus');
}
function pointerEnter(event: PointerEvent) {
  if (event.pointerType === 'touch') return;
  carousel.pause('pointer');
  syncFocus();
}
function pointerLeave(event: PointerEvent) {
  if (event.pointerType === 'touch') return;
  carousel.resume('pointer');
  syncFocus();
}
function touchDown(event: PointerEvent) {
  if (event.pointerType !== 'touch') return;
  touchActive = true;
  clearTimeout(touchTimer);
  carousel.pause('touch');
  const target = event.target as HTMLElement;
  // Buttons keep native click behavior; swipe capture belongs to non-interactive card content.
  if (target.closest('.project-stage') && !target.closest('a, button')) {
    touchStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    root.value?.setPointerCapture(event.pointerId);
  }
}
function touchEnd(event: PointerEvent) {
  if (event.pointerType !== 'touch' || !touchActive) return;
  touchActive = false;
  if (touchStart?.id === event.pointerId) {
    const dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y;
    if (event.type !== 'pointercancel' && Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) select(state.value.index + (dx < 0 ? 1 : -1));
    if (root.value?.hasPointerCapture(event.pointerId)) root.value.releasePointerCapture(event.pointerId);
    touchStart = undefined;
  }
  clearTimeout(touchTimer);
  touchTimer = setTimeout(() => carousel.resume('touch'), 8000);
}
onMounted(() => {
  const host = root.value!;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = () => media.matches ? carousel.pause('motion') : carousel.resume('motion');
  const visibility = () => {
    if (document.hidden) {
      carousel.pause('visibility');
      clearTimeout(touchTimer);
      touchActive = false;
      touchStart = undefined;
      carousel.resume('touch');
    } else {
      const hovered = host.querySelector('.project-stage')?.matches(':hover') && matchMedia('(hover: hover)').matches;
      if (hovered) carousel.pause('pointer');
      else carousel.resume('pointer');
      syncFocus();
      carousel.resume('visibility');
    }
  };
  if (media.addEventListener) {
    media.addEventListener('change', motion);
    cleanup.push(() => media.removeEventListener('change', motion));
  } else {
    media.addListener(motion);
    cleanup.push(() => media.removeListener(motion));
  }
  document.addEventListener('visibilitychange', visibility);
  document.addEventListener('keydown', keyboardInput, true);
  document.addEventListener('pointerdown', pointerInput, true);
  window.addEventListener('pointerup', touchEnd);
  window.addEventListener('pointercancel', touchEnd);
  cleanup.push(() => {
    document.removeEventListener('visibilitychange', visibility);
    document.removeEventListener('keydown', keyboardInput, true);
    document.removeEventListener('pointerdown', pointerInput, true);
    window.removeEventListener('pointerup', touchEnd);
    window.removeEventListener('pointercancel', touchEnd);
  });
  motion(); visibility();
  syncFocus();
  carousel.resume('initializing');
});
onUnmounted(() => {
  clearTimeout(touchTimer);
  unsubscribe();
  carousel.dispose();
  cleanup.forEach(dispose => dispose());
});
</script>

<template>
  <span class="paper-chapter" aria-hidden="true">01</span>
  <div ref="root" class="wrap work-screen project-showcase" data-vue-project-carousel aria-label="精选项目"
    @keydown="onKey" @focusin="syncFocus" @focusout="focusOut" @pointerdown.passive="touchDown">
    <div class="showcase-head">
      <div><div class="section-kicker">01 / Selected work</div><h2>精选项目</h2></div>
      <div class="showcase-status"><span data-project-counter>{{ pad(state.index + 1) }} / {{ pad(projects.length) }}</span></div>
    </div>
    <div class="showcase-layout">
      <div class="project-orbit-panel">
        <div class="project-compass" :style="compassStyle" role="group" aria-label="点击罗盘上的项目名称切换项目">
          <svg class="compass-svg" viewBox="0 0 280 280" fill="none" aria-hidden="true">
            <circle class="compass-scale" cx="140" cy="140" r="134" stroke="currentColor" stroke-opacity=".4" stroke-width="5" stroke-dasharray=".6 5.25"/>
            <circle cx="140" cy="140" r="118" stroke="currentColor" stroke-opacity=".28"/>
            <circle cx="140" cy="140" r="96" stroke="currentColor" stroke-opacity=".18"/>
            <circle cx="140" cy="140" r="57" stroke="currentColor" stroke-opacity=".38"/>
            <path d="M140 15v28M140 237v28M15 140h28M237 140h28" stroke="currentColor" stroke-opacity=".35"/>
            <path d="M140 49v182M49 140h182" stroke="currentColor" stroke-opacity=".12" stroke-dasharray="2 8"/>
          </svg>
          <div class="compass-notch-ring">
            <button v-for="(project, index) in projects" :key="project.id" class="compass-notch" :class="{ 'is-active': state.index === index }"
              type="button" :data-project-index="index" :aria-label="`切换到 ${project.name}`" :aria-pressed="state.index === index"
              :style="{ '--notch-angle': `${index * 360 / projects.length}deg` }" @click="select(index)">
              <span class="compass-notch-content"><b>{{ pad(index + 1) }}</b><strong>{{ project.name }}</strong></span>
            </button>
          </div>
          <div class="compass-core" aria-hidden="true"><span>PROJECT</span><strong data-compass-number>{{ pad(state.index + 1) }}</strong><b data-compass-name>{{ current.name }}</b></div>
          <span class="compass-signal" aria-hidden="true"></span>
        </div>
      </div>
      <div class="project-stage" tabindex="0" style="touch-action: pan-y" @pointerenter="pointerEnter" @pointerleave="pointerLeave">
        <article v-for="(project, index) in projects" :key="project.id" class="project-slide" :class="{ 'is-active': state.index === index }"
          :data-project-slide="index" :aria-labelledby="`project-slide-title-${index}`" :hidden="state.index !== index">
          <div class="project-slide-copy">
            <div class="project-meta"><span class="project-index">{{ pad(index + 1) }}</span><span v-for="tag in project.tags" :key="tag.label" :class="tag.className"><i v-if="tag.className.includes('tag-live')" aria-hidden="true"></i>{{ tag.label }}</span></div>
            <h3 :id="`project-slide-title-${index}`">{{ project.name }}</h3>
            <p class="project-sub">{{ project.subtitle }}</p>
            <p class="project-intro">{{ project.intro }}</p>
            <ul class="project-points"><li v-for="point in project.points" :key="point">{{ point }}</li></ul>
            <div class="project-slide-actions">
              <a v-if="project.url" class="link-out" :href="project.url" target="_blank" rel="noopener">访问应用 <span aria-hidden="true">↗</span></a>
              <button class="btn btn-outline btn--secondary" type="button" :data-open="project.id" @click="openProject(project.id, $event)">{{ project.buttonLabel }} <span aria-hidden="true">→</span></button>
            </div>
          </div>
          <aside class="project-slide-aside"><span class="slide-aside-kicker">{{ project.aside.kicker }}</span><strong>{{ project.aside.title }}</strong>
            <div class="slide-flow"><template v-for="(step, stepIndex) in project.aside.flow" :key="step"><i v-if="stepIndex" aria-hidden="true">→</i><span>{{ step }}</span></template></div>
            <p>{{ project.aside.description }}</p>
          </aside>
        </article>
        <div class="project-dots" role="group" aria-label="项目页码"><button v-for="(project, index) in projects" :key="project.id"
          class="project-dot" :class="{ 'is-active': state.index === index }" type="button" :aria-pressed="state.index === index"
          :aria-label="`第 ${index + 1} 个项目`" :data-project-index="index" @click="select(index)"></button></div>
        <p class="sr-only" data-project-live aria-live="polite">{{ live }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compass-notch-ring {
  transition: transform var(--compass-turn-duration) cubic-bezier(.45, 0, .2, 1);
}
.compass-notch-content {
  transition: transform var(--compass-turn-duration) cubic-bezier(.45, 0, .2, 1), border-color .25s ease, background-color .25s ease;
}
</style>
