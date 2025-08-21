import { z } from 'zod';

// Enums
export const vehicleStatusEnum = z.enum([
  'acquired',
  'reconditioning',
  'listed',
  'sold',
  'archived'
]);

export const expenseTypeEnum = z.enum([
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

export const transactionTypeEnum = z.enum([
  'expense',
  'sale',
  'refund'
]);

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password_hash: z.string(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Login input schema
export const loginInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Vehicle schema
export const vehicleSchema = z.object({
  id: z.number(),
  vin: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  color: z.string(),
  mileage: z.number().int(),
  status: vehicleStatusEnum,
  acquisition_date: z.coerce.date(),
  acquisition_cost: z.number(),
  listing_price: z.number().nullable(),
  sale_price: z.number().nullable(),
  sale_date: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Vehicle = z.infer<typeof vehicleSchema>;

// Create vehicle input schema
export const createVehicleInputSchema = z.object({
  vin: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  color: z.string().min(1),
  mileage: z.number().int().nonnegative(),
  acquisition_cost: z.number().positive(),
  notes: z.string().nullable().optional()
});

export type CreateVehicleInput = z.infer<typeof createVehicleInputSchema>;

// Update vehicle input schema
export const updateVehicleInputSchema = z.object({
  id: z.number(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  color: z.string().optional(),
  mileage: z.number().int().nonnegative().optional(),
  status: vehicleStatusEnum.optional(),
  listing_price: z.number().positive().nullable().optional(),
  sale_price: z.number().positive().nullable().optional(),
  sale_date: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type UpdateVehicleInput = z.infer<typeof updateVehicleInputSchema>;

// Vendor schema
export const vendorSchema = z.object({
  id: z.number(),
  name: z.string(),
  contact_info: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Vendor = z.infer<typeof vendorSchema>;

// Create vendor input schema
export const createVendorInputSchema = z.object({
  name: z.string().min(1),
  contact_info: z.string().nullable().optional()
});

export type CreateVendorInput = z.infer<typeof createVendorInputSchema>;

// Update vendor input schema
export const updateVendorInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  contact_info: z.string().nullable().optional()
});

export type UpdateVendorInput = z.infer<typeof updateVendorInputSchema>;

// Expense schema
export const expenseSchema = z.object({
  id: z.number(),
  vehicle_id: z.number(),
  vendor_id: z.number().nullable(),
  amount: z.number(),
  expense_type: expenseTypeEnum,
  description: z.string(),
  expense_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Expense = z.infer<typeof expenseSchema>;

// Create expense input schema
export const createExpenseInputSchema = z.object({
  vehicle_id: z.number(),
  vendor_id: z.number().nullable().optional(),
  amount: z.number().positive(),
  expense_type: expenseTypeEnum,
  description: z.string().min(1),
  expense_date: z.coerce.date().optional()
});

export type CreateExpenseInput = z.infer<typeof createExpenseInputSchema>;

// Update expense input schema
export const updateExpenseInputSchema = z.object({
  id: z.number(),
  vendor_id: z.number().nullable().optional(),
  amount: z.number().positive().optional(),
  expense_type: expenseTypeEnum.optional(),
  description: z.string().optional(),
  expense_date: z.coerce.date().optional()
});

export type UpdateExpenseInput = z.infer<typeof updateExpenseInputSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  vehicle_id: z.number(),
  type: transactionTypeEnum,
  amount: z.number(),
  description: z.string(),
  transaction_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Create transaction input schema
export const createTransactionInputSchema = z.object({
  vehicle_id: z.number(),
  type: transactionTypeEnum,
  amount: z.number(),
  description: z.string().min(1),
  transaction_date: z.coerce.date().optional()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Dashboard KPI schema
export const dashboardKpiSchema = z.object({
  total_inventory: z.number(),
  total_inventory_value: z.number(),
  vehicles_in_reconditioning: z.number(),
  vehicles_listed: z.number(),
  vehicles_sold_this_month: z.number(),
  total_profit_this_month: z.number(),
  avg_days_to_sale: z.number().nullable()
});

export type DashboardKpi = z.infer<typeof dashboardKpiSchema>;

// Profit/Loss calculation schema
export const profitLossSchema = z.object({
  vehicle_id: z.number(),
  acquisition_cost: z.number(),
  total_expenses: z.number(),
  total_cost: z.number(),
  sale_price: z.number().nullable(),
  profit_loss: z.number().nullable(),
  is_sold: z.boolean()
});

export type ProfitLoss = z.infer<typeof profitLossSchema>;

// Inventory aging schema
export const inventoryAgingSchema = z.object({
  vehicle_id: z.number(),
  vin: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  status: vehicleStatusEnum,
  acquisition_date: z.coerce.date(),
  days_in_inventory: z.number(),
  total_cost: z.number()
});

export type InventoryAging = z.infer<typeof inventoryAgingSchema>;

// Financial report filters
export const financialReportFiltersSchema = z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  status: vehicleStatusEnum.optional(),
  make: z.string().optional(),
  model: z.string().optional()
});

export type FinancialReportFilters = z.infer<typeof financialReportFiltersSchema>;

// Expense breakdown schema
export const expenseBreakdownSchema = z.object({
  expense_type: expenseTypeEnum,
  total_amount: z.number(),
  count: z.number()
});

export type ExpenseBreakdown = z.infer<typeof expenseBreakdownSchema>;

// Get by ID schemas
export const getByIdSchema = z.object({
  id: z.number()
});

export type GetByIdInput = z.infer<typeof getByIdSchema>;

// Vehicle details with related data
export const vehicleDetailsSchema = z.object({
  vehicle: vehicleSchema,
  expenses: z.array(expenseSchema),
  transactions: z.array(transactionSchema),
  profit_loss: profitLossSchema
});

export type VehicleDetails = z.infer<typeof vehicleDetailsSchema>;