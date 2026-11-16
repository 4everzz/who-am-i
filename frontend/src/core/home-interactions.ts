type Cleanup = () => void;

function onMediaChange(media: MediaQueryList, handler: (event: MediaQueryListEvent) => void): Cleanup {
  if (media.addEventListener) {
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }
  media.addListener(handler);
  return () => media.removeListener(handler);
}

export function setupHomeInteractions(): Cleanup {
  if (!document.body.classList.contains('home-page')) return () => {};

  const bar = document.getElementById('progressBar');
  const header = document.querySelector<HTMLElement>('.site-header');
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.nav a')];
  const sections = links
    .map(link => {
      const href = link.getAttribute('href');
      return href?.startsWith('#') ? document.getElementById(href.slice(1)) : null;
    })
    .filter((section): section is HTMLElement => Boolean(section));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 901px) and (pointer: fine)');
  const pages = [...document.querySelectorAll<HTMLElement>(
    '.pages > .page:not(#work), #work > .work-screen, ' +
    '#home-stack-app > .page, #home-principles-app > .page, #home-about-app > .page',
  )];
  const cleanups: Cleanup[] = [];
  let updateFrame = 0;
  let scrollFrame = 0;

  function updateScroll() {
    updateFrame = 0;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = `scaleX(${height > 0 ? window.scrollY / height : 0})`;
    header?.classList.toggle('is-stuck', window.scrollY > 8);
    let current = '';
    const marker = (header?.offsetHeight ?? 80) + window.innerHeight * 0.25;
    sections.forEach(section => {
      if (section.getBoundingClientRect().top <= marker) current = section.id;
    });
    links.forEach(link => {
      const href = link.getAttribute('href') ?? '';
      if (!href.startsWith('#')) return;
      const active = href === `#${current}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function queueScroll() {
    if (!updateFrame) updateFrame = requestAnimationFrame(updateScroll);
  }

  function cancelPageScroll() {
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
  }

  function moveTo(y: number) {
    cancelPageScroll();
    const start = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const target = Math.max(0, Math.min(y, max));
    if (reducedMotion.matches) {
      window.scrollTo(0, target);
      return;
    }
    const began = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - began) / 460);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      window.scrollTo(0, start + (target - start) * eased);
      scrollFrame = t < 1 ? requestAnimationFrame(frame) : 0;
    };
    scrollFrame = requestAnimationFrame(frame);
  }

  function pageStops() {
    const offset = header?.offsetHeight ?? 0;
    const view = window.innerHeight - offset;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const stops = [0];
    pages.forEach(page => {
      const top = Math.max(0, page.getBoundingClientRect().top + window.scrollY - offset);
      const padding = Number.parseFloat(getComputedStyle(page).paddingBottom) || 0;
      const contentHeight = page.offsetHeight - padding;
      stops.push(top);
      if (contentHeight > view + 2) {
        const steps = Math.ceil(page.offsetHeight / view);
        for (let index = 1; index < steps; index += 1) {
          stops.push(top + page.offsetHeight * index / steps);
        }
      }
    });
    stops.push(max);
    return stops
      .map(stop => Math.max(0, Math.min(stop, max)))
      .sort((a, b) => a - b)
      .filter((stop, index, all) => !index || stop - all[index - 1]! > 3);
  }

  function stepPage(direction: 1 | -1) {
    const stops = pageStops();
    if (direction < 0) stops.reverse();
    const target = stops.find(stop => (stop - window.scrollY) * direction > 3);
    if (target !== undefined) moveTo(target);
  }

  function scrollBlocked() {
    return document.body.classList.contains('modal-open') || document.body.classList.contains('nav-open');
  }

  function nestedScroller(target: EventTarget | null) {
    let element = target instanceof Element ? target : null;
    while (element && element !== document.body) {
      if (/(auto|scroll)/.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight + 1) return true;
      element = element.parentElement;
    }
    return false;
  }

  function scrollToHash(hash: string, push: boolean) {
    if (!hash) return false;
    const target = document.getElementById(hash.slice(1));
    if (!target) return false;
    if (push) history.pushState(null, '', hash);
    cancelPageScroll();
    moveTo(target.getBoundingClientRect().top + window.scrollY - (header?.offsetHeight ?? 0));
    return true;
  }

  function openFromHash() {
    if (/^#p-(devfleet|menu|zhiyuan)$/.test(location.hash)) return;
    if (location.hash) scrollToHash(location.hash, false);
  }

  let lastWheel = 0;
  let wheelTotal = 0;
  let wheelDirection = 0;
  let gestureUsed = false;
  const onWheel = (event: WheelEvent) => {
    if (!desktop.matches || reducedMotion.matches || scrollBlocked() || event.ctrlKey || event.metaKey || event.shiftKey
      || Math.abs(event.deltaX) > Math.abs(event.deltaY) || nestedScroller(event.target) || !event.deltaY) return;
    const now = performance.now();
    const direction = Math.sign(event.deltaY);
    if (now - lastWheel > 160 || direction !== wheelDirection) {
      wheelTotal = 0;
      gestureUsed = false;
    }
    lastWheel = now;
    wheelDirection = direction;
    event.preventDefault();
    if (scrollFrame || gestureUsed) return;
    wheelTotal += Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
    if (wheelTotal >= 12) {
      gestureUsed = true;
      stepPage(direction < 0 ? -1 : 1);
    }
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Tab' || event.key === 'Escape') cancelPageScroll();
    if (!desktop.matches || reducedMotion.matches || scrollBlocked() || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('a, button, input, textarea, select, summary, [contenteditable], [role="button"]')) return;
    let direction: 1 | -1 | 0 = ['PageDown', 'ArrowDown', ' '].includes(event.key) ? 1 : ['PageUp', 'ArrowUp'].includes(event.key) ? -1 : 0;
    if (event.key === ' ' && event.shiftKey) direction = -1;
    if (!direction && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    if (event.repeat || scrollFrame) return;
    if (direction) stepPage(direction);
    else moveTo(event.key === 'Home' ? 0 : document.documentElement.scrollHeight);
  };

  const onHashLink = (event: MouseEvent) => {
    const link = event.currentTarget as HTMLAnchorElement;
    if (!link.hash || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (scrollToHash(link.hash, true)) event.preventDefault();
  };

  const revealItems = [...document.querySelectorAll<HTMLElement>('.terminal, .metric, .section-head, .project-card, .note-item, .stack-card, .principles > li, .contact-inner')];
  let revealObserver: IntersectionObserver | undefined;
  const reveal = (element: HTMLElement) => {
    element.classList.remove('reveal-pending');
    element.classList.add('is-in');
  };
  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.target instanceof HTMLElement) {
          reveal(entry.target);
          revealObserver?.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
  }
  revealItems.forEach(element => {
    element.setAttribute('data-reveal', '');
    const box = element.getBoundingClientRect();
    const center = (box.left + box.width / 2) / window.innerWidth;
    element.style.setProperty('--fx', box.width > window.innerWidth * 0.62 ? '0px' : center < 0.44 ? '-48px' : center > 0.56 ? '48px' : '0px');
    if (!reducedMotion.matches && revealObserver) {
      element.classList.add('reveal-pending');
      revealObserver.observe(element);
    } else reveal(element);
  });
  const onFocusIn = (event: FocusEvent) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-reveal]') : null;
    if (target) reveal(target);
  };
  const onReducedMotion = () => {
    if (reducedMotion.matches) {
      revealItems.forEach(reveal);
      revealObserver?.disconnect();
    }
    cancelPageScroll();
  };

  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll);
  window.addEventListener('resize', cancelPageScroll);
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('pointerdown', cancelPageScroll, { passive: true });
  window.addEventListener('touchstart', cancelPageScroll, { passive: true });
  window.addEventListener('popstate', openFromHash);
  window.addEventListener('hashchange', openFromHash);
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('site:project-dialog-open', cancelPageScroll);
  document.querySelectorAll<HTMLAnchorElement>('.brand, .nav a, .hero-actions a').forEach(link => link.addEventListener('click', onHashLink));
  cleanups.push(
    () => window.removeEventListener('scroll', queueScroll),
    () => window.removeEventListener('resize', queueScroll),
    () => window.removeEventListener('resize', cancelPageScroll),
    () => window.removeEventListener('wheel', onWheel),
    () => window.removeEventListener('pointerdown', cancelPageScroll),
    () => window.removeEventListener('touchstart', cancelPageScroll),
    () => window.removeEventListener('popstate', openFromHash),
    () => window.removeEventListener('hashchange', openFromHash),
    () => document.removeEventListener('keydown', onKeydown),
    () => document.removeEventListener('focusin', onFocusIn),
    () => document.removeEventListener('site:project-dialog-open', cancelPageScroll),
    () => document.querySelectorAll<HTMLAnchorElement>('.brand, .nav a, .hero-actions a').forEach(link => link.removeEventListener('click', onHashLink)),
    () => revealObserver?.disconnect(),
    onMediaChange(reducedMotion, onReducedMotion),
  );

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
  updateScroll();
  openFromHash();

  return () => {
    cancelPageScroll();
    cancelAnimationFrame(updateFrame);
    cleanups.splice(0).forEach(cleanup => cleanup());
  };
}
