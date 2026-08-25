import React, { useState, useEffect } from 'react';
import { ArrowDownRight, ArrowUpRight, Search, ChevronDown, Check } from 'lucide-react';
import { inventoryApi } from '../../services/inventoryApi';
import { Modal } from '../ui/Modal';
import toast from 'react-hot-toast';

export function TransactionModal({ isOpen, onClose, txType, onSuccess, initialProductId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      // Reset form
      setQuantity('');
      setReason('');
      setSelectedProductId(initialProductId || '');
      setProductSearch('');
      setIsDropdownOpen(false);
    }
  }, [isOpen, initialProductId]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getProducts({ page: 1, limit: 1000 });
      setProducts(res.data || []);
    } catch (error) {
      console.error('Failed to fetch products', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
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
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transaction failed');
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
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
                {loading ? 'Loading...' : selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku})` : 'Choose a product...'}
              </span>
              <ChevronDown size={18} className="text-[var(--color-text-secondary)]" />
            </div>
          </div>

          {isDropdownOpen && !loading && (
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
            onClick={onClose}
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
  );
}
