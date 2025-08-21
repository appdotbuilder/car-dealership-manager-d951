import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vehiclesTable, transactionsTable } from '../db/schema';
import { type CreateTransactionInput, type GetByIdInput } from '../schema';
import { 
  createTransaction, 
  getTransactions, 
  getTransactionById, 
  getTransactionsByVehicleId, 
  deleteTransaction 
} from '../handlers/transactions';
import { eq } from 'drizzle-orm';

// Test data
const testVehicle = {
  vin: 'TEST123456789',
  make: 'Toyota',
  model: 'Camry',
  year: 2020,
  color: 'Blue',
  mileage: 50000,
  acquisition_cost: '25000.00',
  status: 'listed' as const
};

const testTransactionInput: CreateTransactionInput = {
  vehicle_id: 1, // Will be set after creating vehicle
  type: 'expense',
  amount: 1500.50,
  description: 'Engine repair',
  transaction_date: new Date('2024-01-15')
};

const testSaleTransactionInput: CreateTransactionInput = {
  vehicle_id: 1, // Will be set after creating vehicle
  type: 'sale',
  amount: 28000.00,
  description: 'Vehicle sold to customer',
  transaction_date: new Date('2024-01-20')
};

describe('Transaction Handlers', () => {
  let vehicleId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test vehicle
    const vehicleResult = await db.insert(vehiclesTable)
      .values(testVehicle)
      .returning()
      .execute();
    vehicleId = vehicleResult[0].id;
    
    // Update test inputs with the actual vehicle ID
    testTransactionInput.vehicle_id = vehicleId;
    testSaleTransactionInput.vehicle_id = vehicleId;
  });

  afterEach(resetDB);

  describe('createTransaction', () => {
    it('should create an expense transaction', async () => {
      const result = await createTransaction(testTransactionInput);

      // Verify transaction fields
      expect(result.vehicle_id).toEqual(vehicleId);
      expect(result.type).toEqual('expense');
      expect(result.amount).toEqual(1500.50);
      expect(typeof result.amount).toBe('number');
      expect(result.description).toEqual('Engine repair');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.transaction_date).toBeInstanceOf(Date);
    });

    it('should save expense transaction to database', async () => {
      const result = await createTransaction(testTransactionInput);

      const transactions = await db.select()
        .from(transactionsTable)
        .where(eq(transactionsTable.id, result.id))
        .execute();

      expect(transactions).toHaveLength(1);
      expect(transactions[0].vehicle_id).toEqual(vehicleId);
      expect(transactions[0].type).toEqual('expense');
      expect(parseFloat(transactions[0].amount)).toEqual(1500.50);
      expect(transactions[0].description).toEqual('Engine repair');
    });

    it('should create a sale transaction and update vehicle status', async () => {
      const result = await createTransaction(testSaleTransactionInput);

      // Verify transaction
      expect(result.type).toEqual('sale');
      expect(result.amount).toEqual(28000.00);
      expect(result.description).toEqual('Vehicle sold to customer');

      // Verify vehicle status was updated
      const vehicles = await db.select()
        .from(vehiclesTable)
        .where(eq(vehiclesTable.id, vehicleId))
        .execute();

      expect(vehicles).toHaveLength(1);
      expect(vehicles[0].status).toEqual('sold');
      expect(parseFloat(vehicles[0].sale_price!)).toEqual(28000.00);
      expect(vehicles[0].sale_date).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent vehicle', async () => {
      const invalidInput = {
        ...testTransactionInput,
        vehicle_id: 99999
      };

      await expect(createTransaction(invalidInput)).rejects.toThrow(/Vehicle with ID 99999 not found/);
    });

    it('should use current date when transaction_date not provided', async () => {
      const inputWithoutDate = {
        ...testTransactionInput,
        transaction_date: undefined
      };

      const result = await createTransaction(inputWithoutDate);
      expect(result.transaction_date).toBeInstanceOf(Date);
    });
  });

  describe('getTransactions', () => {
    it('should return empty array when no transactions exist', async () => {
      const result = await getTransactions();
      expect(result).toEqual([]);
    });

    it('should return all transactions ordered by date desc', async () => {
      // Create multiple transactions with different dates
      const transaction1 = await createTransaction({
        ...testTransactionInput,
        transaction_date: new Date('2024-01-10'),
        description: 'First transaction'
      });

      const transaction2 = await createTransaction({
        ...testTransactionInput,
        amount: 800.00,
        transaction_date: new Date('2024-01-20'),
        description: 'Second transaction'
      });

      const result = await getTransactions();

      expect(result).toHaveLength(2);
      expect(typeof result[0].amount).toBe('number');
      expect(typeof result[1].amount).toBe('number');
      
      // Should be ordered by date descending (newest first)
      expect(result[0].description).toEqual('Second transaction');
      expect(result[1].description).toEqual('First transaction');
    });
  });

  describe('getTransactionById', () => {
    it('should return transaction by ID', async () => {
      const created = await createTransaction(testTransactionInput);
      
      const getInput: GetByIdInput = { id: created.id };
      const result = await getTransactionById(getInput);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.vehicle_id).toEqual(vehicleId);
      expect(result!.type).toEqual('expense');
      expect(result!.amount).toEqual(1500.50);
      expect(typeof result!.amount).toBe('number');
      expect(result!.description).toEqual('Engine repair');
    });

    it('should return null for non-existent transaction', async () => {
      const getInput: GetByIdInput = { id: 99999 };
      const result = await getTransactionById(getInput);

      expect(result).toBeNull();
    });
  });

  describe('getTransactionsByVehicleId', () => {
    it('should return transactions for specific vehicle', async () => {
      // Create another vehicle
      const vehicle2Result = await db.insert(vehiclesTable)
        .values({
          ...testVehicle,
          vin: 'TEST987654321'
        })
        .returning()
        .execute();
      const vehicle2Id = vehicle2Result[0].id;

      // Create transactions for both vehicles
      await createTransaction(testTransactionInput); // For vehicle 1
      await createTransaction({
        ...testTransactionInput,
        vehicle_id: vehicle2Id,
        description: 'Vehicle 2 expense'
      }); // For vehicle 2

      const getInput: GetByIdInput = { id: vehicleId };
      const result = await getTransactionsByVehicleId(getInput);

      expect(result).toHaveLength(1);
      expect(result[0].vehicle_id).toEqual(vehicleId);
      expect(result[0].description).toEqual('Engine repair');
      expect(typeof result[0].amount).toBe('number');
    });

    it('should return empty array for vehicle with no transactions', async () => {
      const getInput: GetByIdInput = { id: vehicleId };
      const result = await getTransactionsByVehicleId(getInput);

      expect(result).toEqual([]);
    });

    it('should order transactions by date descending', async () => {
      // Create multiple transactions for the same vehicle
      await createTransaction({
        ...testTransactionInput,
        transaction_date: new Date('2024-01-10'),
        description: 'Older transaction'
      });

      await createTransaction({
        ...testTransactionInput,
        transaction_date: new Date('2024-01-20'),
        description: 'Newer transaction'
      });

      const getInput: GetByIdInput = { id: vehicleId };
      const result = await getTransactionsByVehicleId(getInput);

      expect(result).toHaveLength(2);
      expect(result[0].description).toEqual('Newer transaction');
      expect(result[1].description).toEqual('Older transaction');
    });
  });

  describe('deleteTransaction', () => {
    it('should delete expense transaction', async () => {
      const created = await createTransaction(testTransactionInput);
      
      const deleteInput: GetByIdInput = { id: created.id };
      const result = await deleteTransaction(deleteInput);

      expect(result.success).toBe(true);

      // Verify transaction was deleted
      const transactions = await db.select()
        .from(transactionsTable)
        .where(eq(transactionsTable.id, created.id))
        .execute();

      expect(transactions).toHaveLength(0);
    });

    it('should delete sale transaction and revert vehicle status', async () => {
      // First create a sale transaction (which updates vehicle to sold)
      const created = await createTransaction(testSaleTransactionInput);

      // Verify vehicle is marked as sold
      let vehicle = await db.select()
        .from(vehiclesTable)
        .where(eq(vehiclesTable.id, vehicleId))
        .execute();
      
      expect(vehicle[0].status).toEqual('sold');
      expect(vehicle[0].sale_price).not.toBeNull();
      expect(vehicle[0].sale_date).not.toBeNull();

      // Delete the transaction
      const deleteInput: GetByIdInput = { id: created.id };
      const result = await deleteTransaction(deleteInput);

      expect(result.success).toBe(true);

      // Verify transaction was deleted
      const transactions = await db.select()
        .from(transactionsTable)
        .where(eq(transactionsTable.id, created.id))
        .execute();

      expect(transactions).toHaveLength(0);

      // Verify vehicle status was reverted
      vehicle = await db.select()
        .from(vehiclesTable)
        .where(eq(vehiclesTable.id, vehicleId))
        .execute();

      expect(vehicle[0].status).toEqual('listed');
      expect(vehicle[0].sale_price).toBeNull();
      expect(vehicle[0].sale_date).toBeNull();
    });

    it('should throw error for non-existent transaction', async () => {
      const deleteInput: GetByIdInput = { id: 99999 };

      await expect(deleteTransaction(deleteInput)).rejects.toThrow(/Transaction with ID 99999 not found/);
    });
  });
});