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
import { LayoutDashboard, Users, UserCircle, LogOut, Menu, X } from 'lucide-react';

type ActiveTab = 'dashboard' | 'users' | 'profile';

export default function App() {
  const [locale, setLocale] = useState<Locale>('pt-BR');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    setMobileMenuOpen(false);
  };

  const handleSignOut = () => {
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
    setMobileMenuOpen(false);
  };

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
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

  const renderNavigationLinks = () => (
    <>
      <button
        type="button"
        onClick={() => handleSelectTab('dashboard')}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
          onClick={() => handleSelectTab('users')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
        onClick={() => handleSelectTab('profile')}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          effectiveTab === 'profile'
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <UserCircle className="w-4 h-4 shrink-0" />
        <span>{t.nav.profile}</span>
      </button>
    </>
  );

  const renderSidebarFooter = () => (
    <div className="shrink-0 p-4 border-t border-slate-200 bg-white space-y-3">
      <div className="text-xs">
        <div className="font-semibold text-slate-900 truncate">{user.name}</div>
        <div className="font-mono text-[11px] text-slate-500 truncate">{user.email}</div>
        <div className="mt-1 text-[11px] text-slate-500 truncate">
          {isAdmin ? t.nav.roleAdmin : t.nav.roleClient} · {user.department}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        className="w-full px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5 shrink-0" />
        <span>{t.nav.signOut}</span>
      </button>
    </div>
  );

  return (
    <div className="h-dvh w-full overflow-hidden flex bg-slate-50 text-slate-900">
      {/* DESKTOP FIXED FULL-HEIGHT SIDEBAR (240px) */}
      <aside className="hidden lg:flex lg:flex-col lg:justify-between lg:w-60 lg:h-dvh bg-white border-r border-slate-200 shrink-0">
        {/* Top Brand Header */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
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

        {/* Scrollable Middle Navigation */}
        <nav
          className="flex-1 overflow-y-auto p-3 flex flex-col gap-1"
          aria-label="Main navigation"
        >
          {renderNavigationLinks()}
        </nav>

        {/* Pinned Bottom User Profile & Sign Out Footer */}
        {renderSidebarFooter()}
      </aside>

      {/* MOBILE SLIDE-OVER SIDEBAR & BACKDROP OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px] transition-opacity"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Lateral Sidebar Panel (100% Screen Height, Fixed Bottom Profile/Logout) */}
          <aside
            className="relative z-10 w-64 max-w-[80vw] h-dvh bg-white border-r border-slate-200 flex flex-col justify-between shadow-xl"
            aria-label="Mobile navigation"
          >
            {/* Mobile Drawer Top Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center text-white font-mono text-[11px] font-semibold">
                  KB
                </div>
                <span className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap">
                  {t.brand.name}
                </span>
              </div>

              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Drawer Navigation Links */}
            <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
              {renderNavigationLinks()}
            </nav>

            {/* Mobile Drawer Pinned Bottom User Profile & Sign Out */}
            {renderSidebarFooter()}
          </aside>
        </div>
      )}

      {/* RIGHT COLUMN: FIXED HEADER + INDEPENDENTLY SCROLLABLE MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 h-dvh overflow-hidden">
        {/* Fixed Top Header Bar */}
        <header className="h-14 shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 z-30">
          {/* Left: Mobile Menu Trigger + Contextual Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap overflow-hidden">
              <span className="font-medium text-slate-800">{t.brand.name}</span>
              <span aria-hidden="true">/</span>
              <span className="text-slate-600 truncate">
                {effectiveTab === 'dashboard' && t.nav.dashboard}
                {effectiveTab === 'users' && t.nav.users}
                {effectiveTab === 'profile' && t.nav.profile}
              </span>
            </div>
          </div>

          {/* Right Controls: Language Switcher */}
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
          </div>
        </header>

        {/* Scrollable Active View Content */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="max-w-7xl w-full mx-auto">
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
          </div>
        </main>
      </div>
    </div>
  );
}
