import api from './api';

export const userApi = {
  getUsers: async (params) => {
    const res = await api.get('/users', { params });
    return res.data;
  },
  createUser: async (userData) => {
    const res = await api.post('/users', userData);
    return res.data;
  },
  updateUserRole: async (id, role) => {
    const res = await api.put(`/users/${id}/role`, { role });
    return res.data;
  },
  updateUser: async (id, userData) => {
    const res = await api.put(`/users/${id}`, userData);
    return res.data;
  },
  deleteUser: async (id) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },
  deleteBulkUsers: async (ids) => {
    // Assuming backend was using DELETE / or POST /bulk-delete, let's keep it aligned with what was there or what works:
    // Our updated route is DELETE /api/users
    const res = await api.delete('/users', { data: { ids } });
    return res.data;
  },
  getAllowedEmails: async () => {
    const res = await api.get('/users/allowlist/emails');
    return res.data;
  },
  addAllowedEmailsBulk: async (emails) => {
    const res = await api.post('/users/allowlist/bulk', { emails });
    return res.data;
  },
  deleteAllowedEmail: async (id) => {
    const res = await api.delete(`/users/allowlist/${id}`);
    return res.data;
  }
};
