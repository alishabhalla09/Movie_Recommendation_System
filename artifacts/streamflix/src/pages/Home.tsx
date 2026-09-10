import { useGetHomeRecommendations } from "@workspace/api-client-react";
import HeroBanner from "@/components/HeroBanner";
import ItemCarousel from "@/components/ItemCarousel";
import ContinueWatching from "@/components/ContinueWatching";

export default function Home() {
  const { data: rows, isLoading, isError } = useGetHomeRecommendations();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col pt-16">
        <div className="w-full h-[70vh] bg-zinc-900 animate-pulse"></div>
        <div className="p-8 space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <div className="h-6 w-48 bg-zinc-900 rounded animate-pulse"></div>
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <div key={j} className="w-[180px] aspect-[2/3] bg-zinc-900 rounded-lg animate-pulse shrink-0"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const rowData: any[] = Array.isArray(rows) ? rows : (rows as any)?.data || [];

  if (isError || !rowData || rowData.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-center px-4">
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-white">Welcome to StreamFlix</h2>
          <p className="text-zinc-400 max-w-md mx-auto">
            Your personalized cinema destination. Please ensure the database is seeded or import movies via the Admin dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Find a hero movie (prefer blockbuster with backdrop & trailer)
  const heroCandidate =
    rowData.find((r) => r.reason === "trending")?.items?.[0] ||
    rowData.find((r) => r.reason === "popular")?.items?.[0] ||
    rowData[0]?.items?.[0];

  return (
    <div className="pb-24 bg-background min-h-screen overflow-x-hidden">
      {heroCandidate && <HeroBanner item={heroCandidate} />}

      <div className="flex flex-col gap-6 -mt-16 md:-mt-24 relative z-10 w-full overflow-hidden">
        {/* Continue Watching Row */}
        <ContinueWatching />

        {/* Dynamic Netflix Recommendation Rows */}
        {rowData.map((row, idx) =>
          row.items && row.items.length > 0 ? (
            <ItemCarousel
              key={`${row.reason}-${idx}`}
              title={row.title}
              items={row.items}
            />
          ) : null
        )}
      </div>
    </div>
  );
}
