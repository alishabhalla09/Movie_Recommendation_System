import { useGetWatchlist, useRemoveFromWatchlist, getGetWatchlistQueryKey } from "@workspace/api-client-react";
import PosterCard from "@/components/PosterCard";
import { Button } from "@/components/ui/button";
import { X, Bookmark } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Watchlist() {
  const { data: watchlist = [], isLoading } = useGetWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();
  const queryClient = useQueryClient();

  const handleRemove = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromWatchlist.mutate(
      { itemId: id } as any, // mutation signature from generated client
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetWatchlistQueryKey() });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="pt-24 px-4 md:px-12 min-h-screen">
        <h1 className="text-3xl font-bold mb-8">My List</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-[2/3] bg-card animate-pulse rounded-md"></div>
          ))}
        </div>
      </div>
    );
  }

  const rawWatchlist = watchlist as any;
  const watchlistData: any[] = Array.isArray(rawWatchlist) ? rawWatchlist : (rawWatchlist?.data || []);

  return (
    <div className="pt-24 px-4 md:px-12 pb-20 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-white">My List</h1>

      {watchlistData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground space-y-6">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
            <Bookmark className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-white">Your list is empty</h2>
          <p>Save shows and movies to keep track of what you want to watch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {watchlistData.map((item: any) => (
            <div key={item.id} className="relative group">
              <PosterCard item={item} />
              <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg"
                onClick={(e) => handleRemove(e, item.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
