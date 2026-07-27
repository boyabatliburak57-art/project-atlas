import { sql } from 'drizzle-orm';
import {
  createCoreIndicatorRegistry,
  planScanExecution,
  PRESET_CATEGORY_DEFINITIONS,
  PRESET_SCAN_DEFINITIONS,
  validateScanRule,
} from '@atlas/domain';

import type { Database } from './client';
import {
  dataProviders,
  instruments,
  providerInstrumentMappings,
  presetScanRevisions,
  presetScans,
  scanCategories,
} from './schema';

const MANUAL_IMPORT_PROVIDER_ID = '00000000-0000-4000-8000-000000000001';
const CATALOG_PUBLISHER_ID = '00000000-0000-4000-8000-000000000027';
const BORSA_API_PROVIDER_ID = '00000000-0000-4000-8000-000000000093';
const BORSA_API_PILOT_INSTRUMENTS = [
  ['THYAO', 'Türk Hava Yolları', '00000000-0000-4000-8000-000000000094'],
  ['GARAN', 'Türkiye Garanti Bankası', '00000000-0000-4000-8000-000000000095'],
  ['AKBNK', 'Akbank', '00000000-0000-4000-8000-000000000096'],
  ['EREGL', 'Ereğli Demir ve Çelik', '00000000-0000-4000-8000-000000000097'],
  ['TUPRS', 'Tüpraş', '00000000-0000-4000-8000-000000000098'],
] as const;

export async function seedDatabase(database: Database): Promise<void> {
  const plans = validatePresetCatalog();
  await database.transaction(async (transaction) => {
    await transaction
      .insert(dataProviders)
      .values({
        code: 'manual-import',
        id: MANUAL_IMPORT_PROVIDER_ID,
        name: 'Manual Import',
        status: 'inactive',
      })
      .onConflictDoUpdate({
        set: {
          name: 'Manual Import',
          status: 'inactive',
          updatedAt: sql`now()`,
        },
        target: dataProviders.code,
      });

    await transaction
      .insert(dataProviders)
      .values({
        code: 'borsa-api',
        id: BORSA_API_PROVIDER_ID,
        name: 'borsa-api / third-party delayed data',
        status: 'active',
      })
      .onConflictDoUpdate({
        set: {
          name: 'borsa-api / third-party delayed data',
          status: 'active',
          updatedAt: sql`now()`,
        },
        target: dataProviders.code,
      });

    // Development/pilot reference mappings only; not a BIST instrument master.
    for (const [symbol, name, id] of BORSA_API_PILOT_INSTRUMENTS) {
      await transaction
        .insert(instruments)
        .values({
          id,
          symbol,
          normalizedSymbol: symbol,
          name,
          marketCode: 'BIST',
          currencyCode: 'TRY',
          status: 'active',
        })
        .onConflictDoUpdate({
          set: { name, updatedAt: sql`now()` },
          target: instruments.normalizedSymbol,
          targetWhere: sql`${instruments.status} = 'active'`,
        });
      await transaction
        .insert(providerInstrumentMappings)
        .values({
          providerId: BORSA_API_PROVIDER_ID,
          instrumentId: id,
          providerSymbol: symbol,
          providerMarket: 'BIST',
          metadata: {
            classification: 'development-pilot-reference',
            authoritativeInstrumentMaster: false,
          },
        })
        .onConflictDoUpdate({
          set: {
            active: true,
            metadata: {
              classification: 'development-pilot-reference',
              authoritativeInstrumentMaster: false,
            },
            updatedAt: sql`now()`,
          },
          target: [
            providerInstrumentMappings.providerId,
            providerInstrumentMappings.providerSymbol,
          ],
        });
    }

    for (const category of PRESET_CATEGORY_DEFINITIONS) {
      await transaction
        .insert(scanCategories)
        .values(category)
        .onConflictDoUpdate({
          set: {
            active: true,
            name: category.name,
            sortOrder: category.sortOrder,
            updatedAt: sql`now()`,
          },
          target: scanCategories.code,
        });
    }

    for (const definition of PRESET_SCAN_DEFINITIONS) {
      const category = PRESET_CATEGORY_DEFINITIONS.find(
        ({ code }) => code === definition.categoryCode,
      );
      const plan = plans.get(definition.code);
      if (category === undefined || plan === undefined) {
        throw new Error(`Preset seed invariant failed: ${definition.code}`);
      }
      const preset = (
        await transaction
          .insert(presetScans)
          .values({
            id: definition.id,
            code: definition.code,
            categoryId: category.id,
            name: definition.name,
            description: definition.description,
            status: 'published',
            currentRevision: definition.revision,
          })
          .onConflictDoUpdate({
            set: {
              categoryId: category.id,
              name: definition.name,
              description: definition.description,
              status: 'published',
              currentRevision: definition.revision,
              archivedAt: null,
              updatedAt: sql`now()`,
            },
            target: presetScans.code,
          })
          .returning({ id: presetScans.id })
      )[0];
      if (preset === undefined)
        throw new Error('Preset upsert invariant failed');
      await transaction
        .insert(presetScanRevisions)
        .values({
          presetScanId: preset.id,
          revision: definition.revision,
          ruleVersion: definition.rule.version,
          ruleAst: definition.rule as unknown as Record<string, unknown>,
          complexityScore: String(plan.complexity.score),
          lifecycleStatus: 'published',
          createdBy: CATALOG_PUBLISHER_ID,
          publishedBy: CATALOG_PUBLISHER_ID,
          publishedAt: sql`now()`,
        })
        .onConflictDoNothing({
          target: [
            presetScanRevisions.presetScanId,
            presetScanRevisions.revision,
          ],
        });
    }
  });
}

function validatePresetCatalog() {
  const registry = createCoreIndicatorRegistry();
  return new Map(
    PRESET_SCAN_DEFINITIONS.map((definition) => {
      const validation = validateScanRule(definition.rule);
      if (!validation.valid) {
        throw new Error(`Invalid preset AST: ${definition.code}`);
      }
      const plan = planScanExecution(
        {
          rule: definition.rule,
          universeInstrumentCount: 100,
          requestedHistoryBars: 1,
        },
        {
          indicatorRegistry: registry,
          entitlement: { check: () => ({ allowed: true }) },
          limits: {
            maximumComplexityScore: 1_000_000,
            asynchronousComplexityThreshold: 100_000,
          },
        },
      );
      return [definition.code, plan] as const;
    }),
  );
}
