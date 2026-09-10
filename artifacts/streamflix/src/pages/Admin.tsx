import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Film, Activity, Bookmark, MessageSquare, Download, RefreshCw, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["#e11d48", "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#a4de6c", "#38bdf8"];

const GENRES_LIST = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 18, name: "Drama" },
  { id: 14, name: "Fantasy" },
  { id: 27, name: "Horror" },
  { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" },
];

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // TMDB Import State
  const [importType, setImportType] = useState<"popular" | "trending" | "top_rated" | "now_playing" | "genre" | "year">("popular");
  const [importPages, setImportPages] = useState(3);
  const [selectedGenreId, setSelectedGenreId] = useState<number>(28);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [lastImportResult, setLastImportResult] = useState<any>(null);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: () => customFetch<any>(`/api/admin/stats`),
  });

  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["/api/admin/analytics"],
    queryFn: () => customFetch<any>(`/api/admin/analytics`),
  });

  // TMDB Import Mutation
  const importTmdb = useMutation({
    mutationFn: (body: any) =>
      customFetch<any>(`/api/admin/tmdb/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      setLastImportResult(data);
      toast({
        title: "TMDB Import Succeeded",
        description: `${data.imported} movies added, ${data.updated} updated.`,
      });
      refetchStats();
      refetchAnalytics();
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast({
        title: "Import Failed",
        description: err.message || "Failed to import from TMDB",
        variant: "destructive",
      });
    },
  });

  // Retrain Recommender Mutation
  const retrainRecommender = useMutation({
    mutationFn: () => customFetch<any>(`/api/admin/recommender/train`, { method: "POST" }),
    onSuccess: () => {
      toast({
        title: "ML Training Started",
        description: "ALS collaborative filtering model is retraining in the background.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Retrain Error",
        description: err.message || "Could not reach recommender service",
        variant: "destructive",
      });
    },
  });

  const handleStartImport = () => {
    const payload: any = {
      type: importType,
      pages: importPages,
    };
    if (importType === "genre") {
      payload.genreId = selectedGenreId;
    } else if (importType === "year") {
      payload.year = selectedYear;
    }
    importTmdb.mutate(payload);
  };

  if (statsLoading || analyticsLoading) {
    return (
      <div className="pt-32 min-h-screen flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400 font-medium">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats || !analytics) {
    return (
      <div className="pt-32 min-h-screen flex items-center justify-center text-white">
        Failed to load admin data
      </div>
    );
  }

  return (
    <div className="pt-24 px-4 md:px-12 pb-24 min-h-screen bg-background">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white">Admin Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Manage catalog, import from TMDB, monitor platform analytics & ML recommendations
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => retrainRecommender.mutate()}
          disabled={retrainRecommender.isPending}
          className="border-zinc-700 bg-zinc-900/80 text-white hover:bg-zinc-800 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          {retrainRecommender.isPending ? "Retraining ML..." : "Retrain Recommendation Engine"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        {[
          { label: "Total Users", value: stats.totalUsers, icon: Users },
          { label: "Catalog Movies", value: stats.totalItems, icon: Film },
          { label: "User Interactions", value: stats.totalInteractions, icon: Activity },
          { label: "Watchlist Saves", value: stats.totalWatchlistEntries, icon: Bookmark },
          { label: "Audience Reviews", value: stats.totalReviews, icon: MessageSquare },
        ].map((stat, idx) => (
          <div key={idx} className="bg-zinc-900/70 p-5 rounded-2xl border border-zinc-800 flex items-center gap-4 shadow-md">
            <div className="p-3 bg-primary/15 text-primary rounded-xl shrink-0">
              <stat.icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-400 font-semibold truncate">{stat.label}</p>
              <p className="text-2xl font-bold text-white tracking-tight">{stat.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* TMDB CATALOG IMPORT PANEL */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 md:p-8 mb-10 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-primary/20 text-primary rounded-xl">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">TMDB Catalog Importer</h2>
            <p className="text-xs text-zinc-400">
              Fetch movie metadata, high-res posters, backdrops, cast, crew, and verified YouTube trailers
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          {/* Import Source Type */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2 uppercase tracking-wider">
              Import Source
            </label>
            <select
              value={importType}
              onChange={(e) => setImportType(e.target.value as any)}
              className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="popular">Popular Movies</option>
              <option value="trending">Trending This Week</option>
              <option value="top_rated">Top Rated Movies</option>
              <option value="now_playing">Now Playing in Theaters</option>
              <option value="genre">By Specific Genre</option>
              <option value="year">By Release Year</option>
            </select>
          </div>

          {/* Conditional: Genre or Year */}
          {importType === "genre" && (
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-2 uppercase tracking-wider">
                Select Genre
              </label>
              <select
                value={selectedGenreId}
                onChange={(e) => setSelectedGenreId(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {GENRES_LIST.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {importType === "year" && (
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-2 uppercase tracking-wider">
                Release Year
              </label>
              <input
                type="number"
                min="1950"
                max="2026"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          )}

          {/* Number of Pages */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2 uppercase tracking-wider">
              Pages to Fetch: <span className="text-primary font-bold">{importPages} ({importPages * 20} movies)</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={importPages}
              onChange={(e) => setImportPages(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer mt-2"
            />
          </div>

          {/* Trigger Button */}
          <div>
            <Button
              onClick={handleStartImport}
              disabled={importTmdb.isPending}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02] active:scale-98"
            >
              {importTmdb.isPending ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> Ingesting TMDB...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" /> Start TMDB Import
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Live Import Results Status */}
        {lastImportResult && (
          <div className="mt-6 p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" /> {lastImportResult.message}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 text-center">
                <span className="text-zinc-400 block">Imported</span>
                <span className="text-lg font-bold text-green-400">{lastImportResult.imported}</span>
              </div>
              <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 text-center">
                <span className="text-zinc-400 block">Updated</span>
                <span className="text-lg font-bold text-blue-400">{lastImportResult.updated}</span>
              </div>
              <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 text-center">
                <span className="text-zinc-400 block">Skipped</span>
                <span className="text-lg font-bold text-zinc-400">{lastImportResult.skipped}</span>
              </div>
              <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 text-center">
                <span className="text-zinc-400 block">Failed</span>
                <span className="text-lg font-bold text-red-400">{lastImportResult.failed}</span>
              </div>
            </div>

            {lastImportResult.details && lastImportResult.details.length > 0 && (
              <div className="max-h-32 overflow-y-auto text-[11px] text-zinc-400 font-mono bg-black/50 p-2 rounded border border-zinc-800/80">
                {lastImportResult.details.map((d: string, idx: number) => (
                  <div key={idx}>{d}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Genre Distribution */}
        <div className="bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 shadow-xl">
          <h2 className="text-xl font-bold mb-6 text-white">Genre Distribution in Catalog</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.genreDistribution.slice(0, 10)}>
                <XAxis dataKey="genre" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interaction Types */}
        <div className="bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 shadow-xl">
          <h2 className="text-xl font-bold mb-6 text-white">User Interactions Breakdown</h2>
          <div className="h-80 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.interactionsByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="eventType"
                >
                  {analytics.interactionsByType.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
