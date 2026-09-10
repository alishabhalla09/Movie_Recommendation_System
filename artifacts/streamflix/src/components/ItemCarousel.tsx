import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import type { Item } from "@workspace/api-client-react";
import PosterCard from "./PosterCard";

interface ItemCarouselProps {
  title: string;
  items: Item[];
}

export default function ItemCarousel({ title, items }: ItemCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const scrollAmount = direction === "left" ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
    
    scrollRef.current.scrollTo({
      left: scrollAmount,
      behavior: "smooth"
    });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    setShowLeftScroll(scrollRef.current.scrollLeft > 0);
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="py-2 md:py-4 relative group">
      <h2 className="text-lg md:text-2xl font-bold px-4 md:px-12 mb-2 text-[#e5e5e5] hover:text-white transition-colors cursor-pointer inline-block">
        {title}
      </h2>
      
      <div className="relative">
        {showLeftScroll && (
          <button 
            onClick={() => scroll("left")}
            className="absolute left-0 top-0 bottom-0 w-12 z-20 bg-black/60 hover:bg-black/80 flex items-center justify-start pl-2 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none backdrop-blur-sm"
          >
            <ChevronLeft className="w-10 h-10 text-white hover:scale-125 transition-transform" />
          </button>
        )}
        
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-2 md:gap-4 overflow-x-auto scrollbar-hide px-4 md:px-12 snap-x snap-mandatory py-4"
        >
          {items.map((item) => (
            <div key={item.id} className="snap-start w-[120px] md:w-[180px] lg:w-[220px] shrink-0">
              <PosterCard item={item} />
            </div>
          ))}
        </div>

        <button 
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 w-12 z-20 bg-black/60 hover:bg-black/80 flex items-center justify-end pr-2 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none backdrop-blur-sm"
        >
          <ChevronRight className="w-10 h-10 text-white hover:scale-125 transition-transform" />
        </button>
      </div>
    </div>
  );
}
