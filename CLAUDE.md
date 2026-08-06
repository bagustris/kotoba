# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

kotoba (ことば) is a Japanese vocabulary trainer: plain HTML/CSS/JS, no
framework, no build step, no `package.json`. It's a PWA (installable,
offline-capable via `sw.js`) deployed as a static site to GitHub Pages.

## Running locally

Data is loaded via `fetch()`, so opening `index.html` directly (`file://`)
will fail to load quiz data — always serve it:

```bash
python3 -m http.server 8000
```

There is no build, lint, or test command — there's no toolchain to run.
Verify changes by loading the app in a browser and exercising the affected
quiz mode(s) directly.

**Service worker caching**: `sw.js` caches every JS/data file by exact path
in `CORE_ASSETS`. If you add or rename a file under `js/` or `data/`, update
that list too, or the new file won't be available offline / will never get
cached.

## Architecture

### Script loading order matters

There's no module bundler — every file in `index.html` is a plain
`<script>` tag defining an IIFE-scoped global (e.g. `ProgressManager`,
`QuestionSelector`, `DistractorGenerator`). Load order in `index.html`
encodes the dependency graph: a config file loads before the module that
reads it, a strategy loads before the selector that references it directly
by global name. When adding a new module, add its `<script>` tag in the
right position, and add its path to `sw.js`'s `CORE_ASSETS`.

### The pipeline: data → item list → questions → answer → progress

1. **`data/contexts.json`** lists the 8 contexts (restaurant, hospital,
   station, airport, classroom, home, numbers, colors). Each has
   `data/words/<context>.json` (word/reading/meaning/frequencyRank) and
   `data/sentences/<context>.json` (sentence/target/reading/meaning), 15
   entries each.
2. **`js/app.js`** (`loadItemList`) reshapes raw entries per mode/scope into
   a uniform `{readings, meaning, ...}` shape — which raw field becomes the
   answer vs. the hint flips between Reading mode and Meaning mode.
3. **`js/learning/QuestionSelector.js`** picks which item to ask next from
   the pool, deferring the actual ranking math to whichever strategy is
   configured in `QuestionSelectorConfig.strategy` (currently
   `SpacedRepetitionStrategy`; `WeightedScoreStrategy` also exists). This is
   the only file in the selection module that touches `ProgressManager` or
   owns randomness/recency state.
4. **`js/learning/distractors/DistractorGenerator.js`** builds the wrong
   answer options the same way — orchestration here, scoring delegated to
   `DistractorConfig.strategy` (`WeightedDistractorStrategy`), features from
   `SimilarityFeatures`.
5. **`js/app.js`** (`handleAnswer`) scores the response and calls
   `ProgressManager.recordAnswer`, which in turn asks
   **`js/learning/review/ReviewScheduler.js`** for the next due interval
   (SM-2-derived: correct multiplies the interval, wrong resets it, a slow
   correct answer gets a much smaller bump — see the file's own comments).
6. **`js/progress.js`** (`ProgressManager`) is the *only* module that reads
   or writes `localStorage`, under a single key (`kotoba-progress`).
   `js/settings.js` (`SettingsManager`) owns a separate key
   (`kotoba-settings`) for user prefs, deliberately kept apart so resetting
   progress never wipes settings.

### Strategy contracts (swap-in points)

Both the question-selection and distractor-scoring modules follow the same
shape, documented as JSDoc contracts (no TypeScript in this project) in
`QuestionSelectionStrategy.js` and `DistractorStrategy.js`:

- Strategies are **pure and deterministic**: no `ProgressManager`/
  `localStorage` access, no system-clock reads, no mutation of arguments,
  no randomness. Anything time-dependent (`daysSinceLastSeen`,
  `medianLatencyMs`, etc.) is precomputed by the orchestrator and passed in.
- All tunables live in the paired `*Config.js` file — never a magic number
  inside a strategy implementation.
- To add a new strategy (e.g. an `FSRSStrategy`), implement the contract and
  point `strategy` at it in the config; no orchestrator code changes.

### Five drillable sub-modes, one progress namespace scheme

`PROGRESS_MODES` in `app.js` (`reading-word`, `reading-sentence`,
`meaning-word`, `meaning-sentence`, `fillblank`) are the five combinations
actually tracked. Reading and Meaning fork on scope (word vs.
word-in-sentence); fill-in-the-blank is sentence-only by nature and carries
no scope. `ProgressManager` namespaces every stored question ID by
mode+context (`contextKey`/`questionId`), so the same word tracks
independent mastery under Reading vs. Meaning vs. Fill-in-blank, and per
context it appears in.

### Data conventions

- Word entries use the `word` field; sentence entries use `sentence` — both
  `app.js`'s `itemText()` and `DistractorGenerator` treat these as the same
  identity concept and branch on which is present.
- `frequencyRank` (lower = more common) exists to let new-word introduction
  favor common words first, per the project's Pareto-principle philosophy
  (see README "Philosophy").
- New examples sentences must be written from scratch, not copied from
  copyrighted textbooks/dictionaries — see README "Data sources" for the
  Wiktionary attribution/licensing constraint this comes from.

## Sibling project

kotoba ports its learning engine (spaced repetition, adaptive distractor
selection) from [kanji-drill](https://github.com/bagustris/kanji-drill),
its sibling project drilling kanji shape/reading rather than vocabulary.
When in doubt about *why* a piece of the learning engine is structured a
certain way, that project is the origin of the pattern.
