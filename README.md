# ことば — Kotoba

Word-centered, context-based, and sentence-supported method for learning Japanese vocabulary 

kotoba is a simple, lightweight Japanese vocabulary trainer built on one
premise: **a language is, in large part, a collection of words**. Where its
sibling project [kanji-drill](https://github.com/bagustris/kanji-drill)
drills the *shape and reading* of individual kanji, kotoba drills the
*words* built from them — how they're read, what they mean, and how they're
actually used — grouped by the everyday situations you'd meet them in.

> [!NOTE]
> **Status: v1 implemented**, with a curated dataset (16 contexts —
> restaurant, hospital, station, airport, classroom, home, workplace, and
> hobby, weather, my town, going out together, Japanese study, cooking, work
> communication, healthy living, and social relationships)
> rather than the full frequency-ranked word list
> described under "Data sources" below. All three modes, spaced repetition,
> and adaptive distractor selection (ported from
> [kanji-drill](https://github.com/bagustris/kanji-drill)'s learning engine)
> work end-to-end. Run locally with `python3 -m http.server 8000`. Expanding
> the dataset to more contexts/words is the main remaining work from the
> roadmap below.

## Philosophy

Vocabulary acquisition, distilled to three steps:

1. **Spaced repetition** — review words at increasing intervals so they move
   from short-term to long-term memory instead of decaying.
2. **Comprehensible input** — meet words inside real sentences, not as bare
   flashcards, so meaning is inferred from context the way it is when
   actually reading or listening to Japanese.
3. **Frequent words and sentence** — a small fraction of words and sentence 
  patterns account for most of everyday usage (pareto principle). 
  Focus on the most common words first, then expand to less
  so the word list is ordered by frequency and the most
  common words are surfaced first (see "Data sources" below).
4. **Contextual learning** — words are grouped by the situation you'd
  actually encounter them in, not alphabetically or by JLPT level: 飲食店
  (restaurant), 病院 (hospital), 市役所 (city hall), 駅 (train station),
  空港 (airport), 教室 (classroom), 会議 (conference), 礼拝室 (prayer
  room), 家 (home), トイレ・お風呂 (toilet/bathroom), 感情
  (emotions/feelings), 果物 (fruits), 文房具
  (stationery), etc. This is what lets "fill in the blank" quiz sentences
  feel like natural scenes instead of disconnected drill sentences.  


## Features

### Modes

Main menu — three quiz modes, all operating over the same word/sentence
data:

- **Reading** — see a word, recall or pick its reading (hiragana).
  Meaning can be toggled on/off.
- **Meaning** — see a word, recall or pick its meaning. Reading (hiragana)
  can be toggled on/off.
- **Fill in the blank** — a sentence is shown with one word blanked out;
  type or pick the missing word. Sentence-only by nature (there's no
  standalone-word variant of a fill-in-the-blank question).
  
Scope:  
- Word (only)  
- (Word in) sentence

Reading and Meaning each have a submenu:

1. Pick a **context** (restaurant, hospital, station, ... — see above).
2. Pick a **scope**: word only, or word inside an example sentence.

### Answering flow & help

- **Auto-advance by default (自動で次へ)** — after you answer, the card reveals
  the answer (with furigana over the target word) and moves on after a short
  timed pause. Turn the setting **off** to advance manually instead (tap/click,
  or → / Enter / Space).
- **Furigana (ふりがな)** — reading annotations over kanji (the meaning-mode
  hint and the post-answer reveal) are **on by default**; turn the setting off
  for a plain-kanji drill. Furigana is only ever shown over the target word —
  the whole-sentence reading is carried by spoken audio instead.
- **Spoken readings (読み上げ)** — an optional setting (**off by default**)
  speaks the Japanese reading via the browser's built-in speech synthesis
  (never the English meaning). In sentence modes it speaks the **whole
  sentence**; for word-only questions, just the word.
- **Weak spots (にがて)** — a word you keep missing gets its hint revealed as
  extra scaffolding (except in Fill-in-the-blank, where the hint would give
  the answer away) and a small weak-spot marker.

### Worked example

```
昨日、ラーメンを食べました。
                 ~~~~~~~~ ← highlighted word

Reading mode:  How is 食べました read?          → たべました
Meaning mode:  What does 食べました mean here?   → ate
Fill-in-blank: 昨日、ラーメンを＿＿＿＿ました。   → 食べ
```

## Data sources

- [Wiktionary: Appendix:1000 Japanese basic words](https://en.wiktionary.org/wiki/Appendix:1000_Japanese_basic_words)
- [Wiktionary: Frequency lists/Japanese/5000 Most Frequent Words](https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists/Japanese/5000_Most_Frequent_Words)
- [IRODORI online course / いろどり 生活の日本語](https://www.irodori.jpf.go.jp/) —
  The Japan Foundation Japanese-Language Institute, Urawa. Word-level
  vocabulary of the `workplace` and `hobby` contexts comes from Lessons 1 and
  2. The bundled Lesson 3–18 resources
  (`resources/lesson{3..18}-words-en.pdf`) provide the `weather` (Lessons
  3–4), `neighborhood` (5–6), `outings` (7–8), `japanese-study` (9–10),
  `cooking` (11–12), `work-communication` (13–14), `health` (15–16), and
  `relationships` (17–18) contexts. An additional **authentic sentence set**
  for those contexts is recovered from the same lesson pages, tagged
  `source: "irodori-l1"` through `"irodori-l18"` with the official English gloss;
  where OCR had dropped kana so the Japanese could not be recovered verbatim,
  the Lesson 1/2 sentence is tagged `note: "reconstructed"` (only two of
  those sentences are `note: "verbatim"`). The Lesson 3/4 weather sentences
  and all Lesson 5–18 sentence records were recovered verbatim. — © The Japan
  Foundation, free for non-commercial use with attribution.
- [できる日本語 初中級](https://www.3anet.co.jp/) — 3A Corporation. Word-level
  vocabulary of the same two contexts additionally draws on Lesson 1's
  sub-topics (新しい一歩: job hunting and meeting people) via its official
  English translation list (`resource/7024084_list_English.pdf`);
- All other example sentences are original kotoba sentences written around
  the extracted words, not copied from any textbook.

> [!WARNING]
> Wiktionary content is licensed [CC BY-SA
> 3.0/4.0](https://en.wiktionary.org/wiki/Wiktionary:Copyrights). Word
> lists and frequency rankings sourced from it may be **reused with
> attribution and share-alike**, but example sentences must be written
> from scratch (as kanji-drill did) rather than copied from any
> copyrighted textbook or dictionary. Attribution to Wiktionary/Wiktionary
> contributors belongs in this README's credits and, ideally, an in-app
> "About" or "Credits" screen.

## Tech stack

Same approach as kanji-drill, for the same reason — it's a personal study
tool, not a product, and GitHub Pages is free static hosting:

- Plain HTML/CSS/JS. No framework, no build step, no `package.json`.
- Word/sentence/context data as static JSON files, loaded with `fetch()`
  (so local development needs a static file server, not `file://`).
- Progress and spaced-repetition state in browser `localStorage`, under a
  single namespaced key (e.g. `kotoba-progress`) — no backend, no account,
  no sync. Interval scheduling modeled after kanji-drill's SM-2-style
  ladder (wrong → due now; first correct → short interval; correct again →
  interval × ease factor, capped), scoped per word+mode so Reading and
  Meaning progress on the same word track independently.
- Deployed via GitHub Pages at `bagustris.github.io/kotoba/`, matching
  every other project in this workspace (see kanji-drill, minna-no-nihongo,
  japanese-for-work).

## Project structure

```
index.html              Screens: mode picker, context picker, quiz, summary
style.css                Layout and theming
js/app.js                Screen navigation, quiz flow
js/progress.js           ProgressManager — localStorage read/write (only module that touches it)
js/learning/             Spaced-repetition scheduling, question/distractor selection
data/contexts.json       Context list + display metadata (restaurant, hospital, ...)
data/words/<context>.json     Word entries for one context
data/sentences/<context>.json Example-sentence entries for one context
```

### Data shape

```json
// data/words/restaurant.json
{ "word": "注文", "reading": "ちゅうもん", "meaning": "order (n./v.)", "context": "restaurant", "frequencyRank": 812 }
```

```json
// data/sentences/restaurant.json
{ "sentence": "何を注文しますか。", "target": "注文", "reading": "ちゅうもん", "meaning": "order", "translation": "What will you order?", "context": "restaurant" }
```

`frequencyRank` (lower = more common) is what lets the Pareto principle
actually drive ordering — e.g. defaulting new-word introduction to ascending
`frequencyRank` within a context, the word-level analogue of kanji-drill's
per-grade kanji ordering.

## Roadmap

A sensible build order, mirroring kanji-drill's
chunked approach:

1. Data — compile the word list (frequency-ranked, context-tagged) and
   write original example sentences per context.
2. App shell — mode picker → context picker → quiz screen, static layout.
3. Reading mode, word-only scope (smallest end-to-end slice).
4. Meaning mode, sentence scope, fill-in-the-blank.
5. Progress tracking + spaced repetition (localStorage, interval ladder).
6. Adaptive question/distractor selection (can reuse kanji-drill's
   `QuestionSelectionStrategy`/`DistractorStrategy` contracts almost as-is).

## Deployment

Static site, relative paths only — same as kanji-drill: push to a repo,
enable GitHub Pages for the branch/root, no build step.
