const OPTIONS_COUNT = 4;

// kotoba's five drillable sub-modes: Reading and Meaning each split by scope
// (word vs. word-in-sentence); Fill-in-the-blank is sentence-only by nature
// (see README "Modes") and carries no scope of its own.
const PROGRESS_MODES = ['reading-word', 'reading-sentence', 'meaning-word', 'meaning-sentence', 'fillblank'];

const INSTRUCTIONS = {
  'reading-word': ['正しい読み方は？', 'Choose the correct reading'],
  'reading-sentence': ['緑字の読み方は？', 'Choose the reading for the highlighted word'],
  'meaning-word': ['正しい意味は？', 'Choose the correct meaning'],
  'meaning-sentence': ['緑字の意味は？', 'Choose the meaning of the highlighted word'],
  fillblank: ['空欄に入る言葉は？', 'Choose the word that fits the blank'],
};

// Every context in the curated seed dataset has exactly this many words and
// the same number of sentences (see data/words|sentences/*.json) — this
// becomes a per-file count instead of a constant if that ever stops holding.
const QUESTIONS_PER_CONTEXT = 15;

const state = {
  mode: 'reading', // 'reading' | 'meaning' | 'fillblank'
  scope: 'word', // 'word' | 'sentence' — irrelevant (always 'sentence') for fillblank
  context: null,
  itemList: [],
  questions: [],
  index: 0,
  score: 0,
  missed: [],
  correctItems: [],
  // performance.now() stamp taken when the current question finished
  // rendering; nulled once consumed so a re-render can't double-count.
  questionShownAt: null,
  screen: 'home',
};

let CONTEXTS = [];

const el = {
  screens: {
    home: document.getElementById('screen-home'),
    quiz: document.getElementById('screen-quiz'),
    summary: document.getElementById('screen-summary'),
  },
  modeButtons: document.querySelectorAll('#mode-toggle .toggle-btn'),
  scopeToggleRow: document.getElementById('scope-toggle'),
  scopeButtons: document.querySelectorAll('#scope-toggle .toggle-btn'),
  contextGrid: document.getElementById('context-grid'),
  contextProgressList: document.getElementById('context-progress-list'),
  btnQuit: document.getElementById('btn-quit'),
  btnRetry: document.getElementById('btn-retry'),
  btnHome: document.getElementById('btn-home'),
  quizProgress: document.getElementById('quiz-progress'),
  quizWord: document.getElementById('quiz-word'),
  quizHint: document.getElementById('quiz-hint'),
  quizInstruction: document.getElementById('quiz-instruction'),
  quizOptions: document.getElementById('quiz-options'),
  quizContinue: document.getElementById('quiz-continue'),
  quizLeechBadge: document.getElementById('quiz-leech-badge'),
  summaryScore: document.getElementById('summary-score'),
  summaryMissed: document.getElementById('summary-missed'),
  summaryCorrect: document.getElementById('summary-correct'),
  fileWarning: document.getElementById('file-protocol-warning'),
  loadError: document.getElementById('load-error-banner'),
  btnSettings: document.getElementById('btn-settings'),
  btnSettingsClose: document.getElementById('btn-settings-close'),
  settingsOverlay: document.getElementById('settings-overlay'),
  settingShowHint: document.getElementById('setting-show-hint'),
  settingAutoNext: document.getElementById('setting-auto-next'),
  settingPlayAudio: document.getElementById('setting-play-audio'),
  settingRoundSizeButtons: document.querySelectorAll('#setting-round-size .segmented-btn'),
  installButton: document.getElementById('btn-install'),
  installHint: document.getElementById('settings-install-hint'),
};

function showScreen(name) {
  state.screen = name;
  Object.entries(el.screens).forEach(([key, section]) => {
    section.classList.toggle('hidden', key !== name);
  });
  // Cancels handleAnswer's pending advance-to-next-question timer whenever
  // navigation happens — otherwise quitting mid-question leaves it ticking,
  // and it later fires against whatever round is active by then (see
  // advanceTimer's comment above startRound). A no-op once the timer has
  // already fired on its own.
  clearAdvanceTimer();
  // Also abandon any manual "continue" wait and stop any spoken reading so
  // neither carries into the next screen.
  cancelContinue();
  AudioPlayer.stop();
  if (name === 'home') ProgressView.renderAll();
}

