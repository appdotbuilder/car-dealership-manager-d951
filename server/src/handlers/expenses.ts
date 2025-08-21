import { db } from '../db';
import { expensesTable, vehiclesTable, vendorsTable } from '../db/schema';
import { type CreateExpenseInput, type UpdateExpenseInput, type Expense, type GetByIdInput, type ExpenseBreakdown, type FinancialReportFilters } from '../schema';
import { eq, desc, and, gte, lte, sum, count } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  try {
    // Validate vehicle exists
    const vehicle = await db.select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, input.vehicle_id))
      .execute();
    
    if (vehicle.length === 0) {
      throw new Error('Vehicle not found');
    }

    // Validate vendor exists if provided
    if (input.vendor_id) {
      const vendor = await db.select()
        .from(vendorsTable)
        .where(eq(vendorsTable.id, input.vendor_id))
        .execute();
      
      if (vendor.length === 0) {
        throw new Error('Vendor not found');
      }
    }

    // Create expense record
    const result = await db.insert(expensesTable)
      .values({
        vehicle_id: input.vehicle_id,
        vendor_id: input.vendor_id || null,
        amount: input.amount.toString(),
        expense_type: input.expense_type,
        description: input.description,
        expense_date: input.expense_date || new Date()
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const expense = result[0];
    return {
      ...expense,
      amount: parseFloat(expense.amount)
    };
  } catch (error) {
    console.error('Expense creation failed:', error);
    throw error;
  }
}

export async function updateExpense(input: UpdateExpenseInput): Promise<Expense> {
  try {
    // Check if expense exists
    const existingExpense = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, input.id))
      .execute();
    
    if (existingExpense.length === 0) {
      throw new Error('Expense not found');
    }

    // Validate vendor exists if provided
    if (input.vendor_id) {
      const vendor = await db.select()
        .from(vendorsTable)
        .where(eq(vendorsTable.id, input.vendor_id))
        .execute();
      
      if (vendor.length === 0) {
        throw new Error('Vendor not found');
      }
    }

    // Build update values - only include defined fields
    const updateValues: any = {};
    if (input.vendor_id !== undefined) updateValues.vendor_id = input.vendor_id;
    if (input.amount !== undefined) updateValues.amount = input.amount.toString();
    if (input.expense_type !== undefined) updateValues.expense_type = input.expense_type;
    if (input.description !== undefined) updateValues.description = input.description;
    if (input.expense_date !== undefined) updateValues.expense_date = input.expense_date;

    // Update expense record
    const result = await db.update(expensesTable)
      .set(updateValues)
      .where(eq(expensesTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const expense = result[0];
    return {
      ...expense,
      amount: parseFloat(expense.amount)
    };
  } catch (error) {
    console.error('Expense update failed:', error);
    throw error;
  }
}

export async function getExpenses(): Promise<Expense[]> {
  try {
    const results = await db.select()
      .from(expensesTable)
      .orderBy(desc(expensesTable.expense_date))
      .execute();

    return results.map(expense => ({
      ...expense,
      amount: parseFloat(expense.amount)
    }));
  } catch (error) {
    console.error('Fetching expenses failed:', error);
    throw error;
  }
}

export async function getExpenseById(input: GetByIdInput): Promise<Expense | null> {
  try {
    const results = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, input.id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const expense = results[0];
    return {
      ...expense,
      amount: parseFloat(expense.amount)
    };
  } catch (error) {
    console.error('Fetching expense by ID failed:', error);
    throw error;
  }
}

export async function getExpensesByVehicleId(input: GetByIdInput): Promise<Expense[]> {
  try {
    const results = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.vehicle_id, input.id))
      .orderBy(desc(expensesTable.expense_date))
      .execute();

    return results.map(expense => ({
      ...expense,
      amount: parseFloat(expense.amount)
    }));
  } catch (error) {
    console.error('Fetching expenses by vehicle ID failed:', error);
    throw error;
  }
}

export async function deleteExpense(input: GetByIdInput): Promise<{ success: boolean }> {
  try {
    const result = await db.delete(expensesTable)
      .where(eq(expensesTable.id, input.id))
      .returning({ id: expensesTable.id })
      .execute();

    return { success: result.length > 0 };
  } catch (error) {
    console.error('Expense deletion failed:', error);
    throw error;
  }
}

export async function getExpenseBreakdown(filters?: FinancialReportFilters): Promise<ExpenseBreakdown[]> {
  try {
    // Determine if we need a join based on filters
    const needsJoin = filters && (filters.status || filters.make || filters.model);

    // Build conditions array for filters
    const conditions: SQL<unknown>[] = [];

    if (filters) {
      // Date filters
      if (filters.start_date) {
        conditions.push(gte(expensesTable.expense_date, filters.start_date));
      }
      if (filters.end_date) {
        conditions.push(lte(expensesTable.expense_date, filters.end_date));
      }

      // Vehicle-specific filters
      if (filters.status) {
        conditions.push(eq(vehiclesTable.status, filters.status));
      }
      if (filters.make) {
        conditions.push(eq(vehiclesTable.make, filters.make));
      }
      if (filters.model) {
        conditions.push(eq(vehiclesTable.model, filters.model));
      }
    }

    let results;

    if (needsJoin) {
      // Query with join for vehicle filters
      if (conditions.length > 0) {
        results = await db.select({
          expense_type: expensesTable.expense_type,
          total_amount: sum(expensesTable.amount).as('total_amount'),
          count: count(expensesTable.id).as('count')
        })
        .from(expensesTable)
        .innerJoin(vehiclesTable, eq(expensesTable.vehicle_id, vehiclesTable.id))
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .groupBy(expensesTable.expense_type)
        .execute();
      } else {
        results = await db.select({
          expense_type: expensesTable.expense_type,
          total_amount: sum(expensesTable.amount).as('total_amount'),
          count: count(expensesTable.id).as('count')
        })
        .from(expensesTable)
        .innerJoin(vehiclesTable, eq(expensesTable.vehicle_id, vehiclesTable.id))
        .groupBy(expensesTable.expense_type)
        .execute();
      }
    } else {
      // Simple query without join
      if (conditions.length > 0) {
        results = await db.select({
          expense_type: expensesTable.expense_type,
          total_amount: sum(expensesTable.amount).as('total_amount'),
          count: count(expensesTable.id).as('count')
        })
        .from(expensesTable)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .groupBy(expensesTable.expense_type)
        .execute();
      } else {
        results = await db.select({
          expense_type: expensesTable.expense_type,
          total_amount: sum(expensesTable.amount).as('total_amount'),
          count: count(expensesTable.id).as('count')
        })
        .from(expensesTable)
        .groupBy(expensesTable.expense_type)
        .execute();
      }
    }

    return results.map(result => ({
      expense_type: result.expense_type,
      total_amount: parseFloat(result.total_amount || '0'),
      count: result.count
    }));
  } catch (error) {
    console.error('Expense breakdown failed:', error);
    throw error;
  }
}