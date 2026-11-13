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
  return results;
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
