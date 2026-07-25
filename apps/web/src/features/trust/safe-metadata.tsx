import type { ReactNode } from 'react';

const blockedKey =
  /^(?:hash)$|(?:secret|token|password|authorization|cookie|connection|endpoint|hostname|database|internal|rawPayload|stack)/iu;

export interface DisclosureEntry {
  readonly label: string;
  readonly value: string;
}

export function disclosureEntries(
  metadata: Readonly<Record<string, unknown>> | null | undefined,
): readonly DisclosureEntry[] {
  if (!metadata) return [];
  return flatten(metadata, '', 0).slice(0, 40);
}

export function SafeMetadata({
  metadata,
  empty = 'Paylaşılabilir metadata bulunmuyor.',
}: {
  readonly metadata: Readonly<Record<string, unknown>> | null | undefined;
  readonly empty?: ReactNode;
}) {
  const entries = disclosureEntries(metadata);
  if (entries.length === 0) return <p>{empty}</p>;
  return (
    <dl className="safe-metadata">
      {entries.map((entry) => (
        <div key={entry.label}>
          <dt>{humanize(entry.label)}</dt>
          <dd>{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function flatten(
  value: Readonly<Record<string, unknown>>,
  prefix: string,
  depth: number,
): DisclosureEntry[] {
  const output: DisclosureEntry[] = [];
  for (const [key, item] of Object.entries(value)) {
    if (blockedKey.test(key)) continue;
    const label = prefix ? `${prefix}.${key}` : key;
    if (isRecord(item) && depth < 2) {
      output.push(...flatten(item, label, depth + 1));
      continue;
    }
    const safe = scalar(item);
    if (safe !== null) output.push({ label, value: safe });
  }
  return output;
}

function scalar(value: unknown) {
  if (typeof value === 'string') return value.slice(0, 160);
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  if (value === null) return 'Belirtilmedi';
  if (
    Array.isArray(value) &&
    value.every((item) => ['string', 'number', 'boolean'].includes(typeof item))
  )
    return value.slice(0, 12).map(String).join(', ').slice(0, 160);
  return null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function humanize(value: string) {
  return value
    .replaceAll('.', ' / ')
    .replace(/([a-z])([A-Z])/gu, '$1 $2')
    .replaceAll('_', ' ');
}
