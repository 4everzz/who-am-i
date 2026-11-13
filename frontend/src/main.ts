import { createApp } from 'vue';
import App from './App.vue';
import HomeNotes from './components/HomeNotes.vue';
import HomeStack from './components/HomeStack.vue';
import HomePrinciples from './components/HomePrinciples.vue';
import HomeAbout from './components/HomeAbout.vue';

const app = createApp(App);
app.mount('#work');
createApp(HomeNotes).mount('#home-notes-app');
createApp(HomeStack).mount('#home-stack-app');
createApp(HomePrinciples).mount('#home-principles-app');
createApp(HomeAbout).mount('#home-about-app');

// Existing page interactions bind after Vue has rendered its stable controls.
const legacy = document.createElement('script');
legacy.src = new URL('./generated/legacy-home.js', import.meta.url).href;
document.body.append(legacy);

if (import.meta.hot) import.meta.hot.dispose(() => app.unmount());
