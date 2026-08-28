# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The version shown in the app's Settings → About panel is read from the latest
entry below (see `loadAppVersion()` in `js/app.js`), so this file is the single
source of truth for the app version.

## [Unreleased]

## [1.1.0] - 2026-08-28

### Added
- New context 天気 "Weather & Seasons" (`weather`), based on IRODORI Lesson 3
  (`resources/lesson3-words-en.pdf`, The Japan Foundation). It contains all
  40 listed vocabulary entries and 28 unique source example sentences, with
  `source: "irodori-l3"` provenance and official English glosses.

### Added
- New context 職場 "At Work" (`workplace`), whose vocabulary is extracted from
  Lesson 1 of the IRODORI online course PDF in `resource/lesson1-words-en.pdf`
  (The Japan Foundation). Word-level vocabulary only is taken from the source;
  all example sentences are original kotoba sentences written from scratch
  around those words. The lesson's duration counters (1か月–12か月, 1年–10年)
  are included as words. This context carries 62 words and 42 sentences.
- New context 趣味 "Hobbies & Free Time" (`hobby`), extracted the same way
  from Lesson 2 of that course PDF (`resource/lesson2-words-en.pdf`): hobby
  and free-time vocabulary (sports, music, movies, outings) plus its people
  counters (2人–10人, 何人). All example sentences are original. This
  context carries 56 words and 48 sentences.
- `tools/check_data.py`: a zero-dependency validator for every data/*.json
  invariant (schema keys, sequential unique frequencyRank, verbatim single-
  occurrence sentence targets, no duplicates). Run `python3 tools/check_data.py`
  when touching anything under `data/`.
- Hospital context rebalanced: 58 new example sentences covering reception
  flow (画面案内にしたがって診察券を入れてください — front-desk-style staff
  phrases), departments (小児科/内科/外科), tests & treatment (血圧, 心電図,
  レントゲン, 点滴), emergency care (救急外来, 救急搬送), paperwork (診断書,
  医療費控除, 出生証明書), and — per the dataset's missing core — a large
  産婦人科 block: pregnancy progress (産科医, お印), labor (分娩監視装置,
  陣痛促進剤, 分娩介助), and newborn/postpartum care (新生児ケア, 授乳, 沐浴,
  母子保健指導). Sixty-one everyday sentences added in total, plus ten
  everyday clinical words to anchor those scenes (診察券,
  待合室, 問診票, 予防接種, 授乳, 沐浴, ミルク, 黄疸, 相談). Hospital now
  carries 107 words / 98 sentences (85% of words drillable in sentence
  scope; the remainder are administrative compounds like 病院経営).
- Workplace and hobby contexts enriched from the できる日本語 初中級 word
  list (`resource/7024084_list_English.pdf`, 3A Corporation): Lesson 1
  sub-topic 1-1 アルバイトを探す (job hunt nouns like 面接, 履歴書, 募集 plus
  ten interview/service keigo set-phrases such as 失礼します, 少々お待ち
  ください, よろしくお願いいたします, ～と申します) merged into workplace
  (+23 words / +23 sentences); sub-topic 1-2 新しい友達 (talking about hobbies
  and life in Japan: 意見, 聞き取る, 得意/苦手, つまらない…) merged into
  hobby (+24 words / +24 sentences). Word-level vocabulary only; all example
  sentences remain original. Existing overlaps (半年, 言葉, サイクリング)
  were kept as-is rather than duplicated.
- Sentence records may now carry optional provenance fields (`source` and
  `note`) alongside the schema fields. The workplace/hobby contexts gained a
  second, authentic sentence set recovered from the IRODORI L1/L2 PDFs (the
  official English gloss was always exact; most Japanese readings had dropped
  kana from OCR, so they are flagged `note: "reconstructed"` and only two
  escaped fully intact as `note: "verbatim"` — provenance never implies a
  claim that a reconstructed sentence is a literal scan). `tools/check_data.py`
  now validates these fields against a source/note whitelist.

### Fixed
- Summary screen (end of round): yomigana shown in Meaning mode's review rows
  no longer renders italic. The middle summary column reuses the hint slot,
  which is an English gloss in Reading mode but the reading in Meaning mode —
  italic suited only the former; kana/kanji now stay upright
  (.missed-item-meaning.is-japanese).
- Furigana (fullReading) typos in three workplace sentences: 日曜日 was
  romanized にちようにび → now にちようび, and 父は was pronounced ちは →
  now ちちは (spoken readings were affected too, since fullReading feeds TTS).
- The word 「12か月／1年」 showed two independently-readable segments on one
  card while Reading mode expects a single correct reading — surface changed
  to 「12か月」 (the separate 1年 entry already exists). 「一人」 renamed to
  「1人」 to match Lesson 2's own counter style and workplace's digit counters.

## [1.0.0] - 2026-08-11

### Added
- Multiple-choice vocabulary trainer across 6 everyday-place contexts
  (restaurant, hospital, station, airport, classroom, home), each with 15 word
  and 15 sentence entries.
- Reading and Meaning quiz modes, each drillable over two scopes (a word alone
  or a word in a sentence), plus a sentence-only fill-in-the-blank mode — five
  independently tracked sub-modes in total.
- Adaptive learning engine ported from the sibling
  [kanji-drill](https://github.com/bagustris/kanji-drill) project: spaced
  repetition with per-question intervals (SM-2-derived), answer-latency
  awareness, and new-word introduction that favors common words first by
  `frequencyRank`.
- Adaptive distractor engine that ranks wrong-answer options by reading/meaning
  similarity.
- Optional spoken readings via the browser's speech synthesis, with an
  auto-advance option.
- Progress tracking per question, mode, and context in `localStorage`, kept
  separate from user settings so resetting progress never wipes preferences.
- Installable, offline-capable PWA via a precaching service worker.
- Settings panel (show hint, furigana, auto-advance, spoken audio, round size,
  install) and an About section.
