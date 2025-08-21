import { db } from '../db';
import { vehiclesTable, expensesTable, transactionsTable } from '../db/schema';
import { type ProfitLoss, type InventoryAging, type FinancialReportFilters, type GetByIdInput, type VehicleDetails, type ExpenseBreakdown } from '../schema';
import { eq, and, gte, lte, sum, count, sql, inArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function getProfitLossReport(filters?: FinancialReportFilters): Promise<ProfitLoss[]> {
  try {
    // Build base query with profit/loss calculation
    let baseQuery = db.select({
      vehicle_id: vehiclesTable.id,
      acquisition_cost: vehiclesTable.acquisition_cost,
      sale_price: vehiclesTable.sale_price,
      total_expenses: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)`.as('total_expenses')
    })
    .from(vehiclesTable)
    .leftJoin(expensesTable, eq(vehiclesTable.id, expensesTable.vehicle_id))
    .groupBy(vehiclesTable.id, vehiclesTable.acquisition_cost, vehiclesTable.sale_price);

    // Apply filters conditionally
    const conditions: SQL<unknown>[] = [];
    
    if (filters?.start_date) {
      conditions.push(gte(vehiclesTable.acquisition_date, filters.start_date));
    }
    
    if (filters?.end_date) {
      conditions.push(lte(vehiclesTable.acquisition_date, filters.end_date));
    }
    
    if (filters?.status) {
      conditions.push(eq(vehiclesTable.status, filters.status));
    }
    
    if (filters?.make) {
      conditions.push(eq(vehiclesTable.make, filters.make));
    }
    
    if (filters?.model) {
      conditions.push(eq(vehiclesTable.model, filters.model));
    }

    const query = conditions.length > 0 
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const results = await query.execute();

    return results.map(result => {
      const acquisitionCost = parseFloat(result.acquisition_cost);
      const totalExpenses = parseFloat(result.total_expenses);
      const totalCost = acquisitionCost + totalExpenses;
      const salePrice = result.sale_price ? parseFloat(result.sale_price) : null;
      const profitLoss = salePrice ? salePrice - totalCost : null;
      const isSold = salePrice !== null;

      return {
        vehicle_id: result.vehicle_id,
        acquisition_cost: acquisitionCost,
        total_expenses: totalExpenses,
        total_cost: totalCost,
        sale_price: salePrice,
        profit_loss: profitLoss,
        is_sold: isSold
      };
    });
  } catch (error) {
    console.error('Profit/loss report failed:', error);
    throw error;
  }
}

export async function getVehicleProfitLoss(input: GetByIdInput): Promise<ProfitLoss | null> {
  try {
    // Get vehicle with total expenses
    const result = await db.select({
      vehicle_id: vehiclesTable.id,
      acquisition_cost: vehiclesTable.acquisition_cost,
      sale_price: vehiclesTable.sale_price,
      total_expenses: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)`.as('total_expenses')
    })
    .from(vehiclesTable)
    .leftJoin(expensesTable, eq(vehiclesTable.id, expensesTable.vehicle_id))
    .where(eq(vehiclesTable.id, input.id))
    .groupBy(vehiclesTable.id, vehiclesTable.acquisition_cost, vehiclesTable.sale_price)
    .execute();

    if (result.length === 0) {
      return null;
    }

    const vehicleData = result[0];
    const acquisitionCost = parseFloat(vehicleData.acquisition_cost);
    const totalExpenses = parseFloat(vehicleData.total_expenses);
    const totalCost = acquisitionCost + totalExpenses;
    const salePrice = vehicleData.sale_price ? parseFloat(vehicleData.sale_price) : null;
    const profitLoss = salePrice ? salePrice - totalCost : null;
    const isSold = salePrice !== null;

    return {
      vehicle_id: vehicleData.vehicle_id,
      acquisition_cost: acquisitionCost,
      total_expenses: totalExpenses,
      total_cost: totalCost,
      sale_price: salePrice,
      profit_loss: profitLoss,
      is_sold: isSold
    };
  } catch (error) {
    console.error('Vehicle profit/loss calculation failed:', error);
    throw error;
  }
}

