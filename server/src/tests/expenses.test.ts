import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { expensesTable, vehiclesTable, vendorsTable } from '../db/schema';
import { type CreateExpenseInput, type UpdateExpenseInput, type FinancialReportFilters } from '../schema';
import {
  createExpense,
  updateExpense,
  getExpenses,
  getExpenseById,
  getExpensesByVehicleId,
  deleteExpense,
  getExpenseBreakdown
} from '../handlers/expenses';
import { eq } from 'drizzle-orm';

describe('Expenses Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test vehicle
  const createTestVehicle = async () => {
    const result = await db.insert(vehiclesTable)
      .values({
        vin: 'TEST123456789',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Silver',
        mileage: 50000,
        acquisition_cost: '15000.00'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test vendor
  const createTestVendor = async () => {
    const result = await db.insert(vendorsTable)
      .values({
        name: 'Test Vendor',
        contact_info: 'test@vendor.com'
      })
      .returning()
      .execute();
    return result[0];
  };

  describe('createExpense', () => {
    it('should create an expense successfully', async () => {
      const vehicle = await createTestVehicle();
      const vendor = await createTestVendor();

      const input: CreateExpenseInput = {
        vehicle_id: vehicle.id,
        vendor_id: vendor.id,
        amount: 500.50,
        expense_type: 'repairs',
        description: 'Engine oil change',
        expense_date: new Date('2024-01-15')
      };

      const result = await createExpense(input);

      expect(result.id).toBeDefined();
      expect(result.vehicle_id).toEqual(vehicle.id);
      expect(result.vendor_id).toEqual(vendor.id);
      expect(result.amount).toEqual(500.50);
      expect(typeof result.amount).toBe('number');
      expect(result.expense_type).toEqual('repairs');
      expect(result.description).toEqual('Engine oil change');
      expect(result.expense_date).toEqual(new Date('2024-01-15'));
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create an expense without vendor', async () => {
      const vehicle = await createTestVehicle();

      const input: CreateExpenseInput = {
        vehicle_id: vehicle.id,
        vendor_id: null,
        amount: 250.75,
        expense_type: 'detailing',
        description: 'Car wash and detail'
      };

      const result = await createExpense(input);

      expect(result.vendor_id).toBeNull();
      expect(result.amount).toEqual(250.75);
      expect(result.expense_date).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent vehicle', async () => {
      const input: CreateExpenseInput = {
        vehicle_id: 999,
        amount: 100,
        expense_type: 'other',
        description: 'Test expense'
      };

      await expect(createExpense(input)).rejects.toThrow(/vehicle not found/i);
    });

    it('should throw error for non-existent vendor', async () => {
      const vehicle = await createTestVehicle();

      const input: CreateExpenseInput = {
        vehicle_id: vehicle.id,
        vendor_id: 999,
        amount: 100,
        expense_type: 'other',
        description: 'Test expense'
      };

      await expect(createExpense(input)).rejects.toThrow(/vendor not found/i);
    });
  });

  describe('updateExpense', () => {
    it('should update expense successfully', async () => {
      const vehicle = await createTestVehicle();
      const vendor = await createTestVendor();

      // Create initial expense
      const createInput: CreateExpenseInput = {
        vehicle_id: vehicle.id,
        amount: 100,
        expense_type: 'repairs',
        description: 'Initial repair'
      };
      const expense = await createExpense(createInput);

      // Update expense
      const updateInput: UpdateExpenseInput = {
        id: expense.id,
        vendor_id: vendor.id,
        amount: 200.25,
        expense_type: 'detailing',
        description: 'Updated repair description'
      };

      const result = await updateExpense(updateInput);

      expect(result.id).toEqual(expense.id);
      expect(result.vendor_id).toEqual(vendor.id);
      expect(result.amount).toEqual(200.25);
      expect(typeof result.amount).toBe('number');
      expect(result.expense_type).toEqual('detailing');
      expect(result.description).toEqual('Updated repair description');
    });

    it('should update only provided fields', async () => {
      const vehicle = await createTestVehicle();

      // Create initial expense
      const createInput: CreateExpenseInput = {
        vehicle_id: vehicle.id,
        amount: 100,
        expense_type: 'repairs',
        description: 'Initial repair'
      };
      const expense = await createExpense(createInput);

      // Update only amount
      const updateInput: UpdateExpenseInput = {
        id: expense.id,
        amount: 150.50
      };

      const result = await updateExpense(updateInput);

      expect(result.amount).toEqual(150.50);
      expect(result.expense_type).toEqual('repairs'); // Should remain unchanged
      expect(result.description).toEqual('Initial repair'); // Should remain unchanged
    });

    it('should throw error for non-existent expense', async () => {
      const updateInput: UpdateExpenseInput = {
        id: 999,
        amount: 100
      };

      await expect(updateExpense(updateInput)).rejects.toThrow(/expense not found/i);
    });
  });

  describe('getExpenses', () => {
    it('should return all expenses ordered by date', async () => {
      const vehicle = await createTestVehicle();

      // Create multiple expenses
      await createExpense({
        vehicle_id: vehicle.id,
        amount: 100,
        expense_type: 'repairs',
        description: 'First expense',
        expense_date: new Date('2024-01-10')
      });

      await createExpense({
        vehicle_id: vehicle.id,
        amount: 200,
        expense_type: 'detailing',
        description: 'Second expense',
        expense_date: new Date('2024-01-15')
      });

      const results = await getExpenses();

      expect(results).toHaveLength(2);
      expect(results[0].expense_date >= results[1].expense_date).toBe(true); // Ordered by date desc
      results.forEach(expense => {
        expect(typeof expense.amount).toBe('number');
      });
    });

    it('should return empty array when no expenses exist', async () => {
      const results = await getExpenses();
      expect(results).toHaveLength(0);
    });
  });

  describe('getExpenseById', () => {
    it('should return expense by ID', async () => {
      const vehicle = await createTestVehicle();

      const expense = await createExpense({
        vehicle_id: vehicle.id,
        amount: 150.75,
        expense_type: 'inspection',
        description: 'Vehicle inspection'
      });

      const result = await getExpenseById({ id: expense.id });

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(expense.id);
      expect(result!.amount).toEqual(150.75);
      expect(typeof result!.amount).toBe('number');
      expect(result!.expense_type).toEqual('inspection');
    });

    it('should return null for non-existent expense', async () => {
      const result = await getExpenseById({ id: 999 });
      expect(result).toBeNull();
    });
  });

  describe('getExpensesByVehicleId', () => {
    it('should return expenses for specific vehicle', async () => {
      const vehicle1 = await createTestVehicle();
      const vehicle2 = await db.insert(vehiclesTable)
        .values({
          vin: 'TEST987654321',
          make: 'Honda',
          model: 'Civic',
          year: 2021,
          color: 'Blue',
          mileage: 30000,
          acquisition_cost: '18000.00'
        })
        .returning()
        .execute();

      // Create expenses for both vehicles
      await createExpense({
        vehicle_id: vehicle1.id,
        amount: 100,
        expense_type: 'repairs',
        description: 'Vehicle 1 expense'
      });

      await createExpense({
        vehicle_id: vehicle2[0].id,
        amount: 200,
        expense_type: 'detailing',
        description: 'Vehicle 2 expense'
      });

      await createExpense({
        vehicle_id: vehicle1.id,
        amount: 300,
        expense_type: 'inspection',
        description: 'Another Vehicle 1 expense'
      });

      const results = await getExpensesByVehicleId({ id: vehicle1.id });

      expect(results).toHaveLength(2);
      results.forEach(expense => {
        expect(expense.vehicle_id).toEqual(vehicle1.id);
        expect(typeof expense.amount).toBe('number');
      });
    });

    it('should return empty array for vehicle with no expenses', async () => {
      const vehicle = await createTestVehicle();
      const results = await getExpensesByVehicleId({ id: vehicle.id });
      expect(results).toHaveLength(0);
    });
  });

  describe('deleteExpense', () => {
    it('should delete expense successfully', async () => {
      const vehicle = await createTestVehicle();

      const expense = await createExpense({
        vehicle_id: vehicle.id,
        amount: 100,
        expense_type: 'repairs',
        description: 'To be deleted'
      });

      const result = await deleteExpense({ id: expense.id });

      expect(result.success).toBe(true);

      // Verify expense was deleted
      const deletedExpense = await getExpenseById({ id: expense.id });
      expect(deletedExpense).toBeNull();
    });

    it('should return false for non-existent expense', async () => {
      const result = await deleteExpense({ id: 999 });
      expect(result.success).toBe(false);
    });
  });

  describe('getExpenseBreakdown', () => {
    it('should return expense breakdown by type', async () => {
      const vehicle = await createTestVehicle();

      // Create multiple expenses of different types
      await createExpense({
        vehicle_id: vehicle.id,
        amount: 100,
        expense_type: 'repairs',
        description: 'Repair 1'
      });

      await createExpense({
        vehicle_id: vehicle.id,
        amount: 200,
        expense_type: 'repairs',
        description: 'Repair 2'
      });

      await createExpense({
        vehicle_id: vehicle.id,
        amount: 150,
        expense_type: 'detailing',
        description: 'Detail work'
      });

      const results = await getExpenseBreakdown();

      expect(results).toHaveLength(2);
      
      const repairsBreakdown = results.find(r => r.expense_type === 'repairs');
      expect(repairsBreakdown).toBeDefined();
      expect(repairsBreakdown!.total_amount).toEqual(300);
      expect(repairsBreakdown!.count).toEqual(2);

      const detailingBreakdown = results.find(r => r.expense_type === 'detailing');
      expect(detailingBreakdown).toBeDefined();
      expect(detailingBreakdown!.total_amount).toEqual(150);
      expect(detailingBreakdown!.count).toEqual(1);
    });

    it('should filter by date range', async () => {
      const vehicle = await createTestVehicle();

      // Create expenses on different dates
      await createExpense({
        vehicle_id: vehicle.id,
        amount: 100,
        expense_type: 'repairs',
        description: 'Old expense',
        expense_date: new Date('2024-01-01')
      });

      await createExpense({
        vehicle_id: vehicle.id,
        amount: 200,
        expense_type: 'repairs',
        description: 'Recent expense',
        expense_date: new Date('2024-01-15')
      });

      const filters: FinancialReportFilters = {
        start_date: new Date('2024-01-10'),
        end_date: new Date('2024-01-20')
      };

      const results = await getExpenseBreakdown(filters);

      expect(results).toHaveLength(1);
      expect(results[0].expense_type).toEqual('repairs');
      expect(results[0].total_amount).toEqual(200); // Only the recent expense
      expect(results[0].count).toEqual(1);
    });

    it('should filter by vehicle status', async () => {
      const vehicle1 = await createTestVehicle();
      const vehicle2 = await db.insert(vehiclesTable)
        .values({
          vin: 'TEST987654321',
          make: 'Honda',
          model: 'Civic',
          year: 2021,
          color: 'Blue',
          mileage: 30000,
          acquisition_cost: '18000.00',
          status: 'sold'
        })
        .returning()
        .execute();

      // Create expenses for both vehicles
      await createExpense({
        vehicle_id: vehicle1.id,
        amount: 100,
        expense_type: 'repairs',
        description: 'Acquired vehicle expense'
      });

      await createExpense({
        vehicle_id: vehicle2[0].id,
        amount: 200,
        expense_type: 'repairs',
        description: 'Sold vehicle expense'
      });

      const filters: FinancialReportFilters = {
        status: 'sold'
      };

      const results = await getExpenseBreakdown(filters);

      expect(results).toHaveLength(1);
      expect(results[0].total_amount).toEqual(200); // Only expense from sold vehicle
    });

    it('should return empty array when no expenses match filters', async () => {
      const filters: FinancialReportFilters = {
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-01-31')
      };

      const results = await getExpenseBreakdown(filters);
      expect(results).toHaveLength(0);
    });
  });
});