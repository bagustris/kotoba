// DOM glue for KotobaSearch: fetches every context's word pool, builds the
// index once, and renders results as the user types. Read-only — it never
// touches ProgressManager or the quiz flow, only data/words/*.json.
const SearchUI = (function () {
  'use strict';

  const MAX_RESULTS = 50;
  let ready = false;
  let contextLabels = new Map();

  async function init(contexts, fetchJSON) {
    contextLabels = new Map(contexts.map((c) => [c.id, c.label]));
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    if (!input || !results) return;

    wire(input, results);

    try {
      const lists = await Promise.all(
        contexts.map(({ id }) => fetchJSON(`data/words/${id}.json`))
      );
      KotobaSearch.build(lists.flat());
      ready = true;
      if (input.value.trim()) render(input.value, results);
    } catch (err) {
      console.error('search index build failed', err);
    }
  }

  function wire(input, results) {
    input.addEventListener('input', () => render(input.value, results));
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function render(query, results) {
    const q = query.trim();
    if (!q) {
      results.classList.add('hidden');
      results.innerHTML = '';
      return;
    }
    results.classList.remove('hidden');
    if (!ready) {
      results.innerHTML = '<p class="search-status">読み込み中…<span>Loading…</span></p>';
      return;
    }
    const matches = KotobaSearch.search(q);
    if (!matches.length) {
      results.innerHTML = '<p class="search-status">見つかりません<span>No matches</span></p>';
      return;
    }
    const shown = matches.slice(0, MAX_RESULTS);
    const rows = shown.map((e) => {
      const ctxLabel = contextLabels.get(e.context) || e.context;
      const tags = (e.tags || []).join(', ');
      const meta = tags ? `${ctxLabel} · ${tags}` : ctxLabel;
      return `<div class="search-result">
        <span class="search-result-word">${escapeHtml(e.word)}</span>
        <span class="search-result-reading">${escapeHtml(e.reading)}</span>
        <span class="search-result-meaning">${escapeHtml(e.meaning)}</span>
        <span class="search-result-meta">${escapeHtml(meta)}</span>
      </div>`;
    }).join('');
    const more = matches.length > MAX_RESULTS
      ? `<p class="search-status">+${matches.length - MAX_RESULTS} more<span>もっとあります</span></p>`
      : '';
    results.innerHTML = rows + more;
  }

  return { init };
})();
