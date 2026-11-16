import { createApp, type Component } from 'vue';
import App from './App.vue';
import HomeNotes from './components/HomeNotes.vue';
import HomeStack from './components/HomeStack.vue';
import HomePrinciples from './components/HomePrinciples.vue';
import HomeAbout from './components/HomeAbout.vue';
import { setupHomeInteractions } from './core/home-interactions';
import { mountHeader } from './mount-header';

function mount(component: Component, selector: string) {
  const app = createApp(component);
  app.mount(selector);
  return app;
}
const apps = [
  mountHeader('home'),
  mount(App, '#work'),
  mount(HomeNotes, '#home-notes-app'),
  mount(HomeStack, '#home-stack-app'),
  mount(HomePrinciples, '#home-principles-app'),
  mount(HomeAbout, '#home-about-app'),
];
const disposeHomeInteractions = setupHomeInteractions();

if (import.meta.hot) import.meta.hot.dispose(() => {
  disposeHomeInteractions();
  apps.forEach(app => app.unmount());
});
