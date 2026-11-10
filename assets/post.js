// 文章页脚本：只做移动端导航开合，不加载首页的翻页 / 动效逻辑
(function () {
  'use strict';

  var menuBtn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  if (!menuBtn || !nav) return;

  function setOpen(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
  }

  menuBtn.addEventListener('click', function () {
    setOpen(menuBtn.getAttribute('aria-expanded') !== 'true');
  });

  // 点了链接就收起
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') setOpen(false);
  });

  // Esc 收起并把焦点还给按钮
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (menuBtn.getAttribute('aria-expanded') !== 'true') return;
    setOpen(false);
    menuBtn.focus();
  });

  // 从移动端拉宽到桌面时，清掉展开态
  var wide = window.matchMedia('(min-width: 861px)');
  function onWide() { if (wide.matches) setOpen(false); }
  if (wide.addEventListener) wide.addEventListener('change', onWide);
  else if (wide.addListener) wide.addListener(onWide);
})();
