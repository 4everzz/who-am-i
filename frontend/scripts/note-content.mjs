// Build-time views of the same catalog imported by the Vue components.
// Article bodies remain in posts/; no content is fetched from the network.
export function validateNoteCatalog(notes, articlePaths) {
  if (!Array.isArray(notes) || !notes.length) throw new Error('The note catalog must not be empty.');
  const available = new Set(articlePaths);
  const seen = new Set();
  for (const note of notes) {
    if (!note || ['href', 'type', 'title', 'description'].some(key => typeof note[key] !== 'string' || !note[key].trim())) {
      throw new Error('Each note needs a non-empty href, type, title and description.');
    }
    if (!/^posts\/[a-z0-9][a-z0-9-]*\.html$/.test(note.href)) throw new Error('Invalid article path: ' + note.href);
    if (seen.has(note.href)) throw new Error('Duplicate article: ' + note.href);
    if (!available.has(note.href)) throw new Error('Missing article file: ' + note.href);
    seen.add(note.href);
  }
  const unlisted = [...available].filter(path => !seen.has(path));
  if (unlisted.length) throw new Error('Articles missing from the note catalog: ' + unlisted.join(', '));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

export function fillContentSlot(html, marker, content) {
  if (html.split(marker).length !== 2) throw new Error('Expected exactly one content slot: ' + marker);
  // A callback preserves literal $& / $' in repository-owned text.
  return html.replace(marker, () => content);
}

export function renderHomeNotes(notes) {
  const links = notes.map(note => `<a class="note-item" href="${escapeHtml(note.href)}">
    <span class="note-kicker">${escapeHtml(note.type)}</span>
    <span class="note-body"><span class="note-title">${escapeHtml(note.title)}</span></span>
    <span class="note-arrow" aria-hidden="true">→</span></a>`);
  // Until Vue mounts, every note is readable and there are no inactive controls.
  return `<div id="home-notes-app"><div class="notes-list" id="notesList">${links.join('\n')}</div></div>`;
}

export function renderNoteCatalog(notes) {
  const cards = notes.map(note => `<a class="note-card" href="${escapeHtml(note.href)}">
    <span class="note-type">${escapeHtml(note.type)}</span>
    <h3>${escapeHtml(note.title)}</h3><p>${escapeHtml(note.description)}</p>
    <span class="note-link">阅读文章 →</span></a>`);
  return `<div id="notes-app" class="note-catalog">${cards.join('\n')}</div>`;
}

export function renderNoteSitemap(notes) {
  return notes.map(note => `  <url><loc>https://zmeety.cn/${escapeHtml(note.href)}</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>`).join('\n');
}
