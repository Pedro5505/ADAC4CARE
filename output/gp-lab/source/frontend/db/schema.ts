import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Append-only versions retain the prescription and signature that were authorised.
export const prescriptionRevisions = sqliteTable('prescription_revisions', {
  homeId: text('home_id').notNull(),
  clientId: text('client_id').notNull(),
  medicationId: text('medication_id').notNull(),
  version: integer('version').notNull(),
  prescription: text('prescription').notNull(),
  actor: text('actor').notNull(),
  savedAt: text('saved_at').notNull(),
}, (table) => [primaryKey({ columns: [table.homeId, table.clientId, table.medicationId, table.version] })]);

export const administrationSignatures = sqliteTable('administration_signatures', {
  homeId: text('home_id').notNull(), clientId: text('client_id').notNull(),
  medicationId: text('medication_id').notNull(), cellKey: text('cell_key').notNull(),
  orderVersion: integer('order_version').notNull(),
  date: text('date').notNull(), time: text('time').notNull(), qty: text('qty').notNull(),
  signature: text('signature').notNull(), actor: text('actor').notNull(), savedAt: text('saved_at').notNull(),
}, (table) => [primaryKey({ columns: [table.homeId, table.clientId, table.medicationId, table.cellKey] })]);

export const medicationRecords = sqliteTable('medication_records', {
  id: text('id').primaryKey(),
  authorId: text('author_id').notNull(),
  authorEmail: text('author_email').notNull(),
  createdAt: text('created_at').notNull(),
  payload: text('payload').notNull(),
}, t => [index('idx_medication_records_created_at').on(t.createdAt)]);
