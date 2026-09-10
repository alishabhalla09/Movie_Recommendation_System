import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { customFetch, useListGenres } from "@workspace/api-client-react";
import PosterCard from "@/components/PosterCard";
import { Film } from "lucide-react";

export default function GenrePage() {
  const params = useParams();
  const activeGenre = params.genre ? decodeURIComponent(params.genre) : "Action";
  const [sortBy, setSortBy] = useState<"popular" | "rating" | "new">("popular");

  const { data: genres = [] } = useListGenres();

  const { data: genreData, isLoading } = useQuery({
    queryKey: ["/api/items/genre", activeGenre, sortBy],
    queryFn: () =>
      customFetch<any>(`/api/items/genre/${encodeURIComponent(activeGenre)}?limit=30&sortBy=${sortBy}`),
    enabled: !!activeGenre,
  });

  const items = genreData?.items || [];

  return (
    <div className="pt-24 px-4 md:px-12 pb-24 min-h-screen bg-background">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary tracking-widest uppercase mb-1">
            <Film className="w-4 h-4" /> Genre Exploration
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white">{activeGenre} Movies</h1>
        </div>

        {/* Sort Filter Tabs */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setSortBy("popular")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              sortBy === "popular" ? "bg-primary text-white shadow-md" : "text-zinc-400 hover:text-white"
            }`}
          >
            Most Popular
          </button>
          <button
            onClick={() => setSortBy("rating")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              sortBy === "rating" ? "bg-primary text-white shadow-md" : "text-zinc-400 hover:text-white"
            }`}
          >
            Top Rated
          </button>
          <button
            onClick={() => setSortBy("new")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              sortBy === "new" ? "bg-primary text-white shadow-md" : "text-zinc-400 hover:text-white"
            }`}
          >
            New Releases
          </button>
        </div>
      </div>

      {/* Genre Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
        {genres.map((g) => (
          <Link
            key={g}
            href={`/genres/${encodeURIComponent(g)}`}
            className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all ${
              g.toLowerCase() === activeGenre.toLowerCase()
                ? "bg-white text-black shadow-lg scale-105"
                : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800"
            }`}
          >
            {g}
          </Link>
        ))}
      </div>

      {/* Movies Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-zinc-900 rounded-lg animate-pulse border border-zinc-800"></div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {items.map((item: any) => (
            <PosterCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-zinc-500 space-y-2">
          <p className="text-lg">No movies found in this genre yet.</p>
          <p className="text-xs">Import more movies using the TMDB Admin dashboard.</p>
        </div>
      )}
    </div>
  );
}
