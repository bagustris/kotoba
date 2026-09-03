// Cross-context word search: `tag:minna-no-nihongo` / `tag:dekiru-nihongo`
// filters by book/lesson origin (js/progress.js and app.js never touch this —
// it's read-only over the word pools, independent of the quiz/context flow).
const KotobaSearch = (function () {
  'use strict';

  let index = null;
  let byId = [];

  // `tag:foo` matches any tag *starting with* foo (so `tag:minna` finds
  // `minna-no-nihongo`) without requiring the user to type the full tag or
  // lunr's own `*` wildcard syntax. Bare terms get the same trailing-wildcard
  // treatment for search-as-you-type.
  function expandQuery(raw) {
    return raw
      .trim()
      .split(/\s+/)
      .map((token) => {
        if (!token) return token;
        const m = token.match(/^(-?)tag:(.+)$/);
        if (m) {
          const [, neg, val] = m;
          return val.endsWith('*') ? token : `${neg}tag:${val}*`;
        }
        return token.endsWith('*') ? token : `${token}*`;
      })
      .join(' ');
  }

  // entries: flat array of raw word objects from data/words/*.json (each
  // already carries word/reading/meaning/context, optionally tags).
  function build(entries) {
    byId = entries;
    index = lunr(function () {
      // lunr's default trimmer/stemmer/stopWordFilter assume Latin-alphabet
      // words (their regexes match \w = [A-Za-z0-9_] only) and silently
      // reduce any Japanese-only token to an empty string, breaking every
      // word/reading match. Index and search raw tokens instead.
      this.pipeline.remove(lunr.trimmer);
      this.pipeline.remove(lunr.stemmer);
      this.pipeline.remove(lunr.stopWordFilter);
      this.searchPipeline.remove(lunr.stemmer);
      this.searchPipeline.remove(lunr.stopWordFilter);
      this.ref('id');
      this.field('word');
      this.field('reading');
      this.field('meaning');
      this.field('tag');
      this.field('context');
      entries.forEach((entry, i) => {
        this.add({
          id: String(i),
          word: entry.word || '',
          reading: entry.reading || '',
          meaning: entry.meaning || '',
          tag: (entry.tags || []).join(' '),
          context: entry.context || '',
        });
      });
    });
  }

  function search(rawQuery) {
    if (!index || !rawQuery || !rawQuery.trim()) return [];
    const expanded = expandQuery(rawQuery);
    let results;
    try {
      results = index.search(expanded);
    } catch (e) {
      // Malformed query syntax (stray ':', unbalanced quotes, etc.) — fail
      // closed to no results rather than throwing into the caller.
      return [];
    }
    return results.map((r) => byId[Number(r.ref)]).filter(Boolean);
  }

  return { build, search };
})();
