import {
  dataProviders,
  fundamentalMetricSnapshots,
  fundamentalRatioSnapshots,
  fundamentalStatementSnapshots,
  providerInstrumentMappings,
  type Database,
} from '@atlas/database';
import {
  FUNDAMENTAL_METRIC_CODES,
  VersionedRatioRegistry,
  type NormalizedFundamentalStatement,
} from '@atlas/domain';
import { and, eq } from 'drizzle-orm';
import type { FundamentalsIngestionStore } from './contracts';

export class DatabaseFundamentalsStore implements FundamentalsIngestionStore {
  constructor(private readonly database: Database) {}

  async resolveContext(providerCode: string, providerSymbol: string) {
    const rows = await this.database
      .select({
        providerId: dataProviders.id,
        instrumentId: providerInstrumentMappings.instrumentId,
      })
      .from(providerInstrumentMappings)
      .innerJoin(
        dataProviders,
        eq(dataProviders.id, providerInstrumentMappings.providerId),
      )
      .where(
        and(
          eq(dataProviders.code, providerCode),
          eq(dataProviders.status, 'active'),
          eq(providerInstrumentMappings.providerSymbol, providerSymbol),
          eq(providerInstrumentMappings.active, true),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async persist(
    statements: readonly NormalizedFundamentalStatement[],
    providerId: string,
  ) {
    return this.database.transaction(async (tx) => {
      let insertedStatements = 0,
        duplicateStatements = 0,
        insertedMetrics = 0;
      const ordered = [...statements].sort(
        (left, right) => left.periodEnd.getTime() - right.periodEnd.getTime(),
      );
      const registry = new VersionedRatioRegistry();
      for (let index = 0; index < ordered.length; index += 1) {
        const statement = ordered[index]!;
        const generationId = crypto.randomUUID();
        const rows = await tx
          .insert(fundamentalStatementSnapshots)
          .values({
            instrumentId: statement.instrumentId,
            providerId,
            statementType: 'consolidated',
            fiscalYear: statement.fiscalYear,
            fiscalPeriod: statement.fiscalPeriod,
            periodStart: statement.periodStart,
            periodEnd: statement.periodEnd,
            currencyCode: statement.currencyCode,
            unitScale: '1',
            providerRevision: statement.providerRevision,
            generationId,
            policyVersion: 'fundamentals-normalization-v1',
            dataCutoffAt: statement.sourceTimestamp,
            publishedAt: statement.publishedAt,
            sourceTimestamp: statement.sourceTimestamp,
            normalizedPayload: { periodType: statement.periodType },
            qualityStatus:
              Object.keys(statement.metrics).length ===
              FUNDAMENTAL_METRIC_CODES.length
                ? 'complete'
                : 'partial',
            qualityMetadata: { warnings: statement.warnings },
          })
          .onConflictDoNothing()
          .returning({ id: fundamentalStatementSnapshots.id });
        const snapshotId = rows[0]?.id;
        if (!snapshotId) {
          duplicateStatements += 1;
          continue;
        }
        insertedStatements += 1;
        const metricRows = FUNDAMENTAL_METRIC_CODES.map((code) => {
          const value = statement.metrics[code];
          return {
            statementSnapshotId: snapshotId,
            generationId,
            policyVersion: 'fundamentals-normalization-v1',
            dataCutoffAt: statement.sourceTimestamp,
            metricCode: code,
            value: value ?? null,
            status: value === undefined ? 'missing' : 'complete',
            reasonCode: value === undefined ? 'PROVIDER_METRIC_MISSING' : null,
            metadata: {
              currencyCode: statement.currencyCode,
              providerRevision: statement.providerRevision,
            },
            qualityMetadata: {},
          };
        });
        await tx.insert(fundamentalMetricSnapshots).values(metricRows);
        insertedMetrics += metricRows.length;
        const previous = ordered[index - 1];
        const ratios = registry.calculate({
          current: statement,
          ...(previous ? { previous } : {}),
        });
        await tx.insert(fundamentalRatioSnapshots).values(
          ratios.map((ratio) => ({
            instrumentId: statement.instrumentId,
            generationId,
            policyVersion: 'fundamentals-normalization-v1',
            dataCutoffAt: statement.sourceTimestamp,
            ratioCode: ratio.code,
            formulaVersion: ratio.formulaVersion,
            fiscalPeriodReference: ratio.financialPeriod,
            marketDataCutoffAt: ratio.marketDataCutoffAt,
            value: ratio.value,
            status: ratio.status,
            reasonCode: ratio.reasonCode,
            inputs: { providerRevisions: ratio.inputRevisions },
            qualityMetadata: { warnings: ratio.warnings },
          })),
        );
      }
      return { insertedStatements, duplicateStatements, insertedMetrics };
    });
  }
}
