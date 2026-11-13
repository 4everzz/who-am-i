import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
app.mount('#work');

// Existing page interactions bind after Vue has rendered its stable controls.
const legacy = document.createElement('script');
legacy.src = new URL('./generated/legacy-home.js', import.meta.url).href;
document.body.append(legacy);

if (import.meta.hot) import.meta.hot.dispose(() => app.unmount());
