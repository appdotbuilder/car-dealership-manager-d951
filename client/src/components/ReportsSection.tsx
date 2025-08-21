import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { ProfitLoss, InventoryAging, ExpenseBreakdown, FinancialReportFilters } from '../../../server/src/schema';

export function ReportsSection() {
  const [profitLossData, setProfitLossData] = useState<ProfitLoss[]>([]);
  const [inventoryAging, setInventoryAging] = useState<InventoryAging[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<FinancialReportFilters>({
    start_date: undefined,
    end_date: undefined,
    status: undefined,
    make: undefined,
    model: undefined
  });

  const loadProfitLossReport = useCallback(async (customFilters?: FinancialReportFilters) => {
    try {
      setIsLoading((prev) => ({ ...prev, profitLoss: true }));
      const result = await trpc.getProfitLossReport.query(customFilters || filters);
      setProfitLossData(result);
      setError(null);
    } catch (error) {
      console.error('Failed to load profit/loss report:', error);
      setError('Failed to load profit/loss report');
    } finally {
      setIsLoading((prev) => ({ ...prev, profitLoss: false }));
    }
  }, [filters]);

  const loadInventoryAging = useCallback(async () => {
    try {
      setIsLoading((prev) => ({ ...prev, inventory: true }));
      const result = await trpc.getInventoryAging.query();
      setInventoryAging(result);
      setError(null);
    } catch (error) {
      console.error('Failed to load inventory aging:', error);
      setError('Failed to load inventory aging');
    } finally {
      setIsLoading((prev) => ({ ...prev, inventory: false }));
    }
  }, []);

  const loadExpenseBreakdown = useCallback(async (customFilters?: FinancialReportFilters) => {
    try {
      setIsLoading((prev) => ({ ...prev, expenses: true }));
      const result = await trpc.getExpenseBreakdown.query(customFilters || filters);
      setExpenseBreakdown(result);
      setError(null);
    } catch (error) {
      console.error('Failed to load expense breakdown:', error);
      setError('Failed to load expense breakdown');
    } finally {
      setIsLoading((prev) => ({ ...prev, expenses: false }));
    }
  }, [filters]);

  useEffect(() => {
    loadProfitLossReport();
    loadInventoryAging();
    loadExpenseBreakdown();
  }, [loadProfitLossReport, loadInventoryAging, loadExpenseBreakdown]);

  const handleExportCSV = async (reportType: string) => {
    try {
      let result: string;
      
      switch (reportType) {
        case 'profitLoss':
          result = await trpc.exportProfitLossToCSV.query(filters);
          break;
        case 'inventory':
          result = await trpc.exportInventoryAgingToCSV.query();
          break;
        case 'expenses':
          result = await trpc.exportExpenseBreakdownToCSV.query(filters);
          break;
        default:
          return;
      }

      // Create and download file
      const blob = new Blob([result], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      setError('Failed to export CSV');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getProfitBadge = (profitLoss: number | null, isSold: boolean) => {
    if (!isSold) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Unsold</Badge>;
    }
    if (profitLoss === null) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">N/A</Badge>;
    }
    if (profitLoss > 0) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Profit</Badge>;
    }
    return <Badge variant="secondary" className="bg-red-100 text-red-800">Loss</Badge>;
  };

  const getAgingBadge = (days: number) => {
    if (days <= 30) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Fresh</Badge>;
    } else if (days <= 60) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Aging</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-red-100 text-red-800">Stale</Badge>;
    }
  };

  const getExpenseTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      acquisition: 'bg-blue-100 text-blue-800',
      reconditioning: 'bg-orange-100 text-orange-800',
      marketing: 'bg-purple-100 text-purple-800',
      transport: 'bg-green-100 text-green-800',
      storage: 'bg-yellow-100 text-yellow-800',
      inspection: 'bg-indigo-100 text-indigo-800',
      repairs: 'bg-red-100 text-red-800',
      detailing: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge variant="secondary" className={styles[type] || 'bg-gray-100 text-gray-800'}>
        {type}
      </Badge>
    );
  };

  const handleApplyFilters = () => {
    loadProfitLossReport(filters);
    loadExpenseBreakdown(filters);
  };

  const clearFilters = () => {
    const clearedFilters: FinancialReportFilters = {
      start_date: undefined,
      end_date: undefined,
      status: undefined,
      make: undefined,
      model: undefined
    };
    setFilters(clearedFilters);
    loadProfitLossReport(clearedFilters);
    loadExpenseBreakdown(clearedFilters);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Financial Reports</h2>
        <p className="text-gray-600">Comprehensive analysis of your dealership performance</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Filters</CardTitle>
          <CardDescription>Apply filters to customize your reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={filters.start_date ? filters.start_date.toISOString().split('T')[0] : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters((prev) => ({ ...prev, start_date: e.target.value ? new Date(e.target.value) : undefined }))
                }
              />
            </div>
            
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={filters.end_date ? filters.end_date.toISOString().split('T')[0] : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters((prev) => ({ ...prev, end_date: e.target.value ? new Date(e.target.value) : undefined }))
                }
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status || ''}
                onValueChange={(value) => setFilters((prev) => ({ 
                  ...prev, 
                  status: value ? value as 'acquired' | 'reconditioning' | 'listed' | 'sold' | 'archived' : undefined 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="acquired">Acquired</SelectItem>
                  <SelectItem value="reconditioning">Reconditioning</SelectItem>
                  <SelectItem value="listed">Listed</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="make">Make</Label>
              <Input
                id="make"
                value={filters.make || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters((prev) => ({ ...prev, make: e.target.value || undefined }))
                }
                placeholder="e.g., Toyota"
              />
            </div>

            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={filters.model || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters((prev) => ({ ...prev, model: e.target.value || undefined }))
                }
                placeholder="e.g., Camry"
              />
            </div>
          </div>

          <div className="flex space-x-2 mt-4">
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
            <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profit-loss" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
          <TabsTrigger value="inventory-aging">Inventory Aging</TabsTrigger>
          <TabsTrigger value="expense-breakdown">Expense Breakdown</TabsTrigger>
        </TabsList>

        {/* Profit & Loss Report */}
        <TabsContent value="profit-loss" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Profit & Loss Analysis</h3>
            <Button onClick={() => handleExportCSV('profitLoss')} variant="outline">
              📄 Export CSV
            </Button>
          </div>

          {isLoading.profitLoss ? (
            <div className="text-center py-8">Loading profit/loss data...</div>
          ) : profitLossData.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No profit/loss data available.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {profitLossData.map((item: ProfitLoss) => (
                <Card key={item.vehicle_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-medium">Vehicle #{item.vehicle_id}</h4>
                      </div>
                      {getProfitBadge(item.profit_loss, item.is_sold)}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Acquisition Cost</p>
                        <p className="font-medium">{formatCurrency(item.acquisition_cost)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Expenses</p>
                        <p className="font-medium">{formatCurrency(item.total_expenses)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Cost</p>
                        <p className="font-medium">{formatCurrency(item.total_cost)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Sale Price</p>
                        <p className="font-medium">
                          {item.sale_price ? formatCurrency(item.sale_price) : 'Not sold'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Profit/Loss</p>
                        <p className={`font-medium ${item.profit_loss && item.profit_loss > 0 ? 'text-green-600' : item.profit_loss && item.profit_loss < 0 ? 'text-red-600' : ''}`}>
                          {item.profit_loss ? formatCurrency(item.profit_loss) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Inventory Aging Report */}
        <TabsContent value="inventory-aging" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Inventory Aging Analysis</h3>
            <Button onClick={() => handleExportCSV('inventory')} variant="outline">
              📄 Export CSV
            </Button>
          </div>

          {isLoading.inventory ? (
            <div className="text-center py-8">Loading inventory aging data...</div>
          ) : inventoryAging.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No inventory aging data available.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {inventoryAging.map((item: InventoryAging) => (
                <Card key={item.vehicle_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-medium">
                          {item.year} {item.make} {item.model}
                        </h4>
                        <p className="text-sm text-gray-500">VIN: {item.vin}</p>
                      </div>
                      {getAgingBadge(item.days_in_inventory)}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Status</p>
                        <p className="font-medium capitalize">{item.status}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Days in Inventory</p>
                        <p className="font-medium">{item.days_in_inventory} days</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Acquisition Date</p>
                        <p className="font-medium">{item.acquisition_date.toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Cost</p>
                        <p className="font-medium">{formatCurrency(item.total_cost)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Expense Breakdown Report */}
        <TabsContent value="expense-breakdown" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Expense Breakdown Analysis</h3>
            <Button onClick={() => handleExportCSV('expenses')} variant="outline">
              📄 Export CSV
            </Button>
          </div>

          {isLoading.expenses ? (
            <div className="text-center py-8">Loading expense breakdown...</div>
          ) : expenseBreakdown.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No expense breakdown data available.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expenseBreakdown.map((item: ExpenseBreakdown) => (
                  <Card key={item.expense_type} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg capitalize">{item.expense_type}</CardTitle>
                        {getExpenseTypeBadge(item.expense_type)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Amount:</span>
                          <span className="font-medium">{formatCurrency(item.total_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Count:</span>
                          <span className="font-medium">{item.count} expenses</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Average:</span>
                          <span className="font-medium">
                            {formatCurrency(item.total_amount / item.count)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Expense Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-gray-500">Total Expenses</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(
                          expenseBreakdown.reduce((sum: number, item: ExpenseBreakdown) => sum + item.total_amount, 0)
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Count</p>
                      <p className="text-2xl font-bold">
                        {expenseBreakdown.reduce((sum: number, item: ExpenseBreakdown) => sum + item.count, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Categories</p>
                      <p className="text-2xl font-bold">{expenseBreakdown.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}