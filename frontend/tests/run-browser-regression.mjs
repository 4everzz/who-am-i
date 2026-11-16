import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import {
  checkDesktop,
  checkFallbacks,
  checkPages,
  checkTouch,
} from './browser-regression.mjs';

const base = process.env.BROWSER_BASE_URL ?? 'http://127.0.0.1:4173';
const useExistingServer = process.env.BROWSER_USE_EXISTING_SERVER === '1';
const headed = process.env.BROWSER_HEADED === '1';
const edge = process.argv.includes('--edge') || process.env.BROWSER_CHANNEL === 'msedge';
let preview;
let previewExit;

function startPreview() {
  const command = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run preview'] : ['run', 'preview'];
  preview = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  preview.stdout.on('data', chunk => process.stdout.write(`[preview] ${chunk}`));
  preview.stderr.on('data', chunk => process.stderr.write(`[preview] ${chunk}`));
  preview.on('error', error => console.error(`[preview] ${error.message}`));
  preview.on('exit', (code, signal) => { previewExit = { code, signal }; });
}

async function waitForPreview() {
  const deadline = Date.now() + 15_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/`);
      if (response.ok) {
        if (previewExit || preview?.exitCode != null) {
          throw new Error(`本地预览进程提前退出（code=${previewExit?.code ?? preview?.exitCode ?? 'null'}, signal=${previewExit?.signal ?? 'null'}）。`);
        }
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (previewExit) {
      throw new Error(`本地预览进程提前退出（code=${previewExit.code ?? 'null'}, signal=${previewExit.signal ?? 'null'}）。`);
    }
    await delay(250);
  }
  throw new Error(`本地预览未能在 15 秒内启动：${lastError?.message ?? '未知错误'}`);
}

async function findCachedExecutable() {
  if (!process.env.LOCALAPPDATA) return undefined;
  const root = join(process.env.LOCALAPPDATA, 'ms-playwright');
  const entries = await readdir(root).catch(() => []);
  const candidates = [];
  for (const prefix of ['chromium_headless_shell-', 'chromium-']) {
    for (const directory of entries.filter(name => name.startsWith(prefix)).sort().reverse()) {
      const executable = prefix === 'chromium_headless_shell-'
        ? join(root, directory, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe')
        : join(root, directory, 'chrome-win64', 'chrome.exe');
      if (existsSync(executable)) candidates.push(executable);
    }
  }
  return candidates[0];
}

function stopPreview() {
  if (!preview || preview.killed) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(preview.pid), '/t', '/f'], { windowsHide: true });
  } else {
    preview.kill('SIGTERM');
  }
}

async function run() {
  if (!useExistingServer) {
    startPreview();
    await waitForPreview();
  }

  let browser;
  try {
    if (edge) {
      browser = await chromium.launch({ channel: 'msedge', headless: !headed });
    } else {
      const configuredExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
      const bundledExecutable = chromium.executablePath();
      const cachedExecutable = await findCachedExecutable();
      const executablePath = configuredExecutable
        || (existsSync(bundledExecutable) ? bundledExecutable : undefined)
        || cachedExecutable;
      browser = await chromium.launch({ headless: !headed, ...(executablePath ? { executablePath } : {}) });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/executable|browserType\.launch|chromium/i.test(message)) {
      throw new Error(edge
        ? `${message}\n请确认 Microsoft Edge 已安装，或使用默认 Chromium 测试：npm run test:browser`
        : `${message}\n请先在 frontend 目录执行：npx playwright install chromium`);
    }
    throw error;
  }

  try {
    const checks = [
      ['desktop interaction', checkDesktop],
      ['fallback rendering', checkFallbacks],
      ['responsive pages and contact mock', checkPages],
      ['touch interaction', checkTouch],
    ];
    for (const [name, check] of checks) {
      const results = await check(browser, base);
      console.log(`✓ ${name}`);
      for (const result of results) console.log(`  - ${result}`);
    }
  } finally {
    await browser.close();
  }
}

try {
  await run();
  console.log(`Browser regression checks passed${edge ? ' in Microsoft Edge' : ''}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  stopPreview();
}
