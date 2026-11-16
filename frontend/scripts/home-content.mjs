import { principles, skillGroups, stackGroups } from '../src/data/skills.ts';
import { aboutSite } from '../src/data/about.ts';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderHomeStack() {
  const cards = stackGroups.map(group => `<div class="stack-card">
          <h3><span class="stack-icon" aria-hidden="true">${escapeHtml(group.key)}</span>${escapeHtml(group.title)}</h3>
          <dl>${group.items.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl>
        </div>`).join('\n\n        ');
  return `<section class="section page" id="stack">
    <span class="paper-chapter" aria-hidden="true">03</span>
    <div class="wrap">
      <div class="section-head"><div class="section-kicker">03 / Stack</div><h2>技术栈</h2></div>
      <div class="stack-grid">${cards}</div>
    </div>
  </section>`;
}

export function renderHomePrinciples() {
  const rows = principles.map((principle, index) => `<li>
          <span class="p-num">${String(index + 1).padStart(2, '0')}</span>
          <div><h3>${escapeHtml(principle.title)}</h3><p>${escapeHtml(principle.description)}</p></div>
        </li>`).join('\n        ');
  return `<section class="section section-alt page" id="principles">
    <span class="paper-chapter" aria-hidden="true">04</span>
    <div class="wrap"><div class="section-head"><div class="section-kicker">04 / How I work</div><h2>四条工作原则</h2><p class="section-note">项目之外的一些判断标准，也决定了代码最后长什么样。</p></div>
      <ol class="principles">${rows}</ol>
    </div>
  </section>`;
}

export function renderHomeAbout() {
  return `<section class="section contact page page-last" id="about">
    <span class="paper-chapter" aria-hidden="true">05</span>
    <div class="wrap"><div class="contact-inner" data-moment="word-highlight">
      <div class="section-kicker">${escapeHtml(aboutSite.kicker)}</div><h2>${escapeHtml(aboutSite.title)}</h2>
      <p class="mo-wh__text">${escapeHtml(aboutSite.description)}</p>
      <div class="about-contact"><a class="btn btn-primary btn--primary" href="about.html#contact">联系我</a></div>
      <ul class="contact-list about-facts">${aboutSite.facts.map(([label, value]) => `<li><span>${escapeHtml(label)}</span>${label === '在线作品' ? `<a href="https://menu.zmeety.cn" target="_blank" rel="noopener">${escapeHtml(value)}</a>` : `<em>${escapeHtml(value)}</em>`}</li>`).join('')}</ul>
    </div></div>
  </section>`;
}

export function renderSkillsPageContent() {
  const skills = skillGroups.map((group, index) => `<div class="skill-row"><h3 data-index="${String(index + 1).padStart(2, '0')}">${escapeHtml(group.title)}</h3><div>${group.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div></div>`).join('\n');
  const principleRows = principles.map((principle, index) => `<div class="principle-row"><h3 data-index="${String(index + 1).padStart(2, '0')}">${escapeHtml(principle.title)}</h3><div><p>${escapeHtml(principle.description)}</p></div></div>`).join('\n');
  return `<section class="content-block"><div class="block-heading"><span class="block-index">03.1 / Built in projects</span><h2>项目中的方法</h2></div><div class="skill-list">${skills}</div></section>
<section class="content-block"><div class="block-heading"><span class="block-index">03.2 / Working principles</span><h2>四条工作原则</h2></div><div class="principle-list">${principleRows}</div><div class="quote-block">可靠性不是一句态度，而是把边界、证据和回滚路径写进系统。</div></section>`;
}
