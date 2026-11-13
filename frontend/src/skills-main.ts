import { createApp } from 'vue';
import SkillsApp from './components/SkillsApp.vue';
import { mountHeader } from './mount-header';

mountHeader('skills');
createApp(SkillsApp).mount('#skills-app');
