import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, IndianRupee, AlertTriangle, Activity, ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react';
import { inventoryApi } from '../services/inventoryApi';
import { CardSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { TransactionModal } from '../components/transactions/TransactionModal';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

/**
 * Dashboard Component
 * 
 * High-density enterprise dashboard featuring KPIs, Category Distribution,
 * 7-Day Velocity Flow, Critical Low Stock alerts, and a Ledger Stream.
 */
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState('IN');
  const [preselectedProductId, setPreselectedProductId] = useState('');

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

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[var(--color-bg-surface)] p-4 rounded-xl h-72"><CardSkeleton /></div>
            <div className="bg-[var(--color-bg-surface)] p-4 rounded-xl h-72"><TableSkeleton rows={4} /></div>
          </div>
          <div className="bg-[var(--color-bg-surface)] p-4 rounded-xl h-[600px]"><TableSkeleton rows={10} /></div>
        </div>
      </div>
    );
  }

  // Colors for Donut Chart
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'];

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 pb-2">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setTxType('IN'); setPreselectedProductId(''); setIsTxModalOpen(true); }}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-tr from-emerald-600/80 to-green-400/80 backdrop-blur-md border border-emerald-500/30 text-white rounded-xl hover:shadow-[0_8px_25px_-4px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 transition-all duration-300 font-semibold shadow-sm text-sm"
          >
            <ArrowDownRight size={16} />
            Stock IN
          </button>
          <button 
            onClick={() => { setTxType('OUT'); setPreselectedProductId(''); setIsTxModalOpen(true); }}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-tr from-rose-600/80 to-red-400/80 backdrop-blur-md border border-rose-500/30 text-white rounded-xl hover:shadow-[0_8px_25px_-4px_rgba(239,68,68,0.4)] hover:-translate-y-0.5 transition-all duration-300 font-semibold shadow-sm text-sm"
          >
            <ArrowUpRight size={16} />
            Stock OUT
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4 shrink-0">
        <KpiCard 
          title="Total Products" 
          value={stats?.totalProducts?.toLocaleString() || 0} 
          icon={Package} 
          color="text-blue-500" 
          bg="bg-blue-50 dark:bg-blue-900/20"
        />
        <KpiCard 
          title="Total Valuation" 
          value={`₹${(stats?.totalStockValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={IndianRupee} 
          color="text-green-500" 
          bg="bg-green-50 dark:bg-green-900/20"
        />
        <KpiCard 
          title="Low Stock Alerts" 
          value={stats?.lowStockCount?.toLocaleString() || 0} 
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1 min-h-0">
        
        {/* Left Column: Charts and Alerts (Takes 2/3 space on large screens) */}
        <div className="xl:col-span-2 flex flex-col gap-4 min-h-0">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
            {/* Category Distribution Chart */}
            <div className="bg-[var(--color-bg-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-xl p-4 shadow-sm flex flex-col">
              <h2 className="text-base font-semibold mb-2">Category Value Distribution</h2>
              <div className="flex-1 h-48 min-h-[160px] relative">
                {stats?.categoryDistribution?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="_id"
                      >
                        {stats.categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value) => `₹${value.toLocaleString()}`}
                        contentStyle={{ 
                          backgroundColor: 'var(--color-bg-surface)', 
                          borderColor: 'var(--color-border-subtle)', 
                          borderRadius: '12px',
                          backdropFilter: 'blur(16px)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-[var(--color-text-secondary)]">No category data</div>
                )}
              </div>
            </div>

            {/* 7-Day Velocity Chart */}
            <div className="bg-[var(--color-bg-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-xl p-4 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold">7-Day Stock Flow</h2>
                <div className="flex items-center gap-3 text-xs font-medium">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> IN</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> OUT</div>
                </div>
              </div>
              <div className="flex-1 h-48 min-h-[160px]">
                {stats?.sevenDayFlow?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.sevenDayFlow} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border-subtle)', borderRadius: '12px' }}
                      />
                      <Area type="monotone" dataKey="inQuantity" name="Units IN" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIn)" />
                      <Area type="monotone" dataKey="outQuantity" name="Units OUT" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorOut)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-[var(--color-text-secondary)]">No flow data</div>
                )}
              </div>
            </div>
          </div>

          {/* Critical Low Stock Alerts Table */}
          <div className="bg-[var(--color-bg-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-xl overflow-hidden shadow-sm flex flex-col flex-1 min-h-0">
            <div className="p-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between shrink-0">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={18} />
                Critical Low Stock
              </h2>
            </div>
            
            <div className="overflow-y-auto flex-1">
              {stats?.urgentLowStock?.length === 0 ? (
                <div className="p-8 text-center text-[var(--color-text-secondary)] text-sm">All products are healthy!</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 dark:bg-black/10 border-b border-[var(--color-border-subtle)] text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                      <th className="px-5 py-3 font-medium">Product</th>
                      <th className="px-5 py-3 font-medium">Remaining</th>
                      <th className="px-5 py-3 font-medium">Threshold</th>
                      <th className="px-5 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-subtle)]">
                    {stats?.urgentLowStock?.map((item) => (
                      <tr key={item._id} className="hover:bg-[var(--color-bg-base)] transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-[var(--color-text-secondary)] font-mono">{item.sku}</div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            {item.currentStock}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-[var(--color-text-secondary)]">
                          {item.lowStockThreshold}
                        </td>
                        <td className="px-5 py-2 text-right">
                          <button 
                            onClick={() => { setPreselectedProductId(item._id); setTxType('IN'); setIsTxModalOpen(true); }}
                            className="text-xs font-semibold text-[var(--color-primary)] hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            RESTOCK
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Ledger Stream */}
        <div className="bg-[var(--color-bg-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-xl flex flex-col shadow-sm flex-1 min-h-0 overflow-hidden">
          <div className="p-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-white/5 dark:bg-black/10 shrink-0">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <TrendingUp size={18} className="text-[var(--color-text-secondary)]" />
              Recent Ledger
            </h2>
            <Link to="/transactions" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
              View All
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3">
            {!stats?.recentTransactions?.length ? (
              <EmptyState title="No Activity" description="No transactions recorded yet." icon={Activity} />
            ) : (
              <div className="space-y-2">
                {stats.recentTransactions.map((tx) => (
                  <div key={tx._id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--color-bg-base)] transition-colors border border-transparent hover:border-[var(--color-border-subtle)] group">
                    <div className="flex flex-col flex-1 min-w-0 pr-4">
                      <span className="font-medium text-sm truncate text-[var(--color-text-primary)]">{tx.product?.name || 'Unknown'}</span>
                      <span className="text-xs text-[var(--color-text-secondary)] font-mono">{tx.product?.sku || 'N/A'}</span>
                      <span className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
                        {new Date(tx.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[var(--color-text-primary)]">
                          {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                        </span>
                        {tx.type === 'IN' ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                            <ArrowDownRight size={12} />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">
                            <ArrowUpRight size={12} />
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
                        ₹{(tx.totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
      </div>

      <TransactionModal 
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        txType={txType}
        initialProductId={preselectedProductId}
        onSuccess={fetchStats}
      />
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-[var(--color-bg-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">{title}</span>
          <span className="text-2xl font-bold">{value}</span>
        </div>
        <div className={`p-3 rounded-xl ${bg} ${color} backdrop-blur-sm border border-white/10 dark:border-white/5`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}
