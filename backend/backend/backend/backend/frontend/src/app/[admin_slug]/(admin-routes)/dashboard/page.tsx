"use client";

import { useEffect, useState } from "react";
import { 
  Users as UsersIcon, 
  Ticket as TicketIcon, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  TrendingUp,
  RotateCw
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
    const interval = setInterval(() => fetchStats(), 30_000);
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

  const cards = [
    { name: "Total Customers", value: stats.total_users, icon: UsersIcon, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    { name: "New Customers (Week)", value: stats.new_signups_week, icon: TrendingUp, color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
    { name: "Total Tickets", value: stats.total_tickets, icon: TicketIcon, color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
    { name: "Active Tickets", value: stats.open_tickets, icon: AlertCircle, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    { name: "Resolved Tickets", value: stats.status_breakdown["Resolved"] + stats.status_breakdown["Closed"], icon: CheckCircle, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  ];

  const totalTickets = stats.total_tickets || 1;
  const getPercentage = (val: number) => Math.round((val / totalTickets) * 100);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Overview Dashboard</h1>
          <p className="text-slate-400 mt-1">Real-time health and ops metrics for MakInvoices.</p>
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.name} className={`p-6 rounded-2xl border bg-slate-900/40 backdrop-blur-md flex items-center justify-between transition-all hover:translate-y-[-2px] hover:bg-slate-900/60 ${card.color}`}>
              <div>
                <p className="text-sm font-medium text-slate-400">{card.name}</p>
                <p className="text-3xl font-bold text-white mt-2">{card.value}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Tickets by Status</h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-400" /> Active
            </span>
          </div>
          <div className="space-y-5">
            {Object.entries(stats.status_breakdown).map(([status, count]) => {
              const pct = getPercentage(count);
              const colorMap: Record<string, string> = { "Open": "bg-rose-500", "In Progress": "bg-amber-500", "Resolved": "bg-emerald-500", "Closed": "bg-slate-500" };
              const textColorMap: Record<string, string> = { "Open": "text-rose-400", "In Progress": "text-amber-400", "Resolved": "text-emerald-400", "Closed": "text-slate-400" };
              return (
                <div key={status} className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className={textColorMap[status]}>{status}</span>
                    <span className="text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800/40">
                    <div className={`h-full rounded-full transition-all duration-500 ${colorMap[status] || "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">System Operations</h3>
            <p className="text-sm text-slate-400 leading-relaxed">All support requests and inquiries escalated from the virtual AI agents are registered under the tickets repository. Replied tickets automatically notify the respective user.</p>
          </div>
          <div className="mt-8 border-t border-slate-800/60 pt-4 flex flex-col gap-2">
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
              <span>Auto-sync</span>
              <span className="text-emerald-400 font-medium">Every 30s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}