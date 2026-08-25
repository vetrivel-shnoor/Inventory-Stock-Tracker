import React, { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Search, Plus, FileText, X, ChevronDown, Check } from 'lucide-react';
import { inventoryApi } from '../services/inventoryApi';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
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
  
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txType, setTxType] = useState('IN'); // 'IN' | 'OUT'

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const [txData, prodData] = await Promise.all([
        inventoryApi.getTransactions({ page: pageNum, limit: 50 }),
        pageNum === 1 ? inventoryApi.getProducts({ page: 1, limit: 1000 }) : Promise.resolve({ data: products }) // Only fetch products on first load
      ]);
      
      if (pageNum === 1) {
        setTransactions(txData.transactions || []);
      } else {
        setTransactions(prev => [...prev, ...(txData.transactions || [])]);
      }
      
      setHasMore(txData.transactions?.length === 50);
      if (pageNum === 1) setProducts(prodData.data || []);
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

  const selectedProduct = products.find(p => p._id === selectedProductId);
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={
          txType === 'IN' ? (
            <><ArrowDownRight className="text-green-500" /> Receive Stock (IN)</>
          ) : (
            <><ArrowUpRight className="text-red-500" /> Dispatch Stock (OUT)</>
          )
        }
      >
            <form onSubmit={handleTransactionSubmit} className="p-6 space-y-5 overflow-y-visible">
              
              <div className="space-y-1.5 relative">
                <label className="text-sm font-medium">Select Product</label>
                <div 
                  className="relative cursor-pointer"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <div className="w-full px-4 py-2.5 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg flex items-center justify-between">
                    <span className={selectedProduct ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}>
                      {selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku})` : 'Choose a product...'}
                    </span>
                    <ChevronDown size={18} className="text-[var(--color-text-secondary)]" />
                  </div>
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-[110] mt-1 w-full bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl shadow-lg backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-[var(--color-border-subtle)]">
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search SKU or Name..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking input
                          className="w-full pl-9 pr-4 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-sm transition-colors"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map(p => (
                          <div 
                            key={p._id}
                            onClick={() => {
                              setSelectedProductId(p._id);
                              setIsDropdownOpen(false);
                              setProductSearch('');
                            }}
                            className="px-4 py-3 hover:bg-[var(--color-bg-base)] cursor-pointer flex items-center justify-between transition-colors border-b border-[var(--color-border-subtle)] last:border-0"
                          >
                            <div>
                              <div className="font-medium text-sm text-[var(--color-text-primary)]">{p.name}</div>
                              <div className="text-xs text-[var(--color-text-secondary)]">{p.sku}</div>
                            </div>
                            {selectedProductId === p._id && <Check size={16} className="text-[var(--color-primary)] font-bold" />}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
                          No products found.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedProduct && (
                <div className="p-4 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--color-text-secondary)]">Current Stock</span>
                    <span className="font-semibold text-lg">{selectedProduct.currentStock}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Quantity to {txType === 'IN' ? 'Add' : 'Remove'}</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full px-3 py-2 bg-transparent border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-center font-medium"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Projected Stock</label>
                      <div className={`px-3 py-2 rounded-lg text-center font-bold border ${projectedStock < 0 ? 'bg-red-50 dark:bg-red-900/10 text-red-500 border-red-200 dark:border-red-800' : 'bg-transparent border-transparent'}`}>
                        {projectedStock}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason / Note (Optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={txType === 'IN' ? "e.g. New shipment arrived" : "e.g. Damaged goods, Sale"}
                  className="w-full px-4 py-3 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none h-20 text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)] rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!isValid}
                  className={`px-6 py-2.5 rounded-lg transition-all font-bold shadow-md ${
                    isValid 
                    ? (txType === 'IN' ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20' : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20')
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  Confirm {txType === 'IN' ? 'IN' : 'OUT'}
                </button>
              </div>
            </form>
      </Modal>
    </div>
  );
}
