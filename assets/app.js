// 站点主脚本：无依赖，原生 API
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 移动端导航 ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');

  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!open));
      document.body.classList.toggle('nav-open', !open);
    });

    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menuBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('nav-open');
      }
    });
  }

  /* ---------- 滚动进度 + 顶栏描边 ---------- */
  var bar = document.getElementById('progressBar');
  var header = document.querySelector('.site-header');
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? window.scrollY / h : 0) + ')';
      if (header) header.classList.toggle('is-stuck', window.scrollY > 8);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 进入视口淡入 ---------- */
  var revealItems = document.querySelectorAll('[data-reveal]');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = Number(el.getAttribute('data-delay') || 0);
        setTimeout(function () { el.classList.add('is-in'); }, delay);
        revealObserver.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealItems.forEach(function (el) { revealObserver.observe(el); });
  }

  /* 兜底：锚点跳转或 IO 未触发时，避免内容一直透明 */
  setTimeout(function () {
    document.querySelectorAll('[data-reveal]:not(.is-in)').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight + 80 && r.bottom > -80) el.classList.add('is-in');
    });
  }, 1200);

  /* ---------- 数字滚动 ---------- */
  var counters = document.querySelectorAll('[data-count]');

  function formatNum(value, decimals) {
    var parts = value.toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  function counterText(el, value) {
    return formatNum(value, Number(el.getAttribute('data-decimals') || 0)) +
           (el.getAttribute('data-suffix') || '');
  }

  function runCounter(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var duration = 1100;
    var start = null;

    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = counterText(el, target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if (counters.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      counters.forEach(function (el) {
        el.textContent = counterText(el, parseFloat(el.getAttribute('data-count')));
      });
    } else {
      // 先归零，等进入视口再滚动；脚本在 body 末尾执行，不会造成可见闪烁
      counters.forEach(function (el) { el.textContent = counterText(el, 0); });
      var countObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          countObserver.unobserve(entry.target);
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { countObserver.observe(el); });
    }
  }

  /* ---------- 导航当前区块高亮 ---------- */
  var sections = document.querySelectorAll('main section[id]');
  var navLinks = document.querySelectorAll('.nav a');

  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        navLinks.forEach(function (link) {
          var active = link.getAttribute('href') === '#' + id;
          link.classList.toggle('is-active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { sectionObserver.observe(s); });
  }

  /* ---------- 项目详情弹层 ---------- */
  var openers = document.querySelectorAll('[data-open]');

  openers.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dialog = document.getElementById(btn.getAttribute('data-open'));
      if (!dialog) return;
      dialog.showModal();
      document.body.classList.add('modal-open');
    });
  });

  document.querySelectorAll('dialog.project-dialog').forEach(function (dialog) {
    function close() {
      dialog.close();
    }

    dialog.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', close);
    });

    // 点击遮罩关闭：dialog 自身尺寸即内容尺寸，判断点击是否落在 dialog 之外
    dialog.addEventListener('click', function (e) {
      if (e.target !== dialog) return;
      var r = dialog.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) close();
    });

    dialog.addEventListener('close', function () {
      document.body.classList.remove('modal-open');
      // 从深链打开的，关闭后把 hash 清掉，避免刷新又弹出来
      try {
        if (location.hash === '#' + dialog.id) {
          history.replaceState(null, '', location.pathname + location.search);
        }
      } catch (err) { /* file:// 下忽略 */ }
    });
  });

  /* ---------- 项目深链：zmeety.cn/#p-devfleet ---------- */
  (function openFromHash() {
    var id = location.hash.slice(1);
    if (!id) return;
    var dialog = document.getElementById(id);
    if (dialog && dialog.classList.contains('project-dialog')) {
      dialog.showModal();
      document.body.classList.add('modal-open');
    }
  })();

  /* ---------- 指针动效：卡片 3D 倾斜 + 按钮磁吸 ---------- */
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (!reduceMotion && finePointer) {
    document.querySelectorAll('.project-card').forEach(function (card) {
      var raf = null;

      card.addEventListener('mousemove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width;
          var py = (e.clientY - r.top) / r.height;

          card.style.setProperty('--ry', ((px - 0.5) * 3.2).toFixed(2) + 'deg');
          card.style.setProperty('--rx', ((0.5 - py) * 3.2).toFixed(2) + 'deg');
          card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
          card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
          raf = null;
        });
      });

      card.addEventListener('mouseleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });

    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) * 0.14;
        var dy = (e.clientY - r.top - r.height / 2) * 0.22;
        el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      });

      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });
  }

  /* ---------- 翻页 + 聚拢 ---------- */
  var pages = Array.prototype.slice.call(document.querySelectorAll('.page'));
  var pager = document.querySelector('.pager');
  var pagerIdx = document.getElementById('pagerIdx');
  var pagerRail = document.getElementById('pagerRail');
  var hint = document.querySelector('.scroll-hint');

  if (pages.length) {
    // 按元素在页面中的横向位置决定从哪一侧聚拢
    pages.forEach(function (page) {
      var pr = page.getBoundingClientRect();
      var w = pr.width || window.innerWidth;

      page.querySelectorAll('[data-reveal]').forEach(function (el) {
        var r = el.getBoundingClientRect();
        var ratio = (r.left - pr.left + r.width / 2) / w;

        if (r.width > w * 0.62) {
          el.style.setProperty('--fy', '26px');
        } else if (ratio < 0.44) {
          el.style.setProperty('--fx', '-38px');
          el.style.setProperty('--fy', '12px');
        } else if (ratio > 0.56) {
          el.style.setProperty('--fx', '38px');
          el.style.setProperty('--fy', '12px');
        } else {
          el.style.setProperty('--fy', '26px');
        }
        el.style.setProperty('--fs', '0.972');
      });
    });

    // 页面进入时整体收一下
    var pageObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var idx = pages.indexOf(entry.target);
        entry.target.classList.add('is-in');

        if (pagerIdx) pagerIdx.textContent = String(idx + 1).padStart(2, '0');
        if (pagerRail) pagerRail.style.transform = 'scaleY(' + ((idx + 1) / pages.length).toFixed(3) + ')';
      });
    }, { threshold: 0.5 });

    pages.forEach(function (p) { pageObserver.observe(p); });

    // 桌面才启用吸附
    var wide = window.matchMedia('(min-width: 861px)');
    function syncSnap() {
      document.documentElement.classList.toggle('snap-on', wide.matches);
      if (pager) pager.classList.toggle('is-on', wide.matches && !reduceMotion);
    }
    syncSnap();
    if (wide.addEventListener) wide.addEventListener('change', syncSnap);


    // snap 会把锚点跳转吸回最近一页，滚动前先临时关掉
    function snapToggle(on) {
      document.documentElement.classList.toggle(
        'snap-on', on && window.matchMedia('(min-width: 861px)').matches
      );
    }

    function goTo(el, smooth) {
      if (!el) return;
      var href = el.getAttribute('href');
      var target = href && href.charAt(0) === '#' ? document.querySelector(href) : el;
      if (!target) return;

      snapToggle(false);
      target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
      setTimeout(function () { snapToggle(true); }, smooth ? 720 : 80);
    }

    document.querySelectorAll('.nav a[href^="#"], .hero-actions a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        goTo(a, true);
        if (history.replaceState) history.replaceState(null, '', a.getAttribute('href'));
      });
    });

    window.addEventListener('load', function () {
      if (!location.hash) return;
      setTimeout(function () {
        goTo(document.querySelector(location.hash), false);
      }, 40);
    });

    // 滚动后收起首屏提示
    window.addEventListener('scroll', function () {
      if (hint) hint.classList.toggle('is-off', window.scrollY > window.innerHeight * 0.25);
    }, { passive: true });
  }

  /* ---------- 页脚年份 ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
