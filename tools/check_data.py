#!/usr/bin/env python3
"""Validate kotoba's data/*.json dataset against every invariant app.js,
DistractorGenerator, and the furigana/TTS code rely on.

Run from anywhere:  python3 tools/check_data.py
Exits 1 with a listed diagnosis on any violation — wire it into review for
any PR that adds or edits entries under data/.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / 'data'
WORD_KEYS = {'word', 'reading', 'meaning', 'context', 'frequencyRank'}
SENT_KEYS = {'sentence', 'target', 'reading', 'fullReading', 'meaning',
             'translation', 'context'}
# Optional provenance metadata (second-set entries sourced from textbooks).
SENT_OPT_KEYS = {'source', 'note'}
SOURCE_WHITELIST = {
    'irodori-l1', 'irodori-l2', 'irodori-l3', 'irodori-l4',
    'irodori-l5', 'irodori-l6', 'irodori-l7', 'irodori-l8',
    'irodori-l9', 'irodori-l10', 'irodori-l11', 'irodori-l12',
    'irodori-l13', 'irodori-l14', 'irodori-l15', 'irodori-l16',
    'irodori-l17', 'irodori-l18', 'dekiru-l1',
    'irodori2-l1', 'irodori2-l2', 'irodori2-l3', 'irodori2-l4',
    'irodori2-l5', 'irodori2-l6', 'irodori2-l7', 'irodori2-l8',
    'irodori2-l9', 'irodori2-l10', 'irodori2-l11', 'irodori2-l12',
    'irodori2-l13', 'irodori2-l14', 'irodori2-l15', 'irodori2-l16',
    # Reused, openly licensed example sentences selected from the JED corpus.
    'jed',
}
NOTE_WHITELIST = {'verbatim', 'reconstructed'}
issues = []


def fail(ctx, msg):
    issues.append(f'{ctx}: {msg}')


def is_counter(word):
    """People/month/year counters are exempted from needing their own sentence."""
    return bool(re.fullmatch(r'[0-9]+(人|か月|年)', word)) or word in ('何人',)


def is_bound_form(word):
    """Bound affixes/patterns (～様, ～cm, ノー～) and slash-joined register
    variants (昭和／昭) can't stand alone as a sentence target verbatim, so
    they're structurally exempt from needing their own dedicated sentence."""
    return '～' in word or '〜' in word or '／' in word


def main():
    contexts = json.loads((ROOT / 'contexts.json').read_text())
    ids = [c['id'] for c in contexts]
    if len(set(ids)) != len(ids):
        fail('contexts.json', f'duplicate ids: {ids}')
    for c in contexts:
        if set(c.keys()) != {'id', 'label', 'labelEn'}:
            fail('contexts.json', f'unexpected keys in {c}')

    for ctx in ids:
        try:
            words = json.loads((ROOT / 'words' / f'{ctx}.json').read_text())
            sents = json.loads((ROOT / 'sentences' / f'{ctx}.json').read_text())
        except FileNotFoundError as e:
            fail(ctx, f'missing file ({e.filename})')
            continue
        except json.JSONDecodeError as e:
            fail(ctx, f'invalid JSON: {e}')
            continue
        if not words or not sents:
            fail(ctx, 'empty dataset')

        ranks, wtexts = [], []
        for w in words:
            if set(w.keys()) != WORD_KEYS:
                fail(ctx, f'word key mismatch {w}')
            if w.get('context') != ctx:
                fail(ctx, f'word context field mismatch: {w.get("word")}')
            for f in ('word', 'reading', 'meaning'):
                if not w.get(f):
                    fail(ctx, f'word empty field {f}: {w}')
            ranks.append(w.get('frequencyRank'))
            wtexts.append(w.get('word'))
            # Reading mode drops kana-only words; anything the reader can't
            # make progress on deserves a look rather than silent filtering.
        if len(set(ranks)) != len(ranks):
            fail(ctx, 'duplicate frequencyRank values')
        if sorted(ranks) != list(range(1, len(words) + 1)):
            fail(ctx, f'frequencyRank not sequential 1..{len(words)} '
                      f'(got {sorted(x for x in ranks if x is not None)})')
        if len(set(wtexts)) != len(wtexts):
            dupes = sorted({t for t in wtexts if wtexts.count(t) > 1})
            fail(ctx, f'duplicate word surfaces: {dupes}')

        hits = set()
        pairs = []
        for s in sents:
            extra = set(s.keys()) - SENT_KEYS
            if extra - SENT_OPT_KEYS:
                fail(ctx, f'unexpected sentence keys {sorted(extra)}')
            elif extra & SENT_OPT_KEYS and (
                    s.get('source') not in SOURCE_WHITELIST or
                    s.get('note') not in NOTE_WHITELIST):
                fail(ctx, f"bad provenance: source={s.get('source')!r} "
                          f"note={s.get('note')!r}")
            if not SENT_KEYS.issubset(s.keys()) or set(s.keys()) - SENT_KEYS - SENT_OPT_KEYS:
                fail(ctx, f'sentence key mismatch: {s.get("sentence", "")[:24]}')
            if s.get('context') != ctx:
                fail(ctx, f'sentence context field mismatch: {s.get("sentence", "")[:24]}')
            t, sent = s.get('target'), s.get('sentence', '')
            if not all(s.get(f) for f in SENT_KEYS - {'context'}):
                fail(ctx, f'sentence empty field: {sent[:24]}')
            if t and t not in sent:
                fail(ctx, f'target {t!r} not embedded verbatim in: {sent[:32]}')
            elif t and sent.count(t) > 1:
                # highlightTarget/blankSentence use indexOf -> first occurrence;
                # multiple occurrences would highlight the wrong one.
                fail(ctx, f'target {t!r} occurs {sent.count(t)}x (ambiguous): {sent[:32]}')
            pairs.append((sent, t))
            hits.add(t)
        # An existing sentence may illustrate more than one word.  The
        # target distinguishes those deliberately reused records; only an
        # identical sentence/target pair would be redundant.
        if len(set(pairs)) != len(pairs):
            fail(ctx, 'duplicate sentence/target pairs')

        uncovered = [w['word'] for w in words
                     if w['word'] not in hits and not is_counter(w['word'])
                     and not is_bound_form(w['word'])]
        if uncovered:
            print(f'note[{ctx}]: words without own sentence target '
                  f'(must be covered by inflected targets): {uncovered}')

    if issues:
        print(f'\n{len(issues)} ISSUE(S):')
        for i in issues:
            print(' -', i)
        return 1
    n_words = sum(len(json.loads((ROOT / 'words' / f'{c}.json').read_text())) for c in ids)
    n_sents = sum(len(json.loads((ROOT / 'sentences' / f'{c}.json').read_text())) for c in ids)
    print(f'OK: {len(ids)} contexts, {n_words} words, {n_sents} sentences.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
