<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { navigation } from '../data/navigation';
import type { PageId } from '../data/navigation';

defineProps<{ currentPage: PageId }>();
type Theme = 'light' | 'dark';
const themeKey = 'zmeety-theme';
const normalizeTheme = (value: string | null): Theme => value === 'dark' ? 'dark' : 'light';
const theme = ref<Theme>(normalizeTheme(document.documentElement.getAttribute('data-theme')));
const menuOpen = ref(false);
const header = ref<HTMLDivElement | null>(null);
const nav = ref<HTMLElement | null>(null);
const menuButton = ref<HTMLButtonElement | null>(null);
let wide: MediaQueryList | null = null;
let restoreBackground: (() => void) | null = null;
let disposed = false;

function applyTheme(value: Theme) {
  theme.value = value;
  document.documentElement.setAttribute('data-theme', value);
}
function toggleTheme() {
  applyTheme(theme.value === 'light' ? 'dark' : 'light');
  try { localStorage.setItem(themeKey, theme.value); } catch { /* Switching still works when storage is unavailable. */ }
}
function syncTheme(event: StorageEvent) {
  if (event.key === themeKey || event.key === null) applyTheme(normalizeTheme(event.newValue));
}

function lockBackground() {
  const elements = [...document.querySelectorAll<HTMLElement>('main, .site-footer, .skip-link')];
  const previous = elements.map(element => ({ element, inert: element.inert }));
  elements.forEach(element => { element.inert = true; });
  restoreBackground = () => previous.forEach(({ element, inert }) => { element.inert = inert; });
}
function closeMenu(restoreFocus = false) {
  menuOpen.value = false;
  document.body.classList.remove('nav-open');
  restoreBackground?.();
  restoreBackground = null;
  if (restoreFocus) menuButton.value?.focus();
}
async function toggleMenu() {
  if (menuOpen.value) { closeMenu(true); return; }
  if (wide?.matches) return;
  menuOpen.value = true;
  lockBackground();
  document.body.classList.add('nav-open');
  await nextTick();
  if (!disposed && menuOpen.value) nav.value?.querySelector('a')?.focus();
}
function onKeydown(event: KeyboardEvent) {
  if (!menuOpen.value) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeMenu(true);
    return;
  }
  if (event.key !== 'Tab') return;
  const items = [...(header.value?.querySelectorAll<HTMLElement>('nav a, .header-actions button') ?? [])];
  const index = items.findIndex(element => element === document.activeElement);
  if (event.shiftKey && index <= 0) {
    event.preventDefault();
    items.at(-1)?.focus();
  } else if (!event.shiftKey && (index === -1 || index === items.length - 1)) {
    event.preventDefault();
    items[0]?.focus();
  }
}
function onWide() {
  if (!wide?.matches || !menuOpen.value) return;
  const focusedButton = document.activeElement === menuButton.value;
  closeMenu();
  if (focusedButton) nav.value?.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
}
function onPageShow() {
  // A browser history restoration must not restore an overlay over an inert page.
  if (menuOpen.value) closeMenu(!wide?.matches);
}
onMounted(() => {
  applyTheme(theme.value);
  wide = window.matchMedia('(min-width: 701px)');
  if (wide.addEventListener) wide.addEventListener('change', onWide);
  else wide.addListener(onWide);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('storage', syncTheme);
  window.addEventListener('pageshow', onPageShow);
});
onUnmounted(() => {
  disposed = true;
  closeMenu();
  if (wide?.removeEventListener) wide.removeEventListener('change', onWide);
  else wide?.removeListener(onWide);
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('storage', syncTheme);
  window.removeEventListener('pageshow', onPageShow);
});
</script>

<template>
  <div ref="header" class="wrap header-inner">
    <a class="brand" href="index.html" aria-label="返回首页" :inert="menuOpen">
      <span class="brand-mark" aria-hidden="true">Z</span>
      <span class="brand-text">zmeety<span class="brand-sub">个人小站</span></span>
    </a>
    <nav id="nav" ref="nav" class="nav" aria-label="主导航">
      <a v-for="item in navigation" :key="item.id" :href="item.href"
        :aria-current="currentPage === item.id ? 'page' : undefined" @click="closeMenu()">{{ item.label }}</a>
    </nav>
    <div class="header-actions">
      <button class="theme-toggle" type="button" aria-label="切换阅读模式" :aria-pressed="theme === 'dark'" @click="toggleTheme">
        <svg class="tt-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
        <svg class="tt-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      </button>
      <button ref="menuButton" class="menu-btn" type="button" :aria-expanded="menuOpen" aria-controls="nav" aria-label="切换导航菜单" @click="toggleMenu">
        <span></span><span></span>
      </button>
    </div>
  </div>
</template>
