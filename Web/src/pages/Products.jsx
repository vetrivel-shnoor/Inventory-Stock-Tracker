import React, { useEffect, useState, useRef } from 'react';
import { Search, Filter, LayoutGrid, List, Plus, Edit2, Trash2, Package, Upload } from 'lucide-react';
import { inventoryApi } from '../services/inventoryApi';
import { CardSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../context/Appcontext';
import toast from 'react-hot-toast';

/**
 * Products Component
 * 
 * Manages the entire product catalog including viewing (Grid/Table modes),
 * searching, filtering, creating, updating, and deleting products.
 * Uses a glassmorphic aesthetic to match the global UI system.
 */
export default function Products() {
  const { user } = useApp();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', sku: '', category: '', price: '', initialStock: '', lowStockThreshold: '', image: null });
  const fileInputRef = useRef(null);

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

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ name: '', sku: '', category: '', price: '', initialStock: '', lowStockThreshold: '10', image: null });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingId(product._id);
    setFormData({ 
      name: product.name, 
      sku: product.sku, 
      category: product.category, 
      price: product.price, 
      lowStockThreshold: product.lowStockThreshold,
      image: null 
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? All related transactions will also be deleted.')) return;
    try {
      await inventoryApi.deleteProduct(id);
      setProducts(products.filter(p => p._id !== id));
      toast.success('Product deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          data.append(key, formData[key]);
        }
      });

      if (editingId) {
        const updated = await inventoryApi.updateProduct(editingId, data);
        setProducts(products.map(p => p._id === editingId ? updated : p));
        toast.success('Product updated');
      } else {
        const newProduct = await inventoryApi.createProduct(data);
        setProducts([newProduct, ...products]);
        toast.success('Product added');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${editingId ? 'update' : 'add'} product`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      {/* Header & Actions */}
      <div className="flex flex-col items-center justify-center gap-4 text-center mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Product Catalog</h1>
        {isAdmin && (
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-tr from-blue-600/80 to-indigo-400/80 backdrop-blur-md border border-blue-500/30 text-white rounded-xl hover:shadow-[0_8px_25px_-4px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-300 font-semibold shadow-sm"
          >
            <Plus size={18} />
            Add Product
          </button>
        )}
      </div>

      {/* Toolbar - Glassmorphic */}
      <div className="bg-[var(--color-bg-surface)] backdrop-blur-xl p-4 rounded-xl border border-[var(--color-border-subtle)] flex flex-col lg:flex-row gap-4 justify-between items-center shadow-sm">
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
          
          <button
            type="button"
            role="switch"
            aria-checked={showLowStock}
            onClick={() => setShowLowStock(!showLowStock)}
            className="flex items-center gap-2 text-sm font-medium cursor-pointer group focus:outline-none select-none px-2 py-1 rounded-lg hover:bg-[var(--color-bg-base)] transition-colors"
          >
            <div className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-300 ${
              showLowStock ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border-subtle)] group-hover:bg-gray-400 dark:group-hover:bg-gray-600'
            }`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                showLowStock ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </div>
            <span className={showLowStock ? 'text-[var(--color-primary)] font-semibold' : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]'}>
              Low Stock Only
            </span>
          </button>
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
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-[var(--color-bg-surface)] backdrop-blur-md rounded-xl">
                  <CardSkeleton />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[var(--color-bg-surface)] backdrop-blur-md rounded-xl p-4 border border-[var(--color-border-subtle)]">
              <TableSkeleton rows={8} />
            </div>
          )
        ) : products.length === 0 ? (
          <EmptyState title="No Products Found" description="Try adjusting your search or filters." />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
            {products.map(product => {
              const health = getStockHealth(product.currentStock, product.lowStockThreshold);
              return (
                <div key={product._id} className="bg-[var(--color-bg-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col">
                  <div className="h-48 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 dark:to-transparent relative border-b border-[var(--color-border-subtle)]">
                    {product.image ? (
                      <img src={product.image.startsWith('http') ? product.image : `http://localhost:3000${product.image}`} alt={product.name} className="w-full h-full object-contain p-4" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-secondary)]">
                        <Package size={48} opacity={0.2} />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 dark:bg-black/80 backdrop-blur text-xs font-semibold rounded shadow-sm">
                      {product.sku}
                    </div>
                    {isAdmin && (
                      <div className="absolute top-3 right-3 flex gap-1 bg-white/90 dark:bg-black/80 backdrop-blur rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(product)} className="p-1.5 text-[var(--color-text-secondary)] hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title="Edit Product">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(product._id)} className="p-1.5 text-[var(--color-text-secondary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete Product">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
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
          <div className="bg-[var(--color-bg-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/10 dark:bg-black/10 border-b border-[var(--color-border-subtle)] backdrop-blur-sm">
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
                      <tr key={product._id} className="hover:bg-white/20 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/10 dark:bg-black/20 border border-[var(--color-border-subtle)] flex items-center justify-center overflow-hidden">
                             {product.image ? <img src={product.image.startsWith('http') ? product.image : `http://localhost:3000${product.image}`} className="w-full h-full object-cover" /> : <Package size={20} className="text-[var(--color-text-secondary)]" />}
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
                              <button onClick={() => handleOpenEdit(product)} className="p-2 text-[var(--color-text-secondary)] hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => handleDelete(product._id)} className="p-2 text-[var(--color-text-secondary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Product" : "Add New Product"}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Product Name</label>
              <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="Premium Widget" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">SKU</label>
              <input required={!editingId} disabled={!!editingId} type="text" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} className="w-full p-2.5 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] focus:outline-none focus:border-[var(--color-primary)] transition-colors disabled:opacity-50" placeholder="SKU-123" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Category</label>
              <select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full p-2.5 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] focus:outline-none focus:border-[var(--color-primary)] transition-colors appearance-none">
                <option value="">Select Category</option>
                <option value="Electronics">Electronics</option>
                <option value="Clothing">Clothing</option>
                <option value="Food">Food</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Price (₹)</label>
              <input required type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full p-2.5 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="99.99" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!editingId && (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Initial Stock</label>
                <input type="number" min="0" value={formData.initialStock} onChange={(e) => setFormData({...formData, initialStock: e.target.value})} className="w-full p-2.5 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="0" />
              </div>
            )}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Low Stock Threshold</label>
              <input required type="number" min="0" value={formData.lowStockThreshold} onChange={(e) => setFormData({...formData, lowStockThreshold: e.target.value})} className="w-full p-2.5 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="10" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Product Image (Optional)</label>
            <div className="flex items-center gap-4">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border-subtle)] rounded-lg hover:bg-[var(--color-bg-base)] transition-colors text-sm font-medium"
              >
                <Upload size={16} /> Choose Image
              </button>
              <span className="text-xs text-[var(--color-text-secondary)] truncate">
                {formData.image ? formData.image.name : 'No file chosen'}
              </span>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => setFormData({...formData, image: e.target.files[0]})}
                className="hidden" 
                accept="image/*"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-[var(--color-border-subtle)] mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)] rounded-lg transition-colors font-medium">Cancel</button>
            <button type="submit" className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium shadow-md">
              {editingId ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
