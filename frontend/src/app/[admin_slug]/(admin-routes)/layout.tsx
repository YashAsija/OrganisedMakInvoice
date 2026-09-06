"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Ticket,
  Users,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  User,
  Loader2,
  ClipboardList,
  BarChart2
} from "lucide-react";

interface AdminShellLayoutProps {
  children: React.ReactNode;
}

export default function AdminShellLayout({ children }: AdminShellLayoutProps) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const adminSlug = params.admin_slug as string;

  const [adminEmail, setAdminEmail] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("makinvoices_admin_email") || null;
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      // If we already have a cached admin email in session, mount the shell instantly (0ms delay)
      return !sessionStorage.getItem("makinvoices_admin_email");
    }
    return true;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Prefetch all admin routes and warm them up in browser cache
    if (adminSlug) {
      router.prefetch(`/${adminSlug}/dashboard`);
      router.prefetch(`/${adminSlug}/analytics`);
      router.prefetch(`/${adminSlug}/tickets`);
      router.prefetch(`/${adminSlug}/users`);
      router.prefetch(`/${adminSlug}/audit-log`);
    }

    // Check if the admin is authenticated in the background
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/me");
        if (!res.ok) {
          throw new Error("Unauthenticated");
        }
        const data = await res.json();
        setAdminEmail(data.email);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("makinvoices_admin_email", data.email);
        }
        setLoading(false);
      } catch (err) {
        // Not authenticated -> clear cache and redirect to login
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("makinvoices_admin_email");
          sessionStorage.removeItem("makinvoices_admin_stats_cache");
          sessionStorage.removeItem("makinvoices_admin_users_cache");
          sessionStorage.removeItem("makinvoices_admin_analytics_cache");
          sessionStorage.removeItem("makinvoices_admin_tickets_cache");
          sessionStorage.removeItem("makinvoices_admin_audit_logs_cache");
        }
        router.push(`/${adminSlug}`);
      }
    };
    checkAuth();
  }, [adminSlug, router]);

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("makinvoices_admin_email");
      sessionStorage.removeItem("makinvoices_admin_stats_cache");
      sessionStorage.removeItem("makinvoices_admin_users_cache");
      sessionStorage.removeItem("makinvoices_admin_analytics_cache");
    }
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push(`/${adminSlug}`);
    } catch (err) {
      console.error("Logout failed:", err);
      router.push(`/${adminSlug}`);
    }
  };

  const menuItems = [
    {
      name: "Dashboard",
      href: `/${adminSlug}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      name: "Analytics",
      href: `/${adminSlug}/analytics`,
      icon: BarChart2,
    },
    {
      name: "Tickets",
      href: `/${adminSlug}/tickets`,
      icon: Ticket,
    },
    {
      name: "Users",
      href: `/${adminSlug}/users`,
      icon: Users,
    },
    {
      name: "Audit Log",
      href: `/${adminSlug}/audit-log`,
      icon: ClipboardList,
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="text-sm font-medium">Verifying admin session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dark flex min-h-screen bg-[#070b14] text-slate-100 font-sans antialiased">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-[#0f172a] border-r border-slate-800">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          {/* Logo / Title */}
          <div className="flex items-center px-6 gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-400" />
            <span className="text-lg font-bold tracking-wider text-white uppercase">Ops Center</span>
          </div>
          {/* Nav links */}
          <nav className="mt-8 flex-1 px-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        {/* User profile footer */}
        <div className="flex-shrink-0 flex border-t border-slate-800 p-4 bg-slate-900/50">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center min-w-0">
              <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 border border-slate-700">
                <User className="h-5 w-5" />
              </div>
              <div className="ml-3 min-w-0">
                <p className="text-xs text-slate-400">Signed in as</p>
                <p className="text-sm font-medium text-slate-705 truncate max-w-[120px]">{adminEmail}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header & Menu Toggle */}
      <div className="flex flex-col flex-1 md:pl-64">
        <header className="sticky top-0 z-10 md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            <span className="text-md font-bold text-white uppercase tracking-wider">Ops Center</span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none cursor-pointer"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {/* Mobile menu overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <nav className="fixed top-0 bottom-0 left-0 w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-indigo-400" />
                  <span className="text-lg font-bold text-white uppercase tracking-wider">Ops Center</span>
                </div>
                <div className="space-y-1">
                  {menuItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                          isActive
                            ? "bg-indigo-600 text-white"
                            : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <Icon className="mr-3 h-5 w-5" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
                <div className="flex items-center min-w-0">
                  <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="ml-3 min-w-0">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="text-sm font-medium text-slate-705 truncate max-w-[110px]">{adminEmail}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
