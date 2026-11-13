import { createApp } from 'vue';
import NotesApp from './components/NotesApp.vue';
import { mountHeader } from './mount-header';

mountHeader('notes');
createApp(NotesApp).mount('#notes-app');
