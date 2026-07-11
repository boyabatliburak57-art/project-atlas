import type { ProviderInstrumentDto } from '../providers';
import type {
  InstrumentImportPlan,
  InstrumentImportRejection,
  NormalizedInstrument,
} from './contracts';

const BIST_SYMBOL_PATTERN = /^[A-Z0-9]{1,32}$/;

function duplicateValues(
  values: readonly (string | undefined)[],
): ReadonlySet<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (value === undefined) {
      continue;
    }
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return duplicates;
}

export function normalizeBistSymbol(value: string): string {
  const normalized = value.normalize('NFKC').trim().toUpperCase();
  if (!BIST_SYMBOL_PATTERN.test(normalized)) {
    throw new Error('Invalid BIST symbol');
  }
  return normalized;
}

export function planInstrumentImport(
  providerInstruments: readonly ProviderInstrumentDto[],
): InstrumentImportPlan {
  const providerSymbols = providerInstruments.map((item) =>
    item.providerSymbol.trim().toUpperCase(),
  );
  const normalizedIsins = providerInstruments.map((item) =>
    item.isin?.trim().toUpperCase(),
  );
  const duplicateProviderSymbols = duplicateValues(providerSymbols);
  const duplicateIsins = duplicateValues(normalizedIsins);
  const instruments: NormalizedInstrument[] = [];
  const rejections: InstrumentImportRejection[] = [];

  providerInstruments.forEach((item, index) => {
    const providerSymbol = providerSymbols[index] ?? item.providerSymbol;
    const isin = normalizedIsins[index];
    let rejectionCode: InstrumentImportRejection['code'] | undefined;
    let symbol: string | undefined;

    if (duplicateProviderSymbols.has(providerSymbol)) {
      rejectionCode = 'DUPLICATE_PROVIDER_SYMBOL';
    } else if (isin !== undefined && duplicateIsins.has(isin)) {
      rejectionCode = 'DUPLICATE_ISIN';
    } else if (item.marketCode.trim().toUpperCase() !== 'BIST') {
      rejectionCode = 'INVALID_MARKET';
    } else {
      try {
        symbol = normalizeBistSymbol(item.symbol);
      } catch {
        rejectionCode = 'INVALID_SYMBOL';
      }
    }

    if (rejectionCode !== undefined || symbol === undefined) {
      rejections.push({
        providerSymbol,
        code: rejectionCode ?? 'INVALID_SYMBOL',
      });
      return;
    }

    instruments.push({
      providerSymbol,
      symbol,
      normalizedSymbol: symbol,
      name: item.name.trim(),
      ...(isin === undefined ? {} : { isin }),
      marketCode: 'BIST',
      currencyCode: item.currencyCode.trim().toUpperCase(),
      status:
        item.status === 'suspended' ? 'inactive' : (item.status ?? 'active'),
    });
  });

  return { instruments, rejections };
}
