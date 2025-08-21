import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vehiclesTable, expensesTable, transactionsTable, vendorsTable } from '../db/schema';
import { 
  getProfitLossReport, 
  getVehicleProfitLoss, 
  getInventoryAging, 
  getVehicleDetails,
  exportProfitLossToCSV,
  exportInventoryAgingToCSV,
  exportExpenseBreakdownToCSV
} from '../handlers/reports';
import type { FinancialReportFilters } from '../schema';

describe('Reports Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getProfitLossReport', () => {
    it('should return profit/loss for all vehicles', async () => {
      // Create test vehicle
      const vehicleResult = await db.insert(vehiclesTable).values({
        vin: 'TEST123456789',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Blue',
        mileage: 50000,
        status: 'sold',
        acquisition_cost: '15000.00',
        sale_price: '18000.00'
      }).returning().execute();
      
      const vehicleId = vehicleResult[0].id;

      // Create test expenses
      await db.insert(expensesTable).values([
        {
          vehicle_id: vehicleId,
          amount: '1000.00',
          expense_type: 'repairs',
          description: 'Engine repair'
        },
        {
          vehicle_id: vehicleId,
          amount: '500.00',
          expense_type: 'detailing',
          description: 'Car detailing'
        }
      ]).execute();

      const results = await getProfitLossReport();

      expect(results).toHaveLength(1);
      const profitLoss = results[0];
      expect(profitLoss.vehicle_id).toEqual(vehicleId);
      expect(profitLoss.acquisition_cost).toEqual(15000);
      expect(profitLoss.total_expenses).toEqual(1500);
      expect(profitLoss.total_cost).toEqual(16500);
      expect(profitLoss.sale_price).toEqual(18000);
      expect(profitLoss.profit_loss).toEqual(1500);
      expect(profitLoss.is_sold).toBe(true);
    });

    it('should handle vehicles with no expenses', async () => {
      const vehicleResult = await db.insert(vehiclesTable).values({
        vin: 'TEST987654321',
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        color: 'Red',
        mileage: 30000,
        status: 'listed',
        acquisition_cost: '12000.00',
        listing_price: '14000.00'
      }).returning().execute();

      const results = await getProfitLossReport();

      expect(results).toHaveLength(1);
      const profitLoss = results[0];
      expect(profitLoss.total_expenses).toEqual(0);
      expect(profitLoss.total_cost).toEqual(12000);
      expect(profitLoss.sale_price).toBeNull();
      expect(profitLoss.profit_loss).toBeNull();
      expect(profitLoss.is_sold).toBe(false);
    });

    it('should filter by status', async () => {
      // Create sold vehicle
      await db.insert(vehiclesTable).values({
        vin: 'SOLD123456789',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Blue',
        mileage: 50000,
        status: 'sold',
        acquisition_cost: '15000.00',
        sale_price: '18000.00'
      }).execute();

      // Create listed vehicle
      await db.insert(vehiclesTable).values({
        vin: 'LIST123456789',
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        color: 'Red',
        mileage: 30000,
        status: 'listed',
        acquisition_cost: '12000.00'
      }).execute();

      const filters: FinancialReportFilters = { status: 'sold' };
      const results = await getProfitLossReport(filters);

      expect(results).toHaveLength(1);
      expect(results[0].is_sold).toBe(true);
    });

    it('should filter by date range', async () => {
      const pastDate = new Date('2023-01-01');
      const futureDate = new Date('2023-12-31');

      // Create vehicle with specific acquisition date
      await db.insert(vehiclesTable).values({
        vin: 'DATE123456789',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Blue',
        mileage: 50000,
        status: 'sold',
        acquisition_cost: '15000.00',
        acquisition_date: new Date('2023-06-01')
      }).execute();

      const filters: FinancialReportFilters = {
        start_date: pastDate,
        end_date: futureDate
      };
      const results = await getProfitLossReport(filters);

      expect(results).toHaveLength(1);
    });

    it('should filter by make and model', async () => {
      // Create Toyota
      await db.insert(vehiclesTable).values({
        vin: 'TOY123456789',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Blue',
        mileage: 50000,
        status: 'sold',
        acquisition_cost: '15000.00'
      }).execute();

      // Create Honda
      await db.insert(vehiclesTable).values({
        vin: 'HON123456789',
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        color: 'Red',
        mileage: 30000,
        status: 'sold',
        acquisition_cost: '12000.00'
      }).execute();

      const filters: FinancialReportFilters = { 
        make: 'Toyota',
        model: 'Camry'
      };
      const results = await getProfitLossReport(filters);

      expect(results).toHaveLength(1);
      expect(results[0].acquisition_cost).toEqual(15000);
    });
  });

  describe('getVehicleProfitLoss', () => {
    it('should return profit/loss for specific vehicle', async () => {
      const vehicleResult = await db.insert(vehiclesTable).values({
        vin: 'SPECIFIC123456',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Blue',
        mileage: 50000,
        status: 'sold',
        acquisition_cost: '15000.00',
        sale_price: '18000.00'
      }).returning().execute();
      
      const vehicleId = vehicleResult[0].id;

      await db.insert(expensesTable).values({
        vehicle_id: vehicleId,
        amount: '1500.00',
        expense_type: 'repairs',
        description: 'Engine repair'
      }).execute();

      const result = await getVehicleProfitLoss({ id: vehicleId });

      expect(result).toBeDefined();
      expect(result!.vehicle_id).toEqual(vehicleId);
      expect(result!.acquisition_cost).toEqual(15000);
      expect(result!.total_expenses).toEqual(1500);
      expect(result!.total_cost).toEqual(16500);
      expect(result!.sale_price).toEqual(18000);
      expect(result!.profit_loss).toEqual(1500);
      expect(result!.is_sold).toBe(true);
    });

    it('should return null for non-existent vehicle', async () => {
      const result = await getVehicleProfitLoss({ id: 999 });
      expect(result).toBeNull();
    });
  });

  describe('getInventoryAging', () => {
    it('should return aging data for listed vehicles only', async () => {
      // Create listed vehicle
      const listedResult = await db.insert(vehiclesTable).values({
        vin: 'LISTED123456',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Blue',
        mileage: 50000,
        status: 'listed',
        acquisition_cost: '15000.00',
        acquisition_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      }).returning().execute();

      // Create sold vehicle (should not appear)
      await db.insert(vehiclesTable).values({
        vin: 'SOLD123456789',
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        color: 'Red',
        mileage: 30000,
        status: 'sold',
        acquisition_cost: '12000.00'
      }).execute();

      // Add expenses to listed vehicle
      await db.insert(expensesTable).values({
        vehicle_id: listedResult[0].id,
        amount: '1000.00',
        expense_type: 'repairs',
        description: 'Engine repair'
      }).execute();

      const results = await getInventoryAging();

      expect(results).toHaveLength(1);
      const aging = results[0];
      expect(aging.vehicle_id).toEqual(listedResult[0].id);
      expect(aging.vin).toEqual('LISTED123456');
      expect(aging.make).toEqual('Toyota');
      expect(aging.model).toEqual('Camry');
      expect(aging.year).toEqual(2020);
      expect(aging.status).toEqual('listed');
      expect(typeof aging.days_in_inventory).toBe('number');
      expect(aging.days_in_inventory).toBeGreaterThan(25); // Should be around 30 days
      expect(aging.total_cost).toEqual(16000); // 15000 + 1000 expenses
    });

    it('should return empty array when no listed vehicles exist', async () => {
      await db.insert(vehiclesTable).values({
        vin: 'SOLD123456789',
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        color: 'Red',
        mileage: 30000,
        status: 'sold',
        acquisition_cost: '12000.00'
      }).execute();

      const results = await getInventoryAging();
      expect(results).toHaveLength(0);
    });
  });

  describe('getVehicleDetails', () => {
    it('should return complete vehicle details with related data', async () => {
      // Create vendor first
      const vendorResult = await db.insert(vendorsTable).values({
        name: 'Test Vendor',
        contact_info: 'test@vendor.com'
      }).returning().execute();

      // Create vehicle
      const vehicleResult = await db.insert(vehiclesTable).values({
        vin: 'DETAILS123456',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Blue',
        mileage: 50000,
        status: 'sold',
        acquisition_cost: '15000.00',
        listing_price: '17000.00',
        sale_price: '18000.00',
        notes: 'Test vehicle'
      }).returning().execute();
      
      const vehicleId = vehicleResult[0].id;

      // Create expenses
      await db.insert(expensesTable).values([
        {
          vehicle_id: vehicleId,
          vendor_id: vendorResult[0].id,
          amount: '1000.00',
          expense_type: 'repairs',
          description: 'Engine repair'
        },
        {
          vehicle_id: vehicleId,
          amount: '500.00',
          expense_type: 'detailing',
          description: 'Car detailing'
        }
      ]).execute();

      // Create transactions
      await db.insert(transactionsTable).values([
        {
          vehicle_id: vehicleId,
          type: 'sale',
          amount: '18000.00',
          description: 'Vehicle sale'
        }
      ]).execute();

      const result = await getVehicleDetails({ id: vehicleId });

      expect(result).toBeDefined();
      expect(result!.vehicle.id).toEqual(vehicleId);
      expect(result!.vehicle.vin).toEqual('DETAILS123456');
      expect(result!.vehicle.acquisition_cost).toEqual(15000);
      expect(result!.vehicle.listing_price).toEqual(17000);
      expect(result!.vehicle.sale_price).toEqual(18000);
      
      expect(result!.expenses).toHaveLength(2);
      expect(result!.expenses[0].amount).toEqual(1000);
      expect(result!.expenses[1].amount).toEqual(500);
      
      expect(result!.transactions).toHaveLength(1);
      expect(result!.transactions[0].amount).toEqual(18000);
      
      expect(result!.profit_loss.profit_loss).toEqual(1500); // 18000 - (15000 + 1500)
    });

    it('should return null for non-existent vehicle', async () => {
      const result = await getVehicleDetails({ id: 999 });
      expect(result).toBeNull();
    });
  });

  describe('CSV Export Functions', () => {
    beforeEach(async () => {
      // Create test data for CSV exports
      const vehicleResult = await db.insert(vehiclesTable).values({
        vin: 'CSV123456789',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Blue',
        mileage: 50000,
        status: 'sold',
        acquisition_cost: '15000.00',
        sale_price: '18000.00'
      }).returning().execute();

      await db.insert(expensesTable).values([
        {
          vehicle_id: vehicleResult[0].id,
          amount: '1000.00',
          expense_type: 'repairs',
          description: 'Engine repair'
        },
        {
          vehicle_id: vehicleResult[0].id,
          amount: '500.00',
          expense_type: 'detailing',
          description: 'Car detailing'
        }
      ]).execute();
    });

    describe('exportProfitLossToCSV', () => {
      it('should export profit/loss data as CSV', async () => {
        const csv = await exportProfitLossToCSV();

        expect(csv).toContain('Vehicle ID,VIN,Make,Model,Acquisition Cost,Total Expenses,Sale Price,Profit/Loss');
        expect(csv).toContain('"CSV123456789"');
        expect(csv).toContain('"Toyota"');
        expect(csv).toContain('"Camry"');
        expect(csv).toContain('15000.00');
        expect(csv).toContain('1500.00');
        expect(csv).toContain('18000.00');
        expect(csv).toContain('1500.00'); // profit
      });

      it('should return headers only when no data exists', async () => {
        // Clear all data
        await db.delete(expensesTable).execute();
        await db.delete(vehiclesTable).execute();

        const csv = await exportProfitLossToCSV();

        expect(csv).toEqual('Vehicle ID,VIN,Make,Model,Acquisition Cost,Total Expenses,Sale Price,Profit/Loss\n');
      });
    });

    describe('exportInventoryAgingToCSV', () => {
      it('should export aging data as CSV for listed vehicles', async () => {
        // Update vehicle status to listed
        await db.update(vehiclesTable)
          .set({ status: 'listed' })
          .execute();

        const csv = await exportInventoryAgingToCSV();

        expect(csv).toContain('Vehicle ID,VIN,Make,Model,Year,Status,Days in Inventory,Total Cost');
        expect(csv).toContain('"CSV123456789"');
        expect(csv).toContain('"Toyota"');
        expect(csv).toContain('"Camry"');
        expect(csv).toContain('2020');
        expect(csv).toContain('"listed"');
        expect(csv).toContain('16500.00'); // total cost including expenses
      });
    });

    describe('exportExpenseBreakdownToCSV', () => {
      it('should export expense breakdown as CSV', async () => {
        const csv = await exportExpenseBreakdownToCSV();

        expect(csv).toContain('Expense Type,Total Amount,Count');
        expect(csv).toContain('"repairs"');
        expect(csv).toContain('"detailing"');
        expect(csv).toContain('1000.00');
        expect(csv).toContain('500.00');
        expect(csv).toContain(',1'); // count
      });

      it('should filter expense breakdown by vehicle filters', async () => {
        // Create another vehicle with different make
        const vehicleResult = await db.insert(vehiclesTable).values({
          vin: 'HONDA123456789',
          make: 'Honda',
          model: 'Civic',
          year: 2019,
          color: 'Red',
          mileage: 30000,
          status: 'sold',
          acquisition_cost: '12000.00'
        }).returning().execute();

        await db.insert(expensesTable).values({
          vehicle_id: vehicleResult[0].id,
          amount: '800.00',
          expense_type: 'marketing',
          description: 'Advertisement'
        }).execute();

        const filters: FinancialReportFilters = { make: 'Toyota' };
        const csv = await exportExpenseBreakdownToCSV(filters);

        expect(csv).toContain('"repairs"');
        expect(csv).toContain('"detailing"');
        expect(csv).not.toContain('"marketing"');
      });
    });
  });
});