import React, { useState, useEffect, useCallback } from 'react';
import { Locale, User, UserRole, UserStatus } from '../shared/types';
import { translations } from '../shared/i18n';
import { Plus, Search, X } from 'lucide-react';

interface UsersManagementViewProps {
  token: string;
  currentUser: User;
  locale: Locale;
}

export const UsersManagementView: React.FC<UsersManagementViewProps> = ({
  token,
  currentUser,
  locale,
}) => {
  const t = translations[locale];
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formRole, setFormRole] = useState<UserRole>(UserRole.CLIENT);
  const [formStatus, setFormStatus] = useState<UserStatus>(UserStatus.ACTIVE);
  const [formPassword, setFormPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormDepartment('Operations');
    setFormRole(UserRole.CLIENT);
    setFormStatus(UserStatus.ACTIVE);
    setFormPassword('Cliente@123456');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (target: User) => {
    setEditingUser(target);
    setFormName(target.name);
    setFormEmail(target.email);
    setFormDepartment(target.department);
    setFormRole(target.role);
    setFormStatus(target.status);
    setFormPassword('');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PATCH' : 'POST';
      const payload: Record<string, string> = {
        name: formName,
        email: formEmail,
        department: formDepartment,
        role: formRole,
        status: formStatus,
      };
      if (formPassword.trim().length >= 6) {
        payload.password = formPassword.trim();
      }

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Operation failed');
      } else {
        setModalOpen(false);
        fetchUsers();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (target: User) => {
    if (target.id === currentUser.id) return;
    setErrorMsg(null);
    const res = await fetch(`/api/users/${target.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      fetchUsers();
    } else {
      const data = await res.json();
      setErrorMsg(data.error || 'Could not delete user');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          {t.users.title}
        </h1>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-colors flex items-center gap-2 self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.users.newUserButton}</span>
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-3 rounded-md bg-red-50 border border-red-200 text-xs font-medium text-red-700"
        >
          {errorMsg}
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-lg">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            aria-label={t.users.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.users.searchPlaceholder}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md self-start sm:self-auto">
          {(['all', UserRole.ADMIN, UserRole.CLIENT] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                roleFilter === r
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r === 'all' && t.users.filterAllRoles}
              {r === UserRole.ADMIN && t.nav.roleAdmin}
              {r === UserRole.CLIENT && t.nav.roleClient}
            </button>
          ))}
        </div>
      </div>

      {/* High-Density Users Data Grid */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">{t.users.colName}</th>
                <th className="py-3 px-4">{t.users.colEmail}</th>
                <th className="py-3 px-4">{t.users.colRole}</th>
                <th className="py-3 px-4">{t.users.colDepartment}</th>
                <th className="py-3 px-4">{t.users.colStatus}</th>
                <th className="py-3 px-4">{t.users.colLastLogin}</th>
                <th className="py-3 px-4 text-right">{t.users.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    ...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    {t.users.emptyState}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {u.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {u.email}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {u.role === UserRole.ADMIN ? t.nav.roleAdmin : t.nav.roleClient}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {u.department}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium">
                      <span
                        className={
                          u.status === UserStatus.ACTIVE
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }
                      >
                        {u.status === UserStatus.ACTIVE
                          ? t.users.statusActive
                          : t.users.statusSuspended}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleDateString(locale)
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          aria-label={`${t.users.editButton} ${u.name}`}
                          onClick={() => openEditModal(u)}
                          className="text-xs font-medium text-slate-700 hover:text-slate-900 underline-offset-4 hover:underline cursor-pointer"
                        >
                          {t.users.editButton}
                        </button>
                        {u.id !== currentUser.id && (
                          <button
                            type="button"
                            aria-label={`${t.users.deleteButton} ${u.name}`}
                            onClick={() => handleDeleteUser(u)}
                            className="text-xs font-medium text-red-600 hover:text-red-800 underline-offset-4 hover:underline cursor-pointer"
                          >
                            {t.users.deleteButton}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit User Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 id="user-modal-title" className="text-base font-bold text-slate-900">
                {editingUser ? t.users.modalEditTitle : t.users.modalCreateTitle}
              </h2>
              <button
                type="button"
                aria-label={t.users.cancelButton}
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label
                  htmlFor="modal-user-name"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {t.users.colName}
                </label>
                <input
                  id="modal-user-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="modal-user-email"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {t.users.colEmail}
                </label>
                <input
                  id="modal-user-email"
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="modal-user-dept"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {t.users.colDepartment}
                </label>
                <input
                  id="modal-user-dept"
                  type="text"
                  required
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="modal-user-role"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    {t.users.colRole}
                  </label>
                  <select
                    id="modal-user-role"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                  >
                    <option value={UserRole.CLIENT}>{t.nav.roleClient}</option>
                    <option value={UserRole.ADMIN}>{t.nav.roleAdmin}</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="modal-user-status"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    {t.users.colStatus}
                  </label>
                  <select
                    id="modal-user-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as UserStatus)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                  >
                    <option value={UserStatus.ACTIVE}>{t.users.statusActive}</option>
                    <option value={UserStatus.SUSPENDED}>{t.users.statusSuspended}</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="modal-user-password"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {t.auth.passwordLabel} {editingUser ? '(opcional)' : ''}
                </label>
                <input
                  id="modal-user-password"
                  type="password"
                  required={!editingUser}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingUser ? 'Manter senha atual' : 'Mín. 6 caracteres'}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  {t.users.cancelButton}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer"
                >
                  {t.users.saveButton}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
