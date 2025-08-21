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
import type { Vehicle, CreateVehicleInput, UpdateVehicleInput } from '../../../server/src/schema';

interface VehicleManagementProps {
  onViewVehicle: (vehicleId: number) => void;
}

export function VehicleManagement({ onViewVehicle }: VehicleManagementProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const [createForm, setCreateForm] = useState<CreateVehicleInput>({
    vin: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    mileage: 0,
    acquisition_cost: 0,
    notes: null
  });

  const [updateForm, setUpdateForm] = useState<Partial<UpdateVehicleInput>>({});

  const loadVehicles = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getVehicles.query();
      setVehicles(result);
      setError(null);
    } catch (error) {
      console.error('Failed to load vehicles:', error);
      setError('Failed to load vehicles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const result = await trpc.createVehicle.mutate(createForm);
      setVehicles((prev: Vehicle[]) => [...prev, result]);
      setCreateForm({
        vin: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        mileage: 0,
        acquisition_cost: 0,
        notes: null
      });
      setIsCreateOpen(false);
    } catch (error) {
      console.error('Failed to create vehicle:', error);
      setError('Failed to create vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;

    setIsSubmitting(true);
    
    try {
      const updateData: UpdateVehicleInput = {
        id: editingVehicle.id,
        ...updateForm
      };
      
      const result = await trpc.updateVehicle.mutate(updateData);
      setVehicles((prev: Vehicle[]) => 
        prev.map((v: Vehicle) => v.id === result.id ? result : v)
      );
      setEditingVehicle(null);
      setUpdateForm({});
      setIsEditOpen(false);
    } catch (error) {
      console.error('Failed to update vehicle:', error);
      setError('Failed to update vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (vehicleId: number) => {
    try {
      await trpc.deleteVehicle.mutate({ id: vehicleId });
      setVehicles((prev: Vehicle[]) => prev.filter((v: Vehicle) => v.id !== vehicleId));
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
      setError('Failed to delete vehicle');
    }
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setUpdateForm({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      mileage: vehicle.mileage,
      status: vehicle.status,
      listing_price: vehicle.listing_price,
      sale_price: vehicle.sale_price,
      sale_date: vehicle.sale_date,
      notes: vehicle.notes
    });
    setIsEditOpen(true);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">{error}</p>
          <Button onClick={loadVehicles} className="mt-4">
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
          <h2 className="text-3xl font-bold text-gray-900">Vehicle Inventory</h2>
          <p className="text-gray-600">Manage your vehicle inventory and track status</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>+ Add Vehicle</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Vehicle</DialogTitle>
              <DialogDescription>
                Enter the vehicle details to add it to your inventory.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vin">VIN</Label>
                  <Input
                    id="vin"
                    value={createForm.vin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm((prev: CreateVehicleInput) => ({ ...prev, vin: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={createForm.year}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm((prev: CreateVehicleInput) => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))
                    }
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="make">Make</Label>
                  <Input
                    id="make"
                    value={createForm.make}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm((prev: CreateVehicleInput) => ({ ...prev, make: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={createForm.model}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm((prev: CreateVehicleInput) => ({ ...prev, model: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={createForm.color}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm((prev: CreateVehicleInput) => ({ ...prev, color: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="mileage">Mileage</Label>
                  <Input
                    id="mileage"
                    type="number"
                    min="0"
                    value={createForm.mileage}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm((prev: CreateVehicleInput) => ({ ...prev, mileage: parseInt(e.target.value) || 0 }))
                    }
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="acquisition_cost">Acquisition Cost</Label>
                <Input
                  id="acquisition_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={createForm.acquisition_cost}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm((prev: CreateVehicleInput) => ({ ...prev, acquisition_cost: parseFloat(e.target.value) || 0 }))
                  }
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={createForm.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setCreateForm((prev: CreateVehicleInput) => ({ ...prev, notes: e.target.value || null }))
                  }
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Vehicle'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p>Loading vehicles...</p>
        </div>
      ) : vehicles.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">🚗</div>
            <p className="text-gray-500">No vehicles in inventory yet.</p>
            <p className="text-sm text-gray-400 mt-1">Add your first vehicle to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle: Vehicle) => (
            <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </CardTitle>
                  {getStatusBadge(vehicle.status)}
                </div>
                <CardDescription>VIN: {vehicle.vin}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Color:</span>
                    <span>{vehicle.color}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mileage:</span>
                    <span>{vehicle.mileage.toLocaleString()} mi</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Acquisition Cost:</span>
                    <span>{formatCurrency(vehicle.acquisition_cost)}</span>
                  </div>
                  {vehicle.listing_price && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Listing Price:</span>
                      <span>{formatCurrency(vehicle.listing_price)}</span>
                    </div>
                  )}
                  {vehicle.sale_price && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Sale Price:</span>
                      <span>{formatCurrency(vehicle.sale_price)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => onViewVehicle(vehicle.id)}>
                    View Details
                  </Button>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(vehicle)}>
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
                          <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this vehicle? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(vehicle.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>
              Update vehicle information and status.
            </DialogDescription>
          </DialogHeader>

          {editingVehicle && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-make">Make</Label>
                  <Input
                    id="edit-make"
                    value={updateForm.make || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateForm((prev) => ({ ...prev, make: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-model">Model</Label>
                  <Input
                    id="edit-model"
                    value={updateForm.model || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateForm((prev) => ({ ...prev, model: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-color">Color</Label>
                  <Input
                    id="edit-color"
                    value={updateForm.color || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateForm((prev) => ({ ...prev, color: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-mileage">Mileage</Label>
                  <Input
                    id="edit-mileage"
                    type="number"
                    min="0"
                    value={updateForm.mileage || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateForm((prev) => ({ ...prev, mileage: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={updateForm.status || ''} 
                  onValueChange={(value) => setUpdateForm((prev) => ({ ...prev, status: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acquired">Acquired</SelectItem>
                    <SelectItem value="reconditioning">Reconditioning</SelectItem>
                    <SelectItem value="listed">Listed</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-listing-price">Listing Price</Label>
                  <Input
                    id="edit-listing-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={updateForm.listing_price || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateForm((prev) => ({ ...prev, listing_price: parseFloat(e.target.value) || null }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-sale-price">Sale Price</Label>
                  <Input
                    id="edit-sale-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={updateForm.sale_price || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateForm((prev) => ({ ...prev, sale_price: parseFloat(e.target.value) || null }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={updateForm.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setUpdateForm((prev) => ({ ...prev, notes: e.target.value || null }))
                  }
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Vehicle'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}