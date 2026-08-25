import React, { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Search, Plus, FileText, X } from 'lucide-react';
import { inventoryApi } from '../services/inventoryApi';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txType, setTxType] = useState('IN'); // 'IN' | 'OUT'

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txData, prodData] = await Promise.all([
        inventoryApi.getTransactions(),
        inventoryApi.getProducts()
      ]);
      setTransactions(txData.transactions || []);
      setProducts(prodData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p._id === selectedProductId);
  const numQuantity = parseInt(quantity) || 0;
  
  let projectedStock = selectedProduct?.currentStock || 0;
  if (selectedProduct) {
    if (txType === 'IN') projectedStock += numQuantity;
    if (txType === 'OUT') projectedStock -= numQuantity;
  }

  const isValid = selectedProduct && numQuantity > 0 && (txType === 'IN' || projectedStock >= 0);

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    try {
      await inventoryApi.createTransaction({
        productId: selectedProductId,
        type: txType,
        quantity: numQuantity,
        reason
      });
      toast.success(`Successfully recorded Stock ${txType}`);
      setIsModalOpen(false);
      setQuantity('');
      setReason('');
      setSelectedProductId('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transaction failed');
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

      {/* Audit Log Table */}
      <div className="flex-1 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden shadow-sm flex flex-col">
        {loading ? (
          <div className="p-4"><TableSkeleton rows={10} /></div>
        ) : transactions.length === 0 ? (
          <EmptyState title="No Transactions" description="Stock movements will appear here." icon={FileText} />
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-bg-base)] border-b border-[var(--color-border-subtle)]">
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
                  <tr key={tx._id} className="hover:bg-[var(--color-bg-base)] transition-colors">
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
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <ArrowDownRight size={14} /> IN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <ArrowUpRight size={14} /> OUT
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm font-semibold text-right">
                      <span className={tx.type === 'IN' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-right font-medium">
                      ₹{(tx.totalValue || 0).toFixed(2)}
                      <div className="text-[10px] text-[var(--color-text-secondary)] font-normal">@ ₹{tx.unitPrice?.toFixed(2)}</div>
                    </td>
                    <td className="p-4 text-sm text-[var(--color-text-secondary)]">
                      {tx.performedBy?.name || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-bg-surface)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[var(--color-border-subtle)] flex justify-between items-center bg-[var(--color-bg-base)]">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {txType === 'IN' ? (
                  <><ArrowDownRight className="text-green-500" /> Receive Stock (IN)</>
                ) : (
                  <><ArrowUpRight className="text-red-500" /> Dispatch Stock (OUT)</>
                )}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[var(--color-text-secondary)]">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleTransactionSubmit} className="p-6 space-y-5">
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Select Product</label>
                <div className="relative">
                  <select
                    required
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors appearance-none"
                  >
                    <option value="" disabled>Choose a product...</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none" />
                </div>
              </div>

              {selectedProduct && (
                <div className="p-4 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--color-text-secondary)]">Current Stock</span>
                    <span className="font-semibold text-lg">{selectedProduct.currentStock}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Quantity</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full px-3 py-2 bg-transparent border-b-2 border-[var(--color-border-subtle)] focus:border-[var(--color-primary)] focus:outline-none text-xl font-bold text-center transition-colors"
                        placeholder="0"
                      />
                    </div>
                    
                    <ArrowDownRight size={24} className="text-[var(--color-border-subtle)] rotate-[-90deg] mt-6" />

                    <div className="flex-1 space-y-1.5 text-right">
                      <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Projected</label>
                      <div className={`text-xl font-bold pt-2 ${
                        txType === 'OUT' && projectedStock < 0 ? 'text-red-500' : 
                        txType === 'IN' && numQuantity > 0 ? 'text-green-500' : ''
                      }`}>
                        {projectedStock}
                      </div>
                    </div>
                  </div>

                  {txType === 'OUT' && projectedStock < 0 && (
                    <p className="text-xs text-red-500 text-center font-medium">Insufficient stock available!</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason / Reference</label>
                <input 
                  type="text" 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={txType === 'IN' ? 'e.g. Purchase Order #123' : 'e.g. Retail Sale'}
                  className="w-full px-4 py-2.5 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-[var(--color-border-subtle)] flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium hover:bg-[var(--color-bg-base)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!isValid}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-all ${
                    isValid 
                      ? (txType === 'IN' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600') 
                      : 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed opacity-50'
                  }`}
                >
                  Confirm {txType}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
