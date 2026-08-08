// User preferences (as opposed to js/progress.js, which tracks learning
// history), saved to their own localStorage entry so resetting progress
// never wipes a user's configured preferences and vice versa.

const SettingsManager = (() => {
  const STORAGE_KEY = 'kotoba-settings';
  // showHint toggles the secondary text under the quiz prompt: the meaning
  // in Reading mode, the reading in Meaning mode (see README "Modes" — both
  // are togglable). Fill-in-the-blank never shows it.
  // autoNext defaults to false: after answering, the quiz waits for the learner
  // to continue (tap / → / Enter) rather than jumping ahead on a timer, so
  // there's time to read the revealed answer/furigana. playAudio is tri-state
  // (`null` = never chosen), resolved at read time by app.js's audioEnabled()
  // — off in an installed/offline PWA (ja voice often network-dependent), on in
  // a browser tab. Note the load() spread means get('playAudio') returns
  // `null`, not `undefined`, until toggled.
  const DEFAULTS = { showHint: true, roundSize: 10, autoNext: false, playAudio: null };

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
