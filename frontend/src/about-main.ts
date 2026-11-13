import { createApp } from 'vue';
import ContactForm from './components/ContactForm.vue';
import { mountHeader } from './mount-header';

mountHeader('about');
createApp(ContactForm).mount('#contact-app');
const unavailable = document.querySelector<HTMLElement>('[data-contact-unavailable]');
if (unavailable) unavailable.hidden = true;
