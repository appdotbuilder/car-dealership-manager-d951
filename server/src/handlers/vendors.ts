import { db } from '../db';
import { vendorsTable, expensesTable } from '../db/schema';
import { type CreateVendorInput, type UpdateVendorInput, type Vendor, type GetByIdInput } from '../schema';
import { eq, asc, sql } from 'drizzle-orm';

export async function createVendor(input: CreateVendorInput): Promise<Vendor> {
  try {
    const result = await db.insert(vendorsTable)
      .values({
        name: input.name,
        contact_info: input.contact_info || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Vendor creation failed:', error);
    throw error;
  }
}

export async function updateVendor(input: UpdateVendorInput): Promise<Vendor> {
  try {
    // First check if vendor exists
    const existing = await db.select()
      .from(vendorsTable)
      .where(eq(vendorsTable.id, input.id))
      .execute();

    if (existing.length === 0) {
      throw new Error(`Vendor with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.contact_info !== undefined) updateData.contact_info = input.contact_info;

    const result = await db.update(vendorsTable)
      .set(updateData)
      .where(eq(vendorsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Vendor update failed:', error);
    throw error;
  }
}

export async function getVendors(): Promise<Vendor[]> {
  try {
    const result = await db.select()
      .from(vendorsTable)
      .orderBy(asc(vendorsTable.name))
      .execute();

    return result;
  } catch (error) {
    console.error('Vendor retrieval failed:', error);
    throw error;
  }
}

export async function getVendorById(input: GetByIdInput): Promise<Vendor | null> {
  try {
    const result = await db.select()
      .from(vendorsTable)
      .where(eq(vendorsTable.id, input.id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Vendor retrieval by ID failed:', error);
    throw error;
  }
}

export async function deleteVendor(input: GetByIdInput): Promise<{ success: boolean }> {
  try {
    // First check if vendor exists
    const existing = await db.select()
      .from(vendorsTable)
      .where(eq(vendorsTable.id, input.id))
      .execute();

    if (existing.length === 0) {
      throw new Error(`Vendor with id ${input.id} not found`);
    }

    // Check if vendor has associated expenses
    const expenseCount = await db.select({ count: sql<number>`count(*)` })
      .from(expensesTable)
      .where(eq(expensesTable.vendor_id, input.id))
      .execute();

    if (expenseCount[0].count > 0) {
      throw new Error(`Cannot delete vendor with id ${input.id} because it has associated expenses`);
    }

    await db.delete(vendorsTable)
      .where(eq(vendorsTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Vendor deletion failed:', error);
    throw error;
  }
}