function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path} (HTTP ${res.status})`);
  return res.json();
}

// Word entries use `word`, sentence entries use `sentence` — same identity
// scheme DistractorGenerator uses (see js/learning/distractors/DistractorGenerator.js).
function itemText(entry) {
  return entry.word ?? entry.sentence;
}

// Whether a string contains at least one kanji character — furigana over a
// kana-only word (メニュー, ノート, ...) would just repeat the word itself,
// so ruby rendering is skipped for those (see wordMarkup/handleAnswer).
function hasKanji(str) {
  return /[一-龯]/.test(str || '');
}

function rubyHTML(word, reading) {
  return `<ruby>${word}<rt>${reading}</rt></ruby>`;
}

// Wraps just the target word in a highlight span so sentence-scope questions
// show which word is being quizzed. `innerHTML` overrides what's rendered
// inside the highlight (e.g. plain text vs. a ruby reading).
function highlightTarget(sentence, target, innerHTML) {
  const start = sentence.indexOf(target);
  if (start === -1) return sentence;
  const end = start + target.length;
  return `${sentence.slice(0, start)}<span class="quiz-sentence-target">${innerHTML ?? target}</span>${sentence.slice(end)}`;
}

// Fill-in-the-blank replaces the target word with a placeholder instead of
// highlighting it — the whole point of this mode is that the word isn't
// visible until answered. `revealHTML` swaps the placeholder for the actual
// word (optionally with furigana) once the question has been answered.
function blankSentence(sentence, target, revealHTML) {
  const start = sentence.indexOf(target);
  if (start === -1) return sentence;
  const end = start + target.length;
  const inner = revealHTML
    ? `<span class="quiz-sentence-target">${revealHTML}</span>`
    : `<span class="quiz-blank">${'＿'.repeat(Math.max(2, target.length))}</span>`;
  return `${sentence.slice(0, start)}${inner}${sentence.slice(end)}`;
}

// Meaning mode's hint is the word's reading — shown as furigana above the
// word itself (kanji-drill style) rather than as separate text, and only
// when there's a kanji to annotate. Returns plain text otherwise, so the
// caller can set it via innerHTML uniformly either way.
function wordMarkup(q) {
  const word = q.target ?? q.text;
  if (state.mode === 'meaning' && hasKanji(word)) return rubyHTML(word, q.meaning);
  return word;
}

// The combined ProgressManager mode key for the current selection — Reading
// and Meaning fork on scope, Fill-in-blank doesn't.
function progressModeKey() {
  return state.mode === 'fillblank' ? 'fillblank' : `${state.mode}-${state.scope}`;
}

function registerTotalQuestionCounts() {
  CONTEXTS.forEach(({ id }) => {
    PROGRESS_MODES.forEach((pMode) => ProgressManager.setTotalQuestions(pMode, id, QUESTIONS_PER_CONTEXT));
  });
}

function renderContextGrid() {
  el.contextGrid.innerHTML = '';
  CONTEXTS.forEach(({ id, label, labelEn }, i) => {
    const btn = document.createElement('button');
    btn.className = 'context-btn';
    btn.dataset.context = id;
    btn.innerHTML = `<span class="key-badge key-badge-corner">${i + 1}</span>${label}<span>${labelEn}</span>`;
    btn.addEventListener('click', () => selectContext(id));
    el.contextGrid.appendChild(btn);
  });
}

function renderContextProgressList() {
  ProgressView.renderContextList(progressModeKey(), CONTEXTS.map((c) => ({ id: c.id, name: c.label })));
}

el.contextProgressList.addEventListener('click', (e) => {
  const btn = e.target.closest('.context-row-reset');
  if (!btn) return;
  const contextId = btn.dataset.context;
  const ctx = CONTEXTS.find((c) => c.id === contextId);
  if (!confirm(`${ctx.label}の成績をリセットしますか？\nReset progress for ${ctx.label}?`)) return;
  ProgressManager.reset(progressModeKey(), contextId);
  renderContextProgressList();
});

// Mode and scope are both plain toggles on the front page (like kanji-drill's
// mode toggle sitting above its grade grid) — picking one just relabels the
// context grid/progress list below rather than navigating to another screen.
function selectMode(mode) {
  state.mode = mode;
  el.modeButtons.forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));

  // Fill-in-blank is sentence-only by nature (see README "Modes") — there's
  // nothing to choose, so the scope toggle has no reason to be shown.
  el.scopeToggleRow.classList.toggle('hidden', mode === 'fillblank');
  if (mode === 'fillblank') {
    state.scope = 'sentence';
  } else if (state.scope !== 'word' && state.scope !== 'sentence') {
    state.scope = 'word';
  }
  el.scopeButtons.forEach((b) => b.classList.toggle('active', b.dataset.scope === state.scope));

  renderContextProgressList();
}

function selectScope(scope) {
  state.scope = scope;
  el.scopeButtons.forEach((b) => b.classList.toggle('active', b.dataset.scope === scope));
  renderContextProgressList();
}

function selectContext(id) {
  state.context = id;
  startSession();
}

el.modeButtons.forEach((btn) => btn.addEventListener('click', () => selectMode(btn.dataset.mode)));
el.scopeButtons.forEach((btn) => btn.addEventListener('click', () => selectScope(btn.dataset.scope)));
el.btnQuit.addEventListener('click', () => showScreen('home'));
el.btnHome.addEventListener('click', () => showScreen('home'));
el.btnRetry.addEventListener('click', () => startRound());

// Reshapes the raw data/*.json entries into a uniform shape the learning
// engine understands: `readings` holds the correct-answer string(s) being
// quizzed, `meaning` holds whatever secondary text is used as a togglable
// hint. Which raw field lands in which uniform field flips between Reading
// (answer = reading, hint = English meaning) and Meaning (answer = English
// meaning, hint = reading, rendered as furigana — see wordMarkup).
async function loadItemList(mode, scope, context) {
  if (mode === 'fillblank') {
    const entries = await fetchJSON(`data/sentences/${context}.json`);
    return entries.map((e) => ({ sentence: e.sentence, target: e.target, readings: [e.target], meaning: e.translation, hintReading: e.reading, fullReading: e.fullReading }));
  }
  if (scope === 'word') {
    const entries = await fetchJSON(`data/words/${context}.json`);
    return mode === 'reading'
      ? entries.map((e) => ({ word: e.word, readings: [e.reading], meaning: e.meaning, frequencyRank: e.frequencyRank }))
      : entries.map((e) => ({ word: e.word, readings: [e.meaning], meaning: e.reading, frequencyRank: e.frequencyRank }));
  }
  const entries = await fetchJSON(`data/sentences/${context}.json`);
  // Reading-scope-sentence's hint is the sentence's full translation (not
  // just the target word's meaning) — the question already highlights the
  // target, so the hint's job is to help the reader understand the whole
  // sentence. fullReading (whole-sentence furigana) rides along for the
  // post-answer reveal (see handleAnswer) regardless of mode.
  return mode === 'reading'
    ? entries.map((e) => ({ sentence: e.sentence, target: e.target, readings: [e.reading], meaning: e.translation, fullReading: e.fullReading }))
    : entries.map((e) => ({ sentence: e.sentence, target: e.target, readings: [e.meaning], meaning: e.reading, fullReading: e.fullReading }));
}

// Adaptive replacement for a plain random sample: builds a pool of
// {id, entry} candidates (id = ProgressManager's stable question ID) and
// repeatedly asks QuestionSelector for the next best question, removing each
// pick from the remaining pool so a single round never repeats a question.
function pickQuestions(itemList, pMode, context, count) {
  const remaining = itemList.map((entry) => ({ id: ProgressManager.getQuestionId(pMode, context, itemText(entry)), entry }));
  const picked = [];
  while (picked.length < count && remaining.length > 0) {
    const choice = QuestionSelector.select(remaining);
    if (!choice) break;
    picked.push(choice.entry);
    remaining.splice(remaining.findIndex((p) => p.id === choice.id), 1);
  }
  return picked;
}

// Distractor selection is delegated to the Adaptive Learning Engine's
// DistractorGenerator (js/learning/distractors/), ported from kanji-drill.
function buildQuestion(target, itemList, pMode, context) {
  const correctAnswer = target.readings[0];
  const question = {
    id: ProgressManager.getQuestionId(pMode, context, itemText(target)),
    text: itemText(target),
    reading: correctAnswer,
    meaning: target.meaning,
    frequency: target.frequencyRank,
  };
  const distractors = DistractorGenerator.generate(question, itemList);
  const options = shuffle([correctAnswer, ...distractors]);
  return {
    text: question.text,
    sentence: target.sentence,
    target: target.target,
    meaning: target.meaning,
    hintReading: target.hintReading, // fillblank only; undefined otherwise
    fullReading: target.fullReading, // sentence scope and fillblank; undefined otherwise
    correctAnswer,
    options,
  };
}

async function startSession() {
  el.loadError.classList.add('hidden');
  try {
    state.itemList = await loadItemList(state.mode, state.scope, state.context);
    startRound();
  } catch (err) {
    console.error(err);
    el.loadError.textContent = location.protocol === 'file:'
      ? '読み込みに失敗しました。サーバー経由で開いてください（上の注意を参照）。'
      : '読み込みに失敗しました。ページを再読み込みしてください。';
    el.loadError.classList.remove('hidden');
  }
}

// The delayed state.index++/renderQuestion() scheduled by handleAnswer
// below. Tracked so it can be cancelled if the learner quits or starts a new
// round before it fires — otherwise a stale timer from an abandoned
// question fires later against whatever round happens to be active by then
// (state.questions/state.index are shared, mutable module state), silently
// skipping a question or corrupting the display of an unrelated round.
let advanceTimer = null;

function clearAdvanceTimer() {
  if (advanceTimer !== null) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }
}

// True between an answer being graded and the next question appearing, when
// autoNext is off (the default) — the learner advances manually via tap/click
// or a key. See armContinue()/onContinueClick().
let awaitingContinue = false;

// Advances past the current question — the single exit point for both the
// autoNext timer and a manual continue, so timer/continue state is always
// cleared exactly once.
function advanceQuestion() {
  clearAdvanceTimer();
  cancelContinue();
  el.quizContinue.classList.add('hidden');
  state.index++;
  if (state.index < state.questions.length) renderQuestion();
  else showSummary();
}

// Fires on a click anywhere while awaiting a manual continue. Registered on the
// next macrotask so the click that answered the question doesn't bubble up and
// instantly satisfy its own continue gate; a plain (non-once) listener removed
// by cancelContinue() means exactly one is ever live, so a keyboard advance
// can't leave a stale listener that swallows the next answering click.
function onContinueClick() {
  if (awaitingContinue) advanceQuestion();
}

function armContinue() {
  awaitingContinue = true;
  el.quizContinue.classList.remove('hidden');
  setTimeout(() => {
    if (awaitingContinue) document.addEventListener('click', onContinueClick);
  }, 0);
}

function cancelContinue() {
  awaitingContinue = false;
  document.removeEventListener('click', onContinueClick);
  // Hide the hint here (not only in advanceQuestion) so quitting mid-reveal
  // and starting a new round doesn't leave "つづける →" showing on question 1.
  el.quizContinue.classList.add('hidden');
}

// Resolves the tri-state playAudio preference (see settings.js): explicit
// choice wins; `null` falls back to off in an installed/standalone PWA, on in a
// browser tab.
function audioEnabled() {
  const pref = SettingsManager.get('playAudio');
  return pref === null ? !isStandaloneDisplay() : pref;
}

// The Japanese reading to speak for a question, by mode: Reading quizzes the
// reading itself (the answer); Meaning quizzes the English gloss, so the
// reading lives in q.meaning (the swapped hint); Fill-in-blank quizzes the word
// and carries the reading as hintReading. Never speaks the English meaning.
function readingToSpeak(q) {
  if (state.mode === 'reading') return q.correctAnswer;
  if (state.mode === 'meaning') return q.meaning;
  return q.hintReading || q.correctAnswer; // fillblank
}

// Speaks a reading when audio is enabled and supported; a silent no-op
// otherwise. Any okurigana dot is a display marker, not pronounced.
function speakReading(reading) {
  if (!reading) return;
  if (audioEnabled() && AudioPlayer.isSupported()) AudioPlayer.speak(reading.replace(/\./g, ''));
}

function startRound() {
  clearAdvanceTimer();
  const configuredSize = SettingsManager.get('roundSize');
  const roundSize = configuredSize === 'all' ? state.itemList.length : configuredSize;
  const count = Math.min(roundSize, state.itemList.length);
  const pMode = progressModeKey();
  const picks = pickQuestions(state.itemList, pMode, state.context, count);
  state.questions = picks.map((entry) => buildQuestion(entry, state.itemList, pMode, state.context));
  state.index = 0;
  state.score = 0;
  state.missed = [];
  state.correctItems = [];
  showScreen('quiz');
  renderQuestion();
}

// Governs two different hints depending on mode: Reading's English-meaning
// text (below the word) and Meaning's reading furigana (above the word,
// via the .hide-hint class — see wordMarkup and the CSS rule for it).
// Fill-in-blank shows neither pre-answer; that would give the blank away.
function applyHintVisibility() {
  const showHint = SettingsManager.get('showHint');
  el.quizHint.classList.toggle('hidden', !(state.mode === 'reading' && showHint));

  const q = state.questions[state.index];
  if (!q) return;
  const rubyActive = state.mode === 'meaning' && hasKanji(q.target ?? q.text);
  el.quizWord.classList.toggle('hide-hint', rubyActive && !showHint);
}

function renderQuestion() {
  const q = state.questions[state.index];
  // Cut off any reading still being spoken from the previous reveal.
  AudioPlayer.stop();
  const counter = `${state.index + 1} / ${state.questions.length}`;
  el.quizProgress.textContent = counter;

  const isSentenceDisplay = state.scope === 'sentence' || state.mode === 'fillblank';
  el.quizWord.classList.toggle('is-sentence', isSentenceDisplay);

  if (state.mode === 'fillblank') {
    el.quizWord.innerHTML = blankSentence(q.sentence, q.target);
  } else if (state.scope === 'sentence') {
    el.quizWord.innerHTML = highlightTarget(q.sentence, q.target, wordMarkup(q));
  } else {
    el.quizWord.innerHTML = wordMarkup(q);
  }

  el.quizHint.textContent = q.meaning || '';
  applyHintVisibility();

  // A leech (an item this learner keeps missing) gets extra scaffolding: a
  // "weak spot" marker, plus its hint revealed even when the setting is off —
  // except in fill-in-blank, where the hint would give the answer away before
  // it's answered.
  const leech = ProgressManager.isLeech(ProgressManager.getQuestionId(progressModeKey(), state.context, q.text));
  el.quizLeechBadge.classList.toggle('hidden', !leech);
  if (leech && state.mode !== 'fillblank') {
    if (state.mode === 'reading') el.quizHint.classList.remove('hidden');
    el.quizWord.classList.remove('hide-hint'); // reveal meaning-mode furigana
  }

  const [instructionMain, instructionSub] = INSTRUCTIONS[progressModeKey()];
  el.quizInstruction.innerHTML = `${instructionMain}<span>${instructionSub}</span>`;

  el.quizOptions.innerHTML = '';
  q.options.forEach((answer, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="key-badge key-badge-corner">${i + 1}</span>${answer}`;
    btn.dataset.answer = answer;
    btn.addEventListener('click', () => handleAnswer(answer, btn));
    el.quizOptions.appendChild(btn);
  });

  // Stamped last, once the options are actually on screen, so the measured
  // latency is time-to-answer rather than time-to-answer plus render.
  state.questionShownAt = performance.now();
}

