import { createApp } from 'vue';
import WorksApp from './components/WorksApp.vue';
import { mountHeader } from './mount-header';

mountHeader('works');
createApp(WorksApp).mount('#main');
