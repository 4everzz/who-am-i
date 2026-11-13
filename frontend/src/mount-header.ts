import { createApp } from 'vue';
import SiteHeader from './components/SiteHeader.vue';
import type { PageId } from './data/navigation';

export function mountHeader(currentPage: PageId) {
  const container = document.getElementById('site-header-app');
  if (!container) throw new Error('Shared page header mount is missing.');
  return createApp(SiteHeader, { currentPage }).mount(container);
}
