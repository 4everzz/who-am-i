// Homepage interactions, paper-card entrances and desktop section scrolling.
(function () {
  'use strict';
  var menu = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  var main = document.getElementById('main');
  var footer = document.querySelector('.site-footer');
  var mobile = window.matchMedia('(max-width: 700px)');
  function onMediaChange(media, handler) {
    if (media.addEventListener) media.addEventListener('change', handler);
    else if (media.addListener) media.addListener(handler);
  }
  function setMenu(open, restoreFocus) {
    if (!menu || !nav) return;
    menu.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
    if (main) main.inert = open;
    if (footer) footer.inert = open;
    if (open) nav.querySelector('a').focus();
    else if (restoreFocus) menu.focus();
  }
  if (menu && nav) {
    menu.addEventListener('click', function () { setMenu(menu.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (event) { if (event.target.closest('a')) setMenu(false); });
    onMediaChange(mobile, function () { if (!mobile.matches) setMenu(false); });
    document.addEventListener('keydown', function (event) {
      if (menu.getAttribute('aria-expanded') !== 'true') return;
      if (event.key === 'Escape') { event.preventDefault(); setMenu(false, true); }
      if (event.key !== 'Tab') return;
      var items = Array.from(nav.querySelectorAll('a')).concat(Array.from(document.querySelectorAll('.header-actions button')));
      var current = items.indexOf(document.activeElement);
      if (event.shiftKey && current === 0) { event.preventDefault(); items[items.length - 1].focus(); }
      else if (!event.shiftKey && current === items.length - 1) { event.preventDefault(); items[0].focus(); }
    });
  }
  var bar = document.getElementById('progressBar');
  var header = document.querySelector('.site-header');
  var links = Array.from(document.querySelectorAll('.nav a'));
  var sections = links.map(function (link) {
    var href = link.getAttribute('href');
    return href && href.charAt(0) === '#' ? document.getElementById(href.slice(1)) : null;
  }).filter(Boolean);
  var pending = false;
  function updateScroll() {
    pending = false;
    var height = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (height > 0 ? window.scrollY / height : 0) + ')';
    if (header) header.classList.toggle('is-stuck', window.scrollY > 8);
    var current = '';
    var marker = (header ? header.offsetHeight : 80) + window.innerHeight * .25;
    sections.forEach(function (section) { if (section.getBoundingClientRect().top <= marker) current = section.id; });
    links.forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (href.charAt(0) !== '#') return;
      var active = href === '#' + current;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function queueScroll() { if (!pending) { pending = true; requestAnimationFrame(updateScroll); } }
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll);
  updateScroll();
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width: 901px) and (pointer: fine)');
  // Vue mounts the 03/04/05 sections inside their app containers. Include
  // those nested page elements so desktop wheel/keyboard paging visits every
  // section in order instead of jumping from Notes straight to About.
  var pages = Array.from(document.querySelectorAll(
    '.pages > .page:not(#work), #work > .work-screen, ' +
    '#home-stack-app > .page, #home-principles-app > .page, #home-about-app > .page'
  ));
  var scrollFrame = 0;
  function cancelPageScroll() { cancelAnimationFrame(scrollFrame); scrollFrame = 0; }
  function moveTo(y) {
    cancelPageScroll();
    var start = window.scrollY;
    var target = Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight));
    if (reducedMotion.matches) { window.scrollTo(0, target); return; }
    var began = performance.now();
    function frame(now) {
      var t = Math.min(1, (now - began) / 460);
      var eased = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      window.scrollTo(0, start + (target - start) * eased);
      scrollFrame = t < 1 ? requestAnimationFrame(frame) : 0;
    }
    scrollFrame = requestAnimationFrame(frame);
  }
  // Use screen boundaries, not the few overflow pixels at the bottom of a section.
  // Divide oversized screens evenly in short/zoomed windows, keeping all content reachable.
  function pageStops() {
    var offset = header ? header.offsetHeight : 0;
    var view = innerHeight - offset;
    var max = document.documentElement.scrollHeight - innerHeight;
    var stops = [0];
    pages.forEach(function (page) {
      var top = Math.max(0, page.getBoundingClientRect().top + scrollY - offset);
      var padding = parseFloat(getComputedStyle(page).paddingBottom) || 0;
      var contentHeight = page.offsetHeight - padding;
      stops.push(top);
      if (contentHeight > view + 2) {
        var steps = Math.ceil(page.offsetHeight / view);
        for (var i = 1; i < steps; i++) stops.push(top + page.offsetHeight * i / steps);
      }
    });
    stops.push(max);
    return stops.map(function (y) { return Math.max(0, Math.min(y, max)); })
      .sort(function (a, b) { return a - b; })
      .filter(function (y, i, all) { return !i || y - all[i - 1] > 3; });
  }
  function stepPage(direction) {
    var stops = pageStops();
    if (direction < 0) stops.reverse();
    var target = stops.find(function (y) { return (y - scrollY) * direction > 3; });
    if (target !== undefined) moveTo(target);
  }
  function scrollBlocked() { return document.body.classList.contains('modal-open') || document.body.classList.contains('nav-open'); }
  function nestedScroller(target) {
    for (var el = target; el && el !== document.body; el = el.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1) return true;
    }
    return false;
  }
  var lastWheel = 0, wheelTotal = 0, wheelDirection = 0, gestureUsed = false;
  window.addEventListener('wheel', function (event) {
    if (!desktop.matches || reducedMotion.matches || scrollBlocked() || event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || nestedScroller(event.target)) return;
    if (!event.deltaY) return;
    var now = performance.now(), direction = Math.sign(event.deltaY);
    if (now - lastWheel > 160 || direction !== wheelDirection) { wheelTotal = 0; gestureUsed = false; }
    lastWheel = now;
    wheelDirection = direction;
    event.preventDefault();
    if (scrollFrame || gestureUsed) return;
    wheelTotal += Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    if (wheelTotal >= 12) { gestureUsed = true; stepPage(direction); }
  }, { passive: false });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Tab' || event.key === 'Escape') cancelPageScroll();
    if (!desktop.matches || reducedMotion.matches || scrollBlocked() || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.target.closest('a, button, input, textarea, select, summary, [contenteditable], [role="button"]')) return;
    var direction = ['PageDown', 'ArrowDown', ' '].includes(event.key) ? 1 : ['PageUp', 'ArrowUp'].includes(event.key) ? -1 : 0;
    if (event.key === ' ' && event.shiftKey) direction = -1;
    if (!direction && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    if (event.repeat || scrollFrame) return;
    if (direction) stepPage(direction);
    else moveTo(event.key === 'Home' ? 0 : document.documentElement.scrollHeight);
  });
  function scrollToHash(hash, push) {
    if (!hash) return false;
    var target = document.getElementById(hash.slice(1));
    if (!target) return false;
    if (push) history.pushState(null, '', hash);
    cancelPageScroll();
    moveTo(target.getBoundingClientRect().top + scrollY - (header ? header.offsetHeight : 0));
    return true;
  }

  document.querySelectorAll('.brand, .nav a, .hero-actions a').forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (!link.hash || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (scrollToHash(link.hash, true)) event.preventDefault();
    });
  });
  window.addEventListener('popstate', function () {
    openFromHash();
  });
  window.addEventListener('pointerdown', cancelPageScroll, { passive: true });
  window.addEventListener('touchstart', cancelPageScroll, { passive: true });
  window.addEventListener('resize', cancelPageScroll);
  onMediaChange(reducedMotion, cancelPageScroll);

  var revealItems = Array.from(document.querySelectorAll('.terminal, .metric, .section-head, .project-card, .note-item, .stack-card, .principles > li, .contact-inner'));
  function reveal(el) { el.classList.remove('reveal-pending'); el.classList.add('is-in'); }
  var revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { reveal(entry.target); revealObserver.unobserve(entry.target); }
    });
  }, { threshold: .08, rootMargin: '0px 0px -24px 0px' }) : null;
  revealItems.forEach(function (el) {
    el.setAttribute('data-reveal', '');
    var box = el.getBoundingClientRect();
    var center = (box.left + box.width / 2) / innerWidth;
    el.style.setProperty('--fx', box.width > innerWidth * .62 ? '0px' : center < .44 ? '-48px' : center > .56 ? '48px' : '0px');
    if (!reducedMotion.matches && revealObserver) { el.classList.add('reveal-pending'); revealObserver.observe(el); }
    else reveal(el);
  });
  document.addEventListener('focusin', function (event) {
    var el = event.target.closest('[data-reveal]');
    if (el) reveal(el);
  });
  onMediaChange(reducedMotion, function () {
    if (reducedMotion.matches) { revealItems.forEach(reveal); if (revealObserver) revealObserver.disconnect(); }
  });
  var openers = new WeakMap();
  function openDialog(dialog, opener) {
    if (!dialog || !dialog.classList.contains('project-dialog') || dialog.open) return;
    cancelPageScroll();
    openers.set(dialog, opener || document.activeElement);
    var projectCarousel = document.querySelector('[data-project-carousel]');
    if (projectCarousel && projectCarousel.__pause) projectCarousel.__pause('dialog');
    dialog.showModal();
    document.body.classList.add('modal-open');
  }
  document.querySelectorAll('[data-open]').forEach(function (button) {
    button.addEventListener('click', function () { openDialog(document.getElementById(button.dataset.open), button); });
  });
  document.querySelectorAll('dialog.project-dialog').forEach(function (dialog) {
    dialog.querySelectorAll('[data-close]').forEach(function (button) { button.addEventListener('click', function () { dialog.close(); }); });
    var pointerOutside = false;
    function outside(event) {
      var box = dialog.getBoundingClientRect();
      return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
    }
    dialog.addEventListener('pointerdown', function (event) { pointerOutside = event.target === dialog && outside(event); });
    dialog.addEventListener('click', function (event) { if (event.target === dialog && pointerOutside && outside(event)) dialog.close(); });
    dialog.addEventListener('close', function () {
      document.body.classList.toggle('modal-open', !!document.querySelector('dialog[open]'));
      if (location.hash === '#' + dialog.id) history.replaceState(null, '', location.pathname + location.search);
      var opener = openers.get(dialog);
      var projectCarousel = document.querySelector('[data-project-carousel]');
      if (projectCarousel && projectCarousel.__resume) projectCarousel.__resume('dialog');
      if (opener && opener.isConnected && opener !== document.body) opener.focus({ preventScroll: true });
    });
  });
  function openFromHash() {
    var target = document.getElementById(location.hash.slice(1));
    if (target && target.classList.contains('project-dialog')) openDialog(target);
    else if (location.hash) scrollToHash(location.hash, false);
    else moveTo(0);
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();
  var list = document.getElementById('notesList');
  var buttons = document.querySelectorAll('.page-dot');
  if (list && buttons.length) {
    var notes = Array.from(list.querySelectorAll('.note-item'));
    var status = document.createElement('span');
    status.className = 'sr-only';
    status.setAttribute('role', 'status');
    list.after(status);
    function sizeNotesList() {
      var clone = list.cloneNode(true);
      clone.removeAttribute('id');
      clone.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;min-height:0;width:' + list.clientWidth + 'px';
      list.parentNode.appendChild(clone);
      var heights = [];
      clone.querySelectorAll('.note-item').forEach(function (note, index) {
        note.classList.remove('is-off');
        var page = Math.floor(index / 5);
        heights[page] = (heights[page] || 0) + note.offsetHeight;
      });
      clone.remove();
      list.style.minHeight = (Math.max.apply(null, heights) + 6) + 'px';
    }
    function showPage(page, announce) {
      notes.forEach(function (note, index) {
        var visible = Math.floor(index / 5) === page - 1;
        note.classList.toggle('is-off', !visible);
        if (visible && announce && !reducedMotion.matches) {
          note.classList.add('reveal-pending');
          requestAnimationFrame(function () { requestAnimationFrame(function () { reveal(note); }); });
        }
      });
      buttons.forEach(function (button) {
        var active = Number(button.dataset.page) === page;
        button.classList.toggle('is-active', active);
        if (active) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
      list.dataset.active = page;
      if (announce) status.textContent = '技术笔记，第 ' + page + ' 页，共 ' + buttons.length + ' 页';
      queueScroll();
    }
    buttons.forEach(function (button) { button.addEventListener('click', function () { showPage(Number(button.dataset.page), true); }); });
    showPage(1, false);
    sizeNotesList();
    window.addEventListener('resize', sizeNotesList);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeNotesList);
  }
  var projectCarousel = document.querySelector('[data-project-carousel]');
  if (projectCarousel) {
    var projectSlides = Array.from(projectCarousel.querySelectorAll('[data-project-slide]'));
    var projectTabs = Array.from(projectCarousel.querySelectorAll('[data-project-index]'));
    var projectCounter = projectCarousel.querySelector('[data-project-counter]');
    var projectLive = projectCarousel.querySelector('[data-project-live]');
    var projectStage = projectCarousel.querySelector('.project-stage');
    var compass = projectCarousel.querySelector('.project-compass');
    var compassNumber = projectCarousel.querySelector('[data-compass-number]');
    var compassName = projectCarousel.querySelector('[data-compass-name]');
    var projectReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var projectIndex = 0;
    var projectRotation = 0;
    var projectTimer = 0;
    var projectAuto = !projectReduced.matches;
    var projectTouchX = null;
    var projectDelay = 3000;
    var projectPauseReasons = {};
    var projectTouchResumeTimer = 0;

    function projectIsPaused() {
      return Object.keys(projectPauseReasons).some(function (key) { return projectPauseReasons[key]; });
    }
    function projectPause(reason) {
      projectPauseReasons[reason] = true;
      projectSyncTimer();
    }
    function projectResume(reason) {
      delete projectPauseReasons[reason];
      projectSyncTimer();
    }
    function projectSyncTimer() {
      window.clearTimeout(projectTimer);
      projectTimer = 0;
      if (projectAuto && !projectIsPaused() && !projectReduced.matches && !document.hidden) {
        projectTimer = window.setTimeout(function () {
          projectShow(projectIndex + 1, false);
        }, projectDelay);
      }
    }
    function projectSetAuto(enabled) {
      projectAuto = enabled && !projectReduced.matches;
      projectSyncTimer();
    }
    function projectShow(nextIndex, announce, moveFocus) {
      var targetIndex = (nextIndex + projectSlides.length) % projectSlides.length;
      var step = targetIndex - projectIndex;
      if (step > projectSlides.length / 2) step -= projectSlides.length;
      if (step < -projectSlides.length / 2) step += projectSlides.length;
      projectRotation -= step * (360 / projectSlides.length);
      projectIndex = targetIndex;
      projectSlides.forEach(function (slide, index) {
        var active = index === projectIndex;
        slide.hidden = !active;
        slide.classList.toggle('is-active', active);
      });
      projectTabs.forEach(function (tab) {
        var active = Number(tab.dataset.projectIndex) === projectIndex;
        tab.classList.toggle('is-active', active);
        if (tab.classList.contains('project-tab')) {
          if (active) tab.setAttribute('aria-current', 'true');
          else tab.removeAttribute('aria-current');
        } else if (tab.classList.contains('compass-notch')) {
          tab.setAttribute('aria-pressed', String(active));
        } else tab.setAttribute('aria-pressed', String(active));
      });
      if (projectCounter) projectCounter.textContent = String(projectIndex + 1).padStart(2, '0') + ' / ' + String(projectSlides.length).padStart(2, '0');
      if (compass) {
        compass.style.setProperty('--compass-angle', projectRotation + 'deg');
        compass.style.setProperty('--compass-return', -projectRotation + 'deg');
      }
      if (compassNumber) compassNumber.textContent = String(projectIndex + 1).padStart(2, '0');
      if (compassName) {
        var compassTitle = projectSlides[projectIndex].querySelector('h3');
        compassName.textContent = compassTitle ? compassTitle.textContent : '';
      }
      if (projectLive && announce) {
        var title = projectSlides[projectIndex].querySelector('h3');
        projectLive.textContent = '当前项目：' + (title ? title.textContent : String(projectIndex + 1));
      }
      if (moveFocus) {
        var selector = moveFocus.classList.contains('project-dot') ? '.project-dot' : '.compass-notch';
        var target = projectCarousel.querySelector(selector + '[data-project-index="' + projectIndex + '"]');
        if (target) target.focus({ preventScroll: true });
      }
      projectSyncTimer();
    }
    projectTabs.forEach(function (tab) {
      tab.addEventListener('click', function () { projectShow(Number(tab.dataset.projectIndex), true); });
    });
    projectCarousel.addEventListener('pointerenter', function (event) { if (event.pointerType !== 'touch') projectPause('pointer'); });
    projectCarousel.addEventListener('pointerleave', function (event) { if (event.pointerType !== 'touch') projectResume('pointer'); });
    projectCarousel.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'touch') return;
      window.clearTimeout(projectTouchResumeTimer);
      projectPause('touch');
    }, { passive: true });
    function projectFinishTouch(event) {
      if (event.pointerType !== 'touch') return;
      window.clearTimeout(projectTouchResumeTimer);
      projectTouchResumeTimer = window.setTimeout(function () { projectResume('touch'); }, 8000);
    }
    projectCarousel.addEventListener('pointerup', projectFinishTouch, { passive: true });
    projectCarousel.addEventListener('pointercancel', projectFinishTouch, { passive: true });
    projectCarousel.addEventListener('focusin', function () { projectPause('focus'); });
    projectCarousel.addEventListener('focusout', function (event) {
      if (!projectCarousel.contains(event.relatedTarget)) projectResume('focus');
    });
    projectCarousel.addEventListener('keydown', function (event) {
      var control = event.target.closest('[data-project-index]');
      if (!control) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); projectShow(projectIndex - 1, true, control); }
      if (event.key === 'ArrowRight') { event.preventDefault(); projectShow(projectIndex + 1, true, control); }
    });
    if (projectStage) {
      projectStage.addEventListener('pointerdown', function (event) {
        if (event.pointerType === 'touch') projectTouchX = event.clientX;
      }, { passive: true });
      projectStage.addEventListener('pointerup', function (event) {
        if (projectTouchX === null || event.pointerType !== 'touch') return;
        var distance = event.clientX - projectTouchX;
        projectTouchX = null;
        if (Math.abs(distance) > 44) projectShow(projectIndex + (distance < 0 ? 1 : -1), true, false);
      }, { passive: true });
      projectStage.addEventListener('pointercancel', function () { projectTouchX = null; }, { passive: true });
    }
    document.addEventListener('visibilitychange', projectSyncTimer);
    onMediaChange(projectReduced, function () {
      if (projectReduced.matches) projectSetAuto(false);
      else projectSetAuto(true);
    });
    projectCarousel.__pause = projectPause;
    projectCarousel.__resume = projectResume;
    if (document.querySelector('dialog.project-dialog[open]')) projectPause('dialog');
    projectSetAuto(projectAuto);
    projectShow(0, false, false);
  }
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
  var theme = document.querySelector('.theme-toggle');
  if (theme) theme.setAttribute('aria-pressed', String(document.documentElement.dataset.theme === 'dark'));
})();
