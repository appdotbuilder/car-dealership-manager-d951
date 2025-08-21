import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Schema imports
import {
  loginInputSchema,
  createVehicleInputSchema,
  updateVehicleInputSchema,
  getByIdSchema,
  createVendorInputSchema,
  updateVendorInputSchema,
  createExpenseInputSchema,
  updateExpenseInputSchema,
  createTransactionInputSchema,
  financialReportFiltersSchema
} from './schema';

// Handler imports
import { login, createDefaultUser } from './handlers/auth';
import { createVehicle, updateVehicle, getVehicles, getVehicleById, deleteVehicle } from './handlers/vehicles';
import { createVendor, updateVendor, getVendors, getVendorById, deleteVendor } from './handlers/vendors';
import { createExpense, updateExpense, getExpenses, getExpenseById, getExpensesByVehicleId, deleteExpense, getExpenseBreakdown } from './handlers/expenses';
import { createTransaction, getTransactions, getTransactionById, getTransactionsByVehicleId, deleteTransaction } from './handlers/transactions';
import { getDashboardKpis } from './handlers/dashboard';
import { getProfitLossReport, getVehicleProfitLoss, getInventoryAging, getVehicleDetails, exportProfitLossToCSV, exportInventoryAgingToCSV, exportExpenseBreakdownToCSV } from './handlers/reports';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  createDefaultUser: publicProcedure
    .mutation(() => createDefaultUser()),

  // Vehicle routes
  createVehicle: publicProcedure
    .input(createVehicleInputSchema)
    .mutation(({ input }) => createVehicle(input)),

  updateVehicle: publicProcedure
    .input(updateVehicleInputSchema)
    .mutation(({ input }) => updateVehicle(input)),

  getVehicles: publicProcedure
    .query(() => getVehicles()),

  getVehicleById: publicProcedure
    .input(getByIdSchema)
    .query(({ input }) => getVehicleById(input)),

  deleteVehicle: publicProcedure
    .input(getByIdSchema)
    .mutation(({ input }) => deleteVehicle(input)),

  // Vendor routes
  createVendor: publicProcedure
    .input(createVendorInputSchema)
    .mutation(({ input }) => createVendor(input)),

  updateVendor: publicProcedure
    .input(updateVendorInputSchema)
    .mutation(({ input }) => updateVendor(input)),

  getVendors: publicProcedure
    .query(() => getVendors()),

  getVendorById: publicProcedure
    .input(getByIdSchema)
    .query(({ input }) => getVendorById(input)),

  deleteVendor: publicProcedure
    .input(getByIdSchema)
    .mutation(({ input }) => deleteVendor(input)),

  // Expense routes
  createExpense: publicProcedure
    .input(createExpenseInputSchema)
    .mutation(({ input }) => createExpense(input)),

  updateExpense: publicProcedure
    .input(updateExpenseInputSchema)
    .mutation(({ input }) => updateExpense(input)),

  getExpenses: publicProcedure
    .query(() => getExpenses()),

  getExpenseById: publicProcedure
    .input(getByIdSchema)
    .query(({ input }) => getExpenseById(input)),

  getExpensesByVehicleId: publicProcedure
    .input(getByIdSchema)
    .query(({ input }) => getExpensesByVehicleId(input)),

  deleteExpense: publicProcedure
    .input(getByIdSchema)
    .mutation(({ input }) => deleteExpense(input)),

  getExpenseBreakdown: publicProcedure
    .input(financialReportFiltersSchema.optional())
    .query(({ input }) => getExpenseBreakdown(input)),

  // Transaction routes
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),

  getTransactions: publicProcedure
    .query(() => getTransactions()),

  getTransactionById: publicProcedure
    .input(getByIdSchema)
    .query(({ input }) => getTransactionById(input)),

  getTransactionsByVehicleId: publicProcedure
    .input(getByIdSchema)
    .query(({ input }) => getTransactionsByVehicleId(input)),

  deleteTransaction: publicProcedure
    .input(getByIdSchema)
    .mutation(({ input }) => deleteTransaction(input)),

  // Dashboard routes
  getDashboardKpis: publicProcedure
    .query(() => getDashboardKpis()),

  // Report routes
  getProfitLossReport: publicProcedure
    .input(financialReportFiltersSchema.optional())
    .query(({ input }) => getProfitLossReport(input)),

  getVehicleProfitLoss: publicProcedure
    .input(getByIdSchema)
    .query(({ input }) => getVehicleProfitLoss(input)),

  getInventoryAging: publicProcedure
    .query(() => getInventoryAging()),

  getVehicleDetails: publicProcedure
    .input(getByIdSchema)
    .query(({ input }) => getVehicleDetails(input)),

  // CSV Export routes
  exportProfitLossToCSV: publicProcedure
    .input(financialReportFiltersSchema.optional())
    .query(({ input }) => exportProfitLossToCSV(input)),

  exportInventoryAgingToCSV: publicProcedure
    .query(() => exportInventoryAgingToCSV()),

  exportExpenseBreakdownToCSV: publicProcedure
    .input(financialReportFiltersSchema.optional())
    .query(({ input }) => exportExpenseBreakdownToCSV(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();