export async function getInventoryAging(): Promise<InventoryAging[]> {
  try {
    // Get unsold vehicles with total expenses and days in inventory
    const results = await db.select({
      vehicle_id: vehiclesTable.id,
      vin: vehiclesTable.vin,
      make: vehiclesTable.make,
      model: vehiclesTable.model,
      year: vehiclesTable.year,
      status: vehiclesTable.status,
      acquisition_date: vehiclesTable.acquisition_date,
      acquisition_cost: vehiclesTable.acquisition_cost,
      total_expenses: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)`.as('total_expenses'),
      days_in_inventory: sql<string>`EXTRACT(DAY FROM NOW() - ${vehiclesTable.acquisition_date})`.as('days_in_inventory')
    })
    .from(vehiclesTable)
    .leftJoin(expensesTable, eq(vehiclesTable.id, expensesTable.vehicle_id))
    .where(eq(vehiclesTable.status, 'listed'))
    .groupBy(
      vehiclesTable.id,
      vehiclesTable.vin,
      vehiclesTable.make,
      vehiclesTable.model,
      vehiclesTable.year,
      vehiclesTable.status,
      vehiclesTable.acquisition_date,
      vehiclesTable.acquisition_cost
    )
    .execute();

    return results.map(result => ({
      vehicle_id: result.vehicle_id,
      vin: result.vin,
      make: result.make,
      model: result.model,
      year: result.year,
      status: result.status,
      acquisition_date: result.acquisition_date,
      days_in_inventory: parseInt(result.days_in_inventory),
      total_cost: parseFloat(result.acquisition_cost) + parseFloat(result.total_expenses)
    }));
  } catch (error) {
    console.error('Inventory aging report failed:', error);
    throw error;
  }
}

export async function getVehicleDetails(input: GetByIdInput): Promise<VehicleDetails | null> {
  try {
    // Get vehicle
    const vehicles = await db.select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, input.id))
      .execute();

    if (vehicles.length === 0) {
      return null;
    }

    const vehicle = vehicles[0];

    // Get expenses
    const expenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.vehicle_id, input.id))
      .execute();

    // Get transactions
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.vehicle_id, input.id))
      .execute();

    // Get profit/loss data
    const profitLoss = await getVehicleProfitLoss(input);

    if (!profitLoss) {
      return null;
    }

    return {
      vehicle: {
        ...vehicle,
        acquisition_cost: parseFloat(vehicle.acquisition_cost),
        listing_price: vehicle.listing_price ? parseFloat(vehicle.listing_price) : null,
        sale_price: vehicle.sale_price ? parseFloat(vehicle.sale_price) : null
      },
      expenses: expenses.map(expense => ({
        ...expense,
        amount: parseFloat(expense.amount)
      })),
      transactions: transactions.map(transaction => ({
        ...transaction,
        amount: parseFloat(transaction.amount)
      })),
      profit_loss: profitLoss
    };
  } catch (error) {
    console.error('Vehicle details retrieval failed:', error);
    throw error;
  }
}

export async function exportProfitLossToCSV(filters?: FinancialReportFilters): Promise<string> {
  try {
    const profitLossData = await getProfitLossReport(filters);
    
    // Get vehicle details for CSV export
    const vehicleIds = profitLossData.map(pl => pl.vehicle_id);
    
    if (vehicleIds.length === 0) {
      return 'Vehicle ID,VIN,Make,Model,Acquisition Cost,Total Expenses,Sale Price,Profit/Loss\n';
    }

    const vehicles = await db.select()
      .from(vehiclesTable)
      .where(inArray(vehiclesTable.id, vehicleIds))
      .execute();

    const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

    let csv = 'Vehicle ID,VIN,Make,Model,Acquisition Cost,Total Expenses,Sale Price,Profit/Loss\n';
    
    profitLossData.forEach(pl => {
      const vehicle = vehicleMap.get(pl.vehicle_id);
      if (vehicle) {
        const row = [
          pl.vehicle_id,
          `"${vehicle.vin}"`,
          `"${vehicle.make}"`,
          `"${vehicle.model}"`,
          pl.acquisition_cost.toFixed(2),
          pl.total_expenses.toFixed(2),
          pl.sale_price?.toFixed(2) || '',
          pl.profit_loss?.toFixed(2) || ''
        ].join(',');
        csv += row + '\n';
      }
    });

    return csv;
  } catch (error) {
    console.error('Profit/loss CSV export failed:', error);
    throw error;
  }
}

export async function exportInventoryAgingToCSV(): Promise<string> {
  try {
    const agingData = await getInventoryAging();
    
    let csv = 'Vehicle ID,VIN,Make,Model,Year,Status,Days in Inventory,Total Cost\n';
    
    agingData.forEach(item => {
      const row = [
        item.vehicle_id,
        `"${item.vin}"`,
        `"${item.make}"`,
        `"${item.model}"`,
        item.year,
        `"${item.status}"`,
        item.days_in_inventory,
        item.total_cost.toFixed(2)
      ].join(',');
      csv += row + '\n';
    });

    return csv;
  } catch (error) {
    console.error('Inventory aging CSV export failed:', error);
    throw error;
  }
}

export async function exportExpenseBreakdownToCSV(filters?: FinancialReportFilters): Promise<string> {
  try {
    // Build query for expense breakdown
    let baseQuery = db.select({
      expense_type: expensesTable.expense_type,
      total_amount: sql<string>`SUM(${expensesTable.amount})`.as('total_amount'),
      count: count(expensesTable.id)
    })
    .from(expensesTable)
    .groupBy(expensesTable.expense_type);

    // Apply filters by joining with vehicles table if needed
    if (filters?.start_date || filters?.end_date || filters?.status || filters?.make || filters?.model) {
      const joinedQuery = db.select({
        expense_type: expensesTable.expense_type,
        total_amount: sql<string>`SUM(${expensesTable.amount})`.as('total_amount'),
        count: count(expensesTable.id)
      })
      .from(expensesTable)
      .innerJoin(vehiclesTable, eq(expensesTable.vehicle_id, vehiclesTable.id));
      
      const conditions: SQL<unknown>[] = [];
      
      if (filters.start_date) {
        conditions.push(gte(vehiclesTable.acquisition_date, filters.start_date));
      }
      
      if (filters.end_date) {
        conditions.push(lte(vehiclesTable.acquisition_date, filters.end_date));
      }
      
      if (filters.status) {
        conditions.push(eq(vehiclesTable.status, filters.status));
      }
      
      if (filters.make) {
        conditions.push(eq(vehiclesTable.make, filters.make));
      }
      
      if (filters.model) {
        conditions.push(eq(vehiclesTable.model, filters.model));
      }

      const filteredQuery = conditions.length > 0 
        ? joinedQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
        : joinedQuery;

      const results = await filteredQuery.groupBy(expensesTable.expense_type).execute();
      
      let csv = 'Expense Type,Total Amount,Count\n';
      
      results.forEach(item => {
        const row = [
          `"${item.expense_type}"`,
          parseFloat(item.total_amount).toFixed(2),
          item.count
        ].join(',');
        csv += row + '\n';
      });

      return csv;
    } else {
      const results = await baseQuery.execute();
      
      let csv = 'Expense Type,Total Amount,Count\n';
      
      results.forEach(item => {
        const row = [
          `"${item.expense_type}"`,
          parseFloat(item.total_amount).toFixed(2),
          item.count
        ].join(',');
        csv += row + '\n';
      });

      return csv;
    }
  } catch (error) {
    console.error('Expense breakdown CSV export failed:', error);
    throw error;
  }
}