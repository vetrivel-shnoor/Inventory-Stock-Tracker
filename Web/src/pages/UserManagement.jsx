import React, { useState, useEffect } from 'react';
import { Shield, Trash2, Edit2, UserPlus, User } from 'lucide-react';
import { userApi } from '../services/userApi';
import { Modal } from '../components/ui/Modal';
import toast from 'react-hot-toast';

/**
 * UserManagement Component
 * 
 * Provides a dashboard for superadmins to manage users.
 * Allows creating, updating details/roles, and deleting users.
 * Uses a unified glassmorphic design system.
 */
export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ fullname: '', email: '', password: '', role: 'user' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await userApi.getUsers();
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (id, currentRole, newRole) => {
    if (currentRole === 'superadmin') return toast.error('Cannot modify superadmin role');
    try {
      await userApi.updateUserRole(id, newRole);
      setUsers(users.map(u => u._id === id ? { ...u, role: newRole } : u));
      toast.success('User role updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await userApi.deleteUser(id);
      setUsers(users.filter(u => u._id !== id));
      toast.success('User deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Only send password if it's not empty
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        
        const updatedUser = await userApi.updateUser(editingId, updateData);
        setUsers(users.map(u => u._id === editingId ? updatedUser : u));
        toast.success('User updated successfully');
      } else {
        const newUser = await userApi.createUser(formData);
        setUsers([...users, newUser]);
        toast.success('User created successfully');
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ fullname: '', email: '', password: '', role: 'user' });
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${editingId ? 'update' : 'create'} user`);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ fullname: '', email: '', password: '', role: 'user' });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingId(user._id);
    setFormData({ fullname: user.fullname, email: user.email, password: '', role: user.role });
    setIsModalOpen(true);
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `http://localhost:3000${path}`;
  };

  if (loading) return <div className="p-8 text-center text-[var(--color-text-secondary)]">Loading users...</div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Shield className="text-[var(--color-primary)]" />
            User Management
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm">Manage system access and roles</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors shadow-md"
        >
          <UserPlus size={18} />
          <span>Add User</span>
        </button>
      </div>

      <div className="bg-[var(--color-bg-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/10 dark:bg-black/10 border-b border-[var(--color-border-subtle)] backdrop-blur-sm text-[var(--color-text-secondary)] text-sm">
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Joined</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b border-[var(--color-border-subtle)] hover:bg-white/20 dark:hover:bg-white/5 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 dark:bg-black/20 border border-[var(--color-border-subtle)] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {u.profilePicture ? (
                          <img src={getImageUrl(u.profilePicture)} alt={u.fullname} className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} className="text-[var(--color-text-secondary)]" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-[var(--color-text-primary)]">{u.fullname}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {u.role === 'superadmin' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                        Superadmin
                      </span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, u.role, e.target.value)}
                        className="bg-transparent backdrop-blur-md border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block p-2 hover:bg-white/10 transition-colors"
                      >
                        <option value="user" className="bg-[var(--color-bg-base)]">User</option>
                        <option value="admin" className="bg-[var(--color-bg-base)]">Admin</option>
                      </select>
                    )}
                  </td>
                  <td className="p-4 text-[var(--color-text-secondary)] text-sm">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    {u.role !== 'superadmin' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(u._id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit User" : "Add New User"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Full Name</label>
            <input required type="text" value={formData.fullname} onChange={(e) => setFormData({...formData, fullname: e.target.value})} className="w-full p-3 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Email</label>
            <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-3 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="john@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Password {editingId && <span className="font-normal text-xs">(Leave blank to keep unchanged)</span>}
            </label>
            <input required={!editingId} type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full p-3 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors" placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Role</label>
            <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full p-3 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors appearance-none">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)] rounded-lg transition-colors font-medium">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium shadow-md">
              {editingId ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
