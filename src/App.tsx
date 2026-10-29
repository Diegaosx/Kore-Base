/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Locale, User, UserRole } from './shared/types';
import { translations } from './shared/i18n';
import { AuthSplitScreen } from './components/AuthSplitScreen';
import { DashboardView } from './components/DashboardView';
import { UsersManagementView } from './components/UsersManagementView';
import { ProfileView } from './components/ProfileView';
import { LayoutDashboard, Users, UserCircle, LogOut } from 'lucide-react';

type ActiveTab = 'dashboard' | 'users' | 'profile';

export default function App() {
  const [locale, setLocale] = useState<Locale>('pt-BR');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const t = translations[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const handleAuthSuccess = (newToken: string, loggedUser: User) => {
    setToken(newToken);
    setUser(loggedUser);
    if (loggedUser.locale) {
      setLocale(loggedUser.locale);
    }
    setActiveTab('dashboard');
  };

  const handleSignOut = () => {
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
  };

  if (!token || !user) {
    return (
      <AuthSplitScreen
        locale={locale}
        onLocaleChange={setLocale}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  const isAdmin = user.role === UserRole.ADMIN;
  const effectiveTab: ActiveTab = !isAdmin && activeTab === 'users' ? 'dashboard' : activeTab;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-900">
      {/* SIDEBAR NAVIGATION (240px Desktop) */}
      <aside className="w-full lg:w-60 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Header */}
          <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center text-white font-mono text-[11px] font-semibold">
                KB
              </div>
              <span className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap">
                {t.brand.name}
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              {t.brand.version}
            </span>
          </div>

          {/* Role-Gated Navigation Links */}
          <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto" aria-label="Main navigation">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                effectiveTab === 'dashboard'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>{t.nav.dashboard}</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  effectiveTab === 'users'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>{t.nav.users}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                effectiveTab === 'profile'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UserCircle className="w-4 h-4 shrink-0" />
              <span>{t.nav.profile}</span>
            </button>
          </nav>
        </div>

        {/* Bottom User Identity Footer (Desktop) */}
        <div className="hidden lg:block p-4 border-t border-slate-200 space-y-3">
          <div className="text-xs">
            <div className="font-semibold text-slate-900 truncate">{user.name}</div>
            <div className="font-mono text-[11px] text-slate-500 truncate">{user.email}</div>
            <div className="mt-1 text-[11px] text-slate-500">
              {isAdmin ? t.nav.roleAdmin : t.nav.roleClient} · {user.department}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.nav.signOut}</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4">
          {/* Contextual Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap overflow-hidden">
            <span className="font-medium text-slate-800">{t.brand.name}</span>
            <span aria-hidden="true">/</span>
            <span className="text-slate-600">
              {effectiveTab === 'dashboard' && t.nav.dashboard}
              {effectiveTab === 'users' && t.nav.users}
              {effectiveTab === 'profile' && t.nav.profile}
            </span>
          </div>

          {/* Right Controls: Language Switcher + Mobile Sign Out */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-md"
              role="group"
              aria-label="Language selector"
            >
              {(['pt-BR', 'es', 'en'] as Locale[]).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocale(loc)}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    locale === loc
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {loc === 'pt-BR' ? 'PT-BR' : loc.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="lg:hidden px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.nav.signOut}
            </button>
          </div>
        </header>

        {/* Active View Content */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {effectiveTab === 'dashboard' && (
            <DashboardView token={token} user={user} locale={locale} />
          )}
          {effectiveTab === 'users' && isAdmin && (
            <UsersManagementView token={token} currentUser={user} locale={locale} />
          )}
          {effectiveTab === 'profile' && (
            <ProfileView
              token={token}
              user={user}
              locale={locale}
              onUserUpdated={setUser}
              onLocaleChange={setLocale}
            />
          )}
        </main>
      </div>
    </div>
  );
}
