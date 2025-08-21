import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vehiclesTable, expensesTable, vendorsTable } from '../db/schema';
import { getDashboardKpis } from '../handlers/dashboard';

describe('getDashboardKpis', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return default KPIs for empty database', async () => {
    const result = await getDashboardKpis();

    expect(result.total_inventory).toEqual(0);
    expect(result.total_inventory_value).toEqual(0);
    expect(result.vehicles_in_reconditioning).toEqual(0);
    expect(result.vehicles_listed).toEqual(0);
    expect(result.vehicles_sold_this_month).toEqual(0);
    expect(result.total_profit_this_month).toEqual(0);
    expect(result.avg_days_to_sale).toBeNull();
  });

  it('should calculate inventory metrics correctly', async () => {
    // Create test vehicles with different statuses
    await db.insert(vehiclesTable).values([
      {
        vin: 'VIN001',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Blue',
        mileage: 50000,
        status: 'acquired',
        acquisition_cost: '15000.00'
      },
      {
        vin: 'VIN002', 
        make: 'Honda',
        model: 'Accord',
        year: 2019,
        color: 'Red',
        mileage: 60000,
        status: 'reconditioning',
        acquisition_cost: '18000.00'
      },
      {
        vin: 'VIN003',
        make: 'Ford',
        model: 'F-150',
        year: 2021,
        color: 'White',
        mileage: 30000,
        status: 'listed',
        acquisition_cost: '25000.00'
      },
      {
        vin: 'VIN004',
        make: 'BMW',
        model: '3 Series',
        year: 2018,
        color: 'Black',
        mileage: 80000,
        status: 'sold',
        acquisition_cost: '20000.00',
        sale_price: '22000.00',
        sale_date: new Date()
      },
      {
        vin: 'VIN005',
        make: 'Audi',
        model: 'A4',
        year: 2017,
        color: 'Silver',
        mileage: 90000,
        status: 'archived',
        acquisition_cost: '16000.00'
      }
    ]).execute();

    const result = await getDashboardKpis();

    // Should count acquired, reconditioning, and listed vehicles (not sold or archived)
    expect(result.total_inventory).toEqual(3);
    expect(result.vehicles_in_reconditioning).toEqual(1);
    expect(result.vehicles_listed).toEqual(1);
    
    // Total inventory value should be sum of acquisition costs for unsold vehicles
    // 15000 + 18000 + 25000 = 58000
    expect(result.total_inventory_value).toEqual(58000);
  });

  it('should include expenses in inventory value calculation', async () => {
    // Create a vendor first
    const vendorResult = await db.insert(vendorsTable).values({
      name: 'Test Vendor',
      contact_info: 'test@vendor.com'
    }).returning().execute();

    const vendor = vendorResult[0];

    // Create vehicle
    const vehicleResult = await db.insert(vehiclesTable).values({
      vin: 'VIN001',
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      color: 'Blue',
      mileage: 50000,
      status: 'acquired',
      acquisition_cost: '15000.00'
    }).returning().execute();

    const vehicle = vehicleResult[0];

    // Add expenses to the vehicle
    await db.insert(expensesTable).values([
      {
        vehicle_id: vehicle.id,
        vendor_id: vendor.id,
        amount: '2000.00',
        expense_type: 'repairs',
        description: 'Engine repair'
      },
      {
        vehicle_id: vehicle.id,
        vendor_id: vendor.id,
        amount: '500.00',
        expense_type: 'detailing',
        description: 'Interior cleaning'
      }
    ]).execute();

    const result = await getDashboardKpis();

    expect(result.total_inventory).toEqual(1);
    // Should include acquisition cost + expenses: 15000 + 2000 + 500 = 17500
    expect(result.total_inventory_value).toEqual(17500);
  });

  it('should calculate vehicles sold this month correctly', async () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15); // Mid-month
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);

    // Create vehicles sold this month and last month
    await db.insert(vehiclesTable).values([
      {
        vin: 'VIN001',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Blue',
        mileage: 50000,
        status: 'sold',
        acquisition_cost: '15000.00',
        sale_price: '18000.00',
        sale_date: thisMonth
      },
      {
        vin: 'VIN002',
        make: 'Honda',
        model: 'Accord',
        year: 2019,
        color: 'Red',
        mileage: 60000,
        status: 'sold',
        acquisition_cost: '16000.00',
        sale_price: '19000.00',
        sale_date: thisMonth
      },
      {
        vin: 'VIN003',
        make: 'Ford',
        model: 'F-150',
        year: 2021,
        color: 'White',
        mileage: 30000,
        status: 'sold',
        acquisition_cost: '25000.00',
        sale_price: '28000.00',
        sale_date: lastMonth
      }
    ]).execute();

    const result = await getDashboardKpis();

    expect(result.vehicles_sold_this_month).toEqual(2);
  });

  it('should calculate profit this month correctly', async () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15);

    // Create vendor
    const vendorResult = await db.insert(vendorsTable).values({
      name: 'Test Vendor'
    }).returning().execute();

    const vendor = vendorResult[0];

    // Create vehicle sold this month
    const vehicleResult = await db.insert(vehiclesTable).values({
      vin: 'VIN001',
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      color: 'Blue',
      mileage: 50000,
      status: 'sold',
      acquisition_cost: '15000.00',
      sale_price: '20000.00',
      sale_date: thisMonth
    }).returning().execute();

    const vehicle = vehicleResult[0];

    // Add expenses
    await db.insert(expensesTable).values({
      vehicle_id: vehicle.id,
      vendor_id: vendor.id,
      amount: '2000.00',
      expense_type: 'repairs',
      description: 'Engine repair'
    }).execute();

    const result = await getDashboardKpis();

    // Profit = sale_price - acquisition_cost - expenses
    // 20000 - 15000 - 2000 = 3000
    expect(result.total_profit_this_month).toEqual(3000);
    expect(result.vehicles_sold_this_month).toEqual(1);
  });

  it('should calculate average days to sale correctly', async () => {
    const baseDate = new Date('2024-01-01');
    const saleDate1 = new Date('2024-01-11'); // 10 days
    const saleDate2 = new Date('2024-01-21'); // 20 days
    
    await db.insert(vehiclesTable).values([
      {
        vin: 'VIN001',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Blue',
        mileage: 50000,
        status: 'sold',
        acquisition_cost: '15000.00',
        sale_price: '18000.00',
        acquisition_date: baseDate,
        sale_date: saleDate1
      },
      {
        vin: 'VIN002',
        make: 'Honda',
        model: 'Accord',
        year: 2019,
        color: 'Red',
        mileage: 60000,
        status: 'sold',
        acquisition_cost: '16000.00',
        sale_price: '19000.00',
        acquisition_date: baseDate,
        sale_date: saleDate2
      }
    ]).execute();

    const result = await getDashboardKpis();

    // Average of 10 and 20 days = 15 days
    expect(result.avg_days_to_sale).toEqual(15);
  });

  it('should handle mixed scenarios with all KPI types', async () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 10);

    // Create vendor
    const vendorResult = await db.insert(vendorsTable).values({
      name: 'Mixed Vendor'
    }).returning().execute();

    const vendor = vendorResult[0];

    // Create various vehicles
    const vehicleResults = await db.insert(vehiclesTable).values([
      {
        vin: 'VIN001',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Blue',
        mileage: 50000,
        status: 'acquired',
        acquisition_cost: '15000.00'
      },
      {
        vin: 'VIN002',
        make: 'Honda',
        model: 'Accord',
        year: 2019,
        color: 'Red',
        mileage: 60000,
        status: 'reconditioning',
        acquisition_cost: '18000.00'
      },
      {
        vin: 'VIN003',
        make: 'Ford',
        model: 'F-150',
        year: 2021,
        color: 'White',
        mileage: 30000,
        status: 'listed',
        acquisition_cost: '25000.00'
      },
      {
        vin: 'VIN004',
        make: 'BMW',
        model: '3 Series',
        year: 2018,
        color: 'Black',
        mileage: 80000,
        status: 'sold',
        acquisition_cost: '20000.00',
        sale_price: '24000.00',
        sale_date: thisMonth
      }
    ]).returning().execute();

    // Add expenses to unsold vehicles
    await db.insert(expensesTable).values([
      {
        vehicle_id: vehicleResults[0].id, // acquired vehicle
        vendor_id: vendor.id,
        amount: '1000.00',
        expense_type: 'repairs',
        description: 'Minor repairs'
      },
      {
        vehicle_id: vehicleResults[1].id, // reconditioning vehicle
        vendor_id: vendor.id,
        amount: '2500.00',
        expense_type: 'reconditioning',
        description: 'Full reconditioning'
      },
      {
        vehicle_id: vehicleResults[3].id, // sold vehicle
        vendor_id: vendor.id,
        amount: '1500.00',
        expense_type: 'detailing',
        description: 'Pre-sale detailing'
      }
    ]).execute();

    const result = await getDashboardKpis();

    expect(result.total_inventory).toEqual(3); // acquired + reconditioning + listed
    expect(result.vehicles_in_reconditioning).toEqual(1);
    expect(result.vehicles_listed).toEqual(1);
    expect(result.vehicles_sold_this_month).toEqual(1);
    
    // Inventory value: (15000 + 1000) + (18000 + 2500) + 25000 = 61500
    expect(result.total_inventory_value).toEqual(61500);
    
    // Profit this month: 24000 - 20000 - 1500 = 2500
    expect(result.total_profit_this_month).toEqual(2500);
  });
});