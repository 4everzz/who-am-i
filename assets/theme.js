// 阅读模式切换：日间 / 夜间，连点过多给个提示
(function () {
  'use strict';

  var KEY = 'zmeety-theme';
  var root = document.documentElement;
  var btn = document.querySelector('.theme-toggle');

  function apply(mode) {
    root.setAttribute('data-theme', mode);
    if (btn) btn.setAttribute('aria-pressed', String(mode === 'dark'));
  }

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* 隐私模式 */ }
  apply(root.getAttribute('data-theme') || saved || 'light');

  if (!btn) return;

  btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch (e) { /* 忽略 */ }
  });
})();
