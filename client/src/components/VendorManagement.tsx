import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { Vendor, CreateVendorInput, UpdateVendorInput } from '../../../server/src/schema';

export function VendorManagement() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const [createForm, setCreateForm] = useState<CreateVendorInput>({
    name: '',
    contact_info: null
  });

  const [updateForm, setUpdateForm] = useState<Partial<UpdateVendorInput>>({});

  const loadVendors = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getVendors.query();
      setVendors(result);
      setError(null);
    } catch (error) {
      console.error('Failed to load vendors:', error);
      setError('Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const result = await trpc.createVendor.mutate(createForm);
      setVendors((prev: Vendor[]) => [...prev, result]);
      setCreateForm({
        name: '',
        contact_info: null
      });
      setIsCreateOpen(false);
    } catch (error) {
      console.error('Failed to create vendor:', error);
      setError('Failed to create vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor) return;

    setIsSubmitting(true);
    
    try {
      const updateData: UpdateVendorInput = {
        id: editingVendor.id,
        ...updateForm
      };
      
      const result = await trpc.updateVendor.mutate(updateData);
      setVendors((prev: Vendor[]) => 
        prev.map((v: Vendor) => v.id === result.id ? result : v)
      );
      setEditingVendor(null);
      setUpdateForm({});
      setIsEditOpen(false);
    } catch (error) {
      console.error('Failed to update vendor:', error);
      setError('Failed to update vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (vendorId: number) => {
    try {
      await trpc.deleteVendor.mutate({ id: vendorId });
      setVendors((prev: Vendor[]) => prev.filter((v: Vendor) => v.id !== vendorId));
    } catch (error) {
      console.error('Failed to delete vendor:', error);
      setError('Failed to delete vendor');
    }
  };

  const openEditDialog = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setUpdateForm({
      name: vendor.name,
      contact_info: vendor.contact_info
    });
    setIsEditOpen(true);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">{error}</p>
          <Button onClick={loadVendors} className="mt-4">
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
          <h2 className="text-3xl font-bold text-gray-900">Vendor Management</h2>
          <p className="text-gray-600">Manage your service providers and suppliers</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>+ Add Vendor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
              <DialogDescription>
                Enter the vendor details to add them to your system.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Vendor Name</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm((prev: CreateVendorInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Joe's Auto Repair"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="contact_info">Contact Information (Optional)</Label>
                <Textarea
                  id="contact_info"
                  value={createForm.contact_info || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setCreateForm((prev: CreateVendorInput) => ({ ...prev, contact_info: e.target.value || null }))
                  }
                  placeholder="Phone, email, address, etc."
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Vendor'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p>Loading vendors...</p>
        </div>
      ) : vendors.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">🏢</div>
            <p className="text-gray-500">No vendors registered yet.</p>
            <p className="text-sm text-gray-400 mt-1">Add vendors to track expenses and services!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((vendor: Vendor) => (
            <Card key={vendor.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span className="text-lg">🏢</span>
                  <span>{vendor.name}</span>
                </CardTitle>
                <CardDescription>
                  Added {vendor.created_at.toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {vendor.contact_info ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 font-medium">Contact Information:</p>
                    <p className="text-sm whitespace-pre-line">{vendor.contact_info}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No contact information provided</p>
                )}

                <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(vendor)}>
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
                        <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this vendor? This action cannot be undone.
                          Any expenses associated with this vendor will lose their vendor reference.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(vendor.id)}>
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
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update vendor information and contact details.
            </DialogDescription>
          </DialogHeader>

          {editingVendor && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Vendor Name</Label>
                <Input
                  id="edit-name"
                  value={updateForm.name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setUpdateForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="edit-contact">Contact Information</Label>
                <Textarea
                  id="edit-contact"
                  value={updateForm.contact_info || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setUpdateForm((prev) => ({ ...prev, contact_info: e.target.value || null }))
                  }
                  placeholder="Phone, email, address, etc."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Vendor'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}