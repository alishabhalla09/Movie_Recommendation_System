import { useEffect } from "react";
import { X, Play, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  trailerKey: string | null | undefined;
  trailerSite?: string | null;
}

export default function TrailerModal({
  isOpen,
  onClose,
  title,
  trailerKey,
  trailerSite = "YouTube",
}: TrailerModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
            <h3 className="text-lg md:text-xl font-bold text-white truncate max-w-[70vw]">
              {title} <span className="text-xs text-zinc-400 font-normal ml-2">Official Trailer</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-700/80 p-2 rounded-full transition-all focus:outline-none"
            aria-label="Close trailer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Box */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
          {trailerKey ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title={`${title} Trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
              <AlertCircle className="w-16 h-16 text-zinc-500 stroke-1" />
              <div className="space-y-1">
                <h4 className="text-xl font-semibold text-white">Trailer Unavailable</h4>
                <p className="text-sm text-zinc-400 max-w-md">
                  We could not find an official YouTube trailer for "{title}". Please check back later.
                </p>
              </div>
              <Button variant="secondary" onClick={onClose} className="mt-4">
                Close Player
              </Button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-zinc-900/40 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-400">
          <span>StreamFlix Cinema Experience</span>
          <span className="flex items-center gap-1.5">
            <Play className="w-3 h-3 text-primary fill-current" /> Powered by YouTube Embed API
          </span>
        </div>
      </div>
    </div>
  );
}
