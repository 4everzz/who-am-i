import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
function withVueHeader(html) {
  const header = '<header class="site-header">';
  const themeScript = /<script src="\/?assets\/theme\.js[^"]*"><\/script>/;
  const navScript = /<script src="\/?assets\/post\.js[^"]*"><\/script>/;
  if (!html.includes(header) || !themeScript.test(html) || !navScript.test(html)) {
    throw new Error('Independent page header changed; review the shared Vue header adapter.');
  }
  return html.replace(header, '<header class="site-header" id="site-header-app">')
    .replace(themeScript, '').replace(navScript, '');
}
const target = new URL('../.legacy-public/', import.meta.url);
await mkdir(target, { recursive: true });
// Only public assets: never copy backend code, environment files or repository metadata.
for (const name of ['assets', 'posts', '404.html', 'robots.txt', 'sitemap.xml']) {
  await cp(new URL(name, root), new URL(name, target), { recursive: true });
}
// These pages now have Vite entries; remove stale public copies from previous builds.
for (const name of ['notes.html', 'skills-principles.html', 'works.html', 'about.html']) {
  await rm(new URL(name, target), { force: true });
}

let html = await readFile(new URL('index.html', root), 'utf8');
const details = {};
html = html.replace(/<dialog class="project-dialog" id="([^"]+)" aria-labelledby="([^"]+)">([\s\S]*?)<\/dialog>/g, (_, id, labelId, content) => {
  details[id] = { labelId, html: content };
  return '';
});
if (Object.keys(details).sort().join(',') !== 'p-devfleet,p-menu,p-zhiyuan') throw new Error('Project dialogs changed; review the content mapping.');
const generated = new URL('../src/generated/', import.meta.url);
await mkdir(generated, { recursive: true });
await writeFile(new URL('project-details.json', generated), JSON.stringify(details, null, 2));
const work = /(<section class="section page" id="work">)[\s\S]*?<\/section>/;
if (!work.test(html)) throw new Error('Homepage project section changed; review the Vue pilot adapter.');
html = html.replace(work, '$1<noscript>请启用 JavaScript 查看项目，或前往<a href="works.html">作品页</a>。</noscript></section>');
const homeNotes = /<div class="notes-list" id="notesList">[\s\S]*?<\/nav>/;
if (!homeNotes.test(html)) throw new Error('Homepage notes pagination changed; review the Vue notes adapter.');
html = html.replace(homeNotes, match => `<div id="home-notes-app">${match}</div>`);
for (const [id, mount] of [['stack', 'home-stack-app'], ['principles', 'home-principles-app'], ['about', 'home-about-app']]) {
  const section = new RegExp(`<section[^>]+id="${id}"[\\s\\S]*?<\\/section>`);
  if (!section.test(html)) throw new Error(`Homepage ${id} section changed; review the Vue adapter.`);
  html = html.replace(section, match => `<div id="${mount}">${match}</div>`);
}
const appScript = /<script src="assets\/app\.js[^\"]*"><\/script>/;
if (!appScript.test(html)) throw new Error('Homepage script entry changed.');
html = html.replace(appScript, '<script type="module" src="/src/main.ts"></script>');
html = html.replaceAll('href="assets/', 'href="/assets/').replaceAll('src="assets/', 'src="/assets/');
await writeFile(new URL('../index.html', import.meta.url), html);

let notesHtml = await readFile(new URL('notes.html', root), 'utf8');
const catalog = /<div class="note-catalog">[\s\S]*?<\/div>/;
if (!catalog.test(notesHtml)) throw new Error('Notes catalog changed; review the Vue notes adapter.');
// Keep readable content before the module loads, and when JavaScript is disabled.
notesHtml = notesHtml.replace('<div class="note-catalog">', '<div id="notes-app" class="note-catalog">');
const postScript = /<script src="assets\/post\.js[^\"]*"><\/script>/;
if (!postScript.test(notesHtml)) throw new Error('Notes page script entry changed; review the Vue notes adapter.');
notesHtml = notesHtml.replace(postScript, '$&<script type="module" src="/src/notes-main.ts"></script>');
notesHtml = notesHtml.replaceAll('href="assets/', 'href="/assets/').replaceAll('src="assets/', 'src="/assets/');
await writeFile(new URL('../notes.html', import.meta.url), withVueHeader(notesHtml));

let skillsHtml = await readFile(new URL('skills-principles.html', root), 'utf8');
const skillsContent = /<section class="content-block">[\s\S]*?<\/main>/;
if (!skillsContent.test(skillsHtml)) throw new Error('Skills page content changed; review the Vue skills adapter.');
skillsHtml = skillsHtml.replace(skillsContent, content => '<div id="skills-app">' + content.replace('</main>', '') + '</div></main>');
const skillsPostScript = /<script src="assets\/post\.js[^\"]*"><\/script>/;
if (!skillsPostScript.test(skillsHtml)) throw new Error('Skills page script entry changed; review the Vue skills adapter.');
skillsHtml = skillsHtml.replace(skillsPostScript, '$&<script type="module" src="/src/skills-main.ts"></script>');
skillsHtml = skillsHtml.replaceAll('href="assets/', 'href="/assets/').replaceAll('src="assets/', 'src="/assets/');
await writeFile(new URL('../skills-principles.html', import.meta.url), withVueHeader(skillsHtml));

let worksHtml = await readFile(new URL('works.html', root), 'utf8');
if (!worksHtml.includes('<main class="section-page" id="main">') || !postScript.test(worksHtml)) {
  throw new Error('Works page entry changed; review the Vue works adapter.');
}
worksHtml = worksHtml.replace(postScript, '$&<script type="module" src="/src/works-main.ts"></script>');
worksHtml = worksHtml.replaceAll('href="assets/', 'href="/assets/').replaceAll('src="assets/', 'src="/assets/');
await writeFile(new URL('../works.html', import.meta.url), withVueHeader(worksHtml));

let aboutHtml = await readFile(new URL('about.html', root), 'utf8');
const contactForm = /<form class="contact-form" data-contact-form novalidate>[\s\S]*?<\/form>/;
const contactScript = /<script src="assets\/contact\.js[^"]*"><\/script>/;
if (!contactForm.test(aboutHtml) || !contactScript.test(aboutHtml)) {
  throw new Error('Contact form entry changed; review the Vue contact adapter.');
}
aboutHtml = aboutHtml.replace(contactForm, '<div id="contact-app">$&</div>');
// Vue owns form events; loading the old contact script too would submit twice.
aboutHtml = aboutHtml.replace(contactScript, '<script type="module" src="/src/about-main.ts"></script>');
aboutHtml = aboutHtml.replaceAll('href="assets/', 'href="/assets/').replaceAll('src="assets/', 'src="/assets/');
await writeFile(new URL('../about.html', import.meta.url), withVueHeader(aboutHtml));

