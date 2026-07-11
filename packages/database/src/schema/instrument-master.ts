import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  date,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const auditTimestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const sectors = pgTable(
  'sectors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 64 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    parentId: uuid('parent_id'),
    ...auditTimestamps,
  },
  (table) => [
    uniqueIndex('sectors_code_unique').on(table.code),
    index('sectors_parent_id_idx').on(table.parentId),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'sectors_parent_id_fk',
    }).onDelete('set null'),
    check('sectors_code_not_blank', sql`length(trim(${table.code})) > 0`),
  ],
);

export const instruments = pgTable(
  'instruments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    symbol: varchar('symbol', { length: 32 }).notNull(),
    normalizedSymbol: varchar('normalized_symbol', { length: 32 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    isin: varchar('isin', { length: 12 }),
    marketCode: varchar('market_code', { length: 32 }).notNull(),
    currencyCode: char('currency_code', { length: 3 }).notNull(),
    status: varchar('status', { length: 24 }).notNull(),
    sectorId: uuid('sector_id').references(() => sectors.id, {
      onDelete: 'set null',
    }),
    listedAt: date('listed_at'),
    delistedAt: date('delisted_at'),
    ...auditTimestamps,
  },
  (table) => [
    uniqueIndex('instruments_active_normalized_symbol_unique')
      .on(table.normalizedSymbol)
      .where(sql`${table.status} = 'active'`),
    index('instruments_sector_id_idx').on(table.sectorId),
    index('instruments_market_status_idx').on(table.marketCode, table.status),
    check(
      'instruments_status_check',
      sql`${table.status} in ('active', 'inactive', 'delisted')`,
    ),
    check(
      'instruments_listing_dates_check',
      sql`${table.delistedAt} is null or ${table.listedAt} is null or ${table.delistedAt} >= ${table.listedAt}`,
    ),
  ],
);

export const instrumentSymbolHistory = pgTable(
  'instrument_symbol_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    instrumentId: uuid('instrument_id')
      .notNull()
      .references(() => instruments.id, { onDelete: 'cascade' }),
    symbol: varchar('symbol', { length: 32 }).notNull(),
    validFrom: date('valid_from').notNull(),
    validTo: date('valid_to'),
    reason: text('reason'),
    ...auditTimestamps,
  },
  (table) => [
    uniqueIndex('instrument_symbol_history_period_unique').on(
      table.instrumentId,
      table.symbol,
      table.validFrom,
    ),
    index('instrument_symbol_history_instrument_idx').on(table.instrumentId),
    check(
      'instrument_symbol_history_dates_check',
      sql`${table.validTo} is null or ${table.validTo} >= ${table.validFrom}`,
    ),
  ],
);

export const dataProviders = pgTable(
  'data_providers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 64 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    status: varchar('status', { length: 24 }).notNull(),
    ...auditTimestamps,
  },
  (table) => [
    uniqueIndex('data_providers_code_unique').on(table.code),
    check(
      'data_providers_status_check',
      sql`${table.status} in ('active', 'inactive', 'degraded')`,
    ),
  ],
);

export const providerInstrumentMappings = pgTable(
  'provider_instrument_mappings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => dataProviders.id, { onDelete: 'restrict' }),
    instrumentId: uuid('instrument_id')
      .notNull()
      .references(() => instruments.id, { onDelete: 'cascade' }),
    providerSymbol: varchar('provider_symbol', { length: 128 }).notNull(),
    providerMarket: varchar('provider_market', { length: 64 }),
    active: boolean('active').default(true).notNull(),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    ...auditTimestamps,
  },
  (table) => [
    uniqueIndex('provider_instrument_mappings_symbol_unique').on(
      table.providerId,
      table.providerSymbol,
    ),
    uniqueIndex('provider_instrument_mappings_active_instrument_unique')
      .on(table.providerId, table.instrumentId)
      .where(sql`${table.active} = true`),
    index('provider_instrument_mappings_instrument_active_idx').on(
      table.instrumentId,
      table.active,
    ),
  ],
);
