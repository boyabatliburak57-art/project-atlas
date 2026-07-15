import { WatchlistError } from './errors.js';

const htmlMarkup = /<[^>]*>|[<>]/u;

export function normalizeWatchlistName(value: string): string {
  const name = value.trim();
  if (name.length === 0 || name.length > 160 || hasControlCharacters(name)) {
    throw new WatchlistError('WATCHLIST_INVALID', { field: 'name' });
  }
  return name;
}

export function normalizeWatchlistDescription(
  value: string | null | undefined,
): string | null {
  return normalizeOptionalPlainText(value, 'description', 4_000, false);
}

export function normalizeWatchlistNote(
  value: string | null | undefined,
): string | null {
  return normalizeOptionalPlainText(value, 'note', 2_000, true);
}

export function normalizeWatchlistTags(
  values: readonly string[] | undefined,
): readonly string[] {
  if (values === undefined) return [];
  const tags = [
    ...new Set(values.map((tag) => tag.trim().toLowerCase().normalize('NFKC'))),
  ].sort();
  if (
    tags.length > 20 ||
    tags.some(
      (tag) =>
        tag.length === 0 ||
        tag.length > 64 ||
        hasControlCharacters(tag) ||
        htmlMarkup.test(tag),
    )
  ) {
    throw new WatchlistError('WATCHLIST_INVALID', { field: 'tags' });
  }
  return Object.freeze(tags);
}

function normalizeOptionalPlainText(
  value: string | null | undefined,
  field: 'description' | 'note',
  maxLength: number,
  rejectMarkup: boolean,
): string | null {
  if (value === undefined || value === null) return null;
  const normalized = value.trim();
  if (
    normalized.length > maxLength ||
    hasControlCharacters(normalized) ||
    (rejectMarkup && htmlMarkup.test(normalized))
  ) {
    throw new WatchlistError('WATCHLIST_INVALID', { field });
  }
  return normalized === '' ? null : normalized;
}

function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0)!;
    return (
      codePoint <= 8 ||
      codePoint === 11 ||
      codePoint === 12 ||
      (codePoint >= 14 && codePoint <= 31) ||
      codePoint === 127
    );
  });
}
