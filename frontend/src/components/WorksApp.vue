<script setup lang="ts">
import { onMounted } from 'vue';
import type { Component } from 'vue';
import ProjectArticle from './works/ProjectArticle.vue';
import { projects } from '../data/projects';
import type { ProjectId } from '../types/project';
import DevFleetArticle from './works/DevFleetArticle.vue';
import FamilyMenuArticle from './works/FamilyMenuArticle.vue';
import ZhiyuanArticle from './works/ZhiyuanArticle.vue';

const articleById = {
  'p-devfleet': { index: '01 / Project', subtitle: 'Multi-Agent 研发协作平台', article: DevFleetArticle },
  'p-menu': { index: '02 / Project', subtitle: '家庭菜单、冰箱与 AI 饮食助手', article: FamilyMenuArticle },
  'p-zhiyuan': { index: '03 / Project', subtitle: '高考志愿填报智能体 · 检索与问答质量工程', article: ZhiyuanArticle },
} satisfies Record<ProjectId, { index: string; subtitle: string; article: Component }>;
const articles = projects.map(project => ({ project, ...articleById[project.id] }));

// A direct project URL may be resolved before Vue replaces the static fallback.
onMounted(() => {
  const id = location.hash.slice(1);
  if (articles.some(({ project }) => project.id === id)) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
  }
});
</script>

<template>
<div class="page-hero">
    <div><div class="page-kicker">01 / Selected work</div><h1>把想法做成<br><span class="hl">可以交付的系统</span></h1><p class="page-lead">我关心的不只是模型能不能回答，还关心证据是否可追溯、失败能不能定位、权限是否清楚，以及上线之后能不能被另一个人接手。</p></div>
    <aside class="page-aside"><strong>作品页怎么读</strong>每个项目都按“问题—设计—取舍—验证”的顺序展开。数字只记录已经实际做过、测过或上线过的部分。</aside>
  </div>
  <ProjectArticle v-for="item in articles" :key="item.project.id"
    :project="item.project" :index="item.index" :subtitle="item.subtitle">
    <component :is="item.article" />
  </ProjectArticle>
</template>
