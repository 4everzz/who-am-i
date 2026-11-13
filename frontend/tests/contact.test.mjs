import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createContactClient, validateContact } from '../src/core/contact.ts';

const message = { category: 'cooperation', nickname: '访客', contact: 'visitor@example.com', content: '希望交流一下项目。', website: '' };
const accepted = id => new Response(JSON.stringify({ code: 0, data: { id } }), { status: 202 });

test('validates both contact categories, trims text and accepts formatted phone numbers', () => {
  for (const category of ['cooperation', 'suggestion']) {
    const result = validateContact({ ...message, category, nickname: '  访客  ', contact: '+86 138-0013-8000', content: ' 内容\n第二行 ' });
    assert.equal(result.ok, true);
    assert.equal(result.value.nickname, '访客');
    assert.equal(result.value.content, '内容\n第二行');
  }
});

test('rejects missing, overlong and malformed fields before making a request', () => {
  for (const [field, value] of [['category', ''], ['category', 'other'], ['nickname', ' '], ['nickname', 'x'.repeat(81)], ['contact', 'bad@'], ['contact', '12'], ['contact', 'x'.repeat(161)], ['content', ' '], ['content', 'x'.repeat(4001)], ['nickname', 'a\nb'], ['contact', '1234\t5678'], ['content', 'a\0b']]) {
    const result = validateContact({ ...message, [field]: value });
    assert.equal(result.ok, false, `${field}: ${value}`);
    assert.ok(result.errors[field]);
  }
});

test('failed retries keep their request ID; changed content and a new message receive new IDs', async () => {
  const bodies = [];
  let sequence = 0, success = false;
  const client = createContactClient({ uuid: () => `id-${++sequence}`, fetch: async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    if (!success) throw new TypeError('network disconnected');
    return accepted(bodies.at(-1).request_id);
  } });
  await assert.rejects(client.send(message), /网络连接失败/);
  await assert.rejects(client.send(message), /网络连接失败/);
  const changed = { ...message, content: '修改后的联系内容' };
  await assert.rejects(client.send(changed));
  success = true;
  await client.send(changed);
  await client.send(changed);
  assert.deepEqual(bodies.map(x => x.request_id), ['id-1', 'id-1', 'id-2', 'id-2', 'id-3']);
});

test('rapid repeated submits produce one POST and preserve the API payload', async () => {
  let resolve, calls = 0;
  const client = createContactClient({ uuid: () => 'request-1', fetch: async (url, init) => {
    calls++;
    assert.equal(url, '/api/v1/contact-messages');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(init.body), { ...message, request_id: 'request-1' });
    return new Promise(done => { resolve = done; });
  } });
  const first = client.send(message), second = client.send(message);
  assert.equal(first, second);
  assert.equal(calls, 1);
  resolve(accepted('request-1'));
  await first;
});

test('non-JSON, nonzero codes, HTTP failures and invalid receipts cannot be reported as success', async () => {
  for (const [body, status, pattern] of [
    ['<html>error</html>', 502, /暂时无法提交/],
    ['{}', 200, /暂时无法提交/],
    [JSON.stringify({ code: 1, message: '服务繁忙' }), 200, /服务繁忙/],
    [JSON.stringify({ detail: [{ msg: 'invalid' }] }), 422, /暂时无法提交/],
    [JSON.stringify({ code: 0, data: { id: 'wrong' } }), 202, /暂时无法提交/],
    [JSON.stringify({ code: 0, data: { id: 'expected' } }), 500, /暂时无法提交/],
    ['{}', 429, /提交较频繁/],
  ]) {
    const client = createContactClient({ uuid: () => 'expected', fetch: async () => new Response(body, { status }) });
    await assert.rejects(client.send(message), pattern);
  }
});

test('timeouts abort a pending request and allow a retry with the same ID', async () => {
  const ids = [];
  let sequence = 0;
  const client = createContactClient({ uuid: () => String(++sequence), timeoutMs: 10, fetch: async (_url, init) => {
    ids.push(JSON.parse(init.body).request_id);
    if (ids.length > 1) return accepted(ids.at(-1));
    return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  } });
  await assert.rejects(client.send(message), /等待超时/);
  await client.send(message);
  assert.deepEqual(ids, ['1', '1']);
});

test('disposing aborts the active request and prevents further requests', async () => {
  let signal;
  const client = createContactClient({ uuid: () => 'id', fetch: async (_url, init) => {
    signal = init.signal;
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  } });
  const pending = client.send(message);
  client.dispose();
  assert.equal(signal.aborted, true);
  await assert.rejects(pending);
  await assert.rejects(client.send(message), /表单已关闭/);
});
