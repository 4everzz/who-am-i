import type { ContactDraft, ContactErrors, ContactMessage } from '../types/contact';

export function validateContact(draft: ContactDraft):
  { ok: true; value: ContactMessage } | { ok: false; errors: ContactErrors } {
  const nickname = draft.nickname.trim();
  const contact = draft.contact.trim();
  const content = draft.content.trim();
  const errors: ContactErrors = {};
  if (draft.category !== 'cooperation' && draft.category !== 'suggestion') errors.category = '请选择合作或建议。';
  if (!nickname || nickname.length > 80) errors.nickname = '请填写 1–80 字的昵称。';
  const digits = contact.replace(/[\s()+.\-]/g, '');
  if (contact.length > 160 || !(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(contact) || /^[0-9]{7,15}$/.test(digits))) {
    errors.contact = '请填写有效的手机号或邮箱。';
  }
  if (!content || content.length > 4000) errors.content = '请填写 1–4000 字的联系内容。';
  const controls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/;
  if (controls.test(nickname) || /[\r\n\t]/.test(nickname)) errors.nickname = '昵称请使用不含控制字符的单行文本。';
  if (controls.test(contact) || /[\r\n\t]/.test(contact)) errors.contact = '联系方式请使用不含控制字符的单行文本。';
  if (controls.test(content)) errors.content = '联系内容包含无效字符，请检查后重试。';
  if (Object.keys(errors).length || !draft.category) return { ok: false, errors };
  return { ok: true, value: { category: draft.category, nickname, contact, content, website: draft.website } };
}

const failureMessage = '暂时无法提交，请稍后重试或直接发送邮件。';
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Framework-independent request lifecycle, including safe retries after an uncertain response.
export function createContactClient(options: {
  fetch?: typeof fetch;
  uuid?: () => string;
  timeoutMs?: number;
} = {}) {
  const request = options.fetch ?? globalThis.fetch.bind(globalThis);
  const uuid = options.uuid ?? (() => crypto.randomUUID());
  let previousPayload = '';
  let requestId: string | null = null;
  let inFlight: Promise<void> | null = null;
  let controller: AbortController | null = null;
  let disposed = false;

  async function perform(payload: ContactMessage) {
    const signature = JSON.stringify(payload);
    if (!requestId || signature !== previousPayload) requestId = uuid();
    previousPayload = signature;
    const active = new AbortController();
    controller = active;
    const timer = setTimeout(() => active.abort(), options.timeoutMs ?? 15000);
    try {
      const response = await request('/api/v1/contact-messages', {
        method: 'POST', signal: active.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...payload, request_id: requestId }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (response.status === 429) throw new Error('提交较频繁，请稍后再试。');
      if (!response.ok || !isRecord(result) || result.code !== 0) {
        const message = isRecord(result) && (typeof result.message === 'string' ? result.message : typeof result.detail === 'string' ? result.detail : '');
        throw new Error(message || failureMessage);
      }
      if (!isRecord(result.data) || result.data.id !== requestId) throw new Error(failureMessage);
      requestId = null;
      previousPayload = '';
    } catch (error) {
      if (active.signal.aborted) throw new Error('等待超时，填写的内容已保留，请重试或直接发送邮件。');
      // Native network errors are not useful copy for visitors.
      if (error instanceof TypeError) throw new Error('网络连接失败，填写的内容已保留，请重试或直接发送邮件。');
      throw error;
    } finally {
      clearTimeout(timer);
      controller = null;
    }
  }

  return {
    send(payload: ContactMessage): Promise<void> {
      if (disposed) return Promise.reject(new Error('表单已关闭。'));
      if (inFlight) return inFlight;
      inFlight = perform(payload).finally(() => { inFlight = null; });
      return inFlight;
    },
    dispose() { disposed = true; controller?.abort(); },
  };
}
