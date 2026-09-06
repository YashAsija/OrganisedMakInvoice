"use client";

import { useEffect, useState } from "react";
import { 
  Users as UsersIcon, 
  Ticket as TicketIcon, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  TrendingUp, 
  RotateCw,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Zap
} from "lucide-react";

interface StatsData {
  total_users: number;
  total_tickets: number;
  open_tickets: number;
  status_breakdown: {
    "Open": number;
    "In Progress": number;
    "Resolved": number;
    "Closed": number;
  };
  new_signups_week: number;
  subscriptions?: {
    total_active_paid: number;
    total_active_trial: number;
    total_subscriptions: number;
    breakdown: {
      free?: number;
      basic_paid?: number;
      basic_trial?: number;
      pro_paid?: number;
      pro_trial?: number;
      enterprise_paid?: number;
    };
  };
  db_mode?: "supabase" | "sqlite";
  db_connected?: boolean;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!stats) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 404 || res.status === 401) {
        // Token has expired -> redirect back to login
        const slug = window.location.pathname.split("/")[1] || "admin";
        window.location.href = `/${slug}`;
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch dashboard statistics");
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(true), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="text-sm text-slate-400">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-rose-400 max-w-2xl mx-auto mt-8 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertCircle className="h-5 w-5" /> Error Loading Stats
        </h3>
        <p className="text-sm text-slate-400">{error || "Could not retrieve statistics."}</p>
        <button onClick={() => fetchStats()} className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-rose-500/50 hover:text-white text-slate-300 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-lg">
          <RotateCw className="h-4 w-4" /> Try Again
        </button>
      </div>
    );
  }

  const subs = stats.subscriptions || {
    total_active_paid: 0,
    total_active_trial: 0,
    total_subscriptions: 0,
    breakdown: { free: 0, basic_paid: 0, basic_trial: 0, pro_paid: 0, pro_trial: 0, enterprise_paid: 0 }
  };

  const cards = [
    { 
      name: "Total Customers", 
      value: stats.total_users, 
      icon: UsersIcon, 
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      sub: "Registered accounts"
    },
    { 
      name: "Paid Subscribers", 
      value: subs.total_active_paid, 
      icon: CreditCard, 
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      sub: "Active paid plans"
    },
    { 
      name: "Active Trials", 
      value: subs.total_active_trial, 
      icon: Sparkles, 
      color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      sub: "14-day free trials"
    },
    { 
      name: "New Signups (Week)", 
      value: stats.new_signups_week, 
      icon: TrendingUp, 
      color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      sub: "Last 7 days"
    },
    { 
      name: "Active Tickets", 
      value: stats.open_tickets, 
      icon: AlertCircle, 
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      sub: "Open & in progress"
    },
    { 
      name: "Resolved Tickets", 
      value: stats.status_breakdown["Resolved"] + stats.status_breakdown["Closed"], 
      icon: CheckCircle, 
      color: "bg-teal-500/10 text-teal-400 border-teal-500/20",
      sub: `${stats.total_tickets} total tickets`
    },
  ];

  const totalTickets = stats.total_tickets || 1;
  const getPercentage = (val: number) => Math.round((val / totalTickets) * 100);

  const planBreakdown = [
    { label: "Pro Paid", count: subs.breakdown.pro_paid || 0, color: "bg-emerald-500", text: "text-emerald-400", badge: "Paid" },
    { label: "Pro Trial", count: subs.breakdown.pro_trial || 0, color: "bg-purple-500", text: "text-purple-400", badge: "Trial" },
    { label: "Basic Paid", count: subs.breakdown.basic_paid || 0, color: "bg-emerald-500", text: "text-emerald-400", badge: "Paid" },
    { label: "Basic Trial", count: subs.breakdown.basic_trial || 0, color: "bg-sky-500", text: "text-sky-400", badge: "Trial" },
    { label: "Enterprise Paid", count: subs.breakdown.enterprise_paid || 0, color: "bg-indigo-500", text: "text-indigo-400", badge: "Paid" },
    { label: "Free / Starter", count: subs.breakdown.free || 0, color: "bg-slate-500", text: "text-slate-400", badge: "Free" },
  ];
  const maxPlanCount = Math.max(...planBreakdown.map(p => p.count), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Overview Dashboard</h1>
          <p className="text-slate-400 mt-1">Real-time subscription, operations, and platform health metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-900/60 border border-slate-800 px-3 py-2 rounded-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live auto-sync enabled
          </div>
          <button onClick={() => fetchStats(true)} disabled={refreshing} className="self-start sm:self-auto px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/80 active:bg-slate-950 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group">
            <RotateCw className={`h-4 w-4 text-indigo-400 transition-transform duration-500 ${refreshing ? "animate-spin" : "group-hover:rotate-180"}`} />
            {refreshing ? "Refreshing..." : "Refresh Stats"}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.name} className={`p-5 rounded-2xl border bg-slate-900/40 backdrop-blur-md flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:bg-slate-900/60 ${card.color}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.name}</p>
                <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-800/60">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-extrabold text-white">{card.value.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Plan Distribution */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" /> Subscription Tiers
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Paid plans vs. active trial tiers</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-emerald-400">
              <Zap className="h-3.5 w-3.5" />
              {subs.total_active_paid} Paid Active
            </div>
          </div>

          <div className="space-y-4">
            {planBreakdown.map((item) => {
              const pct = Math.round((item.count / maxPlanCount) * 100);
              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className={item.text}>{item.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        item.badge === "Paid" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : item.badge === "Trial" 
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}>
                        {item.badge}
                      </span>
                    </div>
                    <span className="text-slate-400 font-semibold">{item.count} user{item.count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800/40">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${item.color}`} 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
            <span>Total Subscriptions Tracked</span>
            <span className="text-white font-bold">{subs.total_subscriptions}</span>
          </div>
        </div>

        {/* Tickets by Status */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <TicketIcon className="h-5 w-5 text-indigo-400" /> Tickets by Status
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Support requests & tickets</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-400" /> {stats.open_tickets} Active
            </span>
          </div>
          <div className="space-y-4">
            {Object.entries(stats.status_breakdown).map(([status, count]) => {
              const pct = getPercentage(count);
              const colorMap: Record<string, string> = { "Open": "bg-rose-500", "In Progress": "bg-amber-500", "Resolved": "bg-emerald-500", "Closed": "bg-slate-500" };
              const textColorMap: Record<string, string> = { "Open": "text-rose-400", "In Progress": "text-amber-400", "Resolved": "text-emerald-400", "Closed": "text-slate-400" };
              return (
                <div key={status} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className={textColorMap[status]}>{status}</span>
                    <span className="text-slate-400 font-semibold">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800/40">
                    <div className={`h-full rounded-full transition-all duration-500 ${colorMap[status] || "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
            <span>Total Tickets Resolved</span>
            <span className="text-emerald-400 font-bold">{stats.status_breakdown["Resolved"] + stats.status_breakdown["Closed"]}</span>
          </div>
        </div>

        {/* System Operations */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">System Operations</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Support requests, billing events, and user subscriptions sync automatically with Supabase cloud infrastructure in real-time.
            </p>
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Paid Subscriber Ratio</span>
                <span className="text-emerald-400 font-bold">
                  {stats.total_users > 0 ? Math.round((subs.total_active_paid / stats.total_users) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Trial Conversion Pipeline</span>
                <span className="text-purple-400 font-bold">
                  {subs.total_active_trial} users on trial
                </span>
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-800/60 pt-4 flex flex-col gap-2.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>FastAPI Gateway</span>
              <span className="text-emerald-400 font-medium">Online</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Database Connection</span>
              <span className={`font-medium ${stats.db_mode === "supabase" ? "text-emerald-400" : "text-amber-400"}`}>
                {stats.db_mode === "supabase" ? "Connected (Cloud / Supabase)" : "Connected (Local / SQLite)"}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Auto-sync Frequency</span>
              <span className="text-emerald-400 font-medium">Every 30s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}