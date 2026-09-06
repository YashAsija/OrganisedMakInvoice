"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Lock, Mail, Loader2, AlertCircle, Eye, EyeOff, ShieldCheck } from "lucide-react";
import adminConfig from "../../../admin_config.json";
import dynamic from "next/dynamic";
import { ConfirmProvider } from "../../components/ConfirmContext";

// Lazy load main app only if slug doesn't match
const App = dynamic(() => import("../../App"), {
  ssr: false,
});

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useParams();
  const adminSlug = params.admin_slug as string;

  if (adminSlug !== adminConfig.admin_route_slug) {
    return (
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    );
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          res.status === 502 || res.status === 504 || res.status === 404
            ? "Backend server is offline or unreachable. Please verify backend is running."
            : `Server returned error (${res.status}): ${text.substring(0, 100)}`
        );
      }

      if (!res.ok) {
        throw new Error(data?.detail || "Invalid login credentials");
      }

      // Successful login -> Redirect to admin dashboard
      router.push(`/${adminSlug}/dashboard`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090d16] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden text-white">
      {/* Dynamic ambient gradient glow background */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#4f46e5]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#2563eb]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 bg-[#111827] p-8 sm:p-10 rounded-2xl border border-[#374151] shadow-2xl shadow-[#030712]/80 backdrop-blur-xl relative z-10">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4f46e5]/20 text-[#818cf8] border border-[#6366f1]/30 shadow-inner">
            <ShieldCheck className="h-7 w-7 text-[#818cf8]" />
          </div>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[#ffffff]">
            Admin Portal
          </h2>
          <p className="mt-2 text-sm font-medium text-[#9ca3af]">
            Secure internal management panel
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-center gap-3 rounded-xl bg-[#450a0a] p-4 text-sm font-semibold text-[#fca5a5] border border-[#991b1b] shadow-md animate-in fade-in duration-200">
              <AlertCircle className="h-5 w-5 shrink-0 text-[#f87171]" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label htmlFor="email-address" className="block text-sm font-bold text-[#f3f4f6] mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#9ca3af]">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-[#374151] bg-[#1f2937] py-3.5 pl-11 pr-4 text-[#ffffff] placeholder-[#9ca3af] focus:border-[#6366f1] focus:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 sm:text-sm transition-all shadow-inner font-medium"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-bold text-[#f3f4f6]">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#9ca3af]">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-[#374151] bg-[#1f2937] py-3.5 pl-11 pr-11 text-[#ffffff] placeholder-[#9ca3af] focus:border-[#6366f1] focus:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 sm:text-sm transition-all shadow-inner font-medium"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#9ca3af] hover:text-[#f3f4f6] transition-colors focus:outline-none cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-[#4f46e5] py-3.5 px-4 text-sm font-bold text-[#ffffff] shadow-lg shadow-[#4f46e5]/30 hover:bg-[#4338ca] active:bg-[#3730a3] focus:outline-none focus:ring-2 focus:ring-[#818cf8] focus:ring-offset-2 focus:ring-offset-[#111827] disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-[#ffffff]" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                "Sign In to Admin Portal"
              )}
            </button>
          </div>
        </form>

        <div className="pt-4 border-t border-[#1f2937] text-center">
          <p className="text-xs font-semibold text-[#9ca3af]">
            Protected Ops Environment • Authorized Access Only
          </p>
        </div>
      </div>
    </div>
  );
}



