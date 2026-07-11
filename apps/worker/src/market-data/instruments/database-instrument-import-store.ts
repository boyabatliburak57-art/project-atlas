import {
  dataProviders,
  ingestionRuns,
  instruments,
  instrumentSymbolHistory,
  providerInstrumentMappings,
  type Database,
} from '@atlas/database';
import { and, eq, ne } from 'drizzle-orm';

import type {
  InstrumentImportChanges,
  InstrumentImportStore,
  NormalizedInstrument,
} from './contracts';

type DatabaseTransaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0];

interface InstrumentRecord {
  readonly id: string;
  readonly symbol: string;
  readonly normalizedSymbol: string;
  readonly name: string;
  readonly isin: string | null;
  readonly marketCode: string;
  readonly currencyCode: string;
  readonly status: string;
  readonly createdAt: Date;
}

interface MappingRecord {
  readonly id: string;
  readonly instrumentId: string;
  readonly providerMarket: string | null;
  readonly active: boolean;
}

interface Match {
  readonly instrument: InstrumentRecord | null;
  readonly mapping: MappingRecord | null;
}

interface MutableChanges {
  createdCount: number;
  updatedCount: number;
  mappingCreatedCount: number;
  mappingUpdatedCount: number;
}

export class DatabaseInstrumentImportStore implements InstrumentImportStore {
  constructor(private readonly database: Database) {}

  async findActiveProviderId(code: string): Promise<string | null> {
    const rows = await this.database
      .select({ id: dataProviders.id })
      .from(dataProviders)
      .where(
        and(eq(dataProviders.code, code), ne(dataProviders.status, 'inactive')),
      )
      .limit(1);

    return rows[0]?.id ?? null;
  }

  async previewImport(
    providerId: string,
    importInstruments: readonly NormalizedInstrument[],
  ): Promise<InstrumentImportChanges> {
    const changes = this.emptyChanges();

    for (const instrument of importInstruments) {
      const match = await this.findMatch(this.database, providerId, instrument);
      this.countPlannedChanges(changes, match, instrument);
    }

    return {
      ...changes,
      deactivationCandidates: await this.findDeactivationCandidates(
        this.database,
        providerId,
        importInstruments,
      ),
    };
  }

  async createRun(providerId: string): Promise<string> {
    const rows = await this.database
      .insert(ingestionRuns)
      .values({
        providerId,
        jobType: 'instrument_sync',
        status: 'running',
        fetchedCount: 0,
        metadata: { dryRun: false },
      })
      .returning({ id: ingestionRuns.id });
    const runId = rows[0]?.id;
    if (runId === undefined) {
      throw new Error('Ingestion run could not be created');
    }
    return runId;
  }

  async applyImport(
    runId: string,
    providerId: string,
    importInstruments: readonly NormalizedInstrument[],
    fetchedCount: number,
    rejectedCount: number,
  ): Promise<InstrumentImportChanges> {
    return this.database.transaction(async (transaction) => {
      const changes = this.emptyChanges();

      for (const instrument of importInstruments) {
        await this.upsertInstrument(
          transaction,
          providerId,
          instrument,
          changes,
        );
      }

      const deactivationCandidates = await this.findDeactivationCandidates(
        transaction,
        providerId,
        importInstruments,
      );
      const result = { ...changes, deactivationCandidates };

      await transaction
        .update(ingestionRuns)
        .set({
          status: 'completed',
          completedAt: new Date(),
          fetchedCount,
          acceptedCount: importInstruments.length,
          rejectedCount,
          metadata: {
            createdCount: changes.createdCount,
            deactivationCandidateCount: deactivationCandidates.length,
            dryRun: false,
            mappingCreatedCount: changes.mappingCreatedCount,
            mappingUpdatedCount: changes.mappingUpdatedCount,
            updatedCount: changes.updatedCount,
          },
          updatedAt: new Date(),
        })
        .where(eq(ingestionRuns.id, runId));

      return result;
    });
  }

