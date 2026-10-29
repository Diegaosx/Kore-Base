import React, { useState, useEffect } from 'react';
import { Locale, User } from '../shared/types';
import { translations } from '../shared/i18n';
import { ChevronLeft, ChevronRight, ArrowRight, Check, Copy } from 'lucide-react';

interface AuthSplitScreenProps {
  locale: Locale;
  onLocaleChange: (loc: Locale) => void;
  onAuthSuccess: (token: string, user: User) => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export const AuthSplitScreen: React.FC<AuthSplitScreenProps> = ({
  locale,
  onLocaleChange,
  onAuthSuccess,
}) => {
  const t = translations[locale];
  const [mode, setMode] = useState<AuthMode>('login');
  const [slideIndex, setSlideIndex] = useState(0);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [generatedTokenPreview, setGeneratedTokenPreview] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Auto-advance right-column slider every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const switchMode = (target: AuthMode) => {
    setMode(target);
    setErrorMsg(null);
    setInfoMsg(null);
  };

  const handleQuickFill = (role: 'admin' | 'client') => {
    setMode('login');
    setErrorMsg(null);
    setInfoMsg(null);
    if (role === 'admin') {
      setEmail('admin@kore.dev');
      setPassword('Admin@123456');
    } else {
      setEmail('cliente@kore.dev');
      setPassword('Cliente@123456');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed');
      } else {
        onAuthSuccess(data.token, data.user);
      }
    } catch {
      setErrorMsg('Network error while connecting to authentication service');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          department: department || 'Operations',
          password,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Registration failed');
      } else {
        onAuthSuccess(data.token, data.user);
      }
    } catch {
      setErrorMsg('Network error while registering account');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setGeneratedTokenPreview(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Recovery request failed');
      } else {
        setInfoMsg(t.auth.recoverySentMessage);
        if (data.devPreviewToken) {
          setGeneratedTokenPreview(data.devPreviewToken);
          setResetToken(data.devPreviewToken);
        }
      }
    } catch {
      setErrorMsg('Failed to dispatch password recovery request');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Password reset failed');
      } else {
        setPassword(newPassword);
        setGeneratedTokenPreview(null);
        setMode('login');
        setInfoMsg(t.auth.resetSuccessMessage);
      }
    } catch {
      setErrorMsg('Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const currentSlide = t.auth.slides[slideIndex] || t.auth.slides[0];

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white text-slate-900">
      {/* LEFT COLUMN: CLOUDFLARE-STYLE FORM WORKSPACE */}
      <div className="w-full lg:w-[44%] xl:w-[40%] flex flex-col justify-between px-6 sm:px-12 lg:px-14 py-8 border-b lg:border-b-0 lg:border-r border-slate-200">
        {/* Top bar: Brand + Language Selector */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-slate-900 rounded flex items-center justify-center text-white font-mono text-xs font-semibold">
              KB
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              {t.brand.name}
            </span>
          </div>

          <div
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-md"
            role="group"
            aria-label="Language selector"
          >
            {(['pt-BR', 'es', 'en'] as Locale[]).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => onLocaleChange(loc)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
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

        {/* Center Form Area */}
        <div className="w-full max-w-sm mx-auto my-10">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">
            {mode === 'login' && t.auth.signInTitle}
            {mode === 'register' && t.auth.registerTitle}
            {mode === 'forgot' && t.auth.forgotTitle}
            {mode === 'reset' && t.auth.resetTitle}
          </h1>

          {errorMsg && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-md bg-red-50 border border-red-200 text-xs font-medium text-red-700"
            >
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div
              role="status"
              className="mb-5 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800"
            >
              <p>{infoMsg}</p>
              {generatedTokenPreview && (
                <div className="mt-2 pt-2 border-t border-emerald-200 flex items-center justify-between gap-2">
                  <code className="font-mono text-[11px] text-emerald-950 truncate">
                    {generatedTokenPreview}
                  </code>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(generatedTokenPreview);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 1500);
                      }}
                      className="px-2 py-1 text-[11px] bg-white border border-emerald-300 rounded text-emerald-900 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                    >
                      {copiedToken ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>Token</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="px-2 py-1 text-[11px] bg-emerald-900 text-white rounded hover:bg-emerald-800 transition-colors"
                    >
                      Usar token
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 1: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {t.auth.emailLabel}
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth.emailPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-medium text-slate-700"
                  >
                    {t.auth.passwordLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline"
                  >
                    {t.auth.forgotPasswordLink}
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t.auth.signInButton}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Quick Demo Credentials */}
              <div className="pt-4 mt-4 border-t border-slate-200">
                <span className="block text-xs text-slate-500 mb-2">
                  {t.auth.quickAccessLabel}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin')}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-center whitespace-nowrap cursor-pointer"
                  >
                    {t.auth.quickAdminButton}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('client')}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-center whitespace-nowrap cursor-pointer"
                  >
                    {t.auth.quickClientButton}
                  </button>
                </div>
              </div>

              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-xs font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4 cursor-pointer"
                >
                  {t.auth.createAccountLink}
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {t.auth.nameLabel}
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.auth.namePlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {t.auth.emailLabel}
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth.emailPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-dept"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {t.auth.departmentLabel}
                </label>
                <input
                  id="reg-dept"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder={t.auth.departmentPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {t.auth.passwordLabel}
                </label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-md transition-colors cursor-pointer"
              >
                {t.auth.registerButton}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4 cursor-pointer"
                >
                  {t.auth.backToSignInLink}
                </button>
              </div>
            </form>
          )}

          {/* MODE 3: FORGOT PASSWORD (RESEND / SMTP) */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {t.auth.emailLabel}
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth.emailPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-md transition-colors cursor-pointer"
              >
                {t.auth.sendRecoveryButton}
              </button>

              <div className="pt-2 flex flex-col gap-2 text-center">
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-4 cursor-pointer"
                >
                  {t.auth.haveResetTokenLink}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4 cursor-pointer"
                >
                  {t.auth.backToSignInLink}
                </button>
              </div>
            </form>
          )}

          {/* MODE 4: RESET PASSWORD WITH TOKEN */}
          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="reset-token"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {t.auth.resetTokenLabel}
                </label>
                <input
                  id="reset-token"
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder={t.auth.resetTokenPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="reset-new-password"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {t.auth.newPasswordLabel}
                </label>
                <input
                  id="reset-new-password"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-md transition-colors cursor-pointer"
              >
                {t.auth.confirmResetButton}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4 cursor-pointer"
                >
                  {t.auth.backToSignInLink}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Bottom quiet copyright */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{t.brand.name}</span>
          <span className="font-mono tabular-nums">PostgreSQL · BullMQ · HS256</span>
        </div>
      </div>

      {/* RIGHT COLUMN: ARCHITECTURAL VISUAL SLIDER */}
      <div className="w-full lg:w-[56%] xl:w-[60%] bg-slate-950 text-white relative overflow-hidden flex flex-col justify-between p-8 sm:p-14 min-h-[420px] lg:min-h-screen">
        {/* Architectural SVG Canvas Artwork per Slide */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {slideIndex === 0 && (
            <svg
              className="w-full h-full object-cover opacity-80"
              viewBox="0 0 1200 900"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="1200" height="900" fill="#090D16" />
              <g stroke="#1E293B" strokeWidth="1">
                {Array.from({ length: 16 }).map((_, idx) => (
                  <line key={`v-${idx}`} x1={idx * 80} y1="0" x2={idx * 80} y2="900" />
                ))}
                {Array.from({ length: 12 }).map((_, idx) => (
                  <line key={`h-${idx}`} x1="0" y1={idx * 80} x2="1200" y2={idx * 80} />
                ))}
              </g>
              {/* Isometric Architectural Data Blocks */}
              <g transform="translate(220, 140)">
                <rect
                  x="60"
                  y="60"
                  width="640"
                  height="420"
                  rx="8"
                  fill="#0F172A"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                <rect
                  x="100"
                  y="110"
                  width="250"
                  height="140"
                  rx="4"
                  fill="#1E293B"
                  stroke="#475569"
                />
                <rect
                  x="380"
                  y="110"
                  width="280"
                  height="140"
                  rx="4"
                  fill="#1E293B"
                  stroke="#475569"
                />
                <rect
                  x="100"
                  y="280"
                  width="560"
                  height="160"
                  rx="4"
                  fill="#111827"
                  stroke="#334155"
                />
                <path
                  d="M130 390 L210 350 L290 365 L380 320 L470 335 L550 295 L630 305"
                  stroke="#38BDF8"
                  strokeWidth="3"
                  fill="none"
                />
                <circle cx="380" cy="320" r="5" fill="#38BDF8" />
                <circle cx="550" cy="295" r="5" fill="#38BDF8" />
              </g>
            </svg>
          )}

          {slideIndex === 1 && (
            <svg
              className="w-full h-full object-cover opacity-80"
              viewBox="0 0 1200 900"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="1200" height="900" fill="#090D16" />
              <g stroke="#1E293B" strokeWidth="1">
                {Array.from({ length: 15 }).map((_, idx) => (
                  <circle
                    key={`c-${idx}`}
                    cx="600"
                    cy="420"
                    r={(idx + 1) * 48}
                    strokeOpacity={0.55 - idx * 0.03}
                  />
                ))}
              </g>
              <rect
                x="350"
                y="220"
                width="500"
                height="360"
                rx="10"
                fill="#0F172A"
                stroke="#475569"
                strokeWidth="1.5"
              />
              <line x1="350" y1="290" x2="850" y2="290" stroke="#334155" strokeWidth="1.5" />
              <rect x="390" y="330" width="420" height="36" rx="4" fill="#1E293B" />
              <rect x="390" y="390" width="320" height="36" rx="4" fill="#1E293B" />
              <rect x="390" y="450" width="380" height="36" rx="4" fill="#1E293B" />
              <path
                d="M730 400 L755 425 L805 375"
                stroke="#34D399"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}

          {slideIndex === 2 && (
            <svg
              className="w-full h-full object-cover opacity-80"
              viewBox="0 0 1200 900"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="1200" height="900" fill="#090D16" />
              <g stroke="#1E293B" strokeWidth="1">
                <line x1="180" y1="0" x2="180" y2="900" />
                <line x1="600" y1="0" x2="600" y2="900" />
                <line x1="1020" y1="0" x2="1020" y2="900" />
                <line x1="0" y1="250" x2="1200" y2="250" />
                <line x1="0" y1="550" x2="1200" y2="550" />
              </g>
              <rect
                x="180"
                y="200"
                width="240"
                height="160"
                rx="6"
                fill="#0F172A"
                stroke="#475569"
              />
              <rect
                x="480"
                y="160"
                width="240"
                height="240"
                rx="6"
                fill="#1E293B"
                stroke="#94A3B8"
              />
              <rect
                x="780"
                y="200"
                width="240"
                height="160"
                rx="6"
                fill="#0F172A"
                stroke="#475569"
              />
              <line x1="420" y1="280" x2="480" y2="280" stroke="#94A3B8" strokeWidth="2" />
              <line x1="720" y1="280" x2="780" y2="280" stroke="#94A3B8" strokeWidth="2" />
            </svg>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
        </div>

        {/* Top Slide Counter */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            0{slideIndex + 1} / 03
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => setSlideIndex((prev) => (prev - 1 + 3) % 3)}
              className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900/80 hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => setSlideIndex((prev) => (prev + 1) % 3)}
              className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900/80 hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Slide Caption & Controls */}
        <div className="relative z-10 max-w-xl mt-auto">
          <div className="mb-6 pb-6 border-b border-slate-800/80">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
              {currentSlide.title}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {currentSlide.description}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>{currentSlide.metricLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono font-semibold text-white tabular-nums">
                {currentSlide.metricValue}
              </span>
            </div>

            <div className="flex items-center gap-2" role="tablist" aria-label="Slides">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={slideIndex === idx}
                  aria-label={`Slide ${idx + 1}`}
                  onClick={() => setSlideIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    slideIndex === idx ? 'w-8 bg-white' : 'w-2 bg-slate-700 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
