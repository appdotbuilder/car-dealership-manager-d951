import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/utils/trpc';
import type { DashboardKpi } from '../../../server/src/schema';

export function Dashboard() {
  const [kpis, setKpis] = useState<DashboardKpi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadKpis = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getDashboardKpis.query();
      setKpis(result);
      setError(null);
    } catch (error) {
      console.error('Failed to load KPIs:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKpis();
  }, [loadKpis]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDays = (days: number | null) => {
    if (days === null) return 'N/A';
    return `${Math.round(days)} days`;
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
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
        <p className="text-gray-600">Real-time insights into your dealership performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Inventory */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
            <div className="text-2xl">🚗</div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{kpis?.total_inventory || 0}</div>
            )}
            <p className="text-xs text-gray-500 mt-1">Vehicles in system</p>
          </CardContent>
        </Card>

        {/* Total Inventory Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <div className="text-2xl">💰</div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(kpis?.total_inventory_value || 0)}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">Total investment</p>
          </CardContent>
        </Card>

        {/* Vehicles in Reconditioning */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Reconditioning</CardTitle>
            <div className="text-2xl">🔧</div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{kpis?.vehicles_in_reconditioning || 0}</div>
            )}
            <p className="text-xs text-gray-500 mt-1">Being prepared</p>
          </CardContent>
        </Card>

        {/* Vehicles Listed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Listed for Sale</CardTitle>
            <div className="text-2xl">🏷️</div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{kpis?.vehicles_listed || 0}</div>
            )}
            <p className="text-xs text-gray-500 mt-1">Ready to sell</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sales This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales This Month</CardTitle>
            <div className="text-2xl">🎯</div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{kpis?.vehicles_sold_this_month || 0}</div>
            )}
            <p className="text-xs text-gray-500 mt-1">Units sold</p>
          </CardContent>
        </Card>

        {/* Profit This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit This Month</CardTitle>
            <div className="text-2xl">📈</div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(kpis?.total_profit_this_month || 0)}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">Net profit</p>
            {kpis && kpis.total_profit_this_month > 0 && (
              <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800">
                Profitable
              </Badge>
            )}
            {kpis && kpis.total_profit_this_month < 0 && (
              <Badge variant="secondary" className="mt-2 bg-red-100 text-red-800">
                Loss
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Average Days to Sale */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Days to Sale</CardTitle>
            <div className="text-2xl">⏱️</div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {formatDays(kpis?.avg_days_to_sale || null)}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">Average turnover</p>
            {kpis && kpis.avg_days_to_sale && kpis.avg_days_to_sale <= 30 && (
              <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800">
                Fast Turnover
              </Badge>
            )}
            {kpis && kpis.avg_days_to_sale && kpis.avg_days_to_sale > 60 && (
              <Badge variant="secondary" className="mt-2 bg-yellow-100 text-yellow-800">
                Slow Turnover
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Performance Summary</CardTitle>
          <CardDescription>
            Key insights and recommendations based on current metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="text-lg">📊</div>
                <p className="text-sm text-gray-700">
                  You currently have <strong>{kpis?.total_inventory || 0}</strong> vehicles 
                  worth <strong>{formatCurrency(kpis?.total_inventory_value || 0)}</strong> in inventory.
                </p>
              </div>
              
              {kpis && kpis.vehicles_in_reconditioning > 0 && (
                <div className="flex items-center space-x-3">
                  <div className="text-lg">🔧</div>
                  <p className="text-sm text-gray-700">
                    <strong>{kpis.vehicles_in_reconditioning}</strong> vehicles are in reconditioning 
                    and will be ready for sale soon.
                  </p>
                </div>
              )}
              
              {kpis && kpis.vehicles_listed > 0 && (
                <div className="flex items-center space-x-3">
                  <div className="text-lg">🏷️</div>
                  <p className="text-sm text-gray-700">
                    <strong>{kpis.vehicles_listed}</strong> vehicles are currently listed and 
                    available for sale.
                  </p>
                </div>
              )}
              
              {kpis && kpis.vehicles_sold_this_month > 0 ? (
                <div className="flex items-center space-x-3">
                  <div className="text-lg">🎯</div>
                  <p className="text-sm text-gray-700">
                    Great job! You've sold <strong>{kpis.vehicles_sold_this_month}</strong> vehicles 
                    this month with a profit of <strong>{formatCurrency(kpis.total_profit_this_month)}</strong>.
                  </p>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="text-lg">💡</div>
                  <p className="text-sm text-gray-700">
                    No sales recorded this month yet. Focus on marketing your listed vehicles 
                    to drive sales.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}