function handleAnswer(selected, btnEl) {
  const q = state.questions[state.index];
  const isCorrect = selected === q.correctAnswer;

  const latencyMs = state.questionShownAt === null ? null : performance.now() - state.questionShownAt;
  state.questionShownAt = null;

  [...el.quizOptions.children].forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.answer === q.correctAnswer) btn.classList.add('correct');
    else if (btn === btnEl) btn.classList.add('incorrect');
  });

  // Whole-sentence furigana reveal. On a WRONG answer in any sentence-display
  // mode (sentence scope or fill-in-blank), annotate every kanji in the
  // sentence — not just the quizzed target — so the reader can sound the whole
  // thing out. Reading-sentence also does this on a CORRECT answer (the long
  // furigana reveal is a feature of that mode, not just error feedback). One
  // <rt> spans the full base — a deliberate simplification (no per-word
  // alignment) rather than authoring per-token furigana data.
  const isSentenceDisplay = state.scope === 'sentence' || state.mode === 'fillblank';
  const revealFullReading = !!q.fullReading && isSentenceDisplay &&
    (!isCorrect || (state.mode === 'reading' && state.scope === 'sentence'));

  if (state.mode === 'fillblank') {
    if (revealFullReading) {
      // Fill the blank with plain target text, then annotate the whole
      // sentence — fullReading already covers the target's own reading, so a
      // separate ruby on the target would nest awkwardly.
      el.quizWord.innerHTML = rubyHTML(blankSentence(q.sentence, q.target, q.target), q.fullReading);
    } else {
      const revealHTML = hasKanji(q.target) && q.hintReading ? rubyHTML(q.target, q.hintReading) : q.target;
      el.quizWord.innerHTML = blankSentence(q.sentence, q.target, revealHTML);
    }
  } else if (state.scope === 'sentence') {
    const highlighted = highlightTarget(q.sentence, q.target);
    if (revealFullReading) {
      el.quizWord.innerHTML = rubyHTML(highlighted, q.fullReading);
    } else if (state.mode === 'reading') {
      // No fullReading data to reveal; still drop the pre-answer markup back
      // to a plainly highlighted target.
      el.quizWord.innerHTML = highlighted;
    }
    // meaning-sentence correct answer: keep the pre-answer target furigana.
  }

  ProgressManager.recordAnswer(progressModeKey(), state.context, q.text, isCorrect, selected, latencyMs);
  if (isCorrect) { state.score++; state.correctItems.push(q); }
  else state.missed.push(q);

  ProgressView.renderAll();

  // Speak the target's reading now that the answer is revealed (never the
  // English meaning — see readingToSpeak).
  speakReading(readingToSpeak(q));

  clearAdvanceTimer();
  if (SettingsManager.get('autoNext')) {
    // A wrong answer gets a longer pause than a correct one: that's the moment
    // the revealed answer actually needs to be read. A full-sentence furigana
    // reveal takes longer to read than a single word, so it gets extra time.
    const delay = revealFullReading
      ? (isCorrect ? 2000 : 3200)
      : (isCorrect ? 700 : 1800);
    advanceTimer = setTimeout(advanceQuestion, delay);
  } else {
    // Manual advance (the default): wait for a tap/click or → / Enter / Space.
    armContinue();
  }
}

