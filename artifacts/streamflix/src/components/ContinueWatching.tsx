import { useState, useRef } from "react";
import { Link } from "wouter";
import { Play, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useGetContinueWatching } from "@workspace/api-client-react";
import TrailerModal from "./TrailerModal";

export default function ContinueWatching() {
  const { data: continueList = [], isLoading } = useGetContinueWatching();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedTrailerMovie, setSelectedTrailerMovie] = useState<any>(null);

  if (isLoading || !continueList || continueList.length === 0) {
    return null;
  }

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const scrollAmount = direction === "left" ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
    scrollRef.current.scrollTo({ left: scrollAmount, behavior: "smooth" });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) return `${hrs}h ${remMins}m`;
    return `${remMins}m`;
  };

  return (
    <div className="py-4 relative group">
      <h2 className="text-xl md:text-2xl font-bold px-4 md:px-12 mb-3 text-white flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" /> Continue Watching
      </h2>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 w-12 z-20 bg-black/70 hover:bg-black/90 flex items-center justify-start pl-2 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none backdrop-blur-sm"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-8 h-8 text-white hover:scale-125 transition-transform" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-12 snap-x snap-mandatory py-2"
        >
          {continueList.map(({ item, progress }) => (
            <div
              key={item.id}
              className="snap-start w-[240px] md:w-[280px] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shrink-0 group/card transition-all duration-300 hover:scale-105 hover:border-zinc-700 shadow-lg"
            >
              {/* Card Image */}
              <div className="relative aspect-video w-full bg-zinc-800 overflow-hidden">
                <img
                  src={item.backdropUrl || item.posterUrl || ""}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                {/* Play Button Overlay */}
                <button
                  onClick={() => setSelectedTrailerMovie(item)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  </div>
                </button>

                {/* Duration Badge */}
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[11px] font-semibold text-zinc-300">
                  {formatTime(progress.positionSeconds)} / {formatTime(progress.durationSeconds)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-800 h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, progress.percentage))}%` }}
                ></div>
              </div>

              {/* Card Body */}
              <div className="p-3.5 flex items-center justify-between">
                <Link href={`/item/${item.id}`} className="truncate max-w-[70%]">
                  <h4 className="text-sm font-bold text-white hover:text-primary transition-colors truncate">
                    {item.title}
                  </h4>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {item.genres?.slice(0, 2).join(" • ")}
                  </p>
                </Link>

                <Link
                  href={`/item/${item.id}`}
                  className="text-xs font-semibold text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Details
                </Link>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 w-12 z-20 bg-black/70 hover:bg-black/90 flex items-center justify-end pr-2 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none backdrop-blur-sm"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-8 h-8 text-white hover:scale-125 transition-transform" />
        </button>
      </div>

      {selectedTrailerMovie && (
        <TrailerModal
          isOpen={!!selectedTrailerMovie}
          onClose={() => setSelectedTrailerMovie(null)}
          title={selectedTrailerMovie.title}
          trailerKey={selectedTrailerMovie.trailerKey}
        />
      )}
    </div>
  );
}
