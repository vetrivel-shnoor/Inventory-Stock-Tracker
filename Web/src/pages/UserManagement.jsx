import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Trash2, Edit2, UserPlus, User, Loader2, ListPlus } from 'lucide-react';
import { userApi } from '../services/userApi';
import { Modal } from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { useVirtualizer } from '@tanstack/react-virtual';

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Infinite Scroll State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ fullname: '', email: '', password: '', role: 'user' });
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'allowlist'
  
  // Allowlist State
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [allowlistInput, setAllowlistInput] = useState('');
  const [loadingAllowlist, setLoadingAllowlist] = useState(false);

  const parentRef = useRef(null);

  const fetchUsers = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    else setIsFetchingNextPage(true);

    try {
      const response = await userApi.getUsers({ page: pageNum, limit: 20 });
      if (pageNum === 1) {
        setUsers(response.data);
      } else {
        setUsers(prev => [...prev, ...response.data]);
      }
      setHasMore(pageNum < response.totalPages);
    } catch (err) {
      toast.error('Failed to load users', { id: 'fetch-users-error' });
    } finally {
      setLoading(false);
      setIsFetchingNextPage(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page);
  }, [page, fetchUsers]);

  const fetchAllowlist = async () => {
    setLoadingAllowlist(true);
    try {
      const data = await userApi.getAllowedEmails();
      setAllowedEmails(data || []);
    } catch (err) {
      toast.error('Failed to load allowed emails');
    } finally {
      setLoadingAllowlist(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'allowlist') {
      fetchAllowlist();
    }
  }, [activeTab]);

  const rowVirtualizer = useVirtualizer({
    count: hasMore ? users.length + 1 : users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated row height
    overscan: 5,
  });

  useEffect(() => {
    const [lastItem] = rowVirtualizer.getVirtualItems().slice(-1);
    if (
      lastItem &&
      lastItem.index >= users.length - 1 &&
      hasMore &&
      !isFetchingNextPage
    ) {
      setPage(prev => prev + 1);
    }
  }, [rowVirtualizer.getVirtualItems(), hasMore, isFetchingNextPage, users.length]);


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

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} users?`)) return;
    try {
      await userApi.deleteBulkUsers(selectedIds);
      setUsers(users.filter(u => !selectedIds.includes(u._id)));
      setSelectedIds([]);
      toast.success('Users deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete users');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        
        const updatedUser = await userApi.updateUser(editingId, updateData);
        setUsers(users.map(u => u._id === editingId ? updatedUser : u));
        toast.success('User updated successfully');
      } else {
        const newUser = await userApi.createUser(formData);
        setUsers([newUser, ...users]);
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
    const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/api\/?$/, "");
    return `${API_BASE_URL}${path}`;
  };

  const handleBulkAddEmails = async (e) => {
    e.preventDefault();
    if (!allowlistInput.trim()) return toast.error('Please enter at least one email');
    
    try {
      const res = await userApi.addAllowedEmailsBulk(allowlistInput);
      toast.success(res.message || 'Emails added to allowlist');
      setAllowlistInput('');
      fetchAllowlist();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add emails');
    }
  };

  const handleDeleteAllowedEmail = async (id) => {
    if (!window.confirm('Are you sure you want to remove this email from the allowlist?')) return;
    try {
      await userApi.deleteAllowedEmail(id);
      setAllowedEmails(allowedEmails.filter(e => e._id !== id));
      toast.success('Email removed from allowlist');
    } catch (err) {
      toast.error('Failed to remove email');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Shield className="text-[var(--color-primary)]" />
            User Management
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm">Manage system access and roles</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/80 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md"
            >
              <Trash2 size={18} />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity shadow-md"
          >
            <UserPlus size={18} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border-subtle)] gap-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 font-medium transition-colors relative ${activeTab === 'users' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
        >
          Users
          {activeTab === 'users' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-primary)] rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('allowlist')}
          className={`pb-3 font-medium transition-colors relative ${activeTab === 'allowlist' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
        >
          Access Control (Allowlist)
          {activeTab === 'allowlist' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-primary)] rounded-t-full" />}
        </button>
      </div>

      <div className="bg-[var(--color-bg-surface)] backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
        
        {activeTab === 'users' ? (
          <>
            {/* Table Header */}
        <div className="bg-white/10 dark:bg-black/10 border-b border-[var(--color-border-subtle)] backdrop-blur-sm text-[var(--color-text-secondary)] text-sm flex px-4">
          <div className="p-4 font-medium flex-[2]">User</div>
          <div className="p-4 font-medium flex-1">Role</div>
          <div className="p-4 font-medium flex-1">Joined</div>
          <div className="p-4 font-medium flex-1 text-right">Actions</div>
        </div>

        {/* Virtualized Table Body */}
        <div ref={parentRef} className="flex-1 overflow-auto relative">
          {loading && page === 1 ? (
             <div className="p-8 text-center text-[var(--color-text-secondary)]">Loading users...</div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const isLoaderRow = virtualRow.index > users.length - 1;
                const u = users[virtualRow.index];

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
                    }}
                    className="border-b border-[var(--color-border-subtle)] hover:bg-white/20 dark:hover:bg-white/5 transition-colors group flex items-center px-4"
                  >
                    {isLoaderRow ? (
                      <div className="w-full flex justify-center items-center py-4">
                        {hasMore ? <Loader2 className="animate-spin text-[var(--color-primary)]" /> : <span className="text-sm opacity-50">End of users</span>}
                      </div>
                    ) : (
                      <>
                        <div className="p-4 flex-[2] flex items-center gap-3">
                          {u.role !== 'superadmin' && (
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(u._id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedIds([...selectedIds, u._id]);
                                else setSelectedIds(selectedIds.filter(id => id !== u._id));
                              }}
                              className="w-4 h-4 cursor-pointer accent-red-500 mr-2 shrink-0"
                            />
                          )}
                          <div className="w-10 h-10 rounded-full bg-white/10 dark:bg-black/20 border border-[var(--color-border-subtle)] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {u.profilePicture ? (
                              <img loading="lazy" src={getImageUrl(u.profilePicture)} alt={u.fullname} className="w-full h-full object-cover" />
                            ) : (
                              <User size={20} className="text-[var(--color-text-secondary)]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-[var(--color-text-primary)] truncate">{u.fullname}</div>
                            <div className="text-xs text-[var(--color-text-secondary)] truncate">{u.email}</div>
                          </div>
                        </div>
                        <div className="p-4 flex-1">
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
                        </div>
                        <div className="p-4 flex-1 text-[var(--color-text-secondary)] text-sm truncate">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </div>
                        <div className="p-4 flex-1 flex justify-end gap-2">
                          {u.role !== 'superadmin' && (
                            <>
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
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
          </>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-[var(--color-border-subtle)] bg-white/5 dark:bg-black/5">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Shield size={20} className="text-[var(--color-primary)]" />
                Bulk Import Authorized Emails
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                Enter comma or newline-separated emails. Only users whose emails are listed here (or who are system superadmins) will be able to sign up or log in.
              </p>
              
              <form onSubmit={handleBulkAddEmails} className="flex flex-col gap-3">
                <textarea
                  value={allowlistInput}
                  onChange={(e) => setAllowlistInput(e.target.value)}
                  placeholder="user1@example.com, user2@example.com&#10;user3@example.com"
                  className="w-full h-32 px-4 py-3 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white font-medium rounded-lg hover:opacity-90 transition-opacity shadow-sm"
                  >
                    <ListPlus size={18} />
                    Add Emails
                  </button>
                </div>
              </form>
            </div>
            
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white/10 dark:bg-black/10 backdrop-blur-sm sticky top-0 z-10">
                  <tr className="text-[var(--color-text-secondary)] text-sm border-b border-[var(--color-border-subtle)]">
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Added By</th>
                    <th className="p-4 font-medium">Date Added</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingAllowlist ? (
                    <tr><td colSpan="4" className="p-8 text-center text-[var(--color-text-secondary)]">Loading allowlist...</td></tr>
                  ) : allowedEmails.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-[var(--color-text-secondary)]">No emails in allowlist yet. System is open to all or restricted by ENV.</td></tr>
                  ) : (
                    allowedEmails.map(item => (
                      <tr key={item._id} className="border-b border-[var(--color-border-subtle)] hover:bg-white/10 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4 font-medium">{item.email}</td>
                        <td className="p-4 text-sm text-[var(--color-text-secondary)]">
                          {item.addedBy ? item.addedBy.fullname : 'System'}
                        </td>
                        <td className="p-4 text-sm text-[var(--color-text-secondary)]">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteAllowedEmail(item._id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors inline-block"
                            title="Remove from Allowlist"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
            <button type="submit" className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity font-medium shadow-md">
              {editingId ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
