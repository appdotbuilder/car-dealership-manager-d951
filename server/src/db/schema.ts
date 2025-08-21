import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const vehicleStatusEnum = pgEnum('vehicle_status', [
  'acquired',
  'reconditioning', 
  'listed',
  'sold',
  'archived'
]);

export const expenseTypeEnum = pgEnum('expense_type', [
  'acquisition',
  'reconditioning',
  'marketing',
  'transport',
  'storage',
  'inspection',
  'repairs',
  'detailing',
  'other'
]);

export const transactionTypeEnum = pgEnum('transaction_type', [
  'expense',
  'sale',
  'refund'
]);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Vehicles table
export const vehiclesTable = pgTable('vehicles', {
  id: serial('id').primaryKey(),
  vin: text('vin').notNull().unique(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  color: text('color').notNull(),
  mileage: integer('mileage').notNull(),
  status: vehicleStatusEnum('status').notNull().default('acquired'),
  acquisition_date: timestamp('acquisition_date').defaultNow().notNull(),
  acquisition_cost: numeric('acquisition_cost', { precision: 10, scale: 2 }).notNull(),
  listing_price: numeric('listing_price', { precision: 10, scale: 2 }),
  sale_price: numeric('sale_price', { precision: 10, scale: 2 }),
  sale_date: timestamp('sale_date'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Vendors table
export const vendorsTable = pgTable('vendors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  contact_info: text('contact_info'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Expenses table
export const expensesTable = pgTable('expenses', {
  id: serial('id').primaryKey(),
  vehicle_id: integer('vehicle_id').notNull().references(() => vehiclesTable.id),
  vendor_id: integer('vendor_id').references(() => vendorsTable.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  expense_type: expenseTypeEnum('expense_type').notNull(),
  description: text('description').notNull(),
  expense_date: timestamp('expense_date').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  vehicle_id: integer('vehicle_id').notNull().references(() => vehiclesTable.id),
  type: transactionTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description').notNull(),
  transaction_date: timestamp('transaction_date').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const vehiclesRelations = relations(vehiclesTable, ({ many }) => ({
  expenses: many(expensesTable),
  transactions: many(transactionsTable)
}));

export const expensesRelations = relations(expensesTable, ({ one }) => ({
  vehicle: one(vehiclesTable, {
    fields: [expensesTable.vehicle_id],
    references: [vehiclesTable.id]
  }),
  vendor: one(vendorsTable, {
    fields: [expensesTable.vendor_id],
    references: [vendorsTable.id]
  })
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  vehicle: one(vehiclesTable, {
    fields: [transactionsTable.vehicle_id],
    references: [vehiclesTable.id]
  })
}));

export const vendorsRelations = relations(vendorsTable, ({ many }) => ({
  expenses: many(expensesTable)
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Vehicle = typeof vehiclesTable.$inferSelect;
export type NewVehicle = typeof vehiclesTable.$inferInsert;

export type Vendor = typeof vendorsTable.$inferSelect;
export type NewVendor = typeof vendorsTable.$inferInsert;

export type Expense = typeof expensesTable.$inferSelect;
export type NewExpense = typeof expensesTable.$inferInsert;

export type TransactionRecord = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  vehicles: vehiclesTable,
  vendors: vendorsTable,
  expenses: expensesTable,
  transactions: transactionsTable
};