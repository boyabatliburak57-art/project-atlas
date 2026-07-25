import { describe, expect, it, vi } from 'vitest';

import { createDatabase } from './client';

describe('database pool resilience', () => {
  it('handles idle connection errors without terminating the process', async () => {
    const onPoolError = vi.fn();
    const { pool } = createDatabase(
      'postgresql://atlas:unused@127.0.0.1:1/atlas_test',
      { onPoolError },
    );
    pool.emit(
      'error',
      Object.assign(new Error('terminating connection'), { code: '57P01' }),
    );
    expect(onPoolError).toHaveBeenCalledWith({
      code: '57P01',
      message: 'terminating connection',
    });
    await pool.end();
  });
});
