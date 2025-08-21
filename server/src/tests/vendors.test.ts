import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vendorsTable, expensesTable, vehiclesTable } from '../db/schema';
import { type CreateVendorInput, type UpdateVendorInput, type GetByIdInput } from '../schema';
import { createVendor, updateVendor, getVendors, getVendorById, deleteVendor } from '../handlers/vendors';
import { eq } from 'drizzle-orm';

// Test inputs
const testVendorInput: CreateVendorInput = {
  name: 'Test Auto Parts',
  contact_info: 'contact@testautoparts.com'
};

const testVendorInputMinimal: CreateVendorInput = {
  name: 'Minimal Vendor'
};

describe('Vendor Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createVendor', () => {
    it('should create a vendor with all fields', async () => {
      const result = await createVendor(testVendorInput);

      expect(result.name).toEqual('Test Auto Parts');
      expect(result.contact_info).toEqual('contact@testautoparts.com');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create a vendor with minimal fields', async () => {
      const result = await createVendor(testVendorInputMinimal);

      expect(result.name).toEqual('Minimal Vendor');
      expect(result.contact_info).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save vendor to database', async () => {
      const result = await createVendor(testVendorInput);

      const vendors = await db.select()
        .from(vendorsTable)
        .where(eq(vendorsTable.id, result.id))
        .execute();

      expect(vendors).toHaveLength(1);
      expect(vendors[0].name).toEqual('Test Auto Parts');
      expect(vendors[0].contact_info).toEqual('contact@testautoparts.com');
      expect(vendors[0].created_at).toBeInstanceOf(Date);
    });
  });

  describe('updateVendor', () => {
    it('should update vendor name', async () => {
      const vendor = await createVendor(testVendorInput);

      const updateInput: UpdateVendorInput = {
        id: vendor.id,
        name: 'Updated Auto Parts'
      };

      const result = await updateVendor(updateInput);

      expect(result.name).toEqual('Updated Auto Parts');
      expect(result.contact_info).toEqual('contact@testautoparts.com'); // Should remain unchanged
      expect(result.id).toEqual(vendor.id);
    });

    it('should update contact info', async () => {
      const vendor = await createVendor(testVendorInput);

      const updateInput: UpdateVendorInput = {
        id: vendor.id,
        contact_info: 'newemail@example.com'
      };

      const result = await updateVendor(updateInput);

      expect(result.name).toEqual('Test Auto Parts'); // Should remain unchanged
      expect(result.contact_info).toEqual('newemail@example.com');
      expect(result.id).toEqual(vendor.id);
    });

    it('should update both name and contact info', async () => {
      const vendor = await createVendor(testVendorInput);

      const updateInput: UpdateVendorInput = {
        id: vendor.id,
        name: 'Complete Update Parts',
        contact_info: 'complete@update.com'
      };

      const result = await updateVendor(updateInput);

      expect(result.name).toEqual('Complete Update Parts');
      expect(result.contact_info).toEqual('complete@update.com');
      expect(result.id).toEqual(vendor.id);
    });

    it('should set contact info to null', async () => {
      const vendor = await createVendor(testVendorInput);

      const updateInput: UpdateVendorInput = {
        id: vendor.id,
        contact_info: null
      };

      const result = await updateVendor(updateInput);

      expect(result.name).toEqual('Test Auto Parts');
      expect(result.contact_info).toBeNull();
      expect(result.id).toEqual(vendor.id);
    });

    it('should throw error for non-existent vendor', async () => {
      const updateInput: UpdateVendorInput = {
        id: 999,
        name: 'Non-existent Vendor'
      };

      await expect(updateVendor(updateInput)).rejects.toThrow(/not found/i);
    });
  });

  describe('getVendors', () => {
    it('should return empty array when no vendors exist', async () => {
      const result = await getVendors();
      expect(result).toEqual([]);
    });

    it('should return all vendors sorted by name', async () => {
      // Create vendors in non-alphabetical order
      const vendor1 = await createVendor({ name: 'Zebra Parts', contact_info: 'zebra@example.com' });
      const vendor2 = await createVendor({ name: 'Alpha Parts', contact_info: 'alpha@example.com' });
      const vendor3 = await createVendor({ name: 'Beta Parts' });

      const result = await getVendors();

      expect(result).toHaveLength(3);
      expect(result[0].name).toEqual('Alpha Parts');
      expect(result[1].name).toEqual('Beta Parts');
      expect(result[2].name).toEqual('Zebra Parts');

      // Verify all fields are present
      expect(result[0].id).toEqual(vendor2.id);
      expect(result[0].contact_info).toEqual('alpha@example.com');
      expect(result[0].created_at).toBeInstanceOf(Date);

      expect(result[1].id).toEqual(vendor3.id);
      expect(result[1].contact_info).toBeNull();

      expect(result[2].id).toEqual(vendor1.id);
      expect(result[2].contact_info).toEqual('zebra@example.com');
    });
  });

  describe('getVendorById', () => {
    it('should return vendor when found', async () => {
      const vendor = await createVendor(testVendorInput);

      const input: GetByIdInput = { id: vendor.id };
      const result = await getVendorById(input);

      expect(result).not.toBeNull();
      expect(result!.name).toEqual('Test Auto Parts');
      expect(result!.contact_info).toEqual('contact@testautoparts.com');
      expect(result!.id).toEqual(vendor.id);
      expect(result!.created_at).toBeInstanceOf(Date);
    });

    it('should return null when vendor not found', async () => {
      const input: GetByIdInput = { id: 999 };
      const result = await getVendorById(input);

      expect(result).toBeNull();
    });
  });

  describe('deleteVendor', () => {
    it('should delete vendor successfully', async () => {
      const vendor = await createVendor(testVendorInput);

      const input: GetByIdInput = { id: vendor.id };
      const result = await deleteVendor(input);

      expect(result.success).toBe(true);

      // Verify vendor is deleted
      const deletedVendor = await getVendorById(input);
      expect(deletedVendor).toBeNull();
    });

    it('should throw error for non-existent vendor', async () => {
      const input: GetByIdInput = { id: 999 };

      await expect(deleteVendor(input)).rejects.toThrow(/not found/i);
    });

    it('should throw error when vendor has associated expenses', async () => {
      // First create a vendor
      const vendor = await createVendor(testVendorInput);

      // Create a vehicle first (required for expense)
      const vehicleResult = await db.insert(vehiclesTable)
        .values({
          vin: 'TEST123456789',
          make: 'Test',
          model: 'Model',
          year: 2020,
          color: 'Blue',
          mileage: 50000,
          acquisition_cost: '15000.00'
        })
        .returning()
        .execute();

      // Create an expense associated with this vendor
      await db.insert(expensesTable)
        .values({
          vehicle_id: vehicleResult[0].id,
          vendor_id: vendor.id,
          amount: '500.00',
          expense_type: 'repairs',
          description: 'Test repair expense',
        })
        .execute();

      const input: GetByIdInput = { id: vendor.id };

      await expect(deleteVendor(input)).rejects.toThrow(/associated expenses/i);

      // Verify vendor still exists
      const existingVendor = await getVendorById(input);
      expect(existingVendor).not.toBeNull();
    });

    it('should allow deletion when vendor has no expenses', async () => {
      const vendor = await createVendor(testVendorInput);

      // Create another vendor with expenses to ensure our check works
      const otherVendor = await createVendor({ name: 'Other Vendor' });

      const vehicleResult = await db.insert(vehiclesTable)
        .values({
          vin: 'OTHER123456789',
          make: 'Other',
          model: 'Model',
          year: 2021,
          color: 'Red',
          mileage: 30000,
          acquisition_cost: '20000.00'
        })
        .returning()
        .execute();

      await db.insert(expensesTable)
        .values({
          vehicle_id: vehicleResult[0].id,
          vendor_id: otherVendor.id,
          amount: '300.00',
          expense_type: 'inspection',
          description: 'Test inspection expense',
        })
        .execute();

      // Should be able to delete the vendor with no expenses
      const input: GetByIdInput = { id: vendor.id };
      const result = await deleteVendor(input);

      expect(result.success).toBe(true);

      // Verify vendor is deleted
      const deletedVendor = await getVendorById(input);
      expect(deletedVendor).toBeNull();
    });
  });
});