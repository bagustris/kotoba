// Pure lookup + mora segmentation over data/pitch-accent.json. No DOM, no
// settings access — app.js's renderPitchAccent() is the orchestrator that
// decides when to show this. Data derived from Kanjium
// (https://github.com/mifunetoshiro/kanjium, CC BY-SA 4.0) — see README
// "Data sources".
const PitchAccent = (function () {
  'use strict';

  let table = null; // { word: { reading: { pos, pattern } } }

  async function load(fetchJSON) {
    try {
      table = await fetchJSON('data/pitch-accent.json');
    } catch (err) {
      console.error('pitch accent data failed to load', err);
      table = {};
    }
  }

  // Small kana attach to the preceding character (きょ, しゃ, etc. are one
  // mora); everything else — including っ and ー — is its own mora.
  const SMALL_KANA = new Set([...'ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ']);
  function moraSplit(reading) {
    const moras = [];
    for (const ch of reading) {
      if (SMALL_KANA.has(ch) && moras.length) moras[moras.length - 1] += ch;
      else moras.push(ch);
    }
    return moras;
  }

  // Returns { pos, pattern } for an exact (word, reading) match, or null.
  function lookup(word, reading) {
    if (!table) return null;
    const entry = table[word];
    if (!entry) return null;
    return entry[reading] || null;
  }

  return { load, lookup, moraSplit };
})();
