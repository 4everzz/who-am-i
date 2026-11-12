// API contract stays the same when this form becomes a Vue or React component.
(function () {
  'use strict';
  var form = document.querySelector('[data-contact-form]');
  if (!form) return;
  var types = document.querySelectorAll('input[name="category"]');
  var panel = document.querySelector('[data-contact-fields]');
  var title = document.querySelector('[data-contact-title]');
  var button = form.querySelector('[type="submit"]');
  var status = form.querySelector('[data-contact-status]');
  var sending = false;
  var requestId = null, previousPayload = '';

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state || '';
  }
  function chooseType() {
    var selected = form.querySelector('input[name="category"]:checked');
    if (!selected) return;
    panel.hidden = false;
    title.textContent = selected.value === 'cooperation' ? '聊聊合作' : '留下建议';
    form.elements.content.placeholder = selected.value === 'cooperation'
      ? '介绍一下招聘机会、合作背景、目标或想交流的项目……'
      : '哪里可以改进？欢迎附上页面名称和具体建议……';
  }
  types.forEach(function (input) { input.addEventListener('change', chooseType); });
  chooseType();

  function validate(payload) {
    var errors = {};
    if (!payload.category) errors.category = '请选择合作或建议。';
    if (!payload.nickname || payload.nickname.length > 80) errors.nickname = '请填写 1–80 字的昵称。';
    var digits = payload.contact.replace(/[\s()+.\-]/g, '');
    if (payload.contact.length > 160 || !(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(payload.contact) || /^[0-9]{7,15}$/.test(digits))) {
      errors.contact = '请填写有效的手机号或邮箱。';
    }
    if (!payload.content || payload.content.length > 4000) errors.content = '请填写 1–4000 字的联系内容。';
    ['category', 'nickname', 'contact', 'content'].forEach(function (name) {
      var error = document.getElementById(name + '-error');
      if (error) error.textContent = errors[name] || '';
      var input = name === 'category' ? types[0] : form.elements[name];
      if (errors[name]) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    });
    var names = Object.keys(errors);
    if (names.length) {
      setStatus('请检查 ' + names.length + ' 项信息后再提交。', 'error');
      (names[0] === 'category' ? types[0] : form.elements[names[0]]).focus();
      return false;
    }
    return true;
  }
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (sending) return;
    var data = new FormData(form);
    var payload = {
      category: data.get('category'),
      nickname: String(data.get('nickname') || '').trim(),
      contact: String(data.get('contact') || '').trim(),
      content: String(data.get('content') || '').trim(),
      website: String(data.get('website') || '')
    };
    if (!validate(payload)) return;
    var signature = JSON.stringify(payload);
    if (!requestId || previousPayload !== signature) requestId = crypto.randomUUID();
    previousPayload = signature;
    payload.request_id = requestId;
    sending = true;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    setStatus('正在提交，请稍候……', 'pending');
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 15000);
    try {
      var response = await fetch('/api/v1/contact-messages', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      var result = await response.json().catch(function () { return null; });
      if (!response.ok || !result || result.code !== 0) {
        var message = result && (result.message || (typeof result.detail === 'string' && result.detail));
        throw new Error(response.status === 429 ? '提交较频繁，请稍后再试。' : (message || '暂时无法提交，请稍后重试或直接发送邮件。'));
      }
      form.reset(); requestId = null; previousPayload = '';
      panel.hidden = true;
      setStatus('消息已收到，感谢你的联系。我会通过你留下的方式回复。', 'success');
      status.focus();
    } catch (error) {
      setStatus(error.name === 'AbortError' ? '等待超时，填写的内容已保留，请重试或直接发送邮件。' : error.message, 'error');
    } finally {
      clearTimeout(timeout); sending = false;
      button.disabled = false; button.removeAttribute('aria-busy');
    }
  });
})();