  async failRun(runId: string, errorCode: string): Promise<void> {
    await this.database
      .update(ingestionRuns)
      .set({
        status: 'failed',
        completedAt: new Date(),
        errorCode,
        updatedAt: new Date(),
      })
      .where(eq(ingestionRuns.id, runId));
  }

  private async upsertInstrument(
    transaction: DatabaseTransaction,
    providerId: string,
    input: NormalizedInstrument,
    changes: MutableChanges,
  ): Promise<void> {
    const match = await this.findMatch(transaction, providerId, input);
    let instrumentId = match.instrument?.id;

    if (instrumentId === undefined) {
      const rows = await transaction
        .insert(instruments)
        .values({
          symbol: input.symbol,
          normalizedSymbol: input.normalizedSymbol,
          name: input.name,
          ...(input.isin === undefined ? {} : { isin: input.isin }),
          marketCode: input.marketCode,
          currencyCode: input.currencyCode,
          status: input.status,
        })
        .returning({ id: instruments.id });
      instrumentId = rows[0]?.id;
      if (instrumentId === undefined) {
        throw new Error('Instrument could not be created');
      }
      changes.createdCount += 1;
    } else if (this.instrumentChanged(match.instrument, input)) {
      if (
        match.instrument !== null &&
        match.instrument.symbol !== input.symbol
      ) {
        const today = new Date().toISOString().slice(0, 10);
        const validFrom = match.instrument.createdAt.toISOString().slice(0, 10);
        await transaction
          .insert(instrumentSymbolHistory)
          .values({
            instrumentId,
            symbol: match.instrument.symbol,
            validFrom,
            validTo: today,
            reason: 'provider_sync',
          })
          .onConflictDoNothing();
      }

      await transaction
        .update(instruments)
        .set({
          symbol: input.symbol,
          normalizedSymbol: input.normalizedSymbol,
          name: input.name,
          isin: input.isin ?? null,
          marketCode: input.marketCode,
          currencyCode: input.currencyCode,
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(instruments.id, instrumentId));
      changes.updatedCount += 1;
    }

    if (match.mapping === null) {
      // A changed provider symbol may resolve through ISIN or canonical symbol.
      // Only the directly replaced mapping is deactivated; absent instruments remain untouched.
      await transaction
        .update(providerInstrumentMappings)
        .set({ active: false, updatedAt: new Date() })
        .where(
          and(
            eq(providerInstrumentMappings.providerId, providerId),
            eq(providerInstrumentMappings.instrumentId, instrumentId),
            eq(providerInstrumentMappings.active, true),
          ),
        );
      await transaction.insert(providerInstrumentMappings).values({
        providerId,
        instrumentId,
        providerSymbol: input.providerSymbol,
        providerMarket: input.marketCode,
        active: true,
        metadata: {},
      });
      changes.mappingCreatedCount += 1;
    } else if (
      match.mapping.instrumentId !== instrumentId ||
      match.mapping.providerMarket !== input.marketCode ||
      !match.mapping.active
    ) {
      await transaction
        .update(providerInstrumentMappings)
        .set({
          instrumentId,
          providerMarket: input.marketCode,
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(providerInstrumentMappings.id, match.mapping.id));
      changes.mappingUpdatedCount += 1;
    }
  }

  private async findMatch(
    database: Database | DatabaseTransaction,
    providerId: string,
    input: NormalizedInstrument,
  ): Promise<Match> {
    const mappingRows = await database
      .select({
        mapping: {
          id: providerInstrumentMappings.id,
          instrumentId: providerInstrumentMappings.instrumentId,
          providerMarket: providerInstrumentMappings.providerMarket,
          active: providerInstrumentMappings.active,
        },
        instrument: {
          id: instruments.id,
          symbol: instruments.symbol,
          normalizedSymbol: instruments.normalizedSymbol,
          name: instruments.name,
          isin: instruments.isin,
          marketCode: instruments.marketCode,
          currencyCode: instruments.currencyCode,
          status: instruments.status,
          createdAt: instruments.createdAt,
        },
      })
      .from(providerInstrumentMappings)
      .innerJoin(
        instruments,
        eq(providerInstrumentMappings.instrumentId, instruments.id),
      )
      .where(
        and(
          eq(providerInstrumentMappings.providerId, providerId),
          eq(providerInstrumentMappings.providerSymbol, input.providerSymbol),
        ),
      )
      .limit(1);
    const mapped = mappingRows[0];
    if (mapped !== undefined) {
      return mapped;
    }

    if (input.isin !== undefined) {
      const isinRows = await this.findInstrumentsByIsin(database, input.isin);
      if (isinRows.length > 1) {
        throw new Error('Multiple instruments share the provider ISIN');
      }
      if (isinRows[0] !== undefined) {
        return { instrument: isinRows[0], mapping: null };
      }
    }

    const symbolRows = await database
      .select(this.instrumentSelection())
      .from(instruments)
      .where(
        and(
          eq(instruments.normalizedSymbol, input.normalizedSymbol),
          eq(instruments.status, 'active'),
        ),
      )
      .limit(1);

    return { instrument: symbolRows[0] ?? null, mapping: null };
  }

  private findInstrumentsByIsin(
    database: Database | DatabaseTransaction,
    isin: string,
  ): Promise<InstrumentRecord[]> {
    return database
      .select(this.instrumentSelection())
      .from(instruments)
      .where(eq(instruments.isin, isin))
      .limit(2);
  }

  private async findDeactivationCandidates(
    database: Database | DatabaseTransaction,
    providerId: string,
    importInstruments: readonly NormalizedInstrument[],
  ): Promise<readonly string[]> {
    const incomingSymbols = importInstruments.map(
      (instrument) => instrument.providerSymbol,
    );
    const rows = await database
      .select({ providerSymbol: providerInstrumentMappings.providerSymbol })
      .from(providerInstrumentMappings)
      .where(
        and(
          eq(providerInstrumentMappings.providerId, providerId),
          eq(providerInstrumentMappings.active, true),
        ),
      );
    const incoming = new Set(incomingSymbols);
    return rows
      .map((row) => row.providerSymbol)
      .filter((symbol) => !incoming.has(symbol))
      .sort();
  }

  private instrumentSelection() {
    return {
      id: instruments.id,
      symbol: instruments.symbol,
      normalizedSymbol: instruments.normalizedSymbol,
      name: instruments.name,
      isin: instruments.isin,
      marketCode: instruments.marketCode,
      currencyCode: instruments.currencyCode,
      status: instruments.status,
      createdAt: instruments.createdAt,
    };
  }

  private instrumentChanged(
    current: InstrumentRecord | null,
    input: NormalizedInstrument,
  ): boolean {
    return (
      current === null ||
      current.symbol !== input.symbol ||
      current.normalizedSymbol !== input.normalizedSymbol ||
      current.name !== input.name ||
      current.isin !== (input.isin ?? null) ||
      current.marketCode !== input.marketCode ||
      current.currencyCode !== input.currencyCode ||
      current.status !== input.status
    );
  }

  private countPlannedChanges(
    changes: MutableChanges,
    match: Match,
    input: NormalizedInstrument,
  ): void {
    if (match.instrument === null) {
      changes.createdCount += 1;
    } else if (this.instrumentChanged(match.instrument, input)) {
      changes.updatedCount += 1;
    }

    if (match.mapping === null) {
      changes.mappingCreatedCount += 1;
    } else if (
      match.mapping.providerMarket !== input.marketCode ||
      !match.mapping.active
    ) {
      changes.mappingUpdatedCount += 1;
    }
  }

  private emptyChanges(): MutableChanges {
    return {
      createdCount: 0,
      updatedCount: 0,
      mappingCreatedCount: 0,
      mappingUpdatedCount: 0,
    };
  }
}
