const CACHE_VERSION = 'kotoba-v28';

const CORE_ASSETS = [
  '.',
  'index.html',
  'style.css',
  'manifest.json',
  'CHANGELOG.md',
  'js/settings.js',
  'js/audio.js',
  'js/progress.js',
  'js/progress-view.js',
  'js/learning/QuestionSelectionStrategy.js',
  'js/learning/review/ReviewSchedulerConfig.js',
  'js/learning/review/ReviewScheduler.js',
  'js/learning/strategies/WeightedScoreStrategy.js',
  'js/learning/strategies/SpacedRepetitionStrategy.js',
  'js/learning/QuestionSelectorConfig.js',
  'js/learning/QuestionSelector.js',
  'js/learning/distractors/DistractorStrategy.js',
  'js/learning/distractors/features/SimilarityFeatures.js',
  'js/learning/distractors/strategies/WeightedDistractorStrategy.js',
  'js/learning/distractors/DistractorConfig.js',
  'js/learning/distractors/DistractorGenerator.js',
  'js/app.js',
  'data/contexts.json',
  'data/words/restaurant.json',
  'data/words/hospital.json',
  'data/words/station.json',
  'data/words/airport.json',
  'data/words/classroom.json',
  'data/words/home.json',
  'data/sentences/restaurant.json',
  'data/sentences/hospital.json',
  'data/sentences/station.json',
  'data/sentences/airport.json',
  'data/sentences/classroom.json',
  'data/sentences/home.json',
  'data/words/workplace.json',
  'data/sentences/workplace.json',
  'data/words/hobby.json',
  'data/words/weather.json',
  'data/sentences/hobby.json',
  'data/sentences/weather.json',
  'data/words/neighborhood.json',
  'data/sentences/neighborhood.json',
  'data/words/outings.json',
  'data/sentences/outings.json',
  'data/words/japanese-study.json',
  'data/sentences/japanese-study.json',
  'data/words/cooking.json',
  'data/sentences/cooking.json',
  'data/words/work-communication.json',
  'data/sentences/work-communication.json',
  'data/words/health.json',
  'data/sentences/health.json',
  'data/words/relationships.json',
  'data/sentences/relationships.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate: serve from cache instantly, then refresh the
// cache in the background so the app works fully offline while still
// picking up updates whenever the network is available.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
