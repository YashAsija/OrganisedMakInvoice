"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  FileText,
  TrendingUp,
  TrendingDown,
  BarChart2,
  CheckCircle,
  Mail,
  RefreshCw,
  Loader2,
  AlertCircle,
  Repeat,
  UserCheck,
  Activity,
  Zap,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Crown
} from "lucide-react";

interface AnalyticsData {
  users: {
    total: number;
    new_today: number;
    new_this_week: number;
    new_last_week: number;
    verified_email: number;
    providers: Record<string, number>;
  };
  subscriptions?: {
    total: number;
    paid_active: number;
    trial_active: number;
    free_starter: number;
    plans: Record<string, number>;
  };
  invoices: {
    total: number;
    users_with_invoices: number;
    users_without_invoices: number;
    recurring: number;
  };
  tickets: {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
    categories: Record<string, number>;
    priorities: Record<string, number>;
  };
}

function GrowthBadge({ value, label }: { value: number; label: string }) {
  const positive = value >= 0;
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
        positive
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-rose-500/10 text-rose-400"
      }`}
    >
      {positive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {positive ? "+" : ""}
      {value}%
      <span className="font-normal opacity-70 ml-0.5">{label}</span>
    </div>
  );
}

function CircleProgress({
  pct,
  color,
  size = 80,
}: {
  pct: number;
  color: string;
  size?: number;
}) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(100,116,139,0.15)"
        strokeWidth={8}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("makinvoices_admin_analytics_cache");
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !sessionStorage.getItem("makinvoices_admin_analytics_cache");
    }
    return true;
  });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!data) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.status === 404 || res.status === 401) {
        const slug = window.location.pathname.split("/")[1] || "admin";
        window.location.href = `/${slug}`;
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch analytics data");
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date());
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("makinvoices_admin_analytics_cache", JSON.stringify(json));
        } catch (e) {}
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(() => fetchAnalytics(true), 60_000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="text-sm text-slate-400">
            Loading platform analytics...
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-rose-400 max-w-2xl mx-auto mt-8 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertCircle className="h-5 w-5" /> Error Loading Analytics
        </h3>
        <p className="text-sm text-slate-400">
          {error || "Could not retrieve analytics data."}
        </p>
        <button
          onClick={() => fetchAnalytics()}
          className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-rose-500/50 hover:text-white text-slate-300 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Try Again
        </button>
      </div>
    );
  }

  const verificationRate =
    data.users.total > 0
      ? Math.round((data.users.verified_email / data.users.total) * 100)
      : 0;

  const engagementRate =
    data.users.total > 0
      ? Math.round((data.invoices.users_with_invoices / data.users.total) * 100)
      : 0;

  const subsData = data.subscriptions || {
    total: 0,
    paid_active: 0,
    trial_active: 0,
    free_starter: 0,
    plans: {
      "Starter Free": 0,
      "Basic Trial": 0,
      "Basic Paid": 0,
      "Pro Trial": 0,
      "Pro Paid": 0,
      "Enterprise Paid": 0
    }
  };

  const paidRate =
    data.users.total > 0
      ? Math.round((subsData.paid_active / data.users.total) * 100)
      : 0;

  const trialRate =
    data.users.total > 0
      ? Math.round((subsData.trial_active / data.users.total) * 100)
      : 0;

  const weekGrowthPct =
    data.users.new_last_week > 0
      ? Math.round(
          ((data.users.new_this_week - data.users.new_last_week) /
            data.users.new_last_week) *
            100
        )
      : data.users.new_this_week > 0
      ? 100
      : 0;

  // Merge in phone provider with 0 if it is missing
  const activeProviders = {
    phone: 0,
    ...data.users.providers
  };
  const providerEntries = Object.entries(activeProviders).sort(
    (a, b) => b[1] - a[1]
  );
  const totalProviders = providerEntries.reduce((s, [, v]) => s + v, 0);

  const categoryEntries = Object.entries(data.tickets.categories).sort(
    (a, b) => b[1] - a[1]
  );
  const priorityEntries = Object.entries(data.tickets.priorities).sort(
    (a, b) => b[1] - a[1]
  );
  const maxCategory = Math.max(...categoryEntries.map(([, v]) => v), 1);
  const maxPriority = Math.max(...priorityEntries.map(([, v]) => v), 1);

  const priorityColors: Record<string, string> = {
    Critical: "bg-rose-500",
    High: "bg-orange-500",
    Medium: "bg-amber-400",
    Low: "bg-emerald-500",
  };
  const priorityTextColors: Record<string, string> = {
    Critical: "text-rose-400",
    High: "text-orange-400",
    Medium: "text-amber-400",
    Low: "text-emerald-400",
  };
  const categoryColors = [
    "bg-indigo-500",
    "bg-violet-500",
    "bg-sky-500",
    "bg-teal-500",
    "bg-pink-500",
    "bg-amber-500",
  ];
  const categoryTextColors = [
    "text-indigo-400",
    "text-violet-400",
    "text-sky-400",
    "text-teal-400",
    "text-pink-400",
    "text-amber-400",
  ];

  const planList = [
    { name: "Pro Paid", count: subsData.plans["Pro Paid"] || 0, color: "bg-emerald-500", text: "text-emerald-400", badge: "Paid", badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    { name: "Pro Trial", count: subsData.plans["Pro Trial"] || 0, color: "bg-purple-500", text: "text-purple-400", badge: "Trial", badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    { name: "Basic Paid", count: subsData.plans["Basic Paid"] || 0, color: "bg-emerald-500", text: "text-emerald-400", badge: "Paid", badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    { name: "Basic Trial", count: subsData.plans["Basic Trial"] || 0, color: "bg-sky-500", text: "text-sky-400", badge: "Trial", badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
    { name: "Enterprise Paid", count: subsData.plans["Enterprise Paid"] || 0, color: "bg-indigo-500", text: "text-indigo-400", badge: "Paid", badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
    { name: "Starter Free", count: subsData.plans["Starter Free"] || 0, color: "bg-slate-500", text: "text-slate-400", badge: "Free", badgeColor: "bg-slate-800 text-slate-400 border-slate-700" },
  ];
  const maxPlanCount = Math.max(...planList.map(p => p.count), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <BarChart2 className="h-7 w-7 text-indigo-400" />
            Platform Analytics
          </h1>
          <p className="text-slate-400 mt-1">
            Aggregated platform telemetry and subscription conversion metrics.
            {lastRefreshed && (
              <span className="ml-2 text-slate-500 text-xs">
                Last updated {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-900/60 border border-slate-800 px-3 py-2 rounded-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Auto-sync every 60s
          </div>
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:text-white text-slate-300 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50 group"
          >
            <RefreshCw
              className={`h-4 w-4 text-indigo-400 transition-transform duration-500 ${
                refreshing ? "animate-spin" : "group-hover:rotate-180"
              }`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ROW 1: Subscriptions & Monetization Overview */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Subscriptions & Monetization
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Paid Subscribers",
              value: subsData.paid_active,
              icon: CreditCard,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10 border-emerald-500/20",
              badge: <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">{paidRate}% of users</span>,
              sub: "Active paid accounts"
            },
            {
              label: "Active Trials",
              value: subsData.trial_active,
              icon: Sparkles,
              color: "text-purple-400",
              bg: "bg-purple-500/10 border-purple-500/20",
              badge: <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">{trialRate}% in trial</span>,
              sub: "14-day free trials"
            },
            {
              label: "Free Starter Users",
              value: subsData.free_starter,
              icon: Users,
              color: "text-slate-400",
              bg: "bg-slate-800/40 border-slate-700/60",
              badge: null,
              sub: "Community / unassigned"
            },
            {
              label: "Total Subscriptions",
              value: subsData.total,
              icon: Crown,
              color: "text-indigo-400",
              bg: "bg-indigo-500/10 border-indigo-500/20",
              badge: null,
              sub: "Total tracked in DB"
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`p-5 rounded-2xl border bg-slate-900/40 backdrop-blur-md flex flex-col justify-between gap-3 hover:translate-y-[-2px] transition-all ${card.bg}`}
              >
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  {card.badge}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">
                    {card.label}
                  </p>
                  <p className="text-3xl font-extrabold text-white mt-1">
                    {card.value.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{card.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ROW 2: Subscription Visual Telemetry (Conversion Ring + Plan Tier Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Paid Conversion Ratio */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md flex flex-col items-center justify-center gap-4">
          <h3 className="text-sm font-semibold text-white self-start flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-400" /> Paid Conversion Rate
          </h3>
          <div className="relative flex items-center justify-center">
            <CircleProgress pct={paidRate} color="#10b981" size={100} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-white">
                {paidRate}%
              </span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">
              <span className="text-emerald-400 font-bold">
                {subsData.paid_active.toLocaleString()}
              </span>{" "}
              of {data.users.total.toLocaleString()} total users upgraded to paid
            </p>
            <p className="text-[10px] text-purple-400 mt-1 font-medium">
              +{subsData.trial_active} active trials pending conversion
            </p>
          </div>
        </div>

        {/* Subscription Tier Breakdown */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-400" /> Subscription Tier Distribution
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
              {subsData.total} Total Subscriptions
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {planList.map((plan) => {
              const pct = Math.round((plan.count / maxPlanCount) * 100);
              return (
                <div key={plan.name} className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className={plan.text}>{plan.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border ${plan.badgeColor}`}>
                        {plan.badge}
                      </span>
                    </div>
                    <span className="text-slate-400 font-bold">{plan.count}</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800/40">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${plan.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ROW 3: User Growth KPIs */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Users className="h-3.5 w-3.5" /> User Growth
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Users",
              value: data.users.total,
              icon: Users,
              color: "text-blue-400",
              bg: "bg-blue-500/10 border-blue-500/20",
              badge: null,
            },
            {
              label: "New Today",
              value: data.users.new_today,
              icon: Zap,
              color: "text-amber-400",
              bg: "bg-amber-500/10 border-amber-500/20",
              badge: null,
            },
            {
              label: "New This Week",
              value: data.users.new_this_week,
              icon: TrendingUp,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10 border-emerald-500/20",
              badge: <GrowthBadge value={weekGrowthPct} label="vs last wk" />,
            },
            {
              label: "New Last Week",
              value: data.users.new_last_week,
              icon: Activity,
              color: "text-violet-400",
              bg: "bg-violet-500/10 border-violet-500/20",
              badge: null,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`p-5 rounded-2xl border bg-slate-900/40 backdrop-blur-md flex flex-col justify-between gap-4 hover:translate-y-[-2px] transition-all ${card.bg}`}
              >
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  {card.badge}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">
                    {card.label}
                  </p>
                  <p className="text-3xl font-extrabold text-white mt-1">
                    {card.value.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ROW 4: Verification + Engagement Rings + Provider Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Verification Ring */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md flex flex-col items-center justify-center gap-4">
          <h3 className="text-sm font-semibold text-white self-start flex items-center gap-2">
            <Mail className="h-4 w-4 text-indigo-400" /> Email Verification
          </h3>
          <div className="relative flex items-center justify-center">
            <CircleProgress pct={verificationRate} color="#6366f1" size={100} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-white">
                {verificationRate}%
              </span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">
              <span className="text-emerald-400 font-bold">
                {data.users.verified_email.toLocaleString()}
              </span>{" "}
              of {data.users.total.toLocaleString()} users verified
            </p>
            <p className="text-[10px] text-slate-600 mt-1">
              {data.users.total - data.users.verified_email} unverified
            </p>
          </div>
        </div>

        {/* User Engagement Ring */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md flex flex-col items-center justify-center gap-4">
          <h3 className="text-sm font-semibold text-white self-start flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-emerald-400" /> Invoice Engagement
          </h3>
          <div className="relative flex items-center justify-center">
            <CircleProgress pct={engagementRate} color="#10b981" size={100} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-white">
                {engagementRate}%
              </span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">
              <span className="text-emerald-400 font-bold">
                {data.invoices.users_with_invoices.toLocaleString()}
              </span>{" "}
              users created invoices
            </p>
            <p className="text-[10px] text-slate-600 mt-1">
              {data.invoices.users_without_invoices} yet to create any
            </p>
          </div>
        </div>

        {/* Sign-in Provider Breakdown */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-sky-400" /> Sign-in Providers
          </h3>
          {providerEntries.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No provider data.</p>
          ) : (
            <div className="space-y-3">
              {providerEntries.map(([provider, count], i) => {
                const pct = Math.round((count / (totalProviders || 1)) * 100);
                const colors = [
                  { bar: "bg-indigo-500", text: "text-indigo-400" },
                  { bar: "bg-sky-500", text: "text-sky-400" },
                  { bar: "bg-emerald-500", text: "text-emerald-400" },
                  { bar: "bg-violet-500", text: "text-violet-400" },
                ];
                const c = colors[i % colors.length];
                return (
                  <div key={provider} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className={`capitalize ${c.text}`}>{provider}</span>
                      <span className="text-slate-400">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800/40">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ROW 5: Invoice Platform Stats */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" /> Invoice Platform Stats
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Invoices",
              value: data.invoices.total,
              icon: FileText,
              color: "text-indigo-400",
              bg: "bg-indigo-500/10 border-indigo-500/20",
              sub: "across entire platform",
            },
            {
              label: "Active Users",
              value: data.invoices.users_with_invoices,
              icon: UserCheck,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10 border-emerald-500/20",
              sub: "have created invoices",
            },
            {
              label: "Inactive Users",
              value: data.invoices.users_without_invoices,
              icon: Users,
              color: "text-amber-400",
              bg: "bg-amber-500/10 border-amber-500/20",
              sub: "no invoices yet",
            },
            {
              label: "Recurring Invoices",
              value: data.invoices.recurring,
              icon: Repeat,
              color: "text-violet-400",
              bg: "bg-violet-500/10 border-violet-500/20",
              sub: "auto-billing enabled",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`p-5 rounded-2xl border bg-slate-900/40 backdrop-blur-md hover:translate-y-[-2px] transition-all ${card.bg}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-slate-400">
                    {card.label}
                  </p>
                  <div className="p-2 rounded-xl bg-slate-950/50 border border-slate-800/60">
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-white">
                  {card.value.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ROW 6: Ticket Category + Priority Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Categories */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Tickets by Category
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
              {data.tickets.total} total
            </span>
          </div>
          {categoryEntries.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">
              No ticket data available.
            </p>
          ) : (
            <div className="space-y-3">
              {categoryEntries.map(([cat, count], i) => {
                const pct = Math.round((count / maxCategory) * 100);
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className={categoryTextColors[i % categoryTextColors.length]}>
                        {cat}
                      </span>
                      <span className="text-slate-400">
                        {count} ticket{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800/40">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${categoryColors[i % categoryColors.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ticket Priorities */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Tickets by Priority
            </h3>
            <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
              {data.tickets.open + data.tickets.in_progress} active
            </div>
          </div>
          {priorityEntries.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">
              No priority data available.
            </p>
          ) : (
            <div className="space-y-3">
              {priorityEntries.map(([pri, count]) => {
                const pct = Math.round((count / maxPriority) * 100);
                const barColor = priorityColors[pri] ?? "bg-indigo-500";
                const textColor = priorityTextColors[pri] ?? "text-indigo-400";
                return (
                  <div key={pri} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className={textColor}>{pri}</span>
                      <span className="text-slate-400">
                        {count} ticket{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800/40">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick ticket status pills */}
          <div className="border-t border-slate-800/60 pt-4 grid grid-cols-2 gap-2">
            {[
              { label: "Open", value: data.tickets.open, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
              { label: "In Progress", value: data.tickets.in_progress, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
              { label: "Resolved", value: data.tickets.resolved, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
              { label: "Closed", value: data.tickets.closed, color: "text-slate-400 bg-slate-800 border-slate-700" },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-xl border px-3 py-2 flex items-center justify-between ${s.color}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                  {s.label}
                </span>
                <span className="text-sm font-extrabold">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

