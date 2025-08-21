import { db } from '../db';
import { vehiclesTable, expensesTable, transactionsTable } from '../db/schema';
import { type CreateVehicleInput, type UpdateVehicleInput, type Vehicle, type GetByIdInput } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function createVehicle(input: CreateVehicleInput): Promise<Vehicle> {
  try {
    // Insert vehicle record with default status 'acquired'
    const result = await db.insert(vehiclesTable)
      .values({
        vin: input.vin,
        make: input.make,
        model: input.model,
        year: input.year,
        color: input.color,
        mileage: input.mileage,
        status: 'acquired',
        acquisition_cost: input.acquisition_cost.toString(), // Convert number to string for numeric column
        notes: input.notes || null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const vehicle = result[0];
    return {
      ...vehicle,
      acquisition_cost: parseFloat(vehicle.acquisition_cost), // Convert string back to number
      listing_price: vehicle.listing_price ? parseFloat(vehicle.listing_price) : null,
      sale_price: vehicle.sale_price ? parseFloat(vehicle.sale_price) : null
    };
  } catch (error) {
    console.error('Vehicle creation failed:', error);
    throw error;
  }
}

export async function updateVehicle(input: UpdateVehicleInput): Promise<Vehicle> {
  try {
    // Check if vehicle exists
    const existingVehicle = await db.select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, input.id))
      .execute();

    if (existingVehicle.length === 0) {
      throw new Error(`Vehicle with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.make !== undefined) updateData.make = input.make;
    if (input.model !== undefined) updateData.model = input.model;
    if (input.year !== undefined) updateData.year = input.year;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.mileage !== undefined) updateData.mileage = input.mileage;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.listing_price !== undefined) {
      updateData.listing_price = input.listing_price ? input.listing_price.toString() : null;
    }
    if (input.sale_price !== undefined) {
      updateData.sale_price = input.sale_price ? input.sale_price.toString() : null;
    }
    if (input.sale_date !== undefined) updateData.sale_date = input.sale_date;
    if (input.notes !== undefined) updateData.notes = input.notes;

    // Update vehicle record
    const result = await db.update(vehiclesTable)
      .set(updateData)
      .where(eq(vehiclesTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const vehicle = result[0];
    return {
      ...vehicle,
      acquisition_cost: parseFloat(vehicle.acquisition_cost), // Convert string back to number
      listing_price: vehicle.listing_price ? parseFloat(vehicle.listing_price) : null,
      sale_price: vehicle.sale_price ? parseFloat(vehicle.sale_price) : null
    };
  } catch (error) {
    console.error('Vehicle update failed:', error);
    throw error;
  }
}

export async function getVehicles(): Promise<Vehicle[]> {
  try {
    // Fetch all vehicles sorted by acquisition_date desc by default
    const results = await db.select()
      .from(vehiclesTable)
      .orderBy(desc(vehiclesTable.acquisition_date))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(vehicle => ({
      ...vehicle,
      acquisition_cost: parseFloat(vehicle.acquisition_cost), // Convert string back to number
      listing_price: vehicle.listing_price ? parseFloat(vehicle.listing_price) : null,
      sale_price: vehicle.sale_price ? parseFloat(vehicle.sale_price) : null
    }));
  } catch (error) {
    console.error('Vehicle fetch failed:', error);
    throw error;
  }
}

export async function getVehicleById(input: GetByIdInput): Promise<Vehicle | null> {
  try {
    // Fetch single vehicle by ID
    const results = await db.select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, input.id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const vehicle = results[0];
    return {
      ...vehicle,
      acquisition_cost: parseFloat(vehicle.acquisition_cost), // Convert string back to number
      listing_price: vehicle.listing_price ? parseFloat(vehicle.listing_price) : null,
      sale_price: vehicle.sale_price ? parseFloat(vehicle.sale_price) : null
    };
  } catch (error) {
    console.error('Vehicle fetch by ID failed:', error);
    throw error;
  }
}

export async function deleteVehicle(input: GetByIdInput): Promise<{ success: boolean }> {
  try {
    // Check if vehicle exists
    const existingVehicle = await db.select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, input.id))
      .execute();

    if (existingVehicle.length === 0) {
      throw new Error(`Vehicle with id ${input.id} not found`);
    }

    // Delete related records first (cascade delete)
    // Delete expenses
    await db.delete(expensesTable)
      .where(eq(expensesTable.vehicle_id, input.id))
      .execute();

    // Delete transactions
    await db.delete(transactionsTable)
      .where(eq(transactionsTable.vehicle_id, input.id))
      .execute();

    // Delete the vehicle
    await db.delete(vehiclesTable)
      .where(eq(vehiclesTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Vehicle deletion failed:', error);
    throw error;
  }
}