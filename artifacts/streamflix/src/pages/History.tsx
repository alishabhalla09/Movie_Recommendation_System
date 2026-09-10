import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import PosterCard from "@/components/PosterCard";
import { History as HistoryIcon } from "lucide-react";
import { format } from "date-fns";

// Defining custom hook as we don't know the exact generated signature of useGetInteractionHistory
function useSafeHistory() {
  return useQuery({
    queryKey: ['/api/interactions/history'],
    queryFn: () => customFetch<any[]>(`/api/interactions/history`)
  });
}

export default function History() {
  const { data: history = [], isLoading } = useSafeHistory();

  if (isLoading) {
    return (
      <div className="pt-24 px-4 md:px-12 min-h-screen">
        <h1 className="text-3xl font-bold mb-8">Viewing History</h1>
        <div className="space-y-4 max-w-4xl">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-card animate-pulse rounded-md"></div>
          ))}
        </div>
      </div>
    );
  }

  // Filter distinct items to show a cleaner list, or show everything
  const uniqueItems = Array.from(new Map(history.map((h: any) => [h.itemId, h])).values());

  return (
    <div className="pt-24 px-4 md:px-12 pb-20 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-white">Viewing History</h1>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground space-y-6">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
            <HistoryIcon className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-white">No history found</h2>
          <p>Looks like you haven't watched anything yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {uniqueItems.map((record: any) => (
            <div key={record.id} className="space-y-2">
              <PosterCard item={record.item} />
              <div className="text-xs text-muted-foreground">
                Last {record.eventType} on {format(new Date(record.createdAt), "MMM d, yyyy")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
