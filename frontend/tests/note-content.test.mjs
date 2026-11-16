import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { notes } from '../src/data/notes.ts';
import { fillContentSlot, renderHomeNotes, renderNoteCatalog, renderNoteSitemap, validateNoteCatalog } from '../scripts/note-content.mjs';

const note = { href: 'posts/example.html', type: '工程 / 排障', title: '标题', description: '一句话摘要。' };

test('the catalog matches every published article file and all content slots exist exactly once', async () => {
  const root = new URL('../../', import.meta.url);
  const files = (await readdir(new URL('posts/', root))).filter(name => name.endsWith('.html')).map(name => 'posts/' + name);
  assert.doesNotThrow(() => validateNoteCatalog(notes, files));
  for (const [file, marker] of [['index.html', '<!-- build:home-notes -->'], ['notes.html', '<!-- build:note-catalog -->'], ['notes.html', '<!-- build:note-count -->'], ['sitemap.xml', '<!-- build:note-urls -->']]) {
    const html = await readFile(new URL(file, root), 'utf8');
    assert.doesNotThrow(() => fillContentSlot(html, marker, 'content'));
  }
});

test('catalog validation catches duplicates, unsafe paths, missing articles and forgotten index entries', () => {
  assert.throws(() => validateNoteCatalog([], []), /empty/);
  assert.throws(() => validateNoteCatalog([{ ...note, title: ' ' }], [note.href]), /non-empty/);
  assert.throws(() => validateNoteCatalog([note, note], [note.href]), /Duplicate/);
  assert.throws(() => validateNoteCatalog([note], []), /Missing article/);
  assert.throws(() => validateNoteCatalog([note], [note.href, 'posts/forgotten.html']), /missing from the note catalog/);
  for (const href of ['javascript:alert(1)', '//example.com/a.html', 'posts/../about.html', 'posts/%2e%2e/about.html']) {
    assert.throws(() => validateNoteCatalog([{ ...note, href }], [href]), /Invalid article path/);
  }
});

test('editing or adding notes updates both fallbacks and the sitemap without a second content list', () => {
  const catalog = Array.from({ length: 16 }, (_, index) => ({ ...note, href: 'posts/note-' + index + '.html', title: '标题 ' + index }));
  catalog[0] = { ...catalog[0], title: '修订后的标题', description: '新的摘要' };
  const home = renderHomeNotes(catalog);
  const page = renderNoteCatalog(catalog);
  const sitemap = renderNoteSitemap(catalog);
  assert.equal([...home.matchAll(/class="note-item"/g)].length, 16);
  assert.equal([...page.matchAll(/class="note-card"/g)].length, 16);
  assert.equal([...sitemap.matchAll(/<url>/g)].length, 16);
  for (const item of catalog) {
    for (const html of [home, page, sitemap]) assert.ok(html.includes(item.href));
    assert.ok(home.includes(item.title));
    assert.ok(page.includes(item.title));
  }
  assert.ok(page.includes('新的摘要'));
  assert.doesNotMatch(home, /<button|\shidden[\s>]|data-page=/);
});

test('fallback text is escaped and literal dollar replacement tokens are preserved', () => {
  const unusual = { ...note, title: '<img src=x onerror="alert(1)"> & \'quoted\' $&', description: '<script>alert(1)</script>' };
  for (const render of [renderHomeNotes, renderNoteCatalog]) {
    const html = render([unusual]);
    assert.doesNotMatch(html, /<img|<script/);
    assert.ok(html.includes('&lt;img'));
    assert.ok(html.includes('&amp;'));
    assert.ok(html.includes('&#39;quoted&#39;'));
    assert.equal(fillContentSlot('before<!-- slot -->after', '<!-- slot -->', html), 'before' + html + 'after');
  }
});

test('a missing or duplicated build slot fails instead of silently publishing stale content', () => {
  assert.throws(() => fillContentSlot('<main></main>', '<!-- slot -->', 'content'), /exactly one/);
  assert.throws(() => fillContentSlot('<!-- slot --><!-- slot -->', '<!-- slot -->', 'content'), /exactly one/);
});
