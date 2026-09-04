"use client";

import { useEffect, useState } from "react";
import {
  Search,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  AlertCircle,
  FileText,
  Ticket as TicketIcon,
  RefreshCw,
  Award,
  Calendar,
  Briefcase,
  TrendingUp,
  Receipt,
  Repeat,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  CreditCard,
  Zap,
  Sparkles,
  Clock
} from "lucide-react";

export interface UserSubscriptionInfo {
  id?: string;
  user_id?: string;
  plan_name?: string;
  plan_type?: string;
  status?: string;
  gateway?: string;
  current_period_end?: string;
  subscription_expires_at?: string;
  expires_at?: string;
  renews_at?: string;
  trial_started_at?: string;
  trial_used_plans?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface UserUsageInfo {
  id?: string;
  user_id?: string;
  period_start?: string;
  period_end?: string;
  documents_used?: number;
  reports_used?: number;
}

interface UserRecord {
  uid: string;
  email: string;
  name: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
  provider?: string;
  email_verified?: boolean;
  phone?: string;
  subscription?: UserSubscriptionInfo | null;
}

interface UserDetails {
  user: UserRecord;
  subscription?: UserSubscriptionInfo | null;
  usage?: UserUsageInfo | null;
  company_settings: any;
  invoice_stats: {
    total_created: number;
    status_breakdown: Record<string, number>;
    has_recurring: boolean;
  };
  client_count: number;
  expense_count: number;
  profile_completeness: number;
  tickets: any[];
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleSyncUsers = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/users/sync", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Could not sync users");
      const data = await res.json();
      alert(`Sync completed successfully!\nSynced: ${data.synced} accounts.\nTotal Database Users: ${data.total}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Failed to sync users");
    } finally {
      setSyncing(false);
    }
  };

  // Detail Modal state
  const [activeUser, setActiveUser] = useState<UserRecord | null>(null);
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.status === 404 || res.status === 401) {
        const slug = window.location.pathname.split("/")[1] || "admin";
        window.location.href = `/${slug}`;
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Could not retrieve users list");
      }
      const data = await res.json();
      const rawUsers: UserRecord[] = Array.isArray(data.users) ? data.users : [];

      // Query live subscriptions from Supabase directly via admin endpoint
      try {
        const uids = rawUsers.map(u => u.uid).filter(Boolean);
        const emails = rawUsers.map(u => u.email).filter(Boolean);
        const subRes = await fetch(`/api/admin-subscriptions?uids=${encodeURIComponent(uids.join(','))}&emails=${encodeURIComponent(emails.join(','))}`);
        if (subRes.ok) {
          const subData = await subRes.json();
          const byUid = subData.byUserId || {};
          const byEmail = subData.byUserEmail || {};

          for (const u of rawUsers) {
            const sub = byUid[u.uid] || (u.email ? byEmail[u.email.toLowerCase()] : null);
            if (sub) {
              u.subscription = sub;
            }
          }
        }
      } catch (subFetchErr) {
        console.warn('[UsersAdmin] Live subscription sync note:', subFetchErr);
      }

      setUsers(rawUsers);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch (err: any) {
      setError(err.message || "An error occurred fetching users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleSelectUser = async (user: UserRecord) => {
    setActiveUser(user);
    setDetailsLoading(true);
    setAdminNotes(user.admin_notes || "");
    setDetails(null);

    try {
      const res = await fetch(`/api/admin/users/${user.uid}`);
      let userDetailsData: UserDetails | null = null;
      if (res.ok) {
        userDetailsData = await res.json();
      }

      // Live subscription sync for active user
      try {
        const subRes = await fetch(`/api/admin-subscriptions?uids=${encodeURIComponent(user.uid)}&emails=${encodeURIComponent(user.email || '')}`);
        if (subRes.ok) {
          const subData = await subRes.json();
          const liveSub = subData.byUserId?.[user.uid] || (user.email ? subData.byUserEmail?.[user.email.toLowerCase()] : null);
          if (liveSub) {
            if (userDetailsData) {
              userDetailsData.subscription = liveSub;
            }
            user.subscription = liveSub;
          }
        }
      } catch (subErr) {
        console.warn('[UserDetails] Live sub fetch error:', subErr);
      }

      if (userDetailsData) {
        setDetails(userDetailsData);
      }
    } catch (err) {
      console.error("Failed to load user details:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!activeUser) return;
    setNotesSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${activeUser.uid}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: adminNotes }),
      });
      if (res.ok) {
        setUsers(users.map(u => u.uid === activeUser.uid ? { ...u, admin_notes: adminNotes } : u));
        alert("Admin notes saved successfully.");
      } else {
        alert("Failed to save admin notes.");
      }
    } catch (err) {
      console.error("Error saving notes:", err);
      alert("Failed to save notes.");
    } finally {
      setNotesSaving(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const getAccountAge = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const diffTime = Math.abs(new Date().getTime() - new Date(dateStr).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days`;
  };

