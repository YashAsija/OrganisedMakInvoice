"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  Eye,
  MessageSquare,
  AlertCircle,
  CornerDownRight,
  Send,
  Loader2,
  Trash,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Tag
} from "lucide-react";

interface Ticket {
  id: string;
  user_id: string | null;
  user_email: string;
  user_name: string | null;
  subject: string;
  status: string;
  priority: string;
  category: string;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

interface UserInfo {
  uid: string;
  email: string;
  name: string | null;
  admin_notes: string | null;
}

export default function TicketsAdminPage() {
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("makinvoices_admin_tickets_cache");
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return [];
  });
  const [total, setTotal] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("makinvoices_admin_tickets_total");
        if (cached) return parseInt(cached, 10);
      } catch (e) {}
    }
    return 0;
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  // Search & Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  
  // Bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal / Detail state
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [thread, setThread] = useState<TicketMessage[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [replyText, setReplyText] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [replySending, setReplySending] = useState(false);

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !sessionStorage.getItem("makinvoices_admin_tickets_cache");
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async () => {
    if (tickets.length === 0) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort: sortOrder,
      });
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (priorityFilter) params.append("priority", priorityFilter);
      if (categoryFilter) params.append("category", categoryFilter);

      const res = await fetch(`/api/admin/tickets?${params.toString()}`);
      if (!res.ok) throw new Error("Could not retrieve tickets");
      const data = await res.json();
      setTickets(data.tickets);
      setTotal(data.total);
      if (typeof window !== "undefined" && !search && !statusFilter && !priorityFilter && !categoryFilter && page === 1) {
        try {
          sessionStorage.setItem("makinvoices_admin_tickets_cache", JSON.stringify(data.tickets));
          sessionStorage.setItem("makinvoices_admin_tickets_total", data.total.toString());
        } catch (e) {}
      }
    } catch (err: any) {
      setError(err.message || "An error occurred fetching tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter, priorityFilter, categoryFilter, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const handleSelectTicket = async (ticket: Ticket) => {
    setActiveTicket(ticket);
    setDetailsLoading(true);
    setInternalNotes(ticket.internal_notes || "");
    setThread([]);
    setUserInfo(null);

    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}`);
      if (res.ok) {
        const data = await res.json();
        setThread(data.messages);
        setUserInfo(data.user_info);
      }
    } catch (err) {
      console.error("Failed to load details:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleUpdateField = async (fields: Partial<Ticket>) => {
    if (!activeTicket) return;
    try {
      const res = await fetch(`/api/admin/tickets/${activeTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        const updatedTicket = { ...activeTicket, ...fields };
        setActiveTicket(updatedTicket);
        setTickets(tickets.map(t => t.id === activeTicket.id ? updatedTicket : t));
      }
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;
    setReplySending(true);

    try {
      const res = await fetch(`/api/admin/tickets/${activeTicket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText }),
      });
      if (res.ok) {
        setReplyText("");
        // Reload details to get new message
        handleSelectTicket(activeTicket);
      }
    } catch (err) {
      console.error("Send reply error:", err);
    } finally {
      setReplySending(false);
    }
  };

  const handleBulkUpdate = async (status: string) => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to mark ${selectedIds.length} tickets as ${status}?`)) return;

    try {
      const res = await fetch("/api/admin/tickets/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_ids: selectedIds, status }),
      });
      if (res.ok) {
        setSelectedIds([]);
        fetchTickets();
      }
    } catch (err) {
      console.error("Bulk update failed:", err);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === tickets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tickets.map(t => t.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const priorityColor = (prio: string) => {
    switch (prio) {
      case "Urgent": return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case "High": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "Medium": return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
      default: return "bg-slate-500/10 text-slate-400 border border-slate-700";
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Open": return "bg-red-500/15 text-red-400";
      case "In Progress": return "bg-amber-500/15 text-amber-400";
      case "Resolved": return "bg-emerald-500/15 text-emerald-400";
      default: return "bg-slate-500/15 text-slate-400";
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Tickets Center</h1>
          <p className="text-slate-400 mt-1">Manage and resolve user escalated tickets.</p>
        </div>

        {/* Bulk action buttons */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-900 border border-indigo-500/20 p-2 rounded-xl shadow-lg">
            <span className="text-xs font-semibold text-indigo-400 px-2">{selectedIds.length} Selected</span>
            <button
              onClick={() => handleBulkUpdate("Resolved")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all cursor-pointer"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Resolve
            </button>
            <button
              onClick={() => handleBulkUpdate("Closed")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition-all cursor-pointer"
            >
              <Trash className="h-3.5 w-3.5 text-slate-400" /> Close
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-stretch md:items-center backdrop-blur-md">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            type="text"
            placeholder="Search tickets by user email or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-850 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </form>

        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-955 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-semibold"
          >
            <option className="bg-slate-950 text-white" value="">All Statuses</option>
            <option className="bg-slate-950 text-white" value="Open">Open</option>
            <option className="bg-slate-950 text-white" value="In Progress">In Progress</option>
            <option className="bg-slate-950 text-white" value="Resolved">Resolved</option>
            <option className="bg-slate-950 text-white" value="Closed">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-955 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-semibold"
          >
            <option className="bg-slate-950 text-white" value="">All Priorities</option>
            <option className="bg-slate-950 text-white" value="Low">Low</option>
            <option className="bg-slate-950 text-white" value="Medium">Medium</option>
            <option className="bg-slate-950 text-white" value="High">High</option>
            <option className="bg-slate-950 text-white" value="Urgent">Urgent</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2 bg-slate-955 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-semibold"
          >
            <option className="bg-slate-950 text-white" value="newest">Newest First</option>
            <option className="bg-slate-950 text-white" value="oldest">Oldest First</option>
            <option className="bg-slate-950 text-white" value="priority">Highest Priority</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-slate-900/20 border border-slate-850 rounded-2xl overflow-hidden backdrop-blur-md">
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-slate-500">
            <AlertCircle className="h-10 w-10 mb-2 text-slate-600" />
            <p className="text-sm">No tickets found matching current query filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800/60">
              <thead className="bg-slate-900/60">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === tickets.length}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 tracking-wider">Subject</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 tracking-wider">Created At</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 bg-slate-900/10">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(t.id)}
                        onChange={() => handleToggleSelect(t.id)}
                        className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <div className="truncate font-bold text-white">{t.user_name || "Guest User"}</div>
                      <div className="truncate text-xs text-slate-400">{t.user_email}</div>
                    </td>
                    <td className="px-6 py-4 max-w-[280px]">
                      <div className="truncate text-white font-bold">{t.subject}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{t.category}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full ${statusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full ${priorityColor(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleSelectTicket(t)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {total > limit && (
          <div className="px-6 py-4 border-t border-slate-850/60 bg-slate-900/20 flex items-center justify-between">
            <span className="text-xs text-slate-300">
              Showing page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({total} total tickets)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Details Panel Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-xs">
          {/* Backdrop click close */}
          <div className="absolute inset-0" onClick={() => setActiveTicket(null)} />
          
          <div className="relative w-full max-w-3xl h-full bg-[#0B0F19] border-l border-slate-800 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-800/80 bg-[#0E1524]/60 flex items-center justify-between backdrop-blur-md">
              <div className="min-w-0 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest">Ticket Details</span>
                    <span className={`inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md ${statusColor(activeTicket.status)}`}>
                      {activeTicket.status}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-white truncate mt-1 tracking-tight leading-snug">{activeTicket.subject}</h3>
                </div>
              </div>
              <button
                onClick={() => setActiveTicket(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Inner Details Scroll Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailsLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Conversation thread */}
                  <div className="md:col-span-2 flex flex-col justify-between min-h-[550px]">
                    {/* Chat replies */}
                    <div className="space-y-5 overflow-y-auto flex-1 max-h-[calc(100vh-270px)] pr-2">
                      {thread.map((msg) => {
                        const isAdmin = msg.sender_type === "admin";
                        const initials = isAdmin ? "A" : (activeTicket.user_name ? activeTicket.user_name[0].toUpperCase() : "U");
                        return (
                          <div
                            key={msg.id}
                            className={`flex gap-3 max-w-[85%] ${isAdmin ? "ml-auto flex-row-reverse" : ""}`}
                          >
                            {/* Avatar */}
                            <div className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-black select-none border ${
                              isAdmin 
                                ? "bg-indigo-600 border-indigo-500 text-white" 
                                : "bg-slate-800 border-slate-700 text-slate-300"
                            }`}>
                              {initials}
                            </div>
                            
                            {/* Bubble */}
                            <div
                              className={`flex flex-col rounded-2xl px-4 py-3 border ${
                                isAdmin
                                  ? "bg-indigo-600/10 border-indigo-500/20 rounded-tr-none"
                                  : "bg-slate-950/60 border-slate-800/80 rounded-tl-none"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <span className={`text-[10px] font-black uppercase tracking-wide ${isAdmin ? "text-indigo-400" : "text-slate-400"}`}>
                                  {isAdmin ? "You (Admin)" : activeTicket.user_name || "Client"}
                                </span>
                                <span className="text-[9px] text-slate-500 font-medium">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-white mt-1.5 whitespace-pre-wrap leading-relaxed tracking-wide">{msg.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reply form */}
                    <form onSubmit={handleSendReply} className="border-t border-slate-800/80 pt-5 mt-6">
                      <div className="relative flex flex-col bg-slate-950 border border-slate-800/85 focus-within:border-indigo-500/85 rounded-2xl p-2.5 transition-all shadow-sm">
                        <textarea
                          rows={3}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type support reply details here..."
                          className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none resize-none px-2 py-1 leading-relaxed"
                        />
                        
                        <div className="flex items-center justify-between border-t border-slate-900/60 pt-2.5 mt-2 px-1">
                          <span className="text-[9px] text-slate-500 font-medium tracking-wide">
                            Shift + Enter for new line
                          </span>
                          
                          <button
                            type="submit"
                            disabled={replySending || !replyText.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm hover:scale-102 active:scale-98"
                          >
                            {replySending ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="h-3 w-3" />
                                Send Reply
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Right Column: Settings & Details */}
                  <div className="space-y-6">
                    {/* User Profile */}
                    {userInfo && (
                      <div className="bg-[#0E1524]/60 border border-slate-800/80 p-4 rounded-xl space-y-3 shadow-xs">
                        <div className="flex items-center gap-2 border-b border-slate-900/40 pb-2">
                          <User className="h-4 w-4 text-indigo-400" />
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Profile</h4>
                        </div>
                        <div className="space-y-3 text-xs">
                          <div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Name</div>
                            <div className="text-white font-semibold mt-0.5">{userInfo.name || "N/A"}</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Email</div>
                            <div className="text-white font-semibold mt-0.5 truncate">{userInfo.email}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Metadata Card */}
                    <div className="bg-[#0E1524]/60 border border-slate-800/80 p-4 rounded-xl space-y-3.5 shadow-xs">
                      <div className="flex items-center gap-2 border-b border-slate-900/40 pb-2">
                        <Tag className="h-4 w-4 text-indigo-400" />
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket Info</h4>
                      </div>
                      <div className="space-y-3 text-xs">
                        <div>
                          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Category</div>
                          <div className="text-white font-semibold mt-0.5">{activeTicket.category || "General"}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Created At</div>
                          <div className="text-white font-semibold mt-0.5">
                            {new Date(activeTicket.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ticket fields controls */}
                    <div className="bg-[#0E1524]/60 border border-slate-800/80 p-4 rounded-xl space-y-4 shadow-xs">
                      <div className="flex items-center gap-2 border-b border-slate-900/40 pb-2">
                        <Filter className="h-4 w-4 text-indigo-400" />
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Control Status</h4>
                      </div>
                      
                      <div className="space-y-3.5">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                          <div className="relative">
                            <select
                              value={activeTicket.priority}
                              onChange={(e) => handleUpdateField({ priority: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-850 hover:border-slate-850 focus:border-indigo-500 rounded-lg text-xs text-white focus:outline-none cursor-pointer transition-colors appearance-none font-semibold"
                            >
                              <option className="bg-slate-950 text-white" value="Low">Low</option>
                              <option className="bg-slate-950 text-white" value="Medium">Medium</option>
                              <option className="bg-slate-950 text-white" value="High">High</option>
                              <option className="bg-slate-950 text-white" value="Urgent">Urgent</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                          <div className="relative">
                            <select
                              value={activeTicket.status}
                              onChange={(e) => handleUpdateField({ status: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-955 border border-slate-850 hover:border-slate-850 focus:border-indigo-500 rounded-lg text-xs text-white focus:outline-none cursor-pointer transition-colors appearance-none font-semibold"
                            >
                              <option className="bg-slate-950 text-white" value="Open">Open</option>
                              <option className="bg-slate-950 text-white" value="In Progress">In Progress</option>
                              <option className="bg-slate-950 text-white" value="Resolved">Resolved</option>
                              <option className="bg-slate-950 text-white" value="Closed">Closed</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Internal Notes */}
                    <div className="bg-[#0E1524]/60 border border-slate-800/80 p-4 rounded-xl space-y-3 shadow-xs">
                      <div className="flex items-center gap-2 border-b border-slate-900/40 pb-2">
                        <AlertCircle className="h-4 w-4 text-indigo-400" />
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Notes</h4>
                      </div>
                      <textarea
                        rows={3.5}
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        onBlur={() => handleUpdateField({ internal_notes: internalNotes })}
                        placeholder="Leave notes visible only to admins here (auto saves)..."
                        className="w-full p-3 bg-slate-955 border border-slate-850 hover:border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                      />
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
