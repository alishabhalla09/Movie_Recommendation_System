import { useState } from "react";
import { Link } from "wouter";
import type { Item } from "@workspace/api-client-react";
import { Play, Plus, Check, Info, Star } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch, getGetHomeRecommendationsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import TrailerModal from "./TrailerModal";

interface PosterCardProps {
  item: Item;
  onClick?: () => void;
}

export default function PosterCard({ item, onClick }: PosterCardProps) {
  const [imgError, setImgError] = useState(false);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: watchlistStatus, refetch: refetchWatchlist } = useQuery({
    queryKey: ['/api/watchlist/check', item.id],
    queryFn: () => customFetch<{ inWatchlist: boolean }>(`/api/watchlist/check/${item.id}`),
    enabled: !!item.id,
  });

  const addToWatchlist = useMutation({
    mutationFn: () => customFetch(`/api/watchlist/${item.id}`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: "Added to My List" });
      refetchWatchlist();
      queryClient.invalidateQueries({ queryKey: getGetHomeRecommendationsQueryKey() });
    },
  });

  const removeFromWatchlist = useMutation({
    mutationFn: () => customFetch(`/api/watchlist/${item.id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Removed from My List" });
      refetchWatchlist();
      queryClient.invalidateQueries({ queryKey: getGetHomeRecommendationsQueryKey() });
    },
  });

  const logInteraction = useMutation({
    mutationFn: (eventType: string) =>
      customFetch(`/api/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, eventType }),
      }),
  });

  const inWatchlist = watchlistStatus?.inWatchlist;

  const handlePlayTrailer = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTrailerOpen(true);
    logInteraction.mutate("trailer_play");
  };

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWatchlist) {
      removeFromWatchlist.mutate();
    } else {
      addToWatchlist.mutate();
    }
  };

  const displayImage = item.posterUrl || item.backdropUrl;
  const matchPercent = item.rating ? Math.min(99, Math.round(item.rating * 10 + 10)) : 95;

  return (
    <>
      <div className="group relative block aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-all duration-300 hover:scale-[1.06] hover:z-30 hover:shadow-2xl select-none">
        <Link href={`/item/${item.id}`} onClick={onClick} className="block w-full h-full">
          {displayImage && !imgError ? (
            <img
              src={displayImage}
              alt={item.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex flex-col items-center justify-center p-4 text-center">
              <span className="font-bold text-sm md:text-base text-white opacity-90">{item.title}</span>
              {item.releaseYear && (
                <span className="text-xs text-primary mt-2 font-semibold">{item.releaseYear}</span>
              )}
            </div>
          )}
        </Link>

        {/* Netflix Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 pointer-events-none group-hover:pointer-events-auto">
          {/* Quick Actions Bar */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handlePlayTrailer}
              title="Play Trailer"
              className="w-8 h-8 rounded-full bg-white text-black hover:bg-white/90 flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 focus:outline-none"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </button>

            <button
              onClick={handleToggleWatchlist}
              title={inWatchlist ? "Remove from My List" : "Add to My List"}
              className="w-8 h-8 rounded-full bg-zinc-800/90 text-white hover:bg-zinc-700 border border-zinc-600/80 flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 focus:outline-none"
            >
              {inWatchlist ? <Check className="w-4 h-4 text-green-400" /> : <Plus className="w-4 h-4" />}
            </button>

            <Link
              href={`/item/${item.id}`}
              onClick={onClick}
              title="More Info"
              className="w-8 h-8 rounded-full bg-zinc-800/90 text-white hover:bg-zinc-700 border border-zinc-600/80 flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 focus:outline-none ml-auto"
            >
              <Info className="w-4 h-4" />
            </Link>
          </div>

          {/* Title */}
          <Link href={`/item/${item.id}`} onClick={onClick}>
            <h3 className="text-white font-bold text-xs md:text-sm line-clamp-1 leading-tight hover:text-primary transition-colors">
              {item.title}
            </h3>
          </Link>

          {/* Metadata Badges */}
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-300 font-semibold">
            <span className="text-green-400">{matchPercent}%</span>
            <span>{item.releaseYear}</span>
            <span className="border border-zinc-700 px-1 rounded text-[9px] text-zinc-400">HD</span>
            <span className="flex items-center gap-0.5 text-amber-400 ml-auto">
              <Star className="w-2.5 h-2.5 fill-current" />
              {item.rating?.toFixed(1)}
            </span>
          </div>

          {/* Genres */}
          {item.genres && item.genres.length > 0 && (
            <div className="text-[10px] text-zinc-400 mt-1 truncate">
              {item.genres.slice(0, 2).join(" • ")}
            </div>
          )}
        </div>
      </div>

      <TrailerModal
        isOpen={isTrailerOpen}
        onClose={() => setIsTrailerOpen(false)}
        title={item.title}
        trailerKey={item.trailerKey}
      />
    </>
  );
}
