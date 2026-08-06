// User preferences (as opposed to js/progress.js, which tracks learning
// history), saved to their own localStorage entry so resetting progress
// never wipes a user's configured preferences and vice versa.

const SettingsManager = (() => {
  const STORAGE_KEY = 'kotoba-settings';
  // showHint toggles the secondary text under the quiz prompt: the meaning
  // in Reading mode, the reading in Meaning mode (see README "Modes" — both
  // are togglable). Fill-in-the-blank never shows it.
  const DEFAULTS = { showHint: true, roundSize: 10 };

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
