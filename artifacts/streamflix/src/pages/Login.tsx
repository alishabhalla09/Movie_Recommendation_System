import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Tv,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  UserCheck,
  Film,
  Compass,
} from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useLogin();
  const queryClient = useQueryClient();

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    toast({
      title: "Credentials Auto-filled",
      description: `Loaded account for ${demoEmail}`,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          localStorage.setItem("streamflix_token", data.token);
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          queryClient.resetQueries({ queryKey: getGetMeQueryKey() });
          toast({
            title: "Welcome back!",
            description: "Signed in successfully to StreamFlix.",
          });
          setLocation("/");
        },
        onError: () => {
          toast({
            title: "Sign in failed",
            description: "Invalid email or password. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between relative overflow-hidden selection:bg-red-600 selection:text-white">
      {/* ─── Cinematic Background Backdrop ─── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Poster Grid Layer */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 scale-105 transition-transform duration-1000 ease-out"
          style={{
            backgroundImage: `url('https://image.tmdb.org/t/p/original/rAiYTPIHVikqw950NX87ttAc8st.jpg')`,
          }}
        />
        {/* Vignette Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-red-950/40 via-transparent to-black" />
        {/* Subtle Ambient Red Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
      </div>

      {/* ─── Top Navigation Bar ─── */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-red-600 font-extrabold text-2xl md:text-3xl tracking-tighter uppercase transition-transform hover:scale-105 duration-200"
        >
          <div className="p-1.5 rounded-lg bg-red-600/15 border border-red-600/30 group-hover:bg-red-600/25 transition-colors">
            <Tv className="w-6 h-6 text-red-600 drop-shadow-[0_0_8px_rgba(229,9,20,0.8)]" />
          </div>
          <span className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(229,9,20,0.4)]">
            STREAMFLIX
          </span>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs md:text-sm font-medium text-zinc-300 bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 hover:text-white transition-all backdrop-blur-md"
        >
          <Compass className="w-3.5 h-3.5 text-red-500" />
          <span>Explore Catalog</span>
        </Link>
      </header>

      {/* ─── Center Login Card Container ─── */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[460px] p-8 md:p-10 rounded-2xl bg-zinc-950/85 border border-zinc-800/80 shadow-[0_8px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(229,9,20,0.08)] backdrop-blur-2xl transition-all">
          <div className="mb-7">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-red-950/60 border border-red-800/40 text-red-400 mb-3">
              <Sparkles className="w-3 h-3" />
              Member Access
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Sign In
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Enter your credentials to access your personalized library
            </p>
          </div>

          {/* Quick 1-Click Demo Accounts Pill Bar */}
          <div className="mb-6 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 px-0.5">
              <span className="flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-red-500" />
                Quick 1-Click Demo Fill:
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleQuickFill("admin@streamflix.com", "streamflix123")
                }
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 hover:border-red-500/50 text-xs font-semibold text-zinc-200 transition-all text-center group cursor-pointer"
              >
                <span>👑</span>
                <span className="group-hover:text-red-400 transition-colors">
                  Admin
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickFill("demo@streamflix.com", "streamflix123")
                }
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 hover:border-red-500/50 text-xs font-semibold text-zinc-200 transition-all text-center group cursor-pointer"
              >
                <span>🍿</span>
                <span className="group-hover:text-red-400 transition-colors">
                  Demo User
                </span>
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 pr-4 py-5 bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() =>
                    toast({
                      title: "Password Assistance",
                      description:
                        "Use the quick 1-click demo buttons above (admin or demo).",
                    })
                  }
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Need help?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-11 py-5 bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-400 hover:text-zinc-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-red-600 focus:ring-red-600 focus:ring-offset-0 focus:ring-1"
                />
                <span>Remember this device</span>
              </label>
            </div>

            {/* Submit Action Button */}
            <Button
              type="submit"
              className="w-full py-6 text-base font-bold tracking-wide rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:shadow-[0_0_30px_rgba(229,9,20,0.6)] transition-all duration-200 mt-2 cursor-pointer group"
              disabled={login.isPending}
            >
              {login.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          {/* Footer Callout */}
          <div className="mt-7 pt-6 border-t border-zinc-800/80 text-center text-sm text-zinc-400">
            New to StreamFlix?{" "}
            <Link
              href="/signup"
              className="font-semibold text-white hover:text-red-400 hover:underline transition-colors"
            >
              Sign up now
            </Link>
          </div>

          {/* Security Disclaimer */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-zinc-600">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
            <span>Encrypted 256-bit secure session</span>
          </div>
        </div>
      </main>

      {/* ─── Bottom Footer ─── */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-zinc-600">
        <p>© 2026 StreamFlix Inc. All rights reserved. Powered by TMDB & Python ALS Recommender.</p>
      </footer>
    </div>
  );
}

