"use client";

import { useEffect, useState } from "react";
import { 
  ClipboardList, 
  Loader2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";

interface AuditLog {
  id: number;
  ip_address: string;
  user_agent: string;
  status: string;
  details: string;
  created_at: string;
}

export default function AuditLogsAdminPage() {
  const [logs, setLogs] = useState<AuditLog[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("makinvoices_admin_audit_logs_cache");
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return [];
  });
  const [total, setTotal] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("makinvoices_admin_audit_logs_total");
        if (cached) return parseInt(cached, 10);
      } catch (e) {}
    }
    return 0;
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !sessionStorage.getItem("makinvoices_admin_audit_logs_cache");
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    if (logs.length === 0) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/audit-logs?page=${page}&limit=${limit}`);
      if (!res.ok) {
        throw new Error("Could not retrieve audit logs");
      }
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
      if (typeof window !== "undefined" && page === 1) {
        try {
          sessionStorage.setItem("makinvoices_admin_audit_logs_cache", JSON.stringify(data.logs));
          sessionStorage.setItem("makinvoices_admin_audit_logs_total", data.total.toString());
        } catch (e) {}
      }
    } catch (err: any) {
      setError(err.message || "An error occurred fetching logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white">System Audit Trail</h1>
        <p className="text-slate-400 mt-1">Real-time log of security events, administrative logins, and panel actions.</p>
      </div>

      <div className="bg-slate-900/20 border border-slate-850 rounded-2xl overflow-hidden backdrop-blur-md">
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-60 text-rose-400 p-6">
            <AlertCircle className="h-10 w-10 mb-2 text-rose-500" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-slate-500">
            <ClipboardList className="h-10 w-10 mb-2 text-slate-650" />
            <p className="text-sm">No audit logs found on record.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800/60">
              <thead className="bg-slate-900/60">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 bg-slate-900/10">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.status === "success" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="h-3.5 w-3.5" /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <ShieldAlert className="h-3.5 w-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-705">
                      <div>{log.details}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[400px] mt-1 font-mono">{log.user_agent}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                      {log.ip_address}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="px-6 py-4 border-t border-slate-850/60 bg-slate-900/20 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({total} total logs)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