function itemDisplay(q) {
  return (state.mode === 'fillblank' || state.scope === 'sentence') ? highlightTarget(q.sentence, q.target) : q.text;
}

function summaryRow(q) {
  const row = document.createElement('div');
  row.className = 'missed-item';
  // Fill-in-the-blank already shows the target word (in accent green) inside
  // the sentence column, so the separate answer column would just repeat it.
  const answerCol = state.mode === 'fillblank' ? '' : `<span>${q.correctAnswer}</span>`;
  row.innerHTML = `<span>${itemDisplay(q)}</span><span class="missed-item-meaning">${q.meaning || ''}</span>${answerCol}`;
  return row;
}

function showSummary() {
  showScreen('summary');
  el.summaryScore.innerHTML = `${state.score} / ${state.questions.length} 正解<span>Correct</span>`;

  el.summaryMissed.innerHTML = '';
  if (state.missed.length > 0) {
    const heading = document.createElement('h3');
    heading.textContent = 'まちがえたもの';
    el.summaryMissed.appendChild(heading);
    state.missed.forEach((q) => el.summaryMissed.appendChild(summaryRow(q)));
  }

  el.summaryCorrect.innerHTML = '';
  if (state.correctItems.length > 0) {
    const details = document.createElement('details');
    details.className = 'summary-correct-details';
    const summary = document.createElement('summary');
    summary.textContent = `せいかいしたもの（${state.correctItems.length}）`;
    details.appendChild(summary);
    state.correctItems.forEach((q) => details.appendChild(summaryRow(q)));
    el.summaryCorrect.appendChild(details);
  }
}

