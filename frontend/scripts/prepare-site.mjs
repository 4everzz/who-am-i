import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const target = new URL('../.legacy-public/', import.meta.url);
await mkdir(target, { recursive: true });
// Only public assets: never copy backend code, environment files or repository metadata.
for (const name of ['assets', 'posts', '404.html', 'about.html', 'notes.html', 'skills-principles.html', 'works.html', 'robots.txt', 'sitemap.xml']) {
  await cp(new URL(name, root), new URL(name, target), { recursive: true });
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
const appScript = /<script src="assets\/app\.js[^\"]*"><\/script>/;
if (!appScript.test(html)) throw new Error('Homepage script entry changed.');
html = html.replace(appScript, '<script type="module" src="/src/main.ts"></script>');
html = html.replaceAll('href="assets/', 'href="/assets/').replaceAll('src="assets/', 'src="/assets/');
await writeFile(new URL('../index.html', import.meta.url), html);

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
await writeFile(new URL('legacy-home.js', generated), legacy);
// Remove only the obsolete generated file from the first pilot build.
await rm(new URL('assets/legacy-home.js', target), { force: true });
console.log('Prepared current static site with a Vue project component.');
