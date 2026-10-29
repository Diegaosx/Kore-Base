import React, { useState } from 'react';
import { Locale, User, UserRole, UserStatus } from '../shared/types';
import { translations } from '../shared/i18n';

interface ProfileViewProps {
  token: string;
  user: User;
  locale: Locale;
  onUserUpdated: (updated: User) => void;
  onLocaleChange: (loc: Locale) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  token,
  user,
  locale,
  onUserUpdated,
  onLocaleChange,
}) => {
  const t = translations[locale];

  const [name, setName] = useState(user.name);
  const [department, setDepartment] = useState(user.department);
  const [selectedLocale, setSelectedLocale] = useState<Locale>(user.locale || locale);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    setProfileErr(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          department,
          locale: selectedLocale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileErr(data.error || 'Failed to update profile');
      } else {
        onUserUpdated(data.user);
        onLocaleChange(selectedLocale);
        setProfileMsg(t.profile.savedFeedback);
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMsg(null);
    setPasswordErr(null);

    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordErr(data.error || 'Password update failed');
      } else {
        setCurrentPassword('');
        setNewPassword('');
        setPasswordMsg(t.profile.passwordUpdatedFeedback);
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">
        {t.profile.title}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Data Form */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-sm font-bold text-slate-900 pb-4 mb-4 border-b border-slate-200">
            {t.profile.personalDataTitle}
          </h2>

          {profileMsg && (
            <div
              role="status"
              className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800"
            >
              {profileMsg}
            </div>
          )}
          {profileErr && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-xs font-medium text-red-700"
            >
              {profileErr}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label
                htmlFor="profile-name"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t.auth.nameLabel}
              </label>
              <input
                id="profile-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t.auth.emailLabel}
              </label>
              <input
                id="profile-email"
                type="email"
                disabled
                value={user.email}
                className="w-full px-3.5 py-2 text-xs font-mono bg-slate-100 border border-slate-200 text-slate-500 rounded-md cursor-not-allowed"
              />
            </div>

            <div>
              <label
                htmlFor="profile-dept"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t.auth.departmentLabel}
              </label>
              <input
                id="profile-dept"
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="profile-locale"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t.profile.languageLabel}
              </label>
              <select
                id="profile-locale"
                value={selectedLocale}
                onChange={(e) => setSelectedLocale(e.target.value as Locale)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
              >
                <option value="pt-BR">Português (PT-BR)</option>
                <option value="es">Español (ES)</option>
                <option value="en">English (EN)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
            >
              {t.profile.saveProfileButton}
            </button>
          </form>
        </div>

        {/* Password Update & Session Metadata */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-sm font-bold text-slate-900 pb-4 mb-4 border-b border-slate-200">
              {t.profile.securityPasswordTitle}
            </h2>

            {passwordMsg && (
              <div
                role="status"
                className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800"
              >
                {passwordMsg}
              </div>
            )}
            {passwordErr && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-xs font-medium text-red-700"
              >
                {passwordErr}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label
                  htmlFor="profile-current-password"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {t.profile.currentPasswordLabel}
                </label>
                <input
                  id="profile-current-password"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-new-password"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {t.profile.newPasswordLabel}
                </label>
                <input
                  id="profile-new-password"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
              >
                {t.profile.updatePasswordButton}
              </button>
            </form>
          </div>

          {/* Account RBAC & Session Metadata */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-sm font-bold text-slate-900 pb-4 mb-4 border-b border-slate-200">
              {t.profile.sessionTokenTitle}
            </h2>

            <dl className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">{t.profile.userIdLabel}</dt>
                <dd className="font-mono text-slate-900 tabular-nums">{user.id}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">{t.profile.roleLabel}</dt>
                <dd className="font-medium text-slate-900">
                  {user.role === UserRole.ADMIN ? t.nav.roleAdmin : t.nav.roleClient}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">{t.profile.statusLabel}</dt>
                <dd className="font-medium text-emerald-700">
                  {user.status === UserStatus.ACTIVE
                    ? t.users.statusActive
                    : t.users.statusSuspended}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">{t.profile.lastLoginLabel}</dt>
                <dd className="font-mono text-slate-700 tabular-nums">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString(locale)
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};
