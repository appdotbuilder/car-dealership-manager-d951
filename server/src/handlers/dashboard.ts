import { db } from '../db';
import { vehiclesTable, expensesTable, transactionsTable } from '../db/schema';
import { type DashboardKpi } from '../schema';
import { count, sum, avg, eq, and, gte, ne } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function getDashboardKpis(): Promise<DashboardKpi> {
  try {
    // Calculate date for "this month" filter
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get total inventory count (vehicles not sold or archived)
    const inventoryResult = await db.select({
      count: count()
    })
    .from(vehiclesTable)
    .where(and(
      ne(vehiclesTable.status, 'sold'),
      ne(vehiclesTable.status, 'archived')
    ))
    .execute();

    const total_inventory = inventoryResult[0]?.count || 0;

    // Get total inventory value (acquisition cost + expenses for unsold vehicles)
    const inventoryValueResult = await db.select({
      acquisition_value: sum(vehiclesTable.acquisition_cost)
    })
    .from(vehiclesTable)
    .where(and(
      ne(vehiclesTable.status, 'sold'),
      ne(vehiclesTable.status, 'archived')
    ))
    .execute();

    const expensesValueResult = await db.select({
      expenses_value: sum(expensesTable.amount)
    })
    .from(expensesTable)
    .innerJoin(vehiclesTable, eq(expensesTable.vehicle_id, vehiclesTable.id))
    .where(and(
      ne(vehiclesTable.status, 'sold'),
      ne(vehiclesTable.status, 'archived')
    ))
    .execute();

    const acquisitionValue = parseFloat(inventoryValueResult[0]?.acquisition_value || '0');
    const expensesValue = parseFloat(expensesValueResult[0]?.expenses_value || '0');
    const total_inventory_value = acquisitionValue + expensesValue;

    // Get vehicles in reconditioning
    const reconditioningResult = await db.select({
      count: count()
    })
    .from(vehiclesTable)
    .where(eq(vehiclesTable.status, 'reconditioning'))
    .execute();

    const vehicles_in_reconditioning = reconditioningResult[0]?.count || 0;

    // Get vehicles listed
    const listedResult = await db.select({
      count: count()
    })
    .from(vehiclesTable)
    .where(eq(vehiclesTable.status, 'listed'))
    .execute();

    const vehicles_listed = listedResult[0]?.count || 0;

    // Get vehicles sold this month
    const soldThisMonthResult = await db.select({
      count: count()
    })
    .from(vehiclesTable)
    .where(and(
      eq(vehiclesTable.status, 'sold'),
      gte(vehiclesTable.sale_date, startOfMonth)
    ))
    .execute();

    const vehicles_sold_this_month = soldThisMonthResult[0]?.count || 0;

    // Calculate total profit this month (sale price - acquisition cost - expenses)
    const soldVehiclesThisMonth = await db.select({
      id: vehiclesTable.id,
      acquisition_cost: vehiclesTable.acquisition_cost,
      sale_price: vehiclesTable.sale_price
    })
    .from(vehiclesTable)
    .where(and(
      eq(vehiclesTable.status, 'sold'),
      gte(vehiclesTable.sale_date, startOfMonth)
    ))
    .execute();

    let total_profit_this_month = 0;

    for (const vehicle of soldVehiclesThisMonth) {
      if (vehicle.sale_price) {
        const acquisitionCost = parseFloat(vehicle.acquisition_cost);
        const salePrice = parseFloat(vehicle.sale_price);

        // Get total expenses for this vehicle
        const vehicleExpensesResult = await db.select({
          total_expenses: sum(expensesTable.amount)
        })
        .from(expensesTable)
        .where(eq(expensesTable.vehicle_id, vehicle.id))
        .execute();

        const totalExpenses = parseFloat(vehicleExpensesResult[0]?.total_expenses || '0');
        const profit = salePrice - acquisitionCost - totalExpenses;
        total_profit_this_month += profit;
      }
    }

    // Calculate average days to sale for sold vehicles
    const avgDaysResult = await db.select({
      avg_days: sql<string>`AVG(EXTRACT(DAY FROM (${vehiclesTable.sale_date} - ${vehiclesTable.acquisition_date})))`
    })
    .from(vehiclesTable)
    .where(eq(vehiclesTable.status, 'sold'))
    .execute();

    const avg_days_to_sale = avgDaysResult[0]?.avg_days ? 
      parseFloat(avgDaysResult[0].avg_days) : null;

    return {
      total_inventory,
      total_inventory_value,
      vehicles_in_reconditioning,
      vehicles_listed,
      vehicles_sold_this_month,
      total_profit_this_month,
      avg_days_to_sale
    };
  } catch (error) {
    console.error('Dashboard KPIs calculation failed:', error);
    throw error;
  }
}