// --- Settings dialog ---

function isSettingsOpen() {
  return !el.settingsOverlay.classList.contains('hidden');
}

function openSettings() {
  el.settingsOverlay.classList.remove('hidden');
  renderInstallRow();
  el.btnSettingsClose.focus();
}

function closeSettings() {
  el.settingsOverlay.classList.add('hidden');
  el.btnSettings.focus();
}

// --- PWA install ---
// Chrome/Edge/Android fire `beforeinstallprompt`, which is stashed until the
// user taps the Settings button. Browsers with no such event (iOS Safari,
// desktop Safari/Firefox) get manual "Add to Home Screen" instructions
// instead, since there's no install API to call there.
let deferredInstallPrompt = null;

function isStandaloneDisplay() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function renderInstallRow() {
  if (isStandaloneDisplay()) {
    el.installButton.classList.add('hidden');
    el.installHint.textContent = 'インストール済み — Already installed';
    el.installHint.classList.remove('hidden');
    return;
  }
  if (deferredInstallPrompt) {
    el.installButton.classList.remove('hidden');
    el.installHint.classList.add('hidden');
    return;
  }
  el.installButton.classList.add('hidden');
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  el.installHint.textContent = isIOS
    ? '共有ボタン → ホーム画面に追加 — Share button → Add to Home Screen'
    : 'ブラウザメニューの「インストール」から追加できます — Use your browser menu → Install app';
  el.installHint.classList.remove('hidden');
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  renderInstallRow();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  renderInstallRow();
});

