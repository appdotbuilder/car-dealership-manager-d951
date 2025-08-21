import { db } from '../db';
import { transactionsTable, vehiclesTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction, type GetByIdInput } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  try {
    // First verify the vehicle exists
    const existingVehicle = await db.select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, input.vehicle_id))
      .execute();

    if (existingVehicle.length === 0) {
      throw new Error(`Vehicle with ID ${input.vehicle_id} not found`);
    }

    const vehicle = existingVehicle[0];

    // Insert the transaction
    const result = await db.insert(transactionsTable)
      .values({
        vehicle_id: input.vehicle_id,
        type: input.type,
        amount: input.amount.toString(), // Convert number to string for numeric column
        description: input.description,
        transaction_date: input.transaction_date || new Date()
      })
      .returning()
      .execute();

    const transaction = result[0];

    // Update vehicle status and sale information if this is a sale transaction
    if (input.type === 'sale') {
      await db.update(vehiclesTable)
        .set({
          status: 'sold',
          sale_price: input.amount.toString(), // Convert number to string for numeric column
          sale_date: transaction.transaction_date,
          updated_at: new Date()
        })
        .where(eq(vehiclesTable.id, input.vehicle_id))
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    return {
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  try {
    const results = await db.select()
      .from(transactionsTable)
      .orderBy(desc(transactionsTable.transaction_date))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    throw error;
  }
}

export async function getTransactionById(input: GetByIdInput): Promise<Transaction | null> {
  try {
    const results = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const transaction = results[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Failed to fetch transaction by ID:', error);
    throw error;
  }
}

export async function getTransactionsByVehicleId(input: GetByIdInput): Promise<Transaction[]> {
  try {
    const results = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.vehicle_id, input.id))
      .orderBy(desc(transactionsTable.transaction_date))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Failed to fetch transactions by vehicle ID:', error);
    throw error;
  }
}

export async function deleteTransaction(input: GetByIdInput): Promise<{ success: boolean }> {
  try {
    // First, get the transaction to check if it's a sale
    const existingTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.id))
      .execute();

    if (existingTransaction.length === 0) {
      throw new Error(`Transaction with ID ${input.id} not found`);
    }

    const transaction = existingTransaction[0];

    // If it's a sale transaction, revert the vehicle status
    if (transaction.type === 'sale') {
      await db.update(vehiclesTable)
        .set({
          status: 'listed', // Revert to listed status
          sale_price: null,
          sale_date: null,
          updated_at: new Date()
        })
        .where(eq(vehiclesTable.id, transaction.vehicle_id))
        .execute();
    }

    // Delete the transaction
    await db.delete(transactionsTable)
      .where(eq(transactionsTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Transaction deletion failed:', error);
    throw error;
  }
}