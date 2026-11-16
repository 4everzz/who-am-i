import { createApp } from 'vue';
import App from './App.vue';
import HomeNotes from './components/HomeNotes.vue';
import HomeStack from './components/HomeStack.vue';
import HomePrinciples from './components/HomePrinciples.vue';
import HomeAbout from './components/HomeAbout.vue';
import { setupHomeInteractions } from './core/home-interactions';

const app = createApp(App);
app.mount('#work');
createApp(HomeNotes).mount('#home-notes-app');
createApp(HomeStack).mount('#home-stack-app');
createApp(HomePrinciples).mount('#home-principles-app');
createApp(HomeAbout).mount('#home-about-app');
const disposeHomeInteractions = setupHomeInteractions();

if (import.meta.hot) import.meta.hot.dispose(() => {
  disposeHomeInteractions();
  app.unmount();
});