function initSettingsPanel() {
  el.settingShowHint.checked = SettingsManager.get('showHint');

  const roundSize = String(SettingsManager.get('roundSize'));
  el.settingRoundSizeButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.value === roundSize);
  });

  el.settingShowHint.addEventListener('change', () => {
    SettingsManager.set('showHint', el.settingShowHint.checked);
    applyHintVisibility();
  });

  el.settingAutoNext.checked = SettingsManager.get('autoNext');
  el.settingAutoNext.addEventListener('change', () => {
    SettingsManager.set('autoNext', el.settingAutoNext.checked);
  });

  // Init from the resolved default (audioEnabled()), not the raw tri-state
  // preference, so a never-chosen `null` renders on/off per context.
  el.settingPlayAudio.checked = audioEnabled();
  el.settingPlayAudio.addEventListener('change', () => {
    SettingsManager.set('playAudio', el.settingPlayAudio.checked);
  });

  el.settingRoundSizeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      el.settingRoundSizeButtons.forEach((b) => b.classList.toggle('active', b === btn));
      SettingsManager.set('roundSize', btn.dataset.value === 'all' ? 'all' : Number(btn.dataset.value));
    });
  });

  el.btnSettings.addEventListener('click', openSettings);
  el.btnSettingsClose.addEventListener('click', closeSettings);
  el.settingsOverlay.addEventListener('click', (e) => {
    if (e.target === el.settingsOverlay) closeSettings();
  });

  el.installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    renderInstallRow();
  });

  renderInstallRow();
}

