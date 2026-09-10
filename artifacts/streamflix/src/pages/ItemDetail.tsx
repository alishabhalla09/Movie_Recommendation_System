import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch, useGetItem, getGetItemQueryKey, getGetHomeRecommendationsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Play, Plus, Check, Star, MessageSquare, Clock, Film, Calendar, Globe, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import PosterCard from "@/components/PosterCard";
import TrailerModal from "@/components/TrailerModal";

export default function ItemDetail() {
  const { id } = useParams();
  const itemId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(9);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);

  // Fetch movie details
  const { data: item, isLoading, isError } = useGetItem(itemId, {
    query: { enabled: !!itemId, queryKey: getGetItemQueryKey(itemId) },
  });

  // Watchlist status
  const { data: watchlistStatus, refetch: refetchWatchlist } = useQuery({
    queryKey: ["/api/watchlist/check", itemId],
    queryFn: () => customFetch<{ inWatchlist: boolean }>(`/api/watchlist/check/${itemId}`),
    enabled: !!itemId,
  });

  // Similar movies
  const { data: similar = [] } = useQuery({
    queryKey: ["/api/recommendations/similar", itemId],
    queryFn: () => customFetch<any[]>(`/api/recommendations/similar/${itemId}`),
    enabled: !!itemId,
  });

  // Watch progress
  const { data: watchProgress } = useQuery({
    queryKey: ["/api/watch-progress", itemId],
    queryFn: () => customFetch<any>(`/api/watch-progress/${itemId}`),
    enabled: !!itemId,
  });

  // Reviews
  const { data: reviews = [], refetch: refetchReviews } = useQuery({
    queryKey: ["/api/reviews", itemId],
    queryFn: () => customFetch<any[]>(`/api/reviews/${itemId}`),
    enabled: !!itemId,
  });

  const addToWatchlist = useMutation({
    mutationFn: () => customFetch(`/api/watchlist/${itemId}`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: "Added to My List" });
      refetchWatchlist();
      queryClient.invalidateQueries({ queryKey: getGetHomeRecommendationsQueryKey() });
    },
  });

  const removeFromWatchlist = useMutation({
    mutationFn: () => customFetch(`/api/watchlist/${itemId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Removed from My List" });
      refetchWatchlist();
      queryClient.invalidateQueries({ queryKey: getGetHomeRecommendationsQueryKey() });
    },
  });

  const saveWatchProgress = useMutation({
    mutationFn: (data: { positionSeconds: number; durationSeconds: number }) =>
      customFetch(`/api/watch-progress/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });

  const logInteraction = useMutation({
    mutationFn: (eventType: string) =>
      customFetch(`/api/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, eventType }),
      }),
  });

  const createReview = useMutation({
    mutationFn: (data: any) =>
      customFetch(`/api/reviews/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: "Review posted successfully" });
      setReviewText("");
      refetchReviews();
      queryClient.invalidateQueries({ queryKey: getGetHomeRecommendationsQueryKey() });
    },
  });

  // Log view on load
  useEffect(() => {
    if (itemId) {
      logInteraction.mutate("view");
    }
  }, [itemId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="min-h-screen pt-32 text-center text-white">
        <h2 className="text-2xl font-bold mb-2">Movie Not Found</h2>
        <Link href="/" className="text-primary hover:underline">
          Return to Home
        </Link>
      </div>
    );
  }

  const inWatchlist = watchlistStatus?.inWatchlist;
  const reviewsList = Array.isArray(reviews) ? reviews : (reviews as any)?.data || [];
  const matchPercent = item.rating ? Math.min(99, Math.round(item.rating * 10 + 10)) : 95;

  const handleToggleWatchlist = () => {
    if (inWatchlist) {
      removeFromWatchlist.mutate();
    } else {
      addToWatchlist.mutate();
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    createReview.mutate({ rating, comment: reviewText.trim() });
  };

  const handlePlayTrailer = () => {
    setIsTrailerModalOpen(true);
    logInteraction.mutate("trailer_play");

    // Also simulate recording initial progress
    if (item.duration) {
      const durationSeconds = item.duration * 60;
      saveWatchProgress.mutate({
        positionSeconds: Math.min(180, durationSeconds),
        durationSeconds,
      });
    }
  };

  return (
    <div className="bg-black min-h-screen pb-24 text-zinc-100">
      {/* Hero Backdrop Banner */}
      <div className="relative w-full h-[65vh] md:h-[75vh]">
        <img
          src={item.backdropUrl || item.posterUrl || ""}
          alt={item.title}
          className="w-full h-full object-cover object-center opacity-75"
        />

        {/* Netflix Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent w-full md:w-[70%]"></div>

        {/* Hero Title & Actions */}
        <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full md:w-3/4 max-w-5xl z-10 space-y-4">
          <div className="flex items-center gap-2 text-xs md:text-sm font-bold tracking-wider text-zinc-300">
            <span className="bg-primary text-white text-[11px] font-black px-1.5 py-0.5 rounded">STREAMFLIX</span>
            <span>MOVIE</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none drop-shadow-2xl">
            {item.title}
          </h1>

          {item.tagline && (
            <p className="text-zinc-300 text-lg md:text-xl italic font-serif opacity-90 max-w-2xl">
              "{item.tagline}"
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-zinc-300">
            <span className="text-green-400 font-bold">{matchPercent}% Match</span>
            <span>{item.releaseYear}</span>
            {item.duration && (
              <span>
                {Math.floor(item.duration / 60)}h {item.duration % 60}m
              </span>
            )}
            <span className="border border-zinc-600 px-2 py-0.5 rounded text-xs">HD</span>
            <span className="border border-zinc-600 px-2 py-0.5 rounded text-xs">5.1</span>
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-4 h-4 fill-current" />
              <span>{item.rating?.toFixed(1)}/10</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              size="lg"
              onClick={handlePlayTrailer}
              className="bg-white text-black hover:bg-white/90 font-bold px-8 py-6 text-lg rounded-lg flex items-center shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play className="w-6 h-6 mr-2 fill-current" /> Play Trailer
            </Button>

            <Button
              size="lg"
              variant="secondary"
              onClick={handleToggleWatchlist}
              className="bg-zinc-800/80 hover:bg-zinc-700 text-white font-semibold px-6 py-6 text-lg rounded-lg flex items-center backdrop-blur-md border border-zinc-700 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              {inWatchlist ? (
                <>
                  <Check className="w-5 h-5 mr-2 text-green-400" /> In My List
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" /> Add to My List
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="px-6 md:px-12 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
        {/* Left Column: Synopsis, Trailer Embed, Reviews */}
        <div className="lg:col-span-2 space-y-10">
          {/* Overview */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Storyline</h2>
            <p className="text-zinc-300 text-lg leading-relaxed">{item.description}</p>
          </div>

          {/* Embedded Trailer Section */}
          {item.trailerKey && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-primary fill-current" /> Official Trailer
              </h2>
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${item.trailerKey}?rel=0&modestbranding=1`}
                  title={`${item.title} Trailer`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* Metadata Badges & Cast Grid */}
          <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-4 text-sm text-zinc-300">
            {item.director && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-400 font-semibold block text-xs uppercase tracking-wider">Director</span>
                  <span className="text-white font-medium text-base">{item.director}</span>
                </div>
              </div>
            )}

            {item.cast && item.cast.length > 0 && (
              <div className="flex items-start gap-3">
                <Film className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-400 font-semibold block text-xs uppercase tracking-wider">Starring Cast</span>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {item.cast.map((actor, idx) => (
                      <span key={idx} className="bg-zinc-800 text-zinc-200 px-3 py-1 rounded-full text-xs font-medium">
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {item.genres && item.genres.length > 0 && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-400 font-semibold block text-xs uppercase tracking-wider">Genres</span>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {item.genres.map((g, idx) => (
                      <Link
                        key={idx}
                        href={`/genres/${encodeURIComponent(g)}`}
                        className="bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
                      >
                        {g}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reviews Section */}
          <div className="space-y-6 pt-4">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-primary" /> Audience Reviews ({reviewsList.length})
            </h3>

            {/* Post Review Form */}
            <form onSubmit={handleReviewSubmit} className="space-y-4 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800">
              <h4 className="font-bold text-white text-base">Write a Review</h4>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block font-semibold uppercase">
                  Your Rating: <span className="text-primary font-bold text-sm">{rating}/10</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <Textarea
                placeholder="Share your thoughts about the movie..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={3}
                className="bg-black/70 border-zinc-800 focus-visible:ring-primary text-white rounded-xl"
              />

              <Button type="submit" disabled={createReview.isPending || !reviewText.trim()} className="font-bold">
                {createReview.isPending ? "Submitting..." : "Submit Review"}
              </Button>
            </form>

            {/* Reviews List */}
            <div className="space-y-4">
              {reviewsList.map((r: any) => (
                <div key={r.id} className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{r.userEmail ? r.userEmail.split("@")[0] : "Movie Enthusiast"}</span>
                    <div className="flex items-center gap-1 text-amber-400 text-sm font-bold bg-amber-400/10 px-2 py-0.5 rounded">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{r.rating}/10</span>
                    </div>
                  </div>
                  <p className="text-zinc-300 text-sm">{r.comment}</p>
                  <div className="text-xs text-zinc-500">{format(new Date(r.createdAt), "MMMM d, yyyy")}</div>
                </div>
              ))}

              {reviewsList.length === 0 && (
                <div className="p-8 text-center bg-zinc-900/20 border border-zinc-800/40 rounded-xl text-zinc-500">
                  No reviews yet. Be the first to share your review!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Poster & "More Like This" */}
        <div className="space-y-8">
          {/* High-res Poster Card */}
          <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl hidden lg:block">
            <img src={item.posterUrl || item.backdropUrl || ""} alt={item.title} className="w-full h-full object-cover" />
          </div>

          {/* More Like This Recommendations */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">More Like This</h3>
            <div className="grid grid-cols-2 gap-4">
              {similar.slice(0, 6).map((sim: any) => (
                <PosterCard key={sim.id} item={sim} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={isTrailerModalOpen}
        onClose={() => setIsTrailerModalOpen(false)}
        title={item.title}
        trailerKey={item.trailerKey}
      />
    </div>
  );
}
