export const navigation = [
  { id: 'home', href: 'index.html', label: '首页' },
  { id: 'works', href: 'works.html', label: '作品' },
  { id: 'notes', href: 'notes.html', label: '笔记' },
  { id: 'skills', href: 'skills-principles.html', label: '技能与原则' },
  { id: 'about', href: 'about.html', label: '关于' },
] as const;

export type PageId = typeof navigation[number]['id'];
