import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Search, Filter, LayoutGrid, List, Plus, Edit2, Trash2, Package, Upload, Loader2 } from 'lucide-react';
import { inventoryApi } from '../services/inventoryApi';
import { CardSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../context/Appcontext';
import toast from 'react-hot-toast';
import CreatableSelect from 'react-select/creatable';
import { useVirtualizer } from '@tanstack/react-virtual';

const resolveImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  
  // With Nginx API Gateway, both /api and /public/uploads/ are natively routed to the correct backend container.
  // The frontend can just request the path directly without prepending the backend URL.
  const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';
  return `${baseUrl}${imagePath}`;
};
/**
 * Products Page
 * 
 * [PERFORMANCE: INFINITE SCROLL & VIRTUALIZATION]
 * This component handles massive datasets (10,000+ items) without crashing the browser.
 * It uses `@tanstack/react-virtual` to only render the items currently visible in the 
 * viewport (the "sliding window"). As you scroll, DOM nodes are recycled instead of 
 * creating new ones. This keeps the DOM small, fast, and prevents memory leaks (OOM).
 */
export default function Products() {
  const { user } = useApp();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  
  // Pagination & Infinite Scroll State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState(null);
  const [showLowStock, setShowLowStock] = useState(false);
  const [categories, setCategories] = useState([]);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', sku: '', category: '', price: '', initialStock: '', lowStockThreshold: '10', image: null });
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Parent ref for virtualization
  const parentRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset page on new search
      setProducts([]); // Clear existing
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load Categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await inventoryApi.getCategories();
        setCategories(cats.map(c => ({ value: c, label: c })));
      } catch (error) {
        console.error("Failed to load categories", error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Products
  const fetchProducts = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    else setIsFetchingNextPage(true);
    
    try {
      const response = await inventoryApi.getProducts({
        search: debouncedSearch,
        category: category ? category.value : '',
        lowStock: showLowStock,
        page: pageNum,
        limit: 20
      });
      
      if (pageNum === 1) {
        setProducts(response.data);
      } else {
        setProducts(prev => [...prev, ...response.data]);
      }
      
      setHasMore(pageNum < response.totalPages);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products', { id: 'fetch-products-error' });
    } finally {
      setLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [debouncedSearch, category, showLowStock]);

  useEffect(() => {
    fetchProducts(page);
  }, [page, fetchProducts]);

  // Reset page when filters change (except search which is handled in debounce)
  useEffect(() => {
    setPage(1);
    setProducts([]);
  }, [category, showLowStock]);

  // Virtualizer Setup for Grid
  // Simplified: we will just virtualize as a single list if it's table, and grid layout requires multi-column calc.
  // For simplicity in UI and to prevent complex resize observers, we use a fixed height container.
  const rowVirtualizer = useVirtualizer({
    count: hasMore ? products.length + 1 : products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => viewMode === 'grid' ? 320 : 70, // Rough height estimates
    overscan: 5,
  });

  useEffect(() => {
    const [lastItem] = rowVirtualizer.getVirtualItems().slice(-1);
    if (
      lastItem &&
      lastItem.index >= products.length - 1 &&
      hasMore &&
      !isFetchingNextPage
    ) {
      setPage(prev => prev + 1);
    }
  }, [rowVirtualizer.getVirtualItems(), hasMore, isFetchingNextPage, products.length]);

  const getStockHealth = (current, threshold) => {
    if (current <= threshold) return { color: 'bg-red-500 animate-pulse', label: 'Critical' };
    if (current <= threshold * 2) return { color: 'bg-yellow-500', label: 'Low' };
    return { color: 'bg-green-500', label: 'Healthy' };
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ name: '', sku: '', category: '', price: '', initialStock: '', lowStockThreshold: '10', image: null });
    setImagePreview(null);
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
    setImagePreview(product.image ? resolveImageUrl(product.image) : null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to archive this product?')) return;
    try {
      await inventoryApi.deleteProduct(id);
      setProducts(products.filter(p => p._id !== id));
      toast.success('Product archived');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to archive product');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to archive ${selectedIds.length} products?`)) return;
    try {
      await inventoryApi.deleteBulkProducts(selectedIds);
      setProducts(products.filter(p => !selectedIds.includes(p._id)));
      setSelectedIds([]);
      toast.success('Products archived successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to archive products');
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
        await inventoryApi.updateProduct(editingId, data);
        fetchProducts(page);
        toast.success('Product updated');
      } else {
        const newProduct = await inventoryApi.createProduct(data);
        // Refresh products from server to get updated data
        fetchProducts(page);
        
        // Ensure new category is added to dropdown if it's new
        const exists = categories.find(c => c.value === newProduct.category);
        if (!exists) {
            setCategories([...categories, { value: newProduct.category, label: newProduct.category }]);
        }
        
        toast.success('Product added');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${editingId ? 'update' : 'add'} product`);
    }
  };

  // React Select Custom Styles for Glassmorphism
  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      background: 'transparent',
      borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border-subtle)',
      boxShadow: 'none',
      '&:hover': {
        borderColor: 'var(--color-primary)'
      },
      borderRadius: '0.5rem',
      padding: '2px',
      color: 'var(--color-text-primary)'
    }),
    menu: (base) => ({
      ...base,
      background: 'rgba(30, 41, 59, 0.9)',
      backdropFilter: 'blur(16px)',
      border: '1px solid var(--color-border-subtle)',
      color: 'white',
      zIndex: 50
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? 'var(--color-primary)' : 'transparent',
      '&:active': {
        backgroundColor: 'var(--color-primary)'
      }
    }),
    singleValue: (base) => ({
      ...base,
      color: 'var(--color-text-primary)'
    }),
    input: (base) => ({
      ...base,
      color: 'var(--color-text-primary)'
    })
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      {/* Header & Actions */}
      <div className="flex flex-col items-center justify-center gap-4 text-center mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Product Catalog</h1>
        {isAdmin && (
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600/80 backdrop-blur-md border border-red-500/30 text-white rounded-xl hover:shadow-[0_8px_25px_-4px_rgba(220,38,38,0.4)] hover:-translate-y-0.5 transition-all duration-300 font-semibold shadow-sm"
              >
                <Trash2 size={18} />
                Archive Selected ({selectedIds.length})
              </button>
            )}
            <button 
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-tr from-blue-600/80 to-indigo-400/80 backdrop-blur-md border border-blue-500/30 text-white rounded-xl hover:shadow-[0_8px_25px_-4px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-300 font-semibold shadow-sm"
            >
              <Plus size={18} />
              Add Product
            </button>
          </div>
        )}
      </div>

      {/* Toolbar - Glassmorphic */}
      <div className="bg-[var(--color-bg-surface)] backdrop-blur-xl p-4 rounded-xl border border-[var(--color-border-subtle)] flex flex-col lg:flex-row gap-4 justify-between items-center shadow-sm z-40">
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={18} />
            <input 
              type="text" 
              placeholder="Search SKU or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-transparent border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
          
          <div className="w-full sm:w-64">
             <CreatableSelect
                isClearable
                placeholder="Select or Create Category..."
                value={category}
                onChange={setCategory}
                options={categories}
                styles={customSelectStyles}
                className="text-sm"
              />
          </div>
          
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
      <div 
        ref={parentRef}
        onScroll={(e) => {
          if (viewMode === 'grid' && hasMore && !isFetchingNextPage) {
            const { scrollTop, clientHeight, scrollHeight } = e.target;
            if (scrollHeight - scrollTop <= clientHeight + 100) {
              setPage(p => p + 1);
            }
          }
        }}
        className="flex-1 overflow-auto bg-[var(--color-bg-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-xl relative"
      >
        {loading && page === 1 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-[var(--color-bg-surface)] backdrop-blur-md rounded-xl">
                  <CardSkeleton />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <TableSkeleton rows={8} />
            </div>
          )
        ) : products.length === 0 ? (
          <div className="p-8"><EmptyState title="No Products Found" description="Try adjusting your search or filters." /></div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
            {products.map((product) => (
              <div key={product._id} className="relative group bg-[var(--color-bg-surface)] backdrop-blur-md rounded-xl overflow-hidden border border-[var(--color-border-subtle)] shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 flex flex-col h-full hover:-translate-y-1">
                {isAdmin && (
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(product._id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds([...selectedIds, product._id]);
                      else setSelectedIds(selectedIds.filter(id => id !== product._id));
                    }}
                    className="absolute top-4 left-4 z-20 w-5 h-5 opacity-0 group-hover:opacity-100 checked:opacity-100 cursor-pointer accent-red-500"
                  />
                )}
                <div className="h-48 w-full bg-white/5 relative overflow-hidden flex items-center justify-center p-4">
                  <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <span className="px-2 py-1 bg-black/40 backdrop-blur-md text-white text-xs rounded border border-white/10 shadow-sm">{product.category}</span>
                  </div>
                  {product.image ? (
                    <img loading="lazy" src={product.image.startsWith('http') ? product.image : `http://localhost:3000${product.image}`} alt={product.name} className="w-full h-full object-contain filter group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-30 text-[var(--color-text-secondary)]">
                      <Package size={48} className="mb-2" />
                      <span className="text-sm">No Image</span>
                    </div>
                  )}
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg text-[var(--color-text-primary)] leading-tight">{product.name}</h3>
                  </div>
                  <div className="text-sm text-[var(--color-text-secondary)] font-mono mb-4">{product.sku}</div>
                  
                  <div className="mt-auto">
                    <div className="flex items-end justify-between mb-4">
                      <div className="text-2xl font-bold text-[var(--color-primary)]">₹{product.price.toFixed(2)}</div>
                      <div className="text-right">
                        <div className="text-xs text-[var(--color-text-secondary)] mb-1">Stock Level</div>
                        <div className="flex items-center gap-2 justify-end">
                          <span className={`w-2 h-2 rounded-full ${getStockHealth(product.currentStock, product.lowStockThreshold).color}`} />
                          <span className="font-medium text-[var(--color-text-primary)]">{product.currentStock}</span>
                        </div>
                      </div>
                    </div>
                    
                    {isAdmin && (
                      <div className="flex gap-2 pt-4 border-t border-[var(--color-border-subtle)]">
                        <button onClick={() => handleOpenEdit(product)} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors">
                          <Edit2 size={16} /> Edit
                        </button>
                        <button onClick={() => handleDelete(product._id)} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isFetchingNextPage && (
              <div className="col-span-full flex justify-center py-4">
                <Loader2 className="animate-spin text-blue-500" />
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const isLoaderRow = virtualRow.index > products.length - 1;
              const product = products[virtualRow.index];

              return (
                <div
                  key={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    padding: '8px 16px', // Padding for visual spacing
                  }}
                >
                  {isLoaderRow ? (
                    <div className="flex justify-center items-center py-4">
                      {hasMore ? <Loader2 className="animate-spin text-blue-500" /> : <span className="text-sm opacity-50">End of results</span>}
                    </div>
                  ) : (
                    // Table row format
                    <div className="flex items-center w-full h-full border-b border-[var(--color-border-subtle)] hover:bg-white/5 transition-colors px-4">
                        {isAdmin && (
                          <div className="mr-4">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(product._id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedIds([...selectedIds, product._id]);
                                else setSelectedIds(selectedIds.filter(id => id !== product._id));
                              }}
                              className="w-4 h-4 cursor-pointer accent-red-500"
                            />
                          </div>
                        )}
                        <div className="flex-1 flex items-center gap-3">
                           <div className="w-10 h-10 rounded-lg bg-black/20 overflow-hidden flex items-center justify-center">
                              {product.image ? <img loading="lazy" src={product.image.startsWith('http') ? product.image : `http://localhost:3000${product.image}`} className="w-full h-full object-cover" /> : <Package size={16}/>}
                           </div>
                           <span className="font-medium truncate">{product.name}</span>
                        </div>
                        <div className="flex-1 text-sm font-mono opacity-70">{product.sku}</div>
                        <div className="flex-1 text-sm opacity-70">{product.category}</div>
                        <div className="flex-1 font-semibold">₹{product.price.toFixed(2)}</div>
                        <div className="flex-1 text-sm">{product.currentStock} in stock</div>
                        {isAdmin && (
                            <div className="flex gap-2 justify-end w-20">
                                <button onClick={() => handleOpenEdit(product)} className="p-1 hover:text-blue-500"><Edit2 size={14}/></button>
                                <button onClick={() => handleDelete(product._id)} className="p-1 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Product' : 'Add New Product'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-[var(--color-text-secondary)]">Product Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-primary)]" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-[var(--color-text-secondary)]">SKU</label>
              <input type="text" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-primary)]" required disabled={!!editingId} />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm text-[var(--color-text-secondary)]">Category</label>
              {/* Inside Modal, also use CreatableSelect */}
              <CreatableSelect
                placeholder="Create or Select..."
                value={formData.category ? { label: formData.category, value: formData.category } : null}
                onChange={(val) => setFormData({...formData, category: val ? val.value : ''})}
                options={categories}
                styles={customSelectStyles}
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-[var(--color-text-secondary)]">Price (₹)</label>
              <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-primary)]" required />
            </div>
            
            {!editingId && (
              <div className="space-y-1">
                <label className="text-sm text-[var(--color-text-secondary)]">Initial Stock</label>
                <input type="number" value={formData.initialStock} onChange={(e) => setFormData({...formData, initialStock: e.target.value})} className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-primary)]" required />
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-sm text-[var(--color-text-secondary)]">Low Stock Threshold</label>
              <input type="number" value={formData.lowStockThreshold} onChange={(e) => setFormData({...formData, lowStockThreshold: e.target.value})} className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-primary)]" required />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-[var(--color-text-secondary)]">Product Image (Optional)</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] hover:bg-white/10 rounded-lg text-sm transition-colors">
                <Upload size={16} /> Choose Image
              </button>
              <span className="text-xs text-[var(--color-text-secondary)]">{formData.image ? (formData.image.name || 'Current Image') : 'No file chosen'}</span>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files[0];
                  setFormData({...formData, image: file});
                  if (file) {
                      setImagePreview(URL.createObjectURL(file));
                  } else {
                      setImagePreview(null);
                  }
              }} />
            </div>
            {imagePreview && (
                <div className="mt-3 relative w-32 h-32 rounded-xl overflow-hidden border border-[var(--color-border-subtle)]">
                    <img src={imagePreview} className="w-full h-full object-cover" />
                </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-border-subtle)]">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 hover:bg-[var(--color-bg-base)] rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity">
              {editingId ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
