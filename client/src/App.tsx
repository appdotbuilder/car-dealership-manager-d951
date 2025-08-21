import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import { Dashboard } from '@/components/Dashboard';
import { VehicleManagement } from '@/components/VehicleManagement';
import { VendorManagement } from '@/components/VendorManagement';
import { ExpenseManagement } from '@/components/ExpenseManagement';
import { TransactionManagement } from '@/components/TransactionManagement';
import { ReportsSection } from '@/components/ReportsSection';
import { VehicleDetails } from '@/components/VehicleDetails';
import type { LoginInput, User } from '../../server/src/schema';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState<LoginInput>({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  // Check for stored user on app load
  useEffect(() => {
    const storedUser = localStorage.getItem('car-dealership-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await trpc.login.mutate(loginForm);
      if (result.success && result.user) {
        setUser(result.user);
        localStorage.setItem('car-dealership-user', JSON.stringify(result.user));
        setLoginForm({ username: '', password: '' });
      } else {
        setError('Invalid username or password');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError('Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDefaultUser = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await trpc.createDefaultUser.mutate();
      setError(null);
      // Show success message
      alert('Default user created! Username: admin, Password: password');
    } catch (error) {
      console.error('Failed to create default user:', error);
      setError('Failed to create default user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('car-dealership-user');
    setActiveTab('dashboard');
    setSelectedVehicleId(null);
  };

  const handleViewVehicle = (vehicleId: number) => {
    setSelectedVehicleId(vehicleId);
    setActiveTab('vehicle-details');
  };

  const handleBackToVehicles = () => {
    setSelectedVehicleId(null);
    setActiveTab('vehicles');
  };

  // Login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">🚗 AutoDealer Pro</CardTitle>
            <CardDescription>
              Professional Car Dealership Management System
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Username"
                  value={loginForm.username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setLoginForm((prev: LoginInput) => ({ ...prev, username: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setLoginForm((prev: LoginInput) => ({ ...prev, password: e.target.value }))
                  }
                  required
                />
              </div>
              {error && (
                <div className="text-red-600 text-sm text-center">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Sign In'}
              </Button>
            </form>
            
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-gray-600 text-center mb-3">
                Need to set up the system?
              </p>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleCreateDefaultUser}
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Default Admin User'}
              </Button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Creates admin/password credentials
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main application
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🚗</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AutoDealer Pro</h1>
                <p className="text-sm text-gray-500">Dealership Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.username}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7 mb-8">
            <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
            <TabsTrigger value="vehicles">🚙 Vehicles</TabsTrigger>
            <TabsTrigger value="vendors">🏢 Vendors</TabsTrigger>
            <TabsTrigger value="expenses">💰 Expenses</TabsTrigger>
            <TabsTrigger value="transactions">💳 Transactions</TabsTrigger>
            <TabsTrigger value="reports">📈 Reports</TabsTrigger>
            <TabsTrigger value="vehicle-details" disabled={!selectedVehicleId}>
              📋 Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>

          <TabsContent value="vehicles">
            <VehicleManagement onViewVehicle={handleViewVehicle} />
          </TabsContent>

          <TabsContent value="vendors">
            <VendorManagement />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpenseManagement />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionManagement />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsSection />
          </TabsContent>

          <TabsContent value="vehicle-details">
            {selectedVehicleId && (
              <VehicleDetails 
                vehicleId={selectedVehicleId} 
                onBack={handleBackToVehicles}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;