// --- Keyboard navigation ---
// Arrow-key navigation: each screen exposes an ordered list of button
// groups (each with a column count matching its on-screen grid/row/stack
// layout). Left/Right move within a group's row; Up/Down move within a
// group's column and, at a group's top/bottom edge, jump to the
// neighboring group in the same column. Buttons are real <button>
// elements, so once focused, Enter/Space activate them via native
// browser behavior — no extra handling needed here.
function getNavGroups() {
  if (state.screen === 'home') {
    const groups = [{ items: [...el.modeButtons], cols: el.modeButtons.length }];
    if (state.mode !== 'fillblank') groups.push({ items: [...el.scopeButtons], cols: el.scopeButtons.length });
    groups.push({ items: [...el.contextGrid.children], cols: 2 });
    return groups;
  }
  if (state.screen === 'quiz') {
    return [
      { items: [el.btnQuit], cols: 1 },
      { items: [...el.quizOptions.children], cols: 2 },
    ];
  }
  if (state.screen === 'summary') {
    return [{ items: [el.btnRetry, el.btnHome], cols: 1 }];
  }
  return [];
}

function findFocusPosition(groups) {
  for (let g = 0; g < groups.length; g++) {
    const i = groups[g].items.indexOf(document.activeElement);
    if (i !== -1) return { g, i };
  }
  return null;
}

