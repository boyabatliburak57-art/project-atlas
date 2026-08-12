import { performance } from 'node:perf_hooks';
import { AppLifecycleController } from '../src/services/app-lifecycle';
import { NetworkStatusController } from '../src/services/network-status';
import { OwnerScopedMemoryCache } from '../src/security/offline-cache';
import { AppLockController } from '../src/security/app-lock';
import { redactSensitive } from '../src/security/redaction';

function benchmark(label: string, iterations: number, work: () => void) {
  const started = performance.now();
  for (let index = 0; index < iterations; index += 1) work();
  return { label, iterations, totalMs: performance.now() - started };
}

const lifecycle = new AppLifecycleController();
let lifecycleEvents = 0;
const removeLifecycle = lifecycle.onStateChange(() => {
  lifecycleEvents += 1;
});
const lifecycleResult = benchmark('background_foreground_cycles', 20, () => {
  lifecycle.transition('background');
  lifecycle.transition('active');
});
removeLifecycle();

const network = new NetworkStatusController();
let networkEvents = 0;
const removeNetwork = network.subscribe(() => {
  networkEvents += 1;
});
const networkResult = benchmark('offline_online_cycles', 20, () => {
  network.setStatus('offline');
  network.setStatus('online');
});
removeNetwork();

const cache = new OwnerScopedMemoryCache(250);
const cacheWrite = benchmark('bounded_cache_write', 10_000, () => {
  cache.set('benchmark-owner', 'portfolio', Math.random().toString(36), 1, 0);
});
const cachePurge = benchmark('bounded_cache_purge', 1, () =>
  cache.clearPrivate(),
);

let monotonic = 0;
const lock = new AppLockController('shortGrace', () => monotonic, 30);
const lockResult = benchmark('app_lock_cycles', 10_000, () => {
  lock.onBackground();
  monotonic += 31;
  lock.onForeground();
  lock.unlock('success');
});

const payload = {
  authorization: 'Bearer private-token',
  nested: { portfolioValue: '123', supportDescription: 'private content' },
  reasonCode: 'SAFE',
};
const redaction = benchmark('redaction', 10_000, () => {
  redactSensitive(payload);
});

process.stdout.write(
  `${JSON.stringify(
    {
      lifecycleEvents,
      lifecycleListenerCountAfterCleanup: lifecycle.listenerCount(),
      networkEvents,
      networkListenerCountAfterCleanup: network.listenerCount(),
      finalCacheSize: cache.size(),
      results: [
        lifecycleResult,
        networkResult,
        cacheWrite,
        cachePurge,
        lockResult,
        redaction,
      ],
    },
    null,
    2,
  )}\n`,
);
