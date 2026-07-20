import { describe, expect, it } from 'vitest';

import { roleConsumesQueue } from './worker-runtime';

describe('production worker process roles', () => {
  it('keeps every production queue composition root explicit', () => {
    expect(roleConsumesQueue('market-data', 'market-data')).toBe(true);
    expect(roleConsumesQueue('scanner', 'scanner')).toBe(true);
    expect(roleConsumesQueue('alert', 'alert')).toBe(true);
    expect(roleConsumesQueue('notification', 'notification')).toBe(true);
    expect(roleConsumesQueue('backtest', 'backtest')).toBe(true);
    expect(roleConsumesQueue('experiment', 'experiment')).toBe(true);
    expect(roleConsumesQueue('scheduled', 'scheduled')).toBe(true);
  });

  it('does not let a dedicated process consume another role queue', () => {
    expect(roleConsumesQueue('scanner', 'backtest')).toBe(false);
    expect(roleConsumesQueue('alert', 'notification')).toBe(false);
    expect(roleConsumesQueue('scheduled', 'market-data')).toBe(false);
  });

  it('preserves the all role for local and integration composition', () => {
    expect(roleConsumesQueue('all', 'scanner')).toBe(true);
    expect(roleConsumesQueue('all', 'experiment')).toBe(true);
  });
});