function navigate(dRow, dCol) {
  const groups = getNavGroups().filter((grp) => grp.items.length > 0);
  if (groups.length === 0) return;

  const pos = findFocusPosition(groups);
  if (!pos) {
    groups[0].items[0].focus();
    return;
  }

  const { g, i } = pos;
  const group = groups[g];
  const row = Math.floor(i / group.cols);
  const col = i % group.cols;

  if (dCol !== 0) {
    const newCol = col + dCol;
    if (newCol < 0 || newCol >= group.cols) return;
    const newIndex = row * group.cols + newCol;
    if (newIndex >= group.items.length) return;
    group.items[newIndex].focus();
    return;
  }

  const newRow = row + dRow;
  const withinIndex = newRow * group.cols + col;
  if (newRow >= 0 && withinIndex < group.items.length) {
    group.items[withinIndex].focus();
    return;
  }

  const targetGroupIndex = g + dRow;
  if (targetGroupIndex < 0 || targetGroupIndex >= groups.length) return;
  const targetGroup = groups[targetGroupIndex];
  let targetIndex;
  if (dRow > 0) {
    targetIndex = Math.min(col, targetGroup.cols - 1, targetGroup.items.length - 1);
  } else {
    const lastRow = Math.floor((targetGroup.items.length - 1) / targetGroup.cols);
    const candidate = lastRow * targetGroup.cols + Math.min(col, targetGroup.cols - 1);
    targetIndex = candidate < targetGroup.items.length ? candidate : targetGroup.items.length - 1;
  }
  targetGroup.items[targetIndex].focus();
}

const ARROW_DELTAS = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

// Keyboard shortcuts, mirrored by the on-screen key-badges: r/m/f switch
// mode, w/s switch scope, 1-8 pick a context and start a round, 0 quits a
// quiz, 1-4 pick a quiz option, 1/2 retry or start over on the summary
// screen. Arrow keys move focus between on-screen buttons on every screen.
document.addEventListener('keydown', (e) => {
  if (isSettingsOpen()) {
    if (e.key === 'Escape') closeSettings();
    return;
  }

  if (e.ctrlKey || e.metaKey || e.altKey) return;

  // While a revealed answer waits for a manual continue (autoNext off),
  // →/Enter/Space move on and 0 still quits; other keys are swallowed (the
  // options are already disabled). Checked before arrow-nav so → advances.
  if (state.screen === 'quiz' && awaitingContinue) {
    if (e.key === '0') { el.btnQuit.click(); return; }
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowRight') {
      e.preventDefault();
      advanceQuestion();
    }
    return;
  }

  if (ARROW_DELTAS[e.key]) {
    e.preventDefault();
    navigate(...ARROW_DELTAS[e.key]);
    return;
  }

  if (state.screen === 'home') {
    const key = e.key.toLowerCase();
    if (key === 'r') { document.querySelector('.toggle-btn[data-mode="reading"]').click(); return; }
    if (key === 'm') { document.querySelector('.toggle-btn[data-mode="meaning"]').click(); return; }
    if (key === 'f') { document.querySelector('.toggle-btn[data-mode="fillblank"]').click(); return; }
    if (state.mode !== 'fillblank') {
      if (key === 'w') { document.querySelector('.toggle-btn[data-scope="word"]').click(); return; }
      if (key === 's') { document.querySelector('.toggle-btn[data-scope="sentence"]').click(); return; }
    }
    const btn = el.contextGrid.children[Number(e.key) - 1];
    if (btn) btn.click();
    return;
  }

  if (state.screen === 'quiz') {
    if (e.key === '0') { el.btnQuit.click(); return; }
    const index = Number(e.key) - 1;
    if (!(index >= 0 && index < OPTIONS_COUNT)) return;
    const btn = el.quizOptions.children[index];
    if (!btn || btn.disabled) return;
    btn.click();
    return;
  }

  if (state.screen === 'summary') {
    if (e.key === '1') el.btnRetry.click();
    else if (e.key === '2') el.btnHome.click();
  }
});

// --- Init ---

async function init() {
  initSettingsPanel();
  ProgressView.init();
  ProgressView.renderAll();

  if (location.protocol === 'file:') {
    el.fileWarning.classList.remove('hidden');
  }

  try {
    CONTEXTS = await fetchJSON('data/contexts.json');
    registerTotalQuestionCounts();
    renderContextGrid();
    renderContextProgressList();
  } catch (err) {
    console.error(err);
    el.loadError.textContent = location.protocol === 'file:'
      ? '状況データの読み込みに失敗しました。サーバー経由で開いてください（上の注意を参照）。'
      : '状況データの読み込みに失敗しました。ページを再読み込みしてください。';
    el.loadError.classList.remove('hidden');
  }
}

init();
