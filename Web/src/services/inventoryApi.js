import api from './api';

export const inventoryApi = {
  // Products
  getProducts: async (params) => {
    const res = await api.get('/products', { params });
    return res.data;
  },
  getProductById: async (id) => {
    const res = await api.get(`/products/${id}`);
    return res.data;
  },
  createProduct: async (productData) => {
    const res = await api.post('/products', productData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  updateProduct: async (id, productData) => {
    const res = await api.put(`/products/${id}`, productData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  deleteProduct: async (id) => {
    const res = await api.delete(`/products/${id}`);
    return res.data;
  },

  // Transactions
  getTransactions: async (params) => {
    const res = await api.get('/transactions', { params });
    return res.data;
  },
  createTransaction: async (transactionData) => {
    const res = await api.post('/transactions', transactionData);
    return res.data;
  },

  // Dashboard
  getStats: async () => {
    const res = await api.get('/dashboard/stats');
    return res.data;
  }
};
