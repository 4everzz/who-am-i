<script setup lang="ts">
import { computed, nextTick, onUnmounted, reactive, ref } from 'vue';
import { createContactClient, validateContact } from '../core/contact';
import type { ContactDraft, ContactErrors, ContactField, ContactStatus } from '../types/contact';

const emptyDraft = (): ContactDraft => ({ category: '', nickname: '', contact: '', content: '', website: '' });
const draft = reactive(emptyDraft());
const errors = ref<ContactErrors>({});
const sending = ref(false);
const status = ref<ContactStatus>('');
const message = ref('');
const form = ref<HTMLFormElement | null>(null);
const statusElement = ref<HTMLParagraphElement | null>(null);
const client = createContactClient();
let disposed = false;
const title = computed(() => draft.category === 'cooperation' ? '聊聊合作' : draft.category === 'suggestion' ? '留下建议' : '发一条消息');
const placeholder = computed(() => draft.category === 'cooperation'
  ? '介绍一下招聘机会、合作背景、目标或想交流的项目……'
  : '哪里可以改进？欢迎附上页面名称和具体建议……');

async function submit() {
  if (sending.value) return;
  const validated = validateContact(draft);
  errors.value = validated.ok ? {} : validated.errors;
  if (!validated.ok) {
    const fields = Object.keys(validated.errors) as ContactField[];
    status.value = 'error';
    message.value = `请检查 ${fields.length} 项信息后再提交。`;
    await nextTick();
    form.value?.querySelector<HTMLElement>(`[name="${fields[0]}"]`)?.focus();
    return;
  }
  sending.value = true;
  status.value = 'pending';
  message.value = '正在提交，请稍候……';
  try {
    await client.send(validated.value);
    if (disposed) return;
    Object.assign(draft, emptyDraft());
    status.value = 'success';
    message.value = '消息已收到，感谢你的联系。我会通过你留下的方式回复。';
    await nextTick();
    statusElement.value?.focus();
  } catch (error) {
    if (disposed) return;
    status.value = 'error';
    message.value = error instanceof Error ? error.message : '暂时无法提交，请稍后重试或直接发送邮件。';
  } finally {
    if (!disposed) sending.value = false;
  }
}

onUnmounted(() => { disposed = true; client.dispose(); });
</script>

<template>
  <form ref="form" class="contact-form" data-contact-form method="post" action="/api/v1/contact-messages" novalidate @submit.prevent="submit">
    <fieldset aria-describedby="category-error" :disabled="sending">
      <legend>你想聊什么？</legend>
      <div class="contact-types">
        <div class="contact-type">
          <input id="category-cooperation" v-model="draft.category" type="radio" name="category" value="cooperation" required aria-describedby="category-error" :aria-invalid="errors.category ? 'true' : undefined">
          <label for="category-cooperation">合作</label>
        </div>
        <div class="contact-type">
          <input id="category-suggestion" v-model="draft.category" type="radio" name="category" value="suggestion" required aria-describedby="category-error" :aria-invalid="errors.category ? 'true' : undefined">
          <label for="category-suggestion">建议</label>
        </div>
      </div>
      <span id="category-error" class="field-error">{{ errors.category }}</span>
    </fieldset>
    <div data-contact-fields :hidden="!draft.category">
      <h4 class="contact-panel-title" data-contact-title>{{ title }}</h4>
      <div class="contact-fields">
        <div class="field">
          <label for="nickname">昵称</label>
          <input id="nickname" v-model="draft.nickname" :disabled="sending" name="nickname" type="text" maxlength="80" autocomplete="nickname" placeholder="怎么称呼你？" required aria-describedby="nickname-error" :aria-invalid="errors.nickname ? 'true' : undefined">
          <span id="nickname-error" class="field-error">{{ errors.nickname }}</span>
        </div>
        <div class="field">
          <label for="contact-detail">手机号或邮箱</label>
          <input id="contact-detail" v-model="draft.contact" :disabled="sending" name="contact" type="text" maxlength="160" placeholder="例如 name@example.com" required aria-describedby="contact-hint contact-error" :aria-invalid="errors.contact ? 'true' : undefined">
          <span id="contact-hint" class="contact-hint">任选一种，方便我回复你。</span>
          <span id="contact-error" class="field-error">{{ errors.contact }}</span>
        </div>
        <div class="field">
          <label for="content">联系内容</label>
          <textarea id="content" v-model="draft.content" :disabled="sending" name="content" maxlength="4000" :placeholder="placeholder" required aria-describedby="content-error" :aria-invalid="errors.content ? 'true' : undefined"></textarea>
          <span id="content-error" class="field-error">{{ errors.content }}</span>
        </div>
        <div class="spam-field" aria-hidden="true">
          <label for="website">请留空</label>
          <input id="website" v-model="draft.website" :disabled="sending" name="website" type="text" maxlength="200" autocomplete="off" tabindex="-1">
        </div>
        <div class="contact-submit-row">
          <button class="btn btn-primary btn-lg" type="submit" :disabled="sending" :aria-busy="sending ? 'true' : undefined">提交消息</button>
        </div>
      </div>
    </div>
    <p ref="statusElement" class="contact-status" data-contact-status :data-state="status" role="status" aria-live="polite" tabindex="-1">{{ message }}</p>
  </form>
</template>
