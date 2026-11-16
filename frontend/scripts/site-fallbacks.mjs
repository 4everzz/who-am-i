import { projects } from '../src/data/projects.ts';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const pad = value => String(value).padStart(2, '0');

function renderTags(project) {
  return project.tags.map(tag => `<span class="${escapeHtml(tag.className)}">${tag.className.includes('tag-live') ? '<i aria-hidden="true"></i>' : ''}${escapeHtml(tag.label)}</span>`).join('');
}

function renderActions(project) {
  const external = project.url
    ? `<a class="link-out" href="${escapeHtml(project.url)}" target="_blank" rel="noopener">访问应用 <span aria-hidden="true">↗</span></a>`
    : '';
  return `${external}<a class="btn btn-outline btn--secondary" href="works.html#${escapeHtml(project.id)}">${escapeHtml(project.buttonLabel)} <span aria-hidden="true">→</span></a>`;
}

function renderProject(project, index) {
  const titleId = `project-slide-title-${index}`;
  const flow = project.aside.flow.map((step, stepIndex) => `${stepIndex ? '<i aria-hidden="true">→</i>' : ''}<span>${escapeHtml(step)}</span>`).join('');
  return `<article class="project-slide${index === 0 ? ' is-active' : ''}" data-project-slide="${index}" aria-labelledby="${titleId}">
            <div class="project-slide-copy">
              <div class="project-meta"><span class="project-index">${pad(index + 1)}</span>${renderTags(project)}</div>
              <h3 id="${titleId}">${escapeHtml(project.name)}</h3>
              <p class="project-sub">${escapeHtml(project.subtitle)}</p>
              <p class="project-intro">${escapeHtml(project.intro)}</p>
              <ul class="project-points">${project.points.map(point => `<li>${escapeHtml(point)}</li>`).join('')}</ul>
              <div class="project-slide-actions">${renderActions(project)}</div>
            </div>
            <aside class="project-slide-aside"><span class="slide-aside-kicker">${escapeHtml(project.aside.kicker)}</span><strong>${escapeHtml(project.aside.title)}</strong><div class="slide-flow">${flow}</div><p>${escapeHtml(project.aside.description)}</p></aside>
          </article>`;
}

/** Render the no-JavaScript project view from the same typed data used by Vue. */
export function projectFallback(section) {
  const sourceArticles = [...section.matchAll(/<article\b[^>]*class="project-slide[^"]*"[^>]*>[\s\S]*?<\/article>/g)];
  if (sourceArticles.length !== projects.length) {
    const expected = projects.length === 3 ? 'three' : projects.length;
    throw new Error(`Expected ${expected} homepage projects; review the static fallback.`);
  }
  return `<section class="section page" id="work"><span class="paper-chapter" aria-hidden="true">01</span>
    <div class="wrap work-screen project-showcase work-fallback">
      <div class="showcase-head"><div><div class="section-kicker">01 / Selected work</div><h2>精选项目</h2></div></div>
      ${projects.map(renderProject).join('\n')}
    </div></section>`;
}
