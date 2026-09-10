import { useState } from "react";
import { useListGenres } from "@workspace/api-client-react";
import PosterCard from "@/components/PosterCard";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, SlidersHorizontal, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

function useBrowse(q: string, genre: string, minRating: number, year: number | null) {
  return useQuery({
    queryKey: ["/api/search", { q, genre, minRating, year }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("q", q.trim());
      if (genre && genre !== "all") params.set("genre", genre);
      if (minRating > 0) params.set("minRating", String(minRating));
      if (year && year > 1900) params.set("year", String(year));
      params.set("limit", "60");
      return customFetch<any[]>(`/api/search?${params.toString()}`);
    },
  });
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string>("all");
  const [minRating, setMinRating] = useState<string>("0");
  const [year, setYear] = useState<string>("all");

  const { data: genres = [] } = useListGenres();

  const numRating = Number(minRating);
  const numYear = year !== "all" ? Number(year) : null;
  const { data: results, isLoading } = useBrowse(query, genre, numRating, numYear);

  const rawResults = results as any;
  const searchData: any[] = Array.isArray(rawResults)
    ? rawResults
    : rawResults?.data || [];

  const quickSearches = ["Christopher Nolan", "Sci-Fi", "Marvel", "Space", "Anime", "Bong Joon-ho", "Academy Award", "Cyberpunk"];

  return (
    <div className="pt-24 px-4 md:px-12 pb-24 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Search & Filter Bar */}
        <div className="bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            {/* Text search */}
            <div className="flex-1 w-full space-y-2">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <SearchIcon className="w-4 h-4 text-primary" /> Movie, Cast, Director or Keyword
              </label>
              <div className="relative">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Interstellar, Christopher Nolan, Sci-Fi..."
                  className="pl-11 bg-zinc-950 border-zinc-700 text-white text-base py-6 focus-visible:ring-primary rounded-xl"
                />
              </div>
            </div>

            {/* Genre filter */}
            <div className="w-full md:w-48 space-y-2">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Genre
              </label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white py-6 rounded-xl">
                  <SelectValue placeholder="All Genres" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-white max-h-80">
                  <SelectItem value="all">All Genres</SelectItem>
                  {genres.map((g: string) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rating filter */}
            <div className="w-full md:w-44 space-y-2">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Min Rating</label>
              <Select value={minRating} onValueChange={setMinRating}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white py-6 rounded-xl">
                  <SelectValue placeholder="Any Rating" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                  <SelectItem value="0">Any Rating</SelectItem>
                  <SelectItem value="7">7.0+ Stars</SelectItem>
                  <SelectItem value="8">8.0+ Stars</SelectItem>
                  <SelectItem value="8.5">8.5+ Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Search Tag Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs text-zinc-400 font-semibold flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-primary" /> Popular:
            </span>
            {quickSearches.map((qs) => (
              <button
                key={qs}
                onClick={() => setQuery(qs)}
                className="text-xs bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white px-3 py-1.5 rounded-full transition-colors"
              >
                {qs}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-white">
              {query.trim() ? `Search Results for "${query}"` : "Discover Movies"}
            </h2>
            <span className="text-xs text-zinc-400 font-semibold">{searchData.length} movies found</span>
          </div>

          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-lg bg-zinc-900 border border-zinc-800 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && searchData.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {searchData.map((item: any) => (
                <PosterCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {!isLoading && searchData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-400 space-y-3">
              <SearchIcon className="w-16 h-16 opacity-20" />
              <p className="text-lg font-medium text-white">No movies match your search</p>
              <p className="text-xs text-zinc-500">Try searching with different keywords or genre filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
