import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetTrending, customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";

function SelectablePosterCard({ item, isSelected, onToggle }: { item: any, isSelected: boolean, onToggle: () => void }) {
  const [imgError, setImgError] = useState(false);

  const { data: realPoster, isFetching } = useQuery({
    queryKey: ['/api/images/poster', item.title],
    queryFn: () => customFetch<{url: string | null}>(`/api/images/poster?title=${encodeURIComponent(item.title)}`),
    enabled: !item.posterUrl && !imgError,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const displayImage = item.posterUrl || realPoster?.url || (!imgError && !isFetching && realPoster !== undefined ? `https://image.pollinations.ai/prompt/Movie%20poster%20for%20${encodeURIComponent(item.title)}%20cinematic%20dark?width=300&height=450&nologo=true&seed=${item.id}` : null);

  return (
    <div 
      className={`relative aspect-[2/3] cursor-pointer rounded-lg overflow-hidden transition-all duration-300 ${isSelected ? 'ring-4 ring-primary scale-95 opacity-80' : 'hover:scale-105 opacity-100 hover:ring-2 ring-zinc-500'}`}
      onClick={onToggle}
    >
      {displayImage && !imgError ? (
        <img src={displayImage} alt={item.title} onError={() => setImgError(true)} className="w-full h-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-black flex flex-col items-center justify-center p-4 text-center">
          <span className="font-bold text-sm text-white opacity-90">{item.title}</span>
          {item.releaseYear && <span className="text-xs text-primary mt-2">{item.releaseYear}</span>}
        </div>
      )}
      
      {isSelected && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-primary text-white rounded-full p-2 animate-in zoom-in">
            <Check className="w-8 h-8" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useGetTrending({ limit: 40 });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSelection = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleComplete = async () => {
    if (selectedIds.size < 5) {
      toast({ title: "Please select at least 5 movies", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await customFetch("/api/auth/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: Array.from(selectedIds) }),
      });
      toast({ title: "Welcome to StreamFlix! Your taste profile is ready." });
      
      // Update local cache so we don't get redirected back here
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      setLocation("/");
    } catch (e: any) {
      toast({ title: "Error saving preferences", description: e.message, variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading titles...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-12 py-12 pb-32">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">
          Let's personalize your experience.
        </h1>
        <p className="text-xl text-gray-400">Select at least 5 movies or shows you like so we can recommend you the best content.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items?.map(item => (
          <SelectablePosterCard 
            key={item.id} 
            item={item} 
            isSelected={selectedIds.has(item.id)} 
            onToggle={() => toggleSelection(item.id)} 
          />
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent p-6 flex justify-center z-50 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-6 bg-zinc-900/90 backdrop-blur border border-zinc-800 px-8 py-4 rounded-full shadow-2xl">
          <div className="text-lg font-bold">
            <span className={selectedIds.size >= 5 ? "text-primary" : "text-zinc-400"}>{selectedIds.size}</span> / 5 Selected
          </div>
          <Button 
            size="lg" 
            onClick={handleComplete} 
            disabled={selectedIds.size < 5 || isSubmitting}
            className="rounded-full px-8 font-bold"
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
