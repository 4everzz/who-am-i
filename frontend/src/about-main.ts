import { createApp } from 'vue';
import ContactForm from './components/ContactForm.vue';
import { mountHeader } from './mount-header';

mountHeader('about');
createApp(ContactForm).mount('#contact-app');
