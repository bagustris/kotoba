# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The version shown in the app's Settings → About panel is read from the latest
entry below (see `loadAppVersion()` in `js/app.js`), so this file is the single
source of truth for the app version.

## [Unreleased]

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
