import React, { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Search, Plus, FileText, X, ChevronDown, Check } from 'lucide-react';
import { inventoryApi } from '../services/inventoryApi';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { TransactionModal } from '../components/transactions/TransactionModal';
import toast from 'react-hot-toast';

/**
 * Transactions Component
 * 
 * Displays a ledger of all stock movements (IN and OUT).
 * Allows users to record new stock transactions.
 * Utilizes a glassmorphic aesthetic to match the global UI system.
 */
export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [txType, setTxType] = useState('IN'); // 'IN' | 'OUT'
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const txData = await inventoryApi.getTransactions({ page: pageNum, limit: 50 });
      
      if (pageNum === 1) {
        setTransactions(txData.transactions || []);
      } else {
        setTransactions(prev => [...prev, ...(txData.transactions || [])]);
      }
      
      setHasMore(txData.transactions?.length === 50);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col items-center justify-center gap-4 text-center mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Ledger & Transactions</h1>
        <div className="flex gap-2 w-full sm:w-auto justify-center">
          <button 
            onClick={() => { setTxType('IN'); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-tr from-emerald-600/80 to-green-400/80 backdrop-blur-md border border-emerald-500/30 text-white rounded-xl hover:shadow-[0_8px_25px_-4px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 transition-all duration-300 font-semibold shadow-sm"
          >
            <ArrowDownRight size={18} />
            Stock IN
          </button>
          <button 
            onClick={() => { setTxType('OUT'); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-tr from-rose-600/80 to-red-400/80 backdrop-blur-md border border-rose-500/30 text-white rounded-xl hover:shadow-[0_8px_25px_-4px_rgba(239,68,68,0.4)] hover:-translate-y-0.5 transition-all duration-300 font-semibold shadow-sm"
          >
            <ArrowUpRight size={18} />
            Stock OUT
          </button>
        </div>
      </div>

      {/* Audit Log Table - Glassmorphic */}
      <div className="flex-1 bg-[var(--color-bg-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-xl overflow-hidden shadow-sm flex flex-col">
        {loading ? (
          <div className="p-4"><TableSkeleton rows={10} /></div>
        ) : transactions.length === 0 ? (
          <EmptyState title="No Transactions" description="Stock movements will appear here." icon={FileText} />
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/10 dark:bg-black/10 border-b border-[var(--color-border-subtle)] backdrop-blur-sm">
                  <th className="p-4 font-semibold text-sm">Date & Time</th>
                  <th className="p-4 font-semibold text-sm">Product</th>
                  <th className="p-4 font-semibold text-sm">Type</th>
                  <th className="p-4 font-semibold text-sm text-right">Qty</th>
                  <th className="p-4 font-semibold text-sm text-right">Value</th>
                  <th className="p-4 font-semibold text-sm">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {transactions.map(tx => (
                  <tr key={tx._id} className="hover:bg-white/20 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm text-[var(--color-text-secondary)] whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{tx.product?.name || 'Deleted Product'}</span>
                        <span className="text-xs text-[var(--color-text-secondary)] font-mono">{tx.product?.sku || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {tx.type === 'IN' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400 border border-green-500/20">
                          <ArrowDownRight size={14} /> IN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400 border border-red-500/20">
                          <ArrowUpRight size={14} /> OUT
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm font-semibold text-right">
                      <span className={tx.type === 'IN' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-right font-semibold">
                      ₹{(tx.totalValue || 0).toFixed(2)}
                      <div className="text-xs text-[var(--color-text-secondary)] font-medium">@ ₹{tx.unitPrice?.toFixed(2)}</div>
                    </td>
                    <td className="p-4 text-sm text-[var(--color-text-secondary)]">
                      {tx.performedBy?.name || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {hasMore && (
              <div className="flex justify-center p-6 border-t border-[var(--color-border-subtle)]">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] hover:bg-[var(--color-border-subtle)] transition-colors rounded-xl font-medium text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore ? 'Loading...' : 'Load More Transactions'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <TransactionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        txType={txType}
        onSuccess={() => {
          setPage(1);
          fetchData(1);
        }}
      />
    </div>
  );
}
