import { useState } from "react";
import { Link } from "wouter";
import { Play, Info, Plus, Check, Star } from "lucide-react";
import type { Item } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch, getGetHomeRecommendationsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import TrailerModal from "./TrailerModal";

interface HeroBannerProps {
  item: Item;
}

export default function HeroBanner({ item }: HeroBannerProps) {
  const [imgError, setImgError] = useState(false);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: watchlistStatus, refetch: refetchWatchlist } = useQuery({
    queryKey: ['/api/watchlist/check', item?.id],
    queryFn: () => customFetch<{ inWatchlist: boolean }>(`/api/watchlist/check/${item.id}`),
    enabled: !!item?.id,
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

  const handlePlayTrailer = () => {
    setIsTrailerOpen(true);
    logInteraction.mutate("trailer_play");
  };

  const handleToggleWatchlist = () => {
    if (inWatchlist) {
      removeFromWatchlist.mutate();
    } else {
      addToWatchlist.mutate();
    }
  };

  const matchPercent = item.rating ? Math.min(99, Math.round(item.rating * 10 + 10)) : 95;

  return (
    <div className="relative w-full h-[75vh] md:h-[88vh] bg-black overflow-hidden select-none">
      {/* Backdrop Image */}
      <div className="absolute inset-0">
        {item.backdropUrl && !imgError ? (
          <img
            src={item.backdropUrl}
            alt={item.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center opacity-85 scale-105 transition-transform duration-1000"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-zinc-950 via-zinc-900 to-black"></div>
        )}
      </div>

      {/* Netflix Vignette Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent w-full md:w-[65%]"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent h-40"></div>

      {/* Hero Content */}
      <div className="absolute bottom-[12%] md:bottom-[18%] left-0 p-6 md:px-12 w-full md:w-[55%] lg:w-[48%] flex flex-col justify-end z-10 space-y-4">
        {/* StreamFlix Badge & Genres */}
        <div className="flex items-center gap-2 text-xs md:text-sm font-bold tracking-wider text-zinc-300">
          <span className="bg-primary text-white text-[11px] font-black px-1.5 py-0.5 rounded">STREAMFLIX</span>
          <span>ORIGINAL</span>
          {item.genres && item.genres.length > 0 && (
            <>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-200">{item.genres.slice(0, 3).join(", ")}</span>
            </>
          )}
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight drop-shadow-2xl">
          {item.title}
        </h1>

        {/* Tagline or Metadata Badges */}
        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm font-semibold text-zinc-300">
          <span className="text-green-400 font-bold">{matchPercent}% Match</span>
          <span className="text-zinc-400">{item.releaseYear}</span>
          {item.duration && (
            <span className="text-zinc-400">
              {Math.floor(item.duration / 60)}h {item.duration % 60}m
            </span>
          )}
          <span className="border border-zinc-600 px-1.5 py-0.5 rounded text-[11px] uppercase tracking-wider text-zinc-400">
            HD
          </span>
          <span className="border border-zinc-600 px-1.5 py-0.5 rounded text-[11px] uppercase tracking-wider text-zinc-400">
            5.1
          </span>
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{item.rating?.toFixed(1)}</span>
          </div>
        </div>

        {/* Description / Overview */}
        <p className="text-zinc-200 text-sm md:text-base lg:text-lg line-clamp-3 md:line-clamp-4 font-normal drop-shadow leading-relaxed max-w-xl">
          {item.tagline ? `"${item.tagline}" ` : ""}
          {item.description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            size="lg"
            onClick={handlePlayTrailer}
            className="bg-white text-black hover:bg-white/90 text-base md:text-lg font-bold px-6 md:px-8 py-5 md:py-6 rounded-lg flex items-center shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 md:w-6 md:h-6 mr-2 fill-current" />
            Play Trailer
          </Button>

          <Button
            size="lg"
            variant="secondary"
            onClick={handleToggleWatchlist}
            className="bg-zinc-800/80 hover:bg-zinc-700/90 text-white text-base md:text-lg font-semibold px-5 md:px-6 py-5 md:py-6 rounded-lg flex items-center backdrop-blur-md border border-zinc-700/60 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            {inWatchlist ? (
              <>
                <Check className="w-5 h-5 mr-2 text-green-400" /> In List
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" /> My List
              </>
            )}
          </Button>

          <Link href={`/item/${item.id}`}>
            <Button
              size="lg"
              variant="ghost"
              className="bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-300 hover:text-white text-base md:text-lg font-semibold px-4 md:px-5 py-5 md:py-6 rounded-lg flex items-center border border-zinc-700/40 transition-colors cursor-pointer"
            >
              <Info className="w-5 h-5 mr-1.5" /> Details
            </Button>
          </Link>
        </div>
      </div>

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={isTrailerOpen}
        onClose={() => setIsTrailerOpen(false)}
        title={item.title}
        trailerKey={item.trailerKey}
      />
    </div>
  );
}
