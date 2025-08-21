import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vehiclesTable, expensesTable, transactionsTable, vendorsTable } from '../db/schema';
import { type CreateVehicleInput, type UpdateVehicleInput, type GetByIdInput } from '../schema';
import { createVehicle, updateVehicle, getVehicles, getVehicleById, deleteVehicle } from '../handlers/vehicles';
import { eq } from 'drizzle-orm';

// Test input data
const testVehicleInput: CreateVehicleInput = {
  vin: 'TEST123456789',
  make: 'Toyota',
  model: 'Camry',
  year: 2020,
  color: 'Silver',
  mileage: 50000,
  acquisition_cost: 15000.50,
  notes: 'Clean vehicle in good condition'
};

const testVehicleInputMinimal: CreateVehicleInput = {
  vin: 'MINIMAL123456789',
  make: 'Honda',
  model: 'Civic',
  year: 2019,
  color: 'Blue',
  mileage: 30000,
  acquisition_cost: 12000.99
  // notes is optional and not provided
};

describe('Vehicle Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createVehicle', () => {
    it('should create a vehicle with all fields', async () => {
      const result = await createVehicle(testVehicleInput);

      // Validate basic fields
      expect(result.vin).toBe('TEST123456789');
      expect(result.make).toBe('Toyota');
      expect(result.model).toBe('Camry');
      expect(result.year).toBe(2020);
      expect(result.color).toBe('Silver');
      expect(result.mileage).toBe(50000);
      expect(result.status).toBe('acquired'); // Default status
      expect(typeof result.acquisition_cost).toBe('number'); // Numeric conversion test
      expect(result.acquisition_cost).toBe(15000.50);
      expect(result.notes).toBe('Clean vehicle in good condition');
      expect(result.id).toBeDefined();
      expect(result.acquisition_date).toBeInstanceOf(Date);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(result.listing_price).toBeNull();
      expect(result.sale_price).toBeNull();
      expect(result.sale_date).toBeNull();
    });

    it('should create a vehicle with minimal fields', async () => {
      const result = await createVehicle(testVehicleInputMinimal);

      expect(result.vin).toBe('MINIMAL123456789');
      expect(result.make).toBe('Honda');
      expect(result.model).toBe('Civic');
      expect(result.year).toBe(2019);
      expect(result.color).toBe('Blue');
      expect(result.mileage).toBe(30000);
      expect(typeof result.acquisition_cost).toBe('number');
      expect(result.acquisition_cost).toBe(12000.99);
      expect(result.notes).toBeNull();
      expect(result.status).toBe('acquired');
    });

    it('should save vehicle to database correctly', async () => {
      const result = await createVehicle(testVehicleInput);

      // Query database to verify storage
      const vehicles = await db.select()
        .from(vehiclesTable)
        .where(eq(vehiclesTable.id, result.id))
        .execute();

      expect(vehicles).toHaveLength(1);
      expect(vehicles[0].vin).toBe('TEST123456789');
      expect(vehicles[0].make).toBe('Toyota');
      expect(parseFloat(vehicles[0].acquisition_cost)).toBe(15000.50);
      expect(vehicles[0].status).toBe('acquired');
    });

    it('should throw error for duplicate VIN', async () => {
      await createVehicle(testVehicleInput);

      // Try to create another vehicle with same VIN
      await expect(createVehicle(testVehicleInput)).rejects.toThrow();
    });
  });

  describe('updateVehicle', () => {
    it('should update vehicle with all fields', async () => {
      const vehicle = await createVehicle(testVehicleInput);

      const updateInput: UpdateVehicleInput = {
        id: vehicle.id,
        make: 'Updated Toyota',
        model: 'Updated Camry',
        year: 2021,
        color: 'Black',
        mileage: 55000,
        status: 'listed',
        listing_price: 18000.75,
        sale_price: 17500.25,
        sale_date: new Date('2024-01-15'),
        notes: 'Updated notes'
      };

      const result = await updateVehicle(updateInput);

      expect(result.id).toBe(vehicle.id);
      expect(result.make).toBe('Updated Toyota');
      expect(result.model).toBe('Updated Camry');
      expect(result.year).toBe(2021);
      expect(result.color).toBe('Black');
      expect(result.mileage).toBe(55000);
      expect(result.status).toBe('listed');
      expect(typeof result.listing_price).toBe('number');
      expect(result.listing_price).toBe(18000.75);
      expect(typeof result.sale_price).toBe('number');
      expect(result.sale_price).toBe(17500.25);
      expect(result.sale_date).toEqual(new Date('2024-01-15'));
      expect(result.notes).toBe('Updated notes');
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should update vehicle with partial fields', async () => {
      const vehicle = await createVehicle(testVehicleInput);

      const updateInput: UpdateVehicleInput = {
        id: vehicle.id,
        status: 'reconditioning',
        mileage: 52000
      };

      const result = await updateVehicle(updateInput);

      // Updated fields
      expect(result.status).toBe('reconditioning');
      expect(result.mileage).toBe(52000);

      // Unchanged fields
      expect(result.make).toBe('Toyota');
      expect(result.model).toBe('Camry');
      expect(result.year).toBe(2020);
      expect(result.acquisition_cost).toBe(15000.50);
    });

    it('should handle null values correctly', async () => {
      const vehicle = await createVehicle(testVehicleInput);

      const updateInput: UpdateVehicleInput = {
        id: vehicle.id,
        listing_price: null,
        sale_price: null,
        sale_date: null,
        notes: null
      };

      const result = await updateVehicle(updateInput);

      expect(result.listing_price).toBeNull();
      expect(result.sale_price).toBeNull();
      expect(result.sale_date).toBeNull();
      expect(result.notes).toBeNull();
    });

    it('should save updates to database', async () => {
      const vehicle = await createVehicle(testVehicleInput);

      const updateInput: UpdateVehicleInput = {
        id: vehicle.id,
        status: 'sold',
        sale_price: 16000.00
      };

      await updateVehicle(updateInput);

      // Query database to verify updates
      const vehicles = await db.select()
        .from(vehiclesTable)
        .where(eq(vehiclesTable.id, vehicle.id))
        .execute();

      expect(vehicles[0].status).toBe('sold');
      expect(parseFloat(vehicles[0].sale_price!)).toBe(16000.00);
    });

    it('should throw error for non-existent vehicle', async () => {
      const updateInput: UpdateVehicleInput = {
        id: 999999,
        make: 'Should Fail'
      };

      await expect(updateVehicle(updateInput)).rejects.toThrow(/not found/i);
    });
  });

  describe('getVehicles', () => {
    it('should return empty array when no vehicles exist', async () => {
      const result = await getVehicles();
      expect(result).toEqual([]);
    });

    it('should return all vehicles with correct numeric conversions', async () => {
      const vehicle1 = await createVehicle(testVehicleInput);
      const vehicle2 = await createVehicle(testVehicleInputMinimal);

      const results = await getVehicles();

      expect(results).toHaveLength(2);
      
      // Check that all vehicles have proper numeric conversions
      results.forEach(vehicle => {
        expect(typeof vehicle.acquisition_cost).toBe('number');
        if (vehicle.listing_price !== null) {
          expect(typeof vehicle.listing_price).toBe('number');
        }
        if (vehicle.sale_price !== null) {
          expect(typeof vehicle.sale_price).toBe('number');
        }
      });
    });

    it('should return vehicles sorted by acquisition_date desc', async () => {
      // Create vehicles with different acquisition dates
      const vehicle1 = await createVehicle(testVehicleInput);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const vehicle2 = await createVehicle(testVehicleInputMinimal);

      const results = await getVehicles();

      expect(results).toHaveLength(2);
      // More recent vehicle should come first (desc order)
      expect(results[0].acquisition_date >= results[1].acquisition_date).toBe(true);
    });
  });

  describe('getVehicleById', () => {
    it('should return vehicle by ID with correct numeric conversions', async () => {
      const vehicle = await createVehicle(testVehicleInput);

      const input: GetByIdInput = { id: vehicle.id };
      const result = await getVehicleById(input);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(vehicle.id);
      expect(result!.vin).toBe('TEST123456789');
      expect(typeof result!.acquisition_cost).toBe('number');
      expect(result!.acquisition_cost).toBe(15000.50);
    });

    it('should return null for non-existent vehicle', async () => {
      const input: GetByIdInput = { id: 999999 };
      const result = await getVehicleById(input);

      expect(result).toBeNull();
    });
  });

  describe('deleteVehicle', () => {
    it('should delete vehicle successfully', async () => {
      const vehicle = await createVehicle(testVehicleInput);

      const input: GetByIdInput = { id: vehicle.id };
      const result = await deleteVehicle(input);

      expect(result.success).toBe(true);

      // Verify vehicle is deleted from database
      const vehicles = await db.select()
        .from(vehiclesTable)
        .where(eq(vehiclesTable.id, vehicle.id))
        .execute();

      expect(vehicles).toHaveLength(0);
    });

    it('should cascade delete related expenses and transactions', async () => {
      const vehicle = await createVehicle(testVehicleInput);

      // Create a vendor for the expense
      const vendorResult = await db.insert(vendorsTable)
        .values({
          name: 'Test Vendor',
          contact_info: 'test@vendor.com'
        })
        .returning()
        .execute();

      // Create related expense
      await db.insert(expensesTable)
        .values({
          vehicle_id: vehicle.id,
          vendor_id: vendorResult[0].id,
          amount: '500.00',
          expense_type: 'repairs',
          description: 'Test repair'
        })
        .execute();

      // Create related transaction
      await db.insert(transactionsTable)
        .values({
          vehicle_id: vehicle.id,
          type: 'expense',
          amount: '500.00',
          description: 'Test transaction'
        })
        .execute();

      // Delete vehicle
      const input: GetByIdInput = { id: vehicle.id };
      await deleteVehicle(input);

      // Verify cascade deletion
      const expenses = await db.select()
        .from(expensesTable)
        .where(eq(expensesTable.vehicle_id, vehicle.id))
        .execute();

      const transactions = await db.select()
        .from(transactionsTable)
        .where(eq(transactionsTable.vehicle_id, vehicle.id))
        .execute();

      expect(expenses).toHaveLength(0);
      expect(transactions).toHaveLength(0);
    });

    it('should throw error for non-existent vehicle', async () => {
      const input: GetByIdInput = { id: 999999 };

      await expect(deleteVehicle(input)).rejects.toThrow(/not found/i);
    });
  });
});