// Transitional adapter: keep navigation/scrolling. Vue owns the carousel and dialogs.
let legacy = await readFile(new URL('assets/app.js', root), 'utf8');
const normalized = legacy.replaceAll('\r\n', '\n');
const from = normalized.indexOf("  var projectCarousel = document.querySelector('[data-project-carousel]');\n  if (projectCarousel)");
const to = normalized.indexOf("  var year = document.getElementById('year');", from);
if (from < 0 || to < from) throw new Error('Legacy carousel boundary changed; review the adapter.');
legacy = normalized.slice(0, from) + normalized.slice(to);
const dialogStart = legacy.indexOf('  var openers = new WeakMap();');
const dialogEnd = legacy.indexOf("  var list = document.getElementById('notesList');", dialogStart);
if (dialogStart < 0 || dialogEnd < dialogStart) throw new Error('Legacy dialog boundary changed; review the adapter.');
legacy = legacy.slice(0, dialogStart) + `
  function openFromHash() {
    if (/^#p-(devfleet|menu|zhiyuan)$/.test(location.hash)) return;
    if (location.hash) scrollToHash(location.hash, false);
    else moveTo(0);
  }
  window.addEventListener('hashchange', openFromHash);
  document.addEventListener('site:project-dialog-open', cancelPageScroll);
  openFromHash();
` + legacy.slice(dialogEnd);
const notesStart = legacy.indexOf("  var list = document.getElementById('notesList');");
const yearStart = legacy.indexOf("  var year = document.getElementById('year');", notesStart);
if (notesStart < 0 || yearStart < notesStart) throw new Error('Homepage notes pagination boundary changed.');
legacy = legacy.slice(0, notesStart) + legacy.slice(yearStart);
await writeFile(new URL('legacy-home.js', generated), legacy);
// Remove only the obsolete generated file from the first pilot build.
await rm(new URL('assets/legacy-home.js', target), { force: true });
console.log('Prepared Vue entries for home, notes, skills, works and about with legacy public assets.');
