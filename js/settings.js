// User preferences (as opposed to js/progress.js, which tracks learning
// history), saved to their own localStorage entry so resetting progress
// never wipes a user's configured preferences and vice versa.

const SettingsManager = (() => {
  const STORAGE_KEY = 'kotoba-settings';
  // showHint toggles the secondary text under the quiz prompt: the meaning
  // in Reading mode, the reading in Meaning mode (see README "Modes" — both
  // are togglable). Fill-in-the-blank never shows it.
  // furigana defaults to true: it's the master switch for reading annotations
  // (ruby) over kanji — the meaning-mode hint furigana and the post-answer
  // reveal furigana over the target word. Off means no ruby anywhere (spoken
  // readings via playAudio are unaffected). Furigana is only ever shown over
  // the target word, never the whole sentence — the audio carries that.
  // autoNext defaults to true: after answering, the quiz advances after a short
  // timed pause. Turning it off makes it wait for a manual continue
  // (tap / → / Enter) so there's unlimited time to read the revealed
  // answer/furigana. playAudio defaults to false (spoken readings off); turning
  // it on speaks the word's reading. It stays a real boolean here (audioEnabled()
  // in app.js still treats a legacy `null` from earlier versions as "never
  // chosen").
  const DEFAULTS = { showHint: true, furigana: true, roundSize: 10, autoNext: true, playAudio: false };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function save(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // localStorage unavailable (private mode, quota, etc.) — fail silently
    }
  }

  function get(key) {
    return load()[key];
  }

  function set(key, value) {
    const settings = load();
    settings[key] = value;
    save(settings);
  }

  return { get, set };
})();
