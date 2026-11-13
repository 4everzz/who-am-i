// Extract repository-owned copy; do not maintain a second list of project facts.
export function projectFallback(section) {
  const articles = [...section.matchAll(/<article\b[^>]*class="project-slide[^"]*"[^>]*>[\s\S]*?<\/article>/g)];
  if (articles.length !== 3) throw new Error('Expected three homepage projects; review the static fallback.');
  const cards = articles.map(([article]) => article
    .replace(/\s+hidden(?=[\s>])/g, '')
    .replace(/<button\b[^>]*data-open="(p-[\w-]+)"[^>]*>([\s\S]*?)<\/button>/g,
      '<a class="btn btn-outline btn--secondary" href="works.html#$1">$2</a>'));
  if (cards.some(card => card.includes('<button'))) throw new Error('Fallback contains a JavaScript-only control.');
  return `<section class="section page" id="work"><span class="paper-chapter" aria-hidden="true">01</span>
    <div class="wrap work-screen project-showcase work-fallback">
      <div class="showcase-head"><div><div class="section-kicker">01 / Selected work</div><h2>精选项目</h2></div></div>
      ${cards.join('\n')}
    </div></section>`;
}
