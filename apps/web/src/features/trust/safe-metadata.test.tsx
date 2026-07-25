import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { disclosureEntries, SafeMetadata } from './safe-metadata';

describe('safe disclosure metadata', () => {
  it('keeps bounded public methodology and source revisions', () => {
    expect(
      disclosureEntries({
        provider: 'BIST licensed feed',
        sourceRevision: 'rev-17',
        methodology: { version: 'risk-v2', observations: 252 },
      }),
    ).toEqual([
      { label: 'provider', value: 'BIST licensed feed' },
      { label: 'sourceRevision', value: 'rev-17' },
      { label: 'methodology.version', value: 'risk-v2' },
      { label: 'methodology.observations', value: '252' },
    ]);
  });

  it('removes secrets and internal topology at every nesting level', () => {
    expect(
      disclosureEntries({
        provider: 'public-label',
        endpoint: 'https://internal.invalid',
        nested: {
          accessToken: 'secret',
          databaseHost: 'db.internal',
          hash: 'already-visible-in-evidence-line',
          revision: 'safe-revision',
        },
      }),
    ).toEqual([
      { label: 'provider', value: 'public-label' },
      { label: 'nested.revision', value: 'safe-revision' },
    ]);
  });

  it('renders metadata as text instead of markup', () => {
    render(
      <SafeMetadata
        metadata={{ provider: '<img src=x onerror=alert(1)>', version: 'v1' }}
      />,
    );
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeVisible();
    expect(document.querySelector('img')).toBeNull();
  });
});
