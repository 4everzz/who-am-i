const themeKey = 'zmeety-theme';
type Theme = 'light' | 'dark';

function normalizeTheme(value: string | null): Theme {
  return value === 'dark' ? 'dark' : 'light';
}

function setupTheme(): () => void {
  const root = document.documentElement;
  const button = document.querySelector<HTMLButtonElement>('.theme-toggle');
  const apply = (value: Theme) => {
    root.setAttribute('data-theme', value);
    button?.setAttribute('aria-pressed', String(value === 'dark'));
  };
  const readSaved = () => {
    try { return localStorage.getItem(themeKey); } catch { return null; }
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === themeKey || event.key === null) apply(normalizeTheme(event.newValue));
  };
  apply(normalizeTheme(root.getAttribute('data-theme') ?? readSaved()));
  if (!button) return () => {};
  const onClick = () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(themeKey, next); } catch { /* Private browsing can reject storage. */ }
  };
  button.addEventListener('click', onClick);
  window.addEventListener('storage', onStorage);
  return () => {
    button.removeEventListener('click', onClick);
    window.removeEventListener('storage', onStorage);
  };
}

function setupNavigation(): () => void {
  const menuButton = document.querySelector<HTMLButtonElement>('.menu-btn');
  const nav = document.getElementById('nav');
  if (!menuButton || !nav) return () => {};
  const main = document.querySelector<HTMLElement>('main');
  const footer = document.querySelector<HTMLElement>('.site-footer');
  const wide = window.matchMedia('(min-width: 701px)');
  let menuOpen = false;
  let disposed = false;

  const setInert = (element: HTMLElement | null, value: boolean) => {
    if (element) element.inert = value;
  };
  const focusables = () => [
    ...nav.querySelectorAll<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])'),
    ...document.querySelectorAll<HTMLElement>('.header-actions button'),
  ];
  const setOpen = (open: boolean, restoreFocus = false) => {
    menuOpen = open;
    menuButton.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
    setInert(main, open);
    setInert(footer, open);
    if (open) nav.querySelector<HTMLElement>('a')?.focus();
    else if (restoreFocus && !disposed) menuButton.focus();
  };
  const onClick = () => setOpen(!menuOpen);
  const onNavClick = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest('a')) setOpen(false);
  };
  const onKeydown = (event: KeyboardEvent) => {
    if (!menuOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false, true);
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey && (current <= 0 || current === -1)) {
      event.preventDefault();
      items.at(-1)?.focus();
    } else if (!event.shiftKey && current === items.length - 1) {
      event.preventDefault();
      items[0]?.focus();
    }
  };
  const onWide = () => { if (wide.matches) setOpen(false); };
  const onPageShow = () => { if (menuOpen) setOpen(false, !wide.matches); };

  menuButton.addEventListener('click', onClick);
  nav.addEventListener('click', onNavClick);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('pageshow', onPageShow);
  if (wide.addEventListener) wide.addEventListener('change', onWide);
  else wide.addListener(onWide);
  return () => {
    disposed = true;
    setOpen(false);
    menuButton.removeEventListener('click', onClick);
    nav.removeEventListener('click', onNavClick);
    document.removeEventListener('keydown', onKeydown);
    window.removeEventListener('pageshow', onPageShow);
    if (wide.removeEventListener) wide.removeEventListener('change', onWide);
    else wide.removeListener(onWide);
  };
}

const cleanups = [setupTheme(), setupNavigation()];
if (import.meta.hot) import.meta.hot.dispose(() => cleanups.forEach(cleanup => cleanup()));
