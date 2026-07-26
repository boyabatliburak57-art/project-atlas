import type { NormalizedFundamentalStatement } from './contracts.js';

export function selectFundamentalRevisionAt(
  statements: readonly NormalizedFundamentalStatement[],
  cutoffAt: Date,
): NormalizedFundamentalStatement | null {
  return (
    statements
      .filter(
        (statement) =>
          (statement.availableAt ?? statement.publishedAt).getTime() <=
          cutoffAt.getTime(),
      )
      .sort(
        (left, right) =>
          (right.availableAt ?? right.publishedAt).getTime() -
            (left.availableAt ?? left.publishedAt).getTime() ||
          right.providerRevision.localeCompare(left.providerRevision),
      )[0] ?? null
  );
}
