// 阅读模式切换：日间 / 夜间，连点过多给个提示
(function () {
  'use strict';

  var KEY = 'zmeety-theme';
  var root = document.documentElement;
  var btn = document.querySelector('.theme-toggle');
  var toast = document.querySelector('.theme-toast');
  var hits = [];
  var timer = null;

  function apply(mode) {
    root.setAttribute('data-theme', mode);
    if (btn) btn.setAttribute('aria-pressed', String(mode === 'dark'));
  }

  if (!root.getAttribute('data-theme')) {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* 隐私模式 */ }
    apply(saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  }

  if (!btn) return;

  btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch (e) { /* 忽略 */ }

    var now = Date.now();
    hits = hits.filter(function (t) { return now - t < 3 * 60 * 1000; });
    hits.push(now);

    if (hits.length >= 6 && toast) {
      toast.textContent = '已经尽力啦，不要频繁点啦';
      toast.classList.add('is-on');
      clearTimeout(timer);
      timer = setTimeout(function () {
        toast.classList.remove('is-on');
        hits = [];
      }, 2800);
    }
  });
})();
