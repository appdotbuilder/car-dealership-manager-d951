import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { Transaction, CreateTransactionInput, Vehicle } from '../../../server/src/schema';

export function TransactionManagement() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const [createForm, setCreateForm] = useState<CreateTransactionInput>({
    vehicle_id: 0,
    type: 'sale',
    amount: 0,
    description: '',
    transaction_date: new Date()
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [transactionsResult, vehiclesResult] = await Promise.all([
        trpc.getTransactions.query(),
        trpc.getVehicles.query()
      ]);
      setTransactions(transactionsResult);
      setVehicles(vehiclesResult);
      setError(null);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const result = await trpc.createTransaction.mutate(createForm);
      setTransactions((prev: Transaction[]) => [result, ...prev]);
      setCreateForm({
        vehicle_id: 0,
        type: 'sale',
        amount: 0,
        description: '',
        transaction_date: new Date()
      });
      setIsCreateOpen(false);
    } catch (error) {
      console.error('Failed to create transaction:', error);
      setError('Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (transactionId: number) => {
    try {
      await trpc.deleteTransaction.mutate({ id: transactionId });
      setTransactions((prev: Transaction[]) => prev.filter((t: Transaction) => t.id !== transactionId));
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      setError('Failed to delete transaction');
    }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getVehicleDisplay = (vehicleId: number) => {
    const vehicle = vehicles.find((v: Vehicle) => v.id === vehicleId);
    return vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : `Vehicle #${vehicleId}`;
  };

  const transactionTypeOptions = [
    { value: 'expense', label: 'Expense' },
    { value: 'sale', label: 'Sale' },
    { value: 'refund', label: 'Refund' }
  ];

  // Calculate totals
  const totals = transactions.reduce((acc, transaction: Transaction) => {
    if (transaction.type === 'sale') {
      acc.sales += transaction.amount;
    } else if (transaction.type === 'expense') {
      acc.expenses += transaction.amount;
    } else if (transaction.type === 'refund') {
      acc.refunds += transaction.amount;
    }
    return acc;
  }, { sales: 0, expenses: 0, refunds: 0 });

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">{error}</p>
          <Button onClick={loadData} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Transaction Management</h2>
          <p className="text-gray-600">Track all financial transactions for your vehicles</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>+ Add Transaction</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Transaction</DialogTitle>
              <DialogDescription>
                Record a new financial transaction for a vehicle.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="vehicle_id">Vehicle</Label>
                <Select 
                  value={createForm.vehicle_id.toString()} 
                  onValueChange={(value) => setCreateForm((prev: CreateTransactionInput) => ({ ...prev, vehicle_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle: Vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                        {vehicle.year} {vehicle.make} {vehicle.model} - {vehicle.vin}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Transaction Type</Label>
                  <Select 
                    value={createForm.type} 
                    onValueChange={(value) => setCreateForm((prev: CreateTransactionInput) => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={createForm.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm((prev: CreateTransactionInput) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setCreateForm((prev: CreateTransactionInput) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Describe the transaction..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="transaction_date">Transaction Date</Label>
                <Input
                  id="transaction_date"
                  type="date"
                  value={createForm.transaction_date ? createForm.transaction_date.toISOString().split('T')[0] : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm((prev: CreateTransactionInput) => ({ 
                      ...prev, 
                      transaction_date: e.target.value ? new Date(e.target.value) : undefined 
                    }))
                  }
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || createForm.vehicle_id === 0}>
                  {isSubmitting ? 'Adding...' : 'Add Transaction'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.sales)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.expenses)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(totals.refunds)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.sales - totals.expenses - totals.refunds >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.sales - totals.expenses - totals.refunds)}
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p>Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">💳</div>
            <p className="text-gray-500">No transactions recorded yet.</p>
            <p className="text-sm text-gray-400 mt-1">Start recording your sales, expenses, and refunds!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction: Transaction) => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <span>{formatCurrency(transaction.amount)}</span>
                    </CardTitle>
                    <CardDescription>
                      {getVehicleDisplay(transaction.vehicle_id)} • {transaction.transaction_date.toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {getTransactionTypeBadge(transaction.type)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">{transaction.description}</p>
                  <p className="text-xs text-gray-400">
                    Recorded: {transaction.created_at.toLocaleDateString()}
                  </p>
                </div>

                <div className="flex justify-end mt-4 pt-4 border-t">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this transaction? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(transaction.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}