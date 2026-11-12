// 文章页脚本：只做移动端导航开合，不加载首页的翻页 / 动效逻辑
(function () {
  'use strict';

  var menuBtn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  var main = document.querySelector('main');
  var footer = document.querySelector('.site-footer');
  if (!menuBtn || !nav) return;

  function setOpen(open, restoreFocus) {
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
    if (main) main.inert = open;
    if (footer) footer.inert = open;
    if (open) {
      nav.querySelector('a').focus();
    } else if (restoreFocus) {
      menuBtn.focus();
    }
  }

  function focusables() {
    return Array.prototype.slice.call(nav.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])'))
      .concat(Array.prototype.slice.call(document.querySelectorAll('.header-actions button')));
  }

  menuBtn.addEventListener('click', function () {
    setOpen(menuBtn.getAttribute('aria-expanded') !== 'true');
  });

  // 菜单打开时把 Tab 限制在菜单内，避免焦点落到被遮住的正文
  document.addEventListener('keydown', function (e) {
    if (menuBtn.getAttribute('aria-expanded') !== 'true') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false, true);
      return;
    }
    if (e.key !== 'Tab') return;
    var items = focusables();
    if (!items.length) return;
    var current = items.indexOf(document.activeElement);
    if (e.shiftKey && (current <= 0 || current === -1)) {
      e.preventDefault();
      items[items.length - 1].focus();
    } else if (!e.shiftKey && current === items.length - 1) {
      e.preventDefault();
      items[0].focus();
    }
  });

  // 点了链接就收起
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  // 从移动端拉宽到桌面时，清掉展开态
  var wide = window.matchMedia('(min-width: 701px)');
  function onWide() { if (wide.matches) setOpen(false); }
  if (wide.addEventListener) wide.addEventListener('change', onWide);
  else if (wide.addListener) wide.addListener(onWide);
})();
