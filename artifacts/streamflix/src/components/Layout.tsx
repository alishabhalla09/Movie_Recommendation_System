import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Film, User as UserIcon, LogOut, Bookmark, History as HistoryIcon, ShieldAlert, Sparkles, Menu, X } from "lucide-react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const logout = useLogout();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("streamflix_token");
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login";
      },
    });
  };

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Genres", href: "/genres/Action" },
    { label: "Search", href: "/search" },
    { label: "My List", href: "/watchlist" },
    { label: "History", href: "/history" },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-primary selection:text-white">
      {/* Netflix Floating / Sticky Navbar */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-zinc-950/95 backdrop-blur-md shadow-2xl border-b border-zinc-800/50 py-3"
            : "bg-gradient-to-b from-black/90 via-black/50 to-transparent py-5"
        }`}
      >
        <div className="flex items-center justify-between px-4 md:px-12">
          {/* Logo & Desktop Nav */}
          <div className="flex items-center gap-8 md:gap-10">
            <Link
              href="/"
              className="flex items-center gap-1 text-primary font-black text-2xl md:text-3xl tracking-tighter uppercase cursor-pointer transition-transform hover:scale-105"
            >
              <span className="text-white text-xl md:text-2xl mr-0.5">▶</span>
              <span>STREAM<span className="text-white">FLIX</span></span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              {navLinks.map((link) => {
                const isActive = location === link.href || (link.href.startsWith("/genres") && location.startsWith("/genres"));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`transition-colors hover:text-white ${
                      isActive ? "text-white font-bold" : "text-zinc-400"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {user?.isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-1 transition-colors hover:text-white ${
                    location === "/admin" ? "text-primary font-bold" : "text-zinc-400"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Admin
                </Link>
              )}
            </nav>
          </div>

          {/* Right Actions: Search & Profile */}
          <div className="flex items-center gap-3 md:gap-5">
            <Link
              href="/search"
              className="text-zinc-300 hover:text-white p-2 rounded-full hover:bg-zinc-800/60 transition-colors"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </Link>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg w-9 h-9 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-white cursor-pointer"
                >
                  <span className="font-bold text-sm text-primary">
                    {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border border-zinc-800 rounded-xl p-2 shadow-2xl text-zinc-200">
                <DropdownMenuLabel className="text-xs text-zinc-400 truncate font-semibold">
                  Signed in as<br />
                  <span className="text-white font-bold">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  onClick={() => setLocation("/watchlist")}
                  className="cursor-pointer flex items-center gap-2 text-sm focus:bg-zinc-900 focus:text-white rounded-lg py-2"
                >
                  <Bookmark className="w-4 h-4 text-primary" /> My List
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLocation("/history")}
                  className="cursor-pointer flex items-center gap-2 text-sm focus:bg-zinc-900 focus:text-white rounded-lg py-2"
                >
                  <HistoryIcon className="w-4 h-4 text-zinc-400" /> Viewing History
                </DropdownMenuItem>
                {user?.isAdmin && (
                  <DropdownMenuItem
                    onClick={() => setLocation("/admin")}
                    className="cursor-pointer flex items-center gap-2 text-sm focus:bg-zinc-900 focus:text-white rounded-lg py-2"
                  >
                    <ShieldAlert className="w-4 h-4 text-primary" /> Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer flex items-center gap-2 text-sm text-red-400 focus:bg-red-500/10 focus:text-red-300 rounded-lg py-2"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-zinc-300 hover:text-white p-2 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-zinc-950/98 border-b border-zinc-800 px-6 py-4 flex flex-col gap-3 animate-in slide-in-from-top-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold py-2 text-zinc-300 hover:text-white border-b border-zinc-900"
              >
                {link.label}
              </Link>
            ))}
            {user?.isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold py-2 text-primary flex items-center gap-1.5"
              >
                <ShieldAlert className="w-4 h-4" /> Admin Dashboard
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* Netflix Footer */}
      <footer className="py-12 px-6 md:px-12 border-t border-zinc-900 bg-zinc-950/60 text-zinc-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-black text-sm text-zinc-300">
            <span className="text-primary font-bold">STREAMFLIX</span> CINEMA PLATFORM
          </div>

          <p className="text-center">
            StreamFlix Discovery Platform. Movie metadata powered by The Movie Database (TMDB). Trailers powered by YouTube.
          </p>

          <p>© {new Date().getFullYear()} StreamFlix Inc.</p>
        </div>
      </footer>
    </div>
  );
}
