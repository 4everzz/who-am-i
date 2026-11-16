// Invoke these checks with a Playwright Browser connected to the local production preview.
// All form requests are mocked; these checks never contact the live API or send email.
import assert from 'node:assert/strict';

export async function checkDesktop(browser, base = 'http://127.0.0.1:4173') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  const results = [];
  page.on('pageerror', error => errors.push(error.message));
  const selected = () => page.locator('.project-dot[aria-pressed="true"]').getAttribute('data-project-index');
  const y = () => page.evaluate(() => scrollY);
  const positionAt = id => page.evaluate(id => {
    document.activeElement?.blur();
    // PageUp/PageDown are intentionally ignored while a button or link owns
    // focus. Return focus to a neutral element before testing page paging;
    // this also covers the dialog's focus restoration behavior.
    document.body.setAttribute('tabindex', '-1');
    document.body.focus({ preventScroll: true });
    window.scrollTo(0, document.getElementById(id).getBoundingClientRect().top + scrollY - document.querySelector('.site-header').offsetHeight);
  }, id);
  try {
    await page.goto(base + '/');
    await page.locator('[data-vue-project-carousel]').waitFor();
    await page.locator('.project-dot[data-project-index="0"]').click();
    await page.keyboard.press('ArrowRight');
    assert.equal(await selected(), '1');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.projectIndex), '1');
    await page.mouse.move(2, 2);
    await page.waitForTimeout(4800);
    assert.equal(await selected(), '1', 'Pointer movement must not release keyboard focus pause');
    await page.keyboard.press('ArrowRight');
    assert.equal(await selected(), '2');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.projectIndex), '2');
    results.push('keyboard selection, focus movement and mixed mouse/keyboard pause');

    await page.waitForTimeout(1500);
    await page.locator('.nav a[href="index.html"]').focus();
    await page.waitForTimeout(2700);
    assert.equal(await selected(), '2');
    await page.waitForTimeout(600);
    assert.equal(await selected(), '0');
    results.push('autoplay resumes after a full three-second dwell');

    await page.locator('.project-stage').hover();
    const hovered = await selected();
    await page.waitForTimeout(4700);
    assert.equal(await selected(), hovered);
    await page.locator('.project-slide:not([hidden]) [data-open]').click();
    await page.locator('dialog[open]').waitFor();
    const dialogIndex = await selected();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(4700);
    assert.equal(await selected(), dialogIndex);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.ok(await page.evaluate(() => document.activeElement.hasAttribute('data-open')));
    results.push('reading hover and open dialog pause; Escape returns focus');

    // Let the dialog close handler finish restoring focus before testing the
    // page-level keyboard paging handler.
    await page.waitForTimeout(50);
    await positionAt('notes');
    for (const id of ['stack', 'principles', 'about']) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(650);
      const distance = await page.evaluate(id => Math.abs(document.getElementById(id).getBoundingClientRect().top - document.querySelector('.site-header').offsetHeight), id);
      assert.ok(distance < 3, `Wheel skipped ${id}: distance ${distance}`);
    }
    for (const id of ['principles', 'stack', 'notes']) {
      await page.keyboard.press('PageUp');
      await page.waitForTimeout(600);
      const distance = await page.evaluate(id => Math.abs(document.getElementById(id).getBoundingClientRect().top - document.querySelector('.site-header').offsetHeight), id);
      assert.ok(distance < 3, `PageUp skipped ${id}: distance ${distance}`);
    }
    assert.equal(await page.locator('.nav a[href="index.html"]').getAttribute('aria-current'), 'page');
    results.push('02 → 03 → 04 → 05 wheel stops, reverse keyboard stops, homepage navigation');

    const before = await y();
    await page.reload();
    await page.locator('[data-vue-project-carousel]').waitFor();
    await page.waitForTimeout(900);
    assert.ok(Math.abs(await y() - before) < 5, `Reload lost scroll position: ${before} -> ${await y()}`);
    await page.locator('#notes .note-item').first().click();
    await page.waitForURL('**/posts/*.html');
    await page.goBack();
    await page.locator('[data-vue-project-carousel]').waitFor();
    await page.waitForTimeout(900);
    assert.ok(Math.abs(await y() - before) < 5, `Back lost scroll position: ${before} -> ${await y()}`);
    results.push('reload and browser back preserve scroll position without a hash');
    assert.deepEqual(errors, []);
    return results;
  } finally { await context.close(); }
}