  const verifiedCount = users.filter(u => u.email_verified).length;

  const activeSubscriptionsCount = users.filter(u => {
    const sub = u.subscription;
    if (!sub) return false;
    const plan = (sub.plan_type || sub.plan_name || '').toLowerCase();
    return plan && plan !== 'free' && plan !== 'starter';
  }).length;

  const renderSubscriptionBadge = (sub?: UserSubscriptionInfo | null) => {
    if (!sub) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          Starter Free
        </span>
      );
    }

    const planType = (sub.plan_type || sub.plan_name || 'free').toLowerCase();
    const isTrial = sub.status === 'trialing' || !!sub.trial_started_at;
    const isExpired = sub.status === 'expired';
    const isCancelled = sub.status === 'cancelled';

    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3 h-3" /> Expired ({planType})
        </span>
      );
    }

    if (isCancelled) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Cancelled ({planType})
        </span>
      );
    }

    if (planType === 'basic') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
          <Zap className="w-3 h-3 text-sky-400" />
          {isTrial ? 'Basic (Trial)' : 'Basic Active'}
        </span>
      );
    }

    if (planType === 'professional' || planType === 'pro') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
          <Sparkles className="w-3 h-3 text-purple-400" />
          {isTrial ? 'Pro (Trial)' : 'Pro Active'}
        </span>
      );
    }

    if (planType === 'enterprise') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <Award className="w-3 h-3 text-amber-400" />
          Enterprise Active
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
        Starter Free
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Users Directory</h1>
          <p className="text-slate-400 mt-1 text-sm">Review accounts, billing, usage metrics, and audit logs.</p>
        </div>
        <button
          onClick={handleSyncUsers}
          disabled={syncing}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-sm font-semibold rounded-xl text-white transition-all cursor-pointer flex items-center justify-center gap-2 border border-indigo-500/30 shadow-lg shadow-indigo-600/20 shrink-0"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <RefreshCw className="h-4 w-4 text-white" />
          )}
          {syncing ? "Syncing..." : "Sync Users"}
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-4.5 rounded-2xl backdrop-blur-md flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Registered</div>
            <div className="text-2xl font-bold text-white mt-0.5">{total}</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4.5 rounded-2xl backdrop-blur-md flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Verified Accounts</div>
            <div className="text-2xl font-bold text-white mt-0.5">{verifiedCount} / {users.length}</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4.5 rounded-2xl backdrop-blur-md flex items-center gap-4">
          <div className="p-3 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-xl">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Paid & Trial Subs</div>
            <div className="text-2xl font-bold text-white mt-0.5">{activeSubscriptionsCount} <span className="text-xs text-slate-400 font-normal">/ {users.length}</span></div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4.5 rounded-2xl backdrop-blur-md flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Page</div>
            <div className="text-2xl font-bold text-white mt-0.5">{page} <span className="text-xs text-slate-400 font-normal">/ {totalPages}</span></div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-stretch md:items-center backdrop-blur-md">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            type="text"
            placeholder="Search users by name, email address, or user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </form>
        <button
          onClick={handleSearchSubmit}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold rounded-xl text-white transition-all cursor-pointer shadow-md shadow-indigo-600/20"
        >
          Search
        </button>
        {search && (
          <button
            onClick={() => { setSearch(""); setPage(1); fetchUsers(); }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-sm font-semibold rounded-xl text-slate-300 transition-all cursor-pointer border border-slate-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-rose-400 gap-3">
            <AlertCircle className="h-10 w-10 text-rose-500" />
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-white border border-slate-700"
            >
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-4">
            <div className="flex flex-col items-center">
              <AlertCircle className="h-10 w-10 mb-2 text-slate-500" />
              <p className="text-base font-semibold text-slate-300">No registered users found.</p>
              <p className="text-xs text-slate-500 mt-1">Click below to sync profiles directly with Supabase Auth database.</p>
            </div>
            <button
              onClick={handleSyncUsers}
              disabled={syncing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-xs font-semibold rounded-xl text-white transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sync with Auth Database
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-950/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Profile</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">User ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Signup Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Verification</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Subscription</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin Flags</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/30">
                {users.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 border border-indigo-400/30 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                        {u.name ? u.name[0].toUpperCase() : <UserIcon className="h-5 w-5 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate text-sm">{u.name || "MakInvoice Member"}</div>
                        <div className="text-xs text-slate-400 truncate">{u.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                      <span className="bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800">{u.uid.slice(0, 12)}...</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {u.email_verified ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          <XCircle className="h-3 w-3" /> Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {renderSubscriptionBadge(u.subscription)}
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <div className="truncate text-xs text-slate-400 italic">
                        {u.admin_notes || "No flags recorded"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleSelectUser(u)}
                        className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs font-semibold transition-all border border-indigo-500/20 flex items-center gap-1.5 ml-auto cursor-pointer"
                        title="View Full Profile Details"
                      >
                        <Eye className="h-4 w-4" /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({total} total users)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal Drawer */}
      {activeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setActiveUser(null)} />
          
          <div className="relative w-full max-w-3xl h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-10">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-600 border border-indigo-400/30 flex items-center justify-center text-white font-bold">
                  {activeUser.name ? activeUser.name[0].toUpperCase() : <UserIcon className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">{activeUser.name || "Member Profile"}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{activeUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveUser(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable details panel */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailsLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
              ) : !details ? (
                <div className="text-center text-slate-400 py-12">Could not retrieve account details.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Main section details */}
                  <div className="md:col-span-2 space-y-6">
                    {/* Active Subscription & Plan Details */}
                    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-indigo-400" /> Active Subscription & Billing
                        </h4>
                        <div>
                          {renderSubscriptionBadge(details.subscription || details.user.subscription)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Plan Tier</div>
                          <div className="text-white mt-0.5 font-bold capitalize">
                            {(details.subscription?.plan_name || details.subscription?.plan_type || details.user.subscription?.plan_type || 'Starter Free')}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Status</div>
                          <div className="text-emerald-400 mt-0.5 font-semibold capitalize flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            {details.subscription?.status || details.user.subscription?.status || 'Active (Free)'}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Period / Renews At</div>
                          <div className="text-slate-200 mt-0.5 font-medium flex items-center gap-1 text-xs">
                            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            {details.subscription?.expires_at || details.subscription?.current_period_end || details.subscription?.renews_at
                              ? new Date(details.subscription.expires_at || details.subscription.current_period_end || details.subscription.renews_at || '').toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })
                              : "Free forever (Never expires)"}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Trial Status</div>
                          <div className="text-slate-200 mt-0.5 font-medium text-xs">
                            {details.subscription?.trial_started_at
                              ? `Trial activated (${new Date(details.subscription.trial_started_at).toLocaleDateString()})`
                              : "No active trial claim"}
                          </div>
                        </div>
                      </div>

                      {/* Usage summary if available */}
                      {details.usage && (
                        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-slate-400 font-bold block">Current Period Docs</span>
                            <span className="text-white font-black text-sm">{details.usage.documents_used ?? 0}</span>
                          </div>
                          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-slate-400 font-bold block">Current Period Reports</span>
                            <span className="text-white font-black text-sm">{details.usage.reports_used ?? 0}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Profile Completeness Tracker */}
                    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-3">
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-white flex items-center gap-2">
                          <Award className="h-4 w-4 text-indigo-400" /> Profile Setup Completeness
                        </span>
                        <span className="text-indigo-400 font-bold">{details.profile_completeness}%</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-3.5 overflow-hidden border border-slate-800 p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${
                            details.profile_completeness < 40 ? "from-rose-500 to-orange-500" :
                            details.profile_completeness < 75 ? "from-amber-400 to-indigo-500" :
                            "from-indigo-500 to-emerald-500"
                          }`}
                          style={{ width: `${details.profile_completeness}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        {details.company_settings?.displayName && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Name set</span>}
                        {details.company_settings?.bankName && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Bank set</span>}
                        {details.company_settings?.logoUrl && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Logo uploaded</span>}
                        {details.company_settings?.currency && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Currency: {details.company_settings.currency}</span>}
                      </div>
                    </div>

                    {/* Account Security & Status */}
                    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                      <h4 className="text-sm font-semibold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-indigo-400" /> Account Security & Status
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Signup Date</div>
                          <div className="text-slate-200 mt-0.5 font-medium">
                            {details.user.created_at ? new Date(details.user.created_at).toLocaleString() : "N/A"}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Account Age</div>
                          <div className="text-slate-200 mt-0.5 font-medium flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                            {getAccountAge(details.user.created_at)}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Last Signed In</div>
                          <div className="text-slate-200 mt-0.5 font-medium">
                            {details.user.last_sign_in_at ? new Date(details.user.last_sign_in_at).toLocaleString() : "N/A"}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Sign-in Provider</div>
                          <div className="text-slate-200 mt-0.5 font-medium capitalize">
                            {details.user.provider || "Email"}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Email Verified</div>
                          <div className="text-slate-200 mt-0.5 font-medium">
                            {details.user.email_verified ? "Yes ✅" : "No ❌"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Business Profile Details */}
                    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                      <h4 className="text-sm font-semibold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-indigo-400" /> Business Details
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Display Name</div>
                          <div className="text-slate-200 mt-0.5 font-medium">{details.company_settings?.displayName || details.user.name || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Tax ID / PAN</div>
                          <div className="text-slate-200 mt-0.5 font-medium">{details.company_settings?.taxId || details.company_settings?.pan || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Phone</div>
                          <div className="text-slate-200 mt-0.5 font-medium">{details.company_settings?.phone || details.user.phone || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Address</div>
                          <div className="text-slate-200 mt-0.5 font-medium truncate">{details.company_settings?.address || "N/A"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Banking Details */}
                    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                      <h4 className="text-sm font-semibold text-white border-b border-slate-800 pb-2">Banking & Billing Setup</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Bank Name</div>
                          <div className="text-slate-200 mt-0.5 font-medium">{details.company_settings?.bankName || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Account Number</div>
                          <div className="text-slate-200 mt-0.5 font-medium font-mono">
                            {details.company_settings?.accountNumber 
                              ? `•••• •••• •••• ${details.company_settings.accountNumber.slice(-4)}`
                              : "N/A"}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">IFSC Code</div>
                          <div className="text-slate-200 mt-0.5 font-medium font-mono">{details.company_settings?.ifsc || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">UPI ID</div>
                          <div className="text-slate-200 mt-0.5 font-medium">{details.company_settings?.upiId || "N/A"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Support Tickets History */}
                    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                      <h4 className="text-sm font-semibold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                        <TicketIcon className="h-4 w-4 text-indigo-400" /> Support Tickets History
                      </h4>
                      {details.tickets.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No tickets raised by this user.</p>
                      ) : (
                        <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto">
                          {details.tickets.map((t) => (
                            <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                              <div>
                                <div className="font-semibold text-slate-200">{t.subject}</div>
                                <div className="text-slate-400 mt-0.5">{new Date(t.created_at).toLocaleDateString()}</div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                                t.status === "Open" ? "bg-rose-500/10 text-rose-400" : "bg-slate-800 text-slate-400"
                              }`}>
                                {t.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sidebar stats & notes */}
                  <div className="space-y-6">
                    {/* Usage Stats */}
                    <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-4">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">Usage Stats</h4>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Total Invoices</div>
                            <div className="text-xl font-bold text-white">{details.invoice_stats.total_created}</div>
                          </div>
                        </div>

                        {details.invoice_stats.has_recurring && (
                          <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 w-max">
                            <Repeat className="h-3.5 w-3.5" /> Recurring Enabled
                          </div>
                        )}

                        {details.invoice_stats.total_created > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-800">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Status Breakdown</span>
                            <div className="space-y-1">
                              {Object.entries(details.invoice_stats.status_breakdown || {}).map(([status, val]) => {
                                if (val === 0) return null;
                                return (
                                  <div key={status} className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 capitalize">{status}</span>
                                    <span className="text-slate-200 font-medium">{val}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                          <div className="flex flex-col bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Clients</span>
                            <span className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
                              <TrendingUp className="h-4 w-4 text-emerald-400" />
                              {details.client_count}
                            </span>
                          </div>
                          <div className="flex flex-col bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Expenses</span>
                            <span className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
                              <Receipt className="h-4 w-4 text-indigo-400" />
                              {details.expense_count}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Admin flags / Private Notes */}
                    <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">Admin Flags & Notes</h4>
                      <textarea
                        rows={3}
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Leave private notes, user behavior flags, or special terms tags here..."
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                      />
                      <button
                        onClick={handleSaveNotes}
                        disabled={notesSaving}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-indigo-600/20"
                      >
                        {notesSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Admin Notes"}
                      </button>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-rose-950/10 border border-rose-500/20 p-4 rounded-xl space-y-3">
                      <h4 className="text-xs font-extrabold text-rose-400 uppercase tracking-wide">Danger Zone</h4>
                      <button
                        onClick={async () => {
                          const confirmEmail = prompt(`WARNING: Deleting this account is permanent. This will delete all client profiles, preset items, expenses, and invoices. To confirm, type the user's email address "${activeUser.email}":`);
                          if (!confirmEmail) return;
                          if (confirmEmail.trim().toLowerCase() !== activeUser.email.toLowerCase()) {
                            alert("Confirmation email did not match. Action aborted.");
                            return;
                          }
                          try {
                            const res = await fetch(`/api/admin/users/${activeUser.uid}`, { method: "DELETE" });
                            if (res.ok) {
                              alert("User account successfully deleted.");
                              setActiveUser(null);
                              fetchUsers();
                            } else {
                              const errData = await res.json();
                              alert(errData.detail || "Failed to delete user account.");
                            }
                          } catch (err) {
                            console.error(err);
                            alert("An error occurred trying to delete user.");
                          }
                        }}
                        className="w-full py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete User Account
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
