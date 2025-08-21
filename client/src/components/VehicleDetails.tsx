import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { VehicleDetails as VehicleDetailsType, Expense, Transaction, Vendor } from '../../../server/src/schema';

interface VehicleDetailsProps {
  vehicleId: number;
  onBack: () => void;
}

export function VehicleDetails({ vehicleId, onBack }: VehicleDetailsProps) {
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetailsType | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVehicleDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const [detailsResult, vendorsResult] = await Promise.all([
        trpc.getVehicleDetails.query({ id: vehicleId }),
        trpc.getVendors.query()
      ]);
      setVehicleDetails(detailsResult);
      setVendors(vendorsResult);
      setError(null);
    } catch (error) {
      console.error('Failed to load vehicle details:', error);
      setError('Failed to load vehicle details');
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    loadVehicleDetails();
  }, [loadVehicleDetails]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      acquired: 'bg-blue-100 text-blue-800',
      reconditioning: 'bg-yellow-100 text-yellow-800',
      listed: 'bg-green-100 text-green-800',
      sold: 'bg-gray-100 text-gray-800',
      archived: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge variant="secondary" className={styles[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
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

  const getTransactionTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      expense: 'bg-red-100 text-red-800',
      sale: 'bg-green-100 text-green-800',
      refund: 'bg-yellow-100 text-yellow-800'
    };
    
    const icons: Record<string, string> = {
      expense: '💸',
      sale: '💰',
      refund: '🔄'
    };
    
    return (
      <Badge variant="secondary" className={styles[type] || 'bg-gray-100 text-gray-800'}>
        <span className="mr-1">{icons[type]}</span>
        {type}
      </Badge>
    );
  };

  const getVendorName = (vendorId: number | null) => {
    if (!vendorId) return 'No vendor';
    const vendor = vendors.find((v: Vendor) => v.id === vendorId);
    return vendor ? vendor.name : `Vendor #${vendorId}`;
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">{error}</p>
          <Button onClick={onBack} className="mt-4">
            Back to Vehicles
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <div>Loading vehicle details...</div>
        </div>
      </div>
    );
  }

  if (!vehicleDetails) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Vehicle not found.</p>
          <Button onClick={onBack} className="mt-4">
            Back to Vehicles
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { vehicle, expenses, transactions, profit_loss } = vehicleDetails;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={onBack}>
          ← Back to Vehicles
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h2>
          <p className="text-gray-600">VIN: {vehicle.vin}</p>
        </div>
      </div>

      {/* Vehicle Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Vehicle Information</span>
              {getStatusBadge(vehicle.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Color</p>
                <p className="font-medium">{vehicle.color}</p>
              </div>
              <div>
                <p className="text-gray-500">Mileage</p>
                <p className="font-medium">{vehicle.mileage.toLocaleString()} mi</p>
              </div>
              <div>
                <p className="text-gray-500">Acquisition Date</p>
                <p className="font-medium">{vehicle.acquisition_date.toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Days in Inventory</p>
                <p className="font-medium">
                  {Math.floor((new Date().getTime() - vehicle.acquisition_date.getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>
            </div>
            {vehicle.notes && (
              <div>
                <p className="text-gray-500 text-sm">Notes</p>
                <p className="text-sm">{vehicle.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Acquisition Cost:</span>
                <span className="font-medium">{formatCurrency(profit_loss.acquisition_cost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Expenses:</span>
                <span className="font-medium">{formatCurrency(profit_loss.total_expenses)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-500">Total Cost:</span>
                <span className="font-medium">{formatCurrency(profit_loss.total_cost)}</span>
              </div>
              {vehicle.listing_price && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Listing Price:</span>
                  <span className="font-medium">{formatCurrency(vehicle.listing_price)}</span>
                </div>
              )}
              {profit_loss.sale_price && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Sale Price:</span>
                  <span className="font-medium">{formatCurrency(profit_loss.sale_price)}</span>
                </div>
              )}
              {profit_loss.profit_loss !== null && (
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-500">Profit/Loss:</span>
                  <span className={`font-bold ${profit_loss.profit_loss > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profit_loss.profit_loss)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses">
            Expenses ({expenses.length})
          </TabsTrigger>
          <TabsTrigger value="transactions">
            Transactions ({transactions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Expense History</h3>
            <div className="text-sm text-gray-500">
              Total: {formatCurrency(expenses.reduce((sum: number, exp: Expense) => sum + exp.amount, 0))}
            </div>
          </div>

          {expenses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-4xl mb-4">💰</div>
                <p className="text-gray-500">No expenses recorded for this vehicle.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense: Expense) => (
                <Card key={expense.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{formatCurrency(expense.amount)}</h4>
                        <p className="text-sm text-gray-500">{expense.expense_date.toLocaleDateString()}</p>
                      </div>
                      {getExpenseTypeBadge(expense.expense_type)}
                    </div>
                    <p className="text-sm mb-2">{expense.description}</p>
                    {expense.vendor_id && (
                      <p className="text-xs text-gray-500">
                        Vendor: {getVendorName(expense.vendor_id)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Transaction History</h3>
            <div className="text-sm text-gray-500">
              Total: {formatCurrency(
                transactions.reduce((sum: number, trans: Transaction) => {
                  if (trans.type === 'sale') return sum + trans.amount;
                  if (trans.type === 'refund') return sum - trans.amount;
                  return sum - trans.amount; // expenses are negative
                }, 0)
              )}
            </div>
          </div>

          {transactions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-4xl mb-4">💳</div>
                <p className="text-gray-500">No transactions recorded for this vehicle.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction: Transaction) => (
                <Card key={transaction.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{formatCurrency(transaction.amount)}</h4>
                        <p className="text-sm text-gray-500">{transaction.transaction_date.toLocaleDateString()}</p>
                      </div>
                      {getTransactionTypeBadge(transaction.type)}
                    </div>
                    <p className="text-sm">{transaction.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}