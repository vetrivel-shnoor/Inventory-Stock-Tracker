import React, { useEffect, useState } from 'react';
import { Package, IndianRupee, AlertTriangle, Activity } from 'lucide-react';
import { inventoryApi } from '../services/inventoryApi';
import { CardSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await inventoryApi.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[var(--color-bg-surface)] p-4 rounded-xl border border-[var(--color-border-subtle)] h-96">
            <CardSkeleton />
          </div>
          <div className="bg-[var(--color-bg-surface)] p-4 rounded-xl border border-[var(--color-border-subtle)]">
            <TableSkeleton rows={5} />
          </div>
        </div>
      </div>
    );
  }

  const chartData = [
    { name: 'Healthy Stock', value: (stats?.totalProducts || 0) - (stats?.lowStockCount || 0) },
    { name: 'Low Stock', value: stats?.lowStockCount || 0 }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard 
          title="Total Products" 
          value={stats?.totalProducts || 0} 
          icon={Package} 
          color="text-blue-500" 
          bg="bg-blue-50 dark:bg-blue-900/20"
        />
        <KpiCard 
          title="Total Valuation" 
          value={`₹${(stats?.totalStockValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          icon={IndianRupee} 
          color="text-green-500" 
          bg="bg-green-50 dark:bg-green-900/20"
        />
        <KpiCard 
          title="Low Stock Alerts" 
          value={stats?.lowStockCount || 0} 
          icon={AlertTriangle} 
          color={stats?.lowStockCount > 0 ? "text-red-500" : "text-yellow-500"} 
          bg={stats?.lowStockCount > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-yellow-50 dark:bg-yellow-900/20"}
        />
        <KpiCard 
          title="24h Activity" 
          value={stats?.recentTransactions?.length || 0} 
          icon={Activity} 
          color="text-purple-500" 
          bg="bg-purple-50 dark:bg-purple-900/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Inventory Health</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={false}
                  contentStyle={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border-subtle)', borderRadius: '8px' }} 
                  itemStyle={{ color: 'var(--color-text-primary)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 1 ? 'var(--color-danger)' : 'var(--color-success)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ledger Stream */}
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl p-6 shadow-sm flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Recent Ledger Stream</h2>
          
          <div className="flex-1 overflow-y-auto">
            {!stats?.recentTransactions?.length ? (
              <EmptyState title="No Activity" description="No transactions recorded yet." icon={Activity} />
            ) : (
              <div className="space-y-4">
                {stats.recentTransactions.map((tx) => (
                  <div key={tx._id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--color-bg-base)] transition-colors border border-transparent hover:border-[var(--color-border-subtle)]">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm truncate max-w-[150px]">{tx.product?.name || 'Unknown'}</span>
                      <span className="text-xs text-[var(--color-text-secondary)]">{new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-[var(--color-bg-base)]">
                        {tx.quantity} units
                      </span>
                      {tx.type === 'IN' ? (
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          + IN
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          - OUT
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">{title}</span>
          <span className="text-2xl font-bold">{value}</span>
        </div>
        <div className={`p-3 rounded-xl ${bg} ${color}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}
