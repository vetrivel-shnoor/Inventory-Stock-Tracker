import api from './api';

export const userApi = {
  getUsers: async () => {
    const res = await api.get('/users');
    return res.data;
  },
  createUser: async (userData) => {
    const res = await api.post('/users', userData);
    return res.data;
  },
  updateUserRole: async (id, role) => {
    const res = await api.put(`/users/${id}`, { role });
    return res.data;
  },
  deleteUser: async (id) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  }
};
