// Renders the Progress Dashboard (home screen) and the per-context progress
// list (context-picker screen). Display-only: every number shown here comes
// from ProgressManager — no stats are computed in this file.

const ProgressView = (() => {
  const MASTERY_LABEL = { new: '新規', learning: '要復習', familiar: '定着中', mastered: 'マスター' };
  const MASTERY_TITLE = { new: 'New', learning: 'Learning', familiar: 'Familiar', mastered: 'Mastered' };

  const MODE_ROWS = [
    ['reading-word', '読み方・単語', 'Reading / word'],
    ['reading-sentence', '読み方・文', 'Reading / sentence'],
    ['meaning-word', '意味・単語', 'Meaning / word'],
    ['meaning-sentence', '意味・文', 'Meaning / sentence'],
    ['fillblank', '穴埋め', 'Fill-in-blank'],
  ];

  let els = null;

  function init() {
    els = {
      answered: document.getElementById('progress-answered'),
      correct: document.getElementById('progress-correct'),
      accuracy: document.getElementById('progress-accuracy'),
      modeBreakdown: document.getElementById('progress-mode-breakdown'),
      history: document.getElementById('progress-history-bar'),
      contextList: document.getElementById('context-progress-list'),
    };
  }

  function renderOverall() {
    const stats = ProgressManager.getOverallStats();
    els.answered.textContent = stats.answered;
    els.correct.textContent = stats.correct;
    els.accuracy.textContent = `${stats.accuracy}%`;

    els.modeBreakdown.innerHTML = '';
    MODE_ROWS.forEach(([mode, label, title]) => {
      const modeStats = ProgressManager.getOverallStatsByMode(mode);
      const row = document.createElement('div');
      row.className = 'progress-mode-row';
      row.innerHTML = `<span class="progress-mode-label" title="${title}">${label}</span>` +
        `<span>${modeStats.answered}問</span><span>${modeStats.accuracy}%</span>`;
      els.modeBreakdown.appendChild(row);
    });
  }

  // Recent answers as a compact row of dots, oldest to newest (left to right).
  function renderHistory() {
    const history = ProgressManager.getRecentHistory(20);
    els.history.innerHTML = '';
    if (history.length === 0) {
      els.history.classList.add('is-empty');
      return;
    }
    els.history.classList.remove('is-empty');
    history.forEach((isCorrect) => {
      const dot = document.createElement('span');
      dot.className = `history-dot ${isCorrect ? 'correct' : 'wrong'}`;
      els.history.appendChild(dot);
    });
  }

  // One row per context (in the order given), scoped to the currently
  // selected mode+scope combo (e.g. 'reading-word'). `contexts` is
  // [{id, name}, ...] with `name` resolved by the caller.
  function renderContextList(mode, contexts) {
    els.contextList.innerHTML = '';
    contexts.forEach(({ id, name }) => {
      const stats = ProgressManager.getContextStats(mode, id);
      const percent = ProgressManager.getContextProgressPercent(mode, id);
      const status = ProgressManager.getContextStatus(mode, id);

      const row = document.createElement('div');
      row.className = 'context-row';
      row.dataset.status = status;
      row.innerHTML = `
        <span class="mastery-dot mastery-${status}" title="${MASTERY_TITLE[status]} / ${MASTERY_LABEL[status]}"></span>
        <span class="context-row-name">${name}</span>
        <div class="progress-bar"><div class="progress-bar-fill" style="width: ${percent ?? 0}%"></div></div>
        <span class="context-row-percent">${percent === null ? '—' : `${percent}%`}</span>
        <span class="context-row-accuracy">${stats.answered > 0 ? `${stats.accuracy}%` : '—'}</span>
        <button type="button" class="context-row-reset" data-context="${id}" aria-label="Reset ${name} progress">&times;</button>
      `;
      els.contextList.appendChild(row);
    });
  }

  function renderAll() {
    renderOverall();
    renderHistory();
  }

  return { init, renderOverall, renderHistory, renderContextList, renderAll };
})();
