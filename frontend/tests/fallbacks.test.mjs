import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectFallback } from '../scripts/site-fallbacks.mjs';
import { versionedAssetDirectory } from '../scripts/versioned-assets.mjs';

test('homepage fallback exposes all project copy and navigable details without script', async () => {
  const source = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  const work = source.match(/<section class="section page" id="work">[\s\S]*?<\/section>/)[0];
  const fallback = projectFallback(work);
  assert.equal([...fallback.matchAll(/<article\b/g)].length, 3);
  for (const id of ['p-devfleet', 'p-menu', 'p-zhiyuan']) assert.ok(fallback.includes(`href="works.html#${id}"`));
  assert.doesNotMatch(fallback, /<button|\shidden[\s>]|<noscript/);
  assert.throws(() => projectFallback('<section></section>'), /Expected three/);
});

test('changing a nested motion dependency invalidates the directory URL', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'who-am-i-assets-'));
  try {
    const src = pathToFileURL(join(temp, 'source') + '/');
    const dest = pathToFileURL(join(temp, 'output') + '/');
    await mkdir(new URL('nested/', src), { recursive: true });
    await mkdir(dest);
    await writeFile(new URL('main.js', src), 'import "./nested/helper.js"');
    await writeFile(new URL('nested/helper.js', src), 'export const value = 1');
    const first = await versionedAssetDirectory(src, dest);
    assert.equal(await versionedAssetDirectory(src, dest), first);
    await writeFile(new URL('nested/helper.js', src), 'export const value = 2');
    const second = await versionedAssetDirectory(src, dest);
    assert.notEqual(first, second);
    assert.equal(await readFile(new URL(second + '/nested/helper.js', dest), 'utf8'), 'export const value = 2');
    await assert.rejects(readFile(new URL(first + '/main.js', dest)), { code: 'ENOENT' });
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('versioned motion output does not leave an unversioned public entry', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'who-am-i-public-'));
  try {
    const source = pathToFileURL(join(temp, 'source') + '/');
    const dest = pathToFileURL(join(temp, 'output') + '/');
    await mkdir(source, { recursive: true });
    await mkdir(dest);
    await mkdir(new URL('taste/', dest));
    await writeFile(new URL('motion.js', source), 'export const ready = true');
    const name = await versionedAssetDirectory(source, dest);
    const entries = await readdir(dest);
    assert.deepEqual(entries, [name]);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
