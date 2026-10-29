import React, { useState, useEffect, useCallback } from 'react';
import {
  Locale,
  User,
  UserRole,
  DashboardSummary,
  AuditLog,
  InfrastructureStatus,
  QueueJobRecord,
  LLMProviderId,
} from '../shared/types';
import { translations } from '../shared/i18n';
import { Search, Play, RefreshCw } from 'lucide-react';

interface DashboardViewProps {
  token: string;
  user: User;
  locale: Locale;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ token, user, locale }) => {
  const t = translations[locale];
  const isAdmin = user.role === UserRole.ADMIN;

  const [days, setDays] = useState<7 | 14 | 30>(14);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Admin-only state: Audit Logs & Infrastructure / LLMs / BullMQ
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logCategory, setLogCategory] = useState<string>('all');
  const [logSearch, setLogSearch] = useState<string>('');
  const [infra, setInfra] = useState<InfrastructureStatus | null>(null);
  const [recentJobs, setRecentJobs] = useState<QueueJobRecord[]>([]);

  // Interactive LLM & Queue testing state (Admin)
  const [selectedProvider, setSelectedProvider] = useState<LLMProviderId>('gemini');
  const [llmPrompt, setLlmPrompt] = useState<string>(
    'Summarize system security posture in one sentence.'
  );
  const [llmOutput, setLlmOutput] = useState<{
    provider: string;
    model: string;
    output: string;
    latencyMs: number;
  } | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetch(`/api/dashboard/metrics?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as DashboardSummary;
        setSummary(data);
      }
    } finally {
      setLoadingMetrics(false);
    }
  }, [token, days]);

  const fetchAdminData = useCallback(async () => {
    if (!isAdmin) return;
    const [logsRes, infraRes] = await Promise.all([
      fetch(
        `/api/logs?category=${encodeURIComponent(logCategory)}&search=${encodeURIComponent(logSearch)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
      fetch('/api/infra/status', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (logsRes.ok) {
      const logsData = await logsRes.json();
      setLogs(logsData.logs || []);
    }
    if (infraRes.ok) {
      const infraData = await infraRes.json();
      setInfra(infraData.status || null);
      setRecentJobs(infraData.recentJobs || []);
    }
  }, [isAdmin, token, logCategory, logSearch]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleEnqueueJob = async () => {
    setActionBanner(null);
    const res = await fetch('/api/infra/queue/job', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queueName: 'audit-sync',
        name: 'sync-metrics-snapshot',
        payload: { rangeDays: days, initiatedBy: user.email },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setActionBanner(`Job ${data.job.id} (${data.job.queueName}) processado no BullMQ.`);
      fetchAdminData();
      fetchMetrics();
    }
  };

  const handleSimulateWebhook = async () => {
    setActionBanner(null);
    const res = await fetch('/api/infra/webhook/simulate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event: 'security.audit.verified' }),
    });
    if (res.ok) {
      const data = await res.json();
      setActionBanner(
        `Webhook HMAC-SHA256 validado (${data.signature.slice(0, 18)}...) e filtro de upload PDF verificado.`
      );
      fetchAdminData();
      fetchMetrics();
    }
  };

  const handleExecuteLlm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!llmPrompt.trim()) return;
    setLlmLoading(true);
    try {
      const res = await fetch('/api/infra/llm/execute', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: selectedProvider,
          prompt: llmPrompt,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLlmOutput(data.result);
        fetchAdminData();
        fetchMetrics();
      }
    } finally {
      setLlmLoading(false);
    }
  };

  const series = summary?.series || [];

  // Helper to build SVG polyline points
  const buildPolyline = (values: number[], width: number, height: number, pad = 20) => {
    if (values.length === 0) return { line: '', area: '' };
    const min = 0;
    const max = Math.max(...values, 10);
    const usableW = width - pad * 2;
    const usableH = height - pad * 2;

    const pts = values.map((val, idx) => {
      const x =
        values.length === 1 ? width / 2 : pad + (idx / (values.length - 1)) * usableW;
      const y = pad + usableH - ((val - min) / (max - min || 1)) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const firstX = pad.toFixed(1);
    const lastX = (pad + usableW).toFixed(1);
    const baseY = (pad + usableH).toFixed(1);

    return {
      line: pts.join(' '),
      area: `${firstX},${baseY} ${pts.join(' ')} ${lastX},${baseY}`,
    };
  };

  const usersChart = buildPolyline(
    series.map((s) => s.usersCount),
    560,
    200
  );
  const actionsChart = buildPolyline(
    series.map((s) => s.actionsCount),
    1140,
    210
  );
  const maxLogins = Math.max(...series.map((s) => s.loginsCount), 10);

  return (
    <div className="space-y-8">
      {/* Top Row: Clean Title + Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          {t.dashboard.title}
        </h1>

        <div
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-md self-start sm:self-auto"
          role="group"
          aria-label="Time range"
        >
          {([7, 14, 30] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                days === d
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {d === 7 && t.dashboard.range7d}
              {d === 14 && t.dashboard.range14d}
              {d === 30 && t.dashboard.range30d}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Strip (Single Elevation, Tabular Numerals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500 mb-2">
            {t.dashboard.metricUsers}
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {loadingMetrics ? '...' : summary?.totals.totalUsers ?? 0}
            </span>
            <span className="text-xs font-mono tabular-nums text-emerald-700">
              +{summary?.totals.usersDeltaPct ?? 14.2}%
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500 mb-2">
            {t.dashboard.metricActiveUsers}
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {loadingMetrics ? '...' : summary?.totals.activeUsers ?? 0}
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              RBAC
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500 mb-2">
            {t.dashboard.metricLogins}
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {loadingMetrics ? '...' : summary?.totals.loginsLast30d ?? 0}
            </span>
            <span className="text-xs font-mono tabular-nums text-emerald-700">
              +{summary?.totals.loginsDeltaPct ?? 18.6}%
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500 mb-2">
            {t.dashboard.metricActions}
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {loadingMetrics ? '...' : summary?.totals.actionsLast30d ?? 0}
            </span>
            <span className="text-xs font-mono tabular-nums text-emerald-700">
              +{summary?.totals.actionsDeltaPct ?? 24.1}%
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Users Growth & Daily Logins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Users */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              {t.dashboard.chartUsersTitle}
            </h2>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {series[series.length - 1]?.usersCount ?? 0} total
            </span>
          </div>

          <div className="w-full overflow-hidden">
            <svg
              viewBox="0 0 560 200"
              className="w-full h-48 overflow-visible"
              role="img"
              aria-label={t.dashboard.chartUsersTitle}
            >
              <line x1="20" y1="40" x2="540" y2="40" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="20" y1="100" x2="540" y2="100" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="20" y1="160" x2="540" y2="160" stroke="#F1F5F9" strokeWidth="1" />
              {usersChart.area && (
                <polygon points={usersChart.area} fill="rgba(15, 23, 42, 0.06)" />
              )}
              {usersChart.line && (
                <polyline
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth="2"
                  points={usersChart.line}
                />
              )}
            </svg>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums mt-2 px-1">
              <span>{series[0]?.label}</span>
              <span>{series[Math.floor(series.length / 2)]?.label}</span>
              <span>{series[series.length - 1]?.label}</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Logins */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              {t.dashboard.chartLoginsTitle}
            </h2>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {series[series.length - 1]?.loginsCount ?? 0} hoje
            </span>
          </div>

          <div className="w-full overflow-hidden">
            <svg
              viewBox="0 0 560 200"
              className="w-full h-48"
              role="img"
              aria-label={t.dashboard.chartLoginsTitle}
            >
              <line x1="20" y1="40" x2="540" y2="40" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="20" y1="100" x2="540" y2="100" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="20" y1="180" x2="540" y2="180" stroke="#E2E8F0" strokeWidth="1" />
              {series.map((pt, idx) => {
                const count = series.length || 1;
                const slotWidth = 520 / count;
                const barWidth = Math.max(6, slotWidth * 0.62);
                const x = 20 + idx * slotWidth + (slotWidth - barWidth) / 2;
                const barH = Math.max(4, (pt.loginsCount / maxLogins) * 145);
                const y = 180 - barH;
                return (
                  <rect
                    key={pt.date}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    rx="2"
                    fill="#1E293B"
                  >
                    <title>{`${pt.label}: ${pt.loginsCount} logins`}</title>
                  </rect>
                );
              })}
            </svg>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums mt-2 px-1">
              <span>{series[0]?.label}</span>
              <span>{series[Math.floor(series.length / 2)]?.label}</span>
              <span>{series[series.length - 1]?.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart 3: Audited Actions Full-Width */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {t.dashboard.chartActionsTitle}
          </h2>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {series[series.length - 1]?.actionsCount ?? 0} eventos hoje
          </span>
        </div>

        <div className="w-full overflow-hidden">
          <svg
            viewBox="0 0 1140 210"
            className="w-full h-48"
            role="img"
            aria-label={t.dashboard.chartActionsTitle}
          >
            <line x1="20" y1="40" x2="1120" y2="40" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="20" y1="105" x2="1120" y2="105" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="20" y1="170" x2="1120" y2="170" stroke="#F1F5F9" strokeWidth="1" />
            {actionsChart.area && (
              <polygon points={actionsChart.area} fill="rgba(30, 41, 59, 0.07)" />
            )}
            {actionsChart.line && (
              <polyline
                fill="none"
                stroke="#0F172A"
                strokeWidth="2.2"
                points={actionsChart.line}
              />
            )}
          </svg>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums mt-2 px-1">
            <span>{series[0]?.label}</span>
            <span>{series[Math.floor(series.length / 2)]?.label}</span>
            <span>{series[series.length - 1]?.label}</span>
          </div>
        </div>
      </div>

      {/* ADMIN-ONLY SECTIONS: INFRASTRUCTURE, QUEUES, LLM GATEWAY & SYSTEM LOGS */}
      {isAdmin && (
        <>
          {/* Infrastructure, Queues & Multi-LLM Gateway */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                {t.dashboard.infraTitle}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleEnqueueJob}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.dashboard.enqueueJobButton}
                </button>
                <button
                  type="button"
                  onClick={handleSimulateWebhook}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.dashboard.testWebhookButton}
                </button>
              </div>
            </div>

            {actionBanner && (
              <div
                role="status"
                className="p-3 rounded-md bg-slate-100 border border-slate-300 text-xs font-mono text-slate-800"
              >
                {actionBanner}
              </div>
            )}

            {/* 4-column Architectural Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
              <div className="space-y-2">
                <div className="font-semibold text-slate-900">
                  {t.dashboard.infraDatabase}
                </div>
                <div className="text-slate-600 space-y-1 font-mono tabular-nums">
                  <div>Engine: {infra?.database.engine || 'PostgreSQL'}</div>
                  <div>Host: {infra?.database.host || 'localhost:5432'}</div>
                  <div>DB: {infra?.database.databaseName || 'kore_base'}</div>
                  <div>Pool Max: {infra?.database.poolMax ?? 10}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-900">
                  {t.dashboard.infraQueueCache}
                </div>
                <div className="text-slate-600 space-y-1 font-mono tabular-nums">
                  <div>Mode: {infra?.cacheAndQueue.mode || 'in-memory-fallback'}</div>
                  <div>Redis Host: {infra?.cacheAndQueue.redisHost || '127.0.0.1:6379'}</div>
                  <div>
                    BullMQ Jobs: {infra?.cacheAndQueue.jobsSummary.completed ?? 0} completed
                  </div>
                  <div>Cache Keys: {infra?.cacheAndQueue.cachedKeysCount ?? 0}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-900">
                  {t.dashboard.infraSecurity}
                </div>
                <div className="text-slate-600 space-y-1 font-mono tabular-nums">
                  <div>JWT: {infra?.security.jwtAlgorithm || 'HS256'} · Scrypt</div>
                  <div>
                    Rate Limit: {infra?.security.rateLimitMaxRequests ?? 120} req/min
                  </div>
                  <div>Webhook: HMAC-SHA256</div>
                  <div>Upload Guard: Max 5 MB · Magic Bytes</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-900">
                  {t.dashboard.infraMailTitle}
                </div>
                <div className="text-slate-600 space-y-1 font-mono tabular-nums">
                  <div>Provider: {infra?.mail.provider.toUpperCase() || 'RESEND'}</div>
                  <div>From: {infra?.mail.fromAddress || 'no-reply@kore.dev'}</div>
                  <div>SMTP: {infra?.mail.smtpHost || 'smtp.mailgun.org:587'}</div>
                  <div>Dispatched: {infra?.mail.sentCount ?? 0}</div>
                </div>
              </div>
            </div>

            {/* Multi-LLM Gateway Interactive Bar */}
            <div className="pt-5 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  {t.dashboard.infraLlmTitle}
                </h3>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md self-start">
                  {(['gemini', 'openrouter', 'llama'] as LLMProviderId[]).map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => setSelectedProvider(prov)}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                        selectedProvider === prov
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {prov === 'gemini' && 'Gemini'}
                      {prov === 'openrouter' && 'OpenRouter'}
                      {prov === 'llama' && 'Llama'}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleExecuteLlm} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  aria-label="LLM Prompt"
                  value={llmPrompt}
                  onChange={(e) => setLlmPrompt(e.target.value)}
                  placeholder={t.dashboard.llmPromptPlaceholder}
                  className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                />
                <button
                  type="submit"
                  disabled={llmLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{t.dashboard.testLlmButton}</span>
                </button>
              </form>

              {llmOutput && (
                <div className="mt-3 p-3.5 rounded-md bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 tabular-nums">
                    <span>
                      Provider: {llmOutput.provider.toUpperCase()} · Model: {llmOutput.model}
                    </span>
                    <span>{llmOutput.latencyMs} ms</span>
                  </div>
                  <p className="text-slate-800 leading-relaxed">{llmOutput.output}</p>
                </div>
              )}

              {/* BullMQ Recent Jobs Strip */}
              {recentJobs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 font-mono tabular-nums">
                  <span className="text-slate-700 font-medium">BullMQ Workers:</span>
                  {recentJobs.slice(0, 3).map((job) => (
                    <span key={job.id}>
                      {job.id} · {job.queueName} · {job.status}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* System Audit Logs Table ("Logs de tudo") */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-slate-900">
                  {t.dashboard.logsTitle}
                </h2>
                <button
                  type="button"
                  aria-label="Refresh logs"
                  onClick={fetchAdminData}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    aria-label={t.dashboard.logsSearchPlaceholder}
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder={t.dashboard.logsSearchPlaceholder}
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900 w-full sm:w-64"
                  />
                </div>

                <select
                  aria-label="Filter log category"
                  value={logCategory}
                  onChange={(e) => setLogCategory(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900 text-slate-700"
                >
                  <option value="all">{t.dashboard.logsFilterAll}</option>
                  <option value="auth">auth</option>
                  <option value="users">users</option>
                  <option value="profile">profile</option>
                  <option value="security">security</option>
                  <option value="queue">queue</option>
                  <option value="llm">llm</option>
                  <option value="mail">mail</option>
                  <option value="webhook">webhook</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-4">{t.dashboard.logsColTimestamp}</th>
                    <th className="py-2.5 px-4">{t.dashboard.logsColActor}</th>
                    <th className="py-2.5 px-4">{t.dashboard.logsColAction}</th>
                    <th className="py-2.5 px-4">{t.dashboard.logsColCategory}</th>
                    <th className="py-2.5 px-4">{t.dashboard.logsColResource}</th>
                    <th className="py-2.5 px-4">{t.dashboard.logsColIp}</th>
                    <th className="py-2.5 px-4 text-right">{t.dashboard.logsColLatency}</th>
                    <th className="py-2.5 px-4 text-right">{t.dashboard.logsColStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        {t.dashboard.logsEmpty}
                      </td>
                    </tr>
                  ) : (
                    logs.slice(0, 25).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString(locale, {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-4 text-slate-800 whitespace-nowrap">
                          {log.actorEmail}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] font-medium text-slate-900 whitespace-nowrap">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                          {log.category}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.resource}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                          {log.ipAddress}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 tabular-nums text-right whitespace-nowrap">
                          {log.latencyMs} ms
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap font-medium">
                          <span
                            className={
                              log.status === 'success'
                                ? 'text-emerald-700'
                                : log.status === 'warning'
                                ? 'text-amber-700'
                                : 'text-red-700'
                            }
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