export async function checkFallbacks(browser, base = 'http://127.0.0.1:4173') {
  const results = [];
  for (const mode of ['no-js', 'blocked-scripts']) {
    const context = await browser.newContext({ javaScriptEnabled: mode !== 'no-js', viewport: { width: 390, height: 844 } });
    if (mode === 'blocked-scripts') await context.route('**/*.js*', route => route.abort());
    const page = await context.newPage();
    try {
      await page.goto(base + '/');
      assert.equal(await page.locator('#work article:visible').count(), 3);
      assert.equal(await page.locator('#work button').count(), 0);
      for (const id of ['p-devfleet', 'p-menu', 'p-zhiyuan']) {
        assert.ok(await page.locator(`#work a[href="works.html#${id}"]`).isVisible());
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.goto(base + '/about.html');
      assert.equal(await page.locator('[data-contact-form]').isVisible(), false);
      assert.equal(await page.locator('[data-contact-guard]').getAttribute('disabled'), '');
      assert.ok(await page.locator('[name="nickname"]').isDisabled());
      assert.ok(await page.locator('[data-contact-unavailable]').isVisible());
      assert.equal(await page.evaluate(() => [...new FormData(document.querySelector('[data-contact-form]'))].length), 0);
      assert.equal(await page.locator('[data-contact-form]').getAttribute('method'), 'post');
      results.push(`${mode}: all projects readable; private fields disabled; email fallback visible`);
    } finally { await context.close(); }
  }
  return results;
}

export async function checkPages(browser, base = 'http://127.0.0.1:4173') {
  const results = [];
  for (const [width, height] of [[1440, 900], [1366, 768], [768, 1024], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      for (const path of ['/', '/notes.html', '/works.html', '/skills-principles.html', '/about.html']) {
        await page.goto(base + path);
        await page.locator('[data-v-app]').first().waitFor();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}: overflow at ${path}`);
        const theme = page.locator('.theme-toggle');
        await theme.click();
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', path + ': theme button must respond');
        assert.equal(await theme.getAttribute('aria-pressed'), 'true');
        await theme.click();
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
        if (width === 390) await checkMobileMenu(page);
      }
      let submissions = 0;
      await page.route('**/api/v1/contact-messages', async route => {
        submissions++;
        const data = route.request().postDataJSON();
        assert.equal(route.request().method(), 'POST');
        await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ code: 0, data: { id: data.request_id } }) });
      });
      assert.equal(await page.locator('[data-contact-unavailable]').isVisible(), false);
      await page.locator('label[for="category-suggestion"]').click();
      await page.locator('[name="nickname"]').fill('Local test');
      await page.locator('[name="contact"]').fill('test@example.com');
      await page.locator('[name="content"]').fill('Mocked submission; no email or database write.');
      await page.locator('button[type="submit"]').click();
      await page.locator('[data-contact-status][data-state="success"]').waitFor();
      assert.equal(submissions, 1);
      assert.equal(new URL(page.url()).search, '');
      assert.deepEqual(errors, []);
      results.push(`${width}×${height}: five pages without overflow/errors, mocked contact submit succeeds`);
    } finally { await context.close(); }
  }
  const articleContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const articlePage = await articleContext.newPage();
  try {
    await articlePage.goto(base + '/posts/mcp-cold-start.html');
    await articlePage.locator('.nav a[aria-current="page"]').waitFor({ state: 'attached' });
    assert.equal(await articlePage.locator('.nav a[href="../notes.html"]').getAttribute('aria-current'), 'page');
    await checkMobileMenu(articlePage);
    await articlePage.locator('.theme-toggle').click();
    assert.equal(await articlePage.locator('html').getAttribute('data-theme'), 'dark');
    results.push('article pages share typed mobile navigation and theme switching');
  } finally { await articleContext.close(); }
  return results;
}

async function checkMobileMenu(page) {
  const menu = page.locator('.menu-btn');
  await menu.click();
  assert.equal(await menu.getAttribute('aria-expanded'), 'true');
  assert.equal(await page.locator('main').evaluate(element => element.inert), true);
  assert.equal(await page.locator('.brand').evaluate(element => element.inert), true);
  assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('.nav a')), true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await menu.evaluate(element => element === document.activeElement), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('.nav a')), true);
  await page.keyboard.press('Escape');
  assert.equal(await menu.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('main').evaluate(element => element.inert), false);
  assert.equal(await menu.evaluate(element => element === document.activeElement), true);
}

export async function checkArticleShell(browser, base = 'http://127.0.0.1:4173') {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(base + '/assets/') && response.status() >= 400) {
      errors.push(response.status() + ' ' + response.url());
    }
  });
  try {
    await page.goto(base + '/notes.html');
    await page.locator('#notes-app[data-v-app]').waitFor();
    const articles = await page.locator('.note-card').evaluateAll(links => links.map(link => link.getAttribute('href')));
    assert.ok(articles.length > 0);
    assert.equal(new Set(articles).size, articles.length);
    let shellPath;
    for (const article of articles) {
      await page.goto(base + '/' + article);
      await page.locator('.nav a[aria-current="page"]').waitFor({ state: 'attached' });
      const shell = await page.locator('script[src*="site-shell-"]').getAttribute('src');
      assert.match(shell, /\.\.\/assets\/site-shell-[a-f0-9]{12}\.js$/);
      shellPath ??= new URL(shell, page.url()).pathname;
      assert.equal(new URL(shell, page.url()).pathname, shellPath);
      assert.equal(await page.locator('script[src*="/post.js"], script[src*="/theme.js"]').count(), 0);
      assert.ok(await page.locator('article h1').isVisible());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), article);
    }
    await page.locator('.theme-toggle').click();
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await checkMobileMenu(page);

    // Recreate an open menu restored by the back/forward cache.
    await page.locator('.menu-btn').click();
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    assert.equal(await page.locator('.menu-btn').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('main').evaluate(element => element.inert), false);
    await page.locator('.menu-btn').click();
    await page.locator('.menu-btn').focus();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => !document.querySelector('main').inert);
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('.nav a[aria-current="page"]')), true);

    // Exercise the absolute resource URL when 404 HTML is served for a nested path.
    const errorHtml = await (await context.request.get(base + '/404.html')).text();
    await page.route('**/posts/not-exist.html', route => route.fulfill({
      status: 404, contentType: 'text/html', body: errorHtml,
    }));
    const response = await page.goto(base + '/posts/not-exist.html');
    assert.equal(response.status(), 404);
    assert.equal(await page.locator('script[src*="site-shell-"]').getAttribute('src'), shellPath);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.locator('.theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    assert.deepEqual(errors, []);
    return [articles.length + ' article shells, current navigation, persistent themes, resize/history menu cleanup and nested 404 resources'];
  } finally { await context.close(); }
}

export async function checkNoteCatalog(browser, base = 'http://127.0.0.1:4173') {
  const readCards = page => page.locator('.note-card').evaluateAll(cards => cards.map(card => ({
    href: card.getAttribute('href'), title: card.querySelector('h3').textContent,
    type: card.querySelector('.note-type').textContent, description: card.querySelector('p').textContent,
  })));
  let catalog;
  for (const mode of ['no-js', 'blocked-scripts']) {
    const context = await browser.newContext({ javaScriptEnabled: mode !== 'no-js', viewport: { width: 390, height: 844 } });
    if (mode === 'blocked-scripts') await context.route('**/*.js*', route => route.abort());
    try {
      const page = await context.newPage();
      await page.goto(base + '/notes.html');
      const cards = await readCards(page);
      assert.ok(cards.length > 0);
      catalog ??= cards;
      assert.deepEqual(cards, catalog);
      assert.equal(await page.locator('.block-index').textContent(), cards.length + ' essays / continuously updated');
      assert.equal(await page.locator('.note-card:visible').count(), cards.length);
      await page.goto(base + '/');
      assert.equal(await page.locator('#notes .note-item:visible').count(), cards.length);
      assert.equal(await page.locator('#home-notes-app button').count(), 0);
      const titles = await page.locator('#notes .note-title').allTextContents();
      assert.deepEqual(titles, cards.map(card => card.title));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    } finally { await context.close(); }
  }
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + '/notes.html');
      await page.locator('#notes-app[data-v-app]').waitFor();
      assert.deepEqual(await readCards(page), catalog);
      await page.goto(base + '/');
      await page.locator('#home-notes-app[data-v-app]').waitFor();
      const count = Math.ceil(catalog.length / 5);
      assert.equal(await page.locator('#notes .page-dot').count(), count);
      for (let number = 1; number <= count; number++) {
        const button = page.locator('#notes .page-dot').nth(number - 1);
        await button.click();
        await page.waitForFunction(number => document.getElementById('notesList').dataset.active === String(number), number);
        assert.equal(await button.getAttribute('aria-current'), 'page');
        const rows = await page.locator('#notes .note-item').evaluateAll(links => links.map(link => ({
          href: link.getAttribute('href'), title: link.querySelector('.note-title').textContent,
        })));
        assert.deepEqual(rows, catalog.slice((number - 1) * 5, number * 5).map(({ href, title }) => ({ href, title })));
      }
      const xml = await (await context.request.get(base + '/sitemap.xml')).text();
      const articleUrls = [...xml.matchAll(/<loc>(https:\/\/zmeety\.cn\/posts\/[^<]+)<\/loc>/g)].map(match => match[1]);
      assert.deepEqual(articleUrls, catalog.map(note => 'https://zmeety.cn/' + note.href));
      assert.doesNotMatch(xml, /<!-- build:/);
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  return ['one catalog across Vue, no-js/blocked-script fallbacks, all note pages and the published sitemap'];
}

export async function checkTouch(browser, base = 'http://127.0.0.1:4173') {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await page.goto(base + '/');
    await page.locator('[data-vue-project-carousel]').waitFor();
    await page.locator('.project-dot[data-project-index="1"]').tap();
    const selected = () => page.locator('.project-dot[aria-pressed="true"]').getAttribute('data-project-index');
    assert.equal(await selected(), '1');
    await page.waitForTimeout(9000);
    assert.equal(await selected(), '1', 'Touch pause and full dwell must finish before advancing');
    await page.waitForTimeout(2400);
    assert.equal(await selected(), '2', 'A lingering focus from a tap must not freeze autoplay');
    assert.equal(await page.evaluate(() => matchMedia('(min-width: 901px) and (pointer: fine)').matches), false);
    return ['touch pauses temporarily then resumes autoplay; mobile remains outside desktop paging'];
  } finally { await context.close(); }
}
