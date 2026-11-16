import { readFile, writeFile, mkdir, cp, rm, readdir } from 'node:fs/promises';
import ts from 'typescript';
import { createHash } from 'node:crypto';
import { projectFallback } from './site-fallbacks.mjs';
import { versionedAssetDirectory } from './versioned-assets.mjs';
import { notes } from '../src/data/notes.ts';
import { fillContentSlot, renderHomeNotes, renderNoteCatalog, renderNoteSitemap, validateNoteCatalog } from './note-content.mjs';

const root = new URL('../../', import.meta.url);
const articlePaths = (await readdir(new URL('posts/', root), { withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name.endsWith('.html')).map(entry => 'posts/' + entry.name);
validateNoteCatalog(notes, articlePaths);
function withVueHeader(html, legacyScripts = true) {
  const header = '<header class="site-header">';
  const themeScript = /<script src="\/?assets\/theme\.js[^"]*"><\/script>/;
  const navScript = /<script src="\/?assets\/post\.js[^"]*"><\/script>/;
  if (!html.includes(header) || (legacyScripts && (!themeScript.test(html) || !navScript.test(html)))) {
    throw new Error('Independent page header changed; review the shared Vue header adapter.');
  }
  return html.replace(header, '<header class="site-header" id="site-header-app">')
    .replace(themeScript, '').replace(navScript, '');
}
const target = new URL('../.legacy-public/', import.meta.url);
await mkdir(target, { recursive: true });
// Only public assets: never copy backend code, environment files or repository metadata.
for (const name of ['assets', 'posts', '404.html', 'robots.txt']) {
  await cp(new URL(name, root), new URL(name, target), { recursive: true });
}
const sitemap = await readFile(new URL('sitemap.xml', root), 'utf8');
await writeFile(new URL('sitemap.xml', target), fillContentSlot(sitemap, '<!-- build:note-urls -->', renderNoteSitemap(notes)));
const motionAssets = await versionedAssetDirectory(new URL('assets/taste/', root), new URL('assets/', target));
const shellSource = await readFile(new URL('../src/site-shell.ts', import.meta.url), 'utf8');
const shellOutput = ts.transpileModule(shellSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const shellFile = 'site-shell-' + createHash('sha256').update(shellOutput).digest('hex').slice(0, 12) + '.js';
const publicAssets = new URL('assets/', target);
// Only remove obsolete generated shell files from the local build staging directory.
for (const entry of await readdir(publicAssets)) {
  if (/^site-shell(?:-[a-f0-9]{12})?\.js$/.test(entry) && entry !== shellFile) {
    await rm(new URL(entry, publicAssets));
  }
}
await writeFile(new URL(shellFile, publicAssets), shellOutput);
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
const work = /(<section class="section page" id="work">)([\s\S]*?)(<\/section>)/;
if (!work.test(html)) throw new Error('Homepage project section changed; review the Vue pilot adapter.');
// Readable before Vue mounts, with JavaScript disabled, or if its bundle fails.
html = html.replace(work, projectFallback);
html = fillContentSlot(html, '<!-- build:home-notes -->', renderHomeNotes(notes));
for (const [id, mount] of [['stack', 'home-stack-app'], ['principles', 'home-principles-app'], ['about', 'home-about-app']]) {
  const section = new RegExp(`<section[^>]+id="${id}"[\\s\\S]*?<\\/section>`);
  if (!section.test(html)) throw new Error(`Homepage ${id} section changed; review the Vue adapter.`);
  html = html.replace(section, match => `<div id="${mount}">${match}</div>`);
}
if (/<script[^>]+src="\/?assets\/(?:app|theme)\.js/.test(html)) {
  throw new Error('Homepage must not load legacy interactions alongside Vue.');
}
html = html.replaceAll('href="assets/', 'href="/assets/').replaceAll('src="assets/', 'src="/assets/');
html = html.replaceAll('/assets/taste/', `/assets/${motionAssets}/`);
html = html.replace('</body>', '<script type="module" src="/src/main.ts"></script>\n</body>');
await writeFile(new URL('../index.html', import.meta.url), withVueHeader(html, false));

let notesHtml = await readFile(new URL('notes.html', root), 'utf8');
notesHtml = fillContentSlot(notesHtml, '<!-- build:note-count -->', String(notes.length));
notesHtml = fillContentSlot(notesHtml, '<!-- build:note-catalog -->', renderNoteCatalog(notes));
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
const contactForm = /<form\b[^>]*class="contact-form"[^>]*data-contact-form[^>]*>[\s\S]*?<\/form>/;
const contactScript = /<script src="assets\/contact\.js[^"]*"><\/script>/;
if (!contactForm.test(aboutHtml) || !contactScript.test(aboutHtml)) {
  throw new Error('Contact form entry changed; review the Vue contact adapter.');
}
aboutHtml = aboutHtml.replace(contactForm, '<div id="contact-app">$&</div>');
// Vue owns form events; loading the old contact script too would submit twice.
aboutHtml = aboutHtml.replace(contactScript, '<script type="module" src="/src/about-main.ts"></script>');
aboutHtml = aboutHtml.replaceAll('href="assets/', 'href="/assets/').replaceAll('src="assets/', 'src="/assets/');
await writeFile(new URL('../about.html', import.meta.url), withVueHeader(aboutHtml));

// Article pages keep their static content, but share the typed theme and mobile
// navigation shell instead of loading two separate legacy scripts.
const postsDirectory = new URL('posts/', target);
for (const entry of await readdir(postsDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
  const file = new URL(entry.name, postsDirectory);
  let postHtml = await readFile(file, 'utf8');
  const scripts = /<script src="\.\.\/assets\/post\.js[^"]*" defer><\/script>\s*<script src="\.\.\/assets\/theme\.js[^"]*" defer><\/script>/;
  if (!scripts.test(postHtml)) throw new Error(`Post script entry changed: ${entry.name}`);
  postHtml = postHtml.replace(scripts, '<script type="module" src="../assets/' + shellFile + '"></script>');
  await writeFile(file, postHtml);
}
const errorPage = new URL('404.html', target);
let errorHtml = await readFile(errorPage, 'utf8');
const errorTheme = /<script src="\/assets\/theme\.js[^"]*" defer><\/script>/;
if (!errorTheme.test(errorHtml)) throw new Error('404 theme script entry changed.');
errorHtml = errorHtml.replace(errorTheme, '<script type="module" src="/assets/' + shellFile + '"></script>');
await writeFile(errorPage, errorHtml);

// Home interactions are now typed Vue-side code; remove stale generated output from earlier builds.
await rm(new URL('legacy-home.js', generated), { force: true });
console.log('Prepared Vue entries for home, notes, skills, works and about with legacy public assets.');
