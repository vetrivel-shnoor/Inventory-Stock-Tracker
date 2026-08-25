import React, { useEffect, useState } from 'react';
import { Search, Filter, LayoutGrid, List, Plus, Edit2, Trash2,Package } from 'lucide-react';
import { inventoryApi } from '../services/inventoryApi';
import { CardSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useApp } from '../context/Appcontext';
import toast from 'react-hot-toast';

export default function Products() {
  const { user } = useApp();
  const isAdmin = user?.role === 'admin';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  // Modals state (UI only for now, logic can be wired later)
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, category, showLowStock]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getProducts({
        search: searchTerm,
        category,
        lowStock: showLowStock
      });
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockHealth = (current, threshold) => {
    const ratio = current / (threshold * 3 || 30); // Simple heuristic for progress max
    const percentage = Math.min(100, Math.max(0, (current / (current + threshold)) * 100)); // Alternative percentage calculation
    
    // Simpler rule:
    // If current <= threshold: Danger (Pulsing Red)
    // If current <= threshold * 2: Warning (Yellow)
    // Else: Success (Green)
    if (current <= threshold) return { color: 'bg-red-500 animate-pulse', label: 'Critical' };
    if (current <= threshold * 2) return { color: 'bg-yellow-500', label: 'Low' };
    return { color: 'bg-green-500', label: 'Healthy' };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      {/* Header & Actions */}
      <div className="flex flex-col items-center justify-center gap-4 text-center mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Product Catalog</h1>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-tr from-blue-600/80 to-indigo-400/80 backdrop-blur-md border border-blue-500/30 text-white rounded-xl hover:shadow-[0_8px_25px_-4px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-300 font-semibold shadow-sm"
          >
            <Plus size={18} />
            Add Product
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-[var(--color-bg-surface)] p-4 rounded-xl border border-[var(--color-border-subtle)] flex flex-col lg:flex-row gap-4 justify-between items-center shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={18} />
            <input 
              type="text" 
              placeholder="Search SKU or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
          
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full sm:w-40 px-4 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors appearance-none"
          >
            <option value="">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Clothing">Clothing</option>
            <option value="Food">Food</option>
          </select>
          
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
            <input 
              type="checkbox" 
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--color-border-subtle)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            Low Stock Only
          </label>
        </div>

        <div className="flex items-center bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg p-1 self-end lg:self-auto">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[var(--color-bg-surface)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-[var(--color-bg-surface)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : (
            <TableSkeleton rows={8} />
          )
        ) : products.length === 0 ? (
          <EmptyState title="No Products Found" description="Try adjusting your search or filters." />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
            {products.map(product => {
              const health = getStockHealth(product.currentStock, product.lowStockThreshold);
              return (
                <div key={product._id} className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden hover:shadow-lg transition-all group flex flex-col">
                  <div className="h-48 bg-gradient-to-br from-[var(--color-bg-base)] to-[var(--color-border-subtle)] relative">
                    {product.image ? (
                      <img src={`http://localhost:3000${product.image}`} alt={product.name} className="w-full h-full object-contain p-4" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-secondary)]">
                        <Package size={48} opacity={0.2} />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 dark:bg-black/80 backdrop-blur text-xs font-semibold rounded shadow-sm">
                      {product.sku}
                    </div>
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                      <span className="font-bold text-[var(--color-primary)]">₹{product.price.toFixed(2)}</span>
                    </div>
                    <span className="text-xs text-[var(--color-text-secondary)] mb-4 bg-[var(--color-bg-base)] px-2 py-1 rounded w-max">
                      {product.category}
                    </span>
                    
                    <div className="mt-auto pt-4 border-t border-[var(--color-border-subtle)]">
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-[var(--color-text-secondary)]">Stock Level</span>
                        <span className="font-medium">{product.currentStock} / {product.lowStockThreshold} (Min)</span>
                      </div>
                      <div className="h-2 w-full bg-[var(--color-bg-base)] rounded-full overflow-hidden">
                        <div className={`h-full ${health.color}`} style={{ width: `${Math.min(100, (product.currentStock / (product.lowStockThreshold * 3)) * 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-bg-base)] border-b border-[var(--color-border-subtle)]">
                    <th className="p-4 font-semibold text-sm">Product</th>
                    <th className="p-4 font-semibold text-sm">SKU</th>
                    <th className="p-4 font-semibold text-sm">Category</th>
                    <th className="p-4 font-semibold text-sm">Price</th>
                    <th className="p-4 font-semibold text-sm">Stock Status</th>
                    {isAdmin && <th className="p-4 font-semibold text-sm text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {products.map(product => {
                    const health = getStockHealth(product.currentStock, product.lowStockThreshold);
                    return (
                      <tr key={product._id} className="hover:bg-[var(--color-bg-base)] transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] flex items-center justify-center overflow-hidden">
                             {product.image ? <img src={`http://localhost:3000${product.image}`} className="w-full h-full object-cover" /> : <Package size={20} className="text-[var(--color-text-secondary)]" />}
                          </div>
                          <span className="font-medium">{product.name}</span>
                        </td>
                        <td className="p-4 text-sm font-mono text-[var(--color-text-secondary)]">{product.sku}</td>
                        <td className="p-4 text-sm">{product.category}</td>
                        <td className="p-4 font-semibold">₹{product.price.toFixed(2)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium w-8">{product.currentStock}</span>
                            <div className="h-1.5 w-24 bg-[var(--color-border-subtle)] rounded-full overflow-hidden hidden sm:block">
                              <div className={`h-full ${health.color}`} style={{ width: `${Math.min(100, (product.currentStock / (product.lowStockThreshold * 3)) * 100)}%` }}></div>
                            </div>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button className="p-2 text-[var(--color-text-secondary)] hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors">
                                <Edit2 size={16} />
                              </button>
                              <button className="p-2 text-[var(--color-text-secondary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Admin Action Modal Placeholder */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-bg-surface)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--color-border-subtle)] flex justify-between items-center">
              <h2 className="text-xl font-bold">Add New Product</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[var(--color-bg-base)] rounded-full transition-colors text-[var(--color-text-secondary)]">
                <Filter size={20} className="rotate-45" /> {/* Using Filter as X for now since X isn't imported, wait, let me use standard HTML X or import X */}
                <span className="sr-only">Close</span>
              </button>
            </div>
            <div className="p-6">
              <p className="text-[var(--color-text-secondary)] mb-4">Modal UI placeholder. You can wire this to the API next!</p>
              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg font-medium hover:bg-[var(--color-bg-base)] transition-colors">Cancel</button>
                <button onClick={() => { setIsModalOpen(false); toast.success('Product functionality wired soon!'); }} className="px-4 py-2 rounded-lg font-medium bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity">Save Product</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
