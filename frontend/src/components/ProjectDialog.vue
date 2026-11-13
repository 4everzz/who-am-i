<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { Project } from '../types/project';
import details from '../generated/project-details.json';

const props = defineProps<{ project: Project }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement>();
const content = computed(() => details[props.project.id]);
let pointerOutside = false;
function outside(event: PointerEvent | MouseEvent) {
  const box = dialog.value!.getBoundingClientRect();
  return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
}
function pointerDown(event: PointerEvent) { pointerOutside = event.target === dialog.value && outside(event); }
function click(event: MouseEvent) {
  const closeButton = event.target instanceof Element && event.target.closest('[data-close]');
  if (closeButton || (event.target === dialog.value && pointerOutside && outside(event))) dialog.value?.close();
  pointerOutside = false;
}
function keyDown(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !dialog.value) return;
  const items = Array.from(dialog.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]'
  )).filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0 && !element.closest('[inert]'));
  const first = items[0], last = items[items.length - 1];
  if (!first || !last) { event.preventDefault(); dialog.value.focus(); return; }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
}
onMounted(() => {
  document.dispatchEvent(new Event('site:project-dialog-open'));
  dialog.value!.showModal();
  document.body.classList.add('modal-open');
});
onUnmounted(() => {
  dialog.value?.close();
  document.body.classList.toggle('modal-open', Boolean(document.querySelector('dialog[open]')));
});
</script>

<template>
  <Teleport to="body">
    <!-- Trusted repository HTML copied at build time; never accept API/user HTML here. -->
    <dialog ref="dialog" :id="project.id" class="project-dialog" :aria-labelledby="content.labelId" tabindex="-1"
      @close="emit('close')" @pointerdown="pointerDown" @click="click" @keydown="keyDown" v-html="content.html"></dialog>
  </Teleport>
</template>
