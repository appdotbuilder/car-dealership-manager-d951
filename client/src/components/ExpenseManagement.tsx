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
import type { Expense, CreateExpenseInput, UpdateExpenseInput, Vehicle, Vendor } from '../../../server/src/schema';

export function ExpenseManagement() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const [createForm, setCreateForm] = useState<CreateExpenseInput>({
    vehicle_id: 0,
    vendor_id: null,
    amount: 0,
    expense_type: 'other',
    description: '',
    expense_date: new Date()
  });

  const [updateForm, setUpdateForm] = useState<Partial<UpdateExpenseInput>>({});

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [expensesResult, vehiclesResult, vendorsResult] = await Promise.all([
        trpc.getExpenses.query(),
        trpc.getVehicles.query(),
        trpc.getVendors.query()
      ]);
      setExpenses(expensesResult);
      setVehicles(vehiclesResult);
      setVendors(vendorsResult);
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
      const result = await trpc.createExpense.mutate(createForm);
      setExpenses((prev: Expense[]) => [result, ...prev]);
      setCreateForm({
        vehicle_id: 0,
        vendor_id: null,
        amount: 0,
        expense_type: 'other',
        description: '',
        expense_date: new Date()
      });
      setIsCreateOpen(false);
    } catch (error) {
      console.error('Failed to create expense:', error);
      setError('Failed to create expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    setIsSubmitting(true);
    
    try {
      const updateData: UpdateExpenseInput = {
        id: editingExpense.id,
        ...updateForm
      };
      
      const result = await trpc.updateExpense.mutate(updateData);
      setExpenses((prev: Expense[]) => 
        prev.map((exp: Expense) => exp.id === result.id ? result : exp)
      );
      setEditingExpense(null);
      setUpdateForm({});
      setIsEditOpen(false);
    } catch (error) {
      console.error('Failed to update expense:', error);
      setError('Failed to update expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (expenseId: number) => {
    try {
      await trpc.deleteExpense.mutate({ id: expenseId });
      setExpenses((prev: Expense[]) => prev.filter((exp: Expense) => exp.id !== expenseId));
    } catch (error) {
      console.error('Failed to delete expense:', error);
      setError('Failed to delete expense');
    }
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setUpdateForm({
      vendor_id: expense.vendor_id,
      amount: expense.amount,
      expense_type: expense.expense_type,
      description: expense.description,
      expense_date: expense.expense_date
    });
    setIsEditOpen(true);
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

  const getVendorDisplay = (vendorId: number | null) => {
    if (!vendorId) return 'No vendor';
    const vendor = vendors.find((v: Vendor) => v.id === vendorId);
    return vendor ? vendor.name : `Vendor #${vendorId}`;
  };

  const expenseTypeOptions = [
    { value: 'acquisition', label: 'Acquisition' },
    { value: 'reconditioning', label: 'Reconditioning' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'transport', label: 'Transport' },
    { value: 'storage', label: 'Storage' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'repairs', label: 'Repairs' },
    { value: 'detailing', label: 'Detailing' },
    { value: 'other', label: 'Other' }
  ];

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
          <h2 className="text-3xl font-bold text-gray-900">Expense Management</h2>
          <p className="text-gray-600">Track all costs associated with your vehicles</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>+ Add Expense</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>
                Record a new expense for a vehicle.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="vehicle_id">Vehicle</Label>
                <Select 
                  value={createForm.vehicle_id.toString()} 
                  onValueChange={(value) => setCreateForm((prev: CreateExpenseInput) => ({ ...prev, vehicle_id: parseInt(value) }))}
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

              <div>
                <Label htmlFor="vendor_id">Vendor (Optional)</Label>
                <Select 
                  value={createForm.vendor_id?.toString() || ''} 
                  onValueChange={(value) => setCreateForm((prev: CreateExpenseInput) => ({ 
                    ...prev, 
                    vendor_id: value ? parseInt(value) : null 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No vendor</SelectItem>
                    {vendors.map((vendor: Vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={createForm.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm((prev: CreateExpenseInput) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expense_type">Type</Label>
                  <Select 
                    value={createForm.expense_type} 
                    onValueChange={(value) => setCreateForm((prev: CreateExpenseInput) => ({ ...prev, expense_type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setCreateForm((prev: CreateExpenseInput) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Describe the expense..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="expense_date">Expense Date</Label>
                <Input
                  id="expense_date"
                  type="date"
                  value={createForm.expense_date ? createForm.expense_date.toISOString().split('T')[0] : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm((prev: CreateExpenseInput) => ({ 
                      ...prev, 
                      expense_date: e.target.value ? new Date(e.target.value) : undefined 
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
                  {isSubmitting ? 'Adding...' : 'Add Expense'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p>Loading expenses...</p>
        </div>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">💰</div>
            <p className="text-gray-500">No expenses recorded yet.</p>
            <p className="text-sm text-gray-400 mt-1">Start tracking costs for your vehicles!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {expenses.map((expense: Expense) => (
            <Card key={expense.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <span>💰</span>
                      <span>{formatCurrency(expense.amount)}</span>
                    </CardTitle>
                    <CardDescription>
                      {getVehicleDisplay(expense.vehicle_id)} • {expense.expense_date.toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {getExpenseTypeBadge(expense.expense_type)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">{expense.description}</p>
                  {expense.vendor_id && (
                    <p className="text-sm text-gray-500">
                      Vendor: {getVendorDisplay(expense.vendor_id)}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    Recorded: {expense.created_at.toLocaleDateString()}
                  </p>
                </div>

                <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(expense)}>
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this expense? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(expense.id)}>
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update expense information.
            </DialogDescription>
          </DialogHeader>

          {editingExpense && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label htmlFor="edit-vendor">Vendor</Label>
                <Select 
                  value={updateForm.vendor_id?.toString() || ''} 
                  onValueChange={(value) => setUpdateForm((prev) => ({ 
                    ...prev, 
                    vendor_id: value ? parseInt(value) : null 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No vendor</SelectItem>
                    {vendors.map((vendor: Vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-amount">Amount</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={updateForm.amount || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateForm((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-type">Type</Label>
                  <Select 
                    value={updateForm.expense_type || ''} 
                    onValueChange={(value) => setUpdateForm((prev) => ({ ...prev, expense_type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={updateForm.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setUpdateForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="edit-date">Expense Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={updateForm.expense_date ? updateForm.expense_date.toISOString().split('T')[0] : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setUpdateForm((prev) => ({ 
                      ...prev, 
                      expense_date: e.target.value ? new Date(e.target.value) : undefined 
                    }))
                  }
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Expense'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}