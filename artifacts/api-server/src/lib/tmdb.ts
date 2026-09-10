import { db, itemsTable, Item, InsertItem } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";
import { buildItemVector } from "./recommendations";

export interface TmdbVideo {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  published_at: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  order: number;
  profile_path?: string | null;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
}

export interface TmdbMovieItem {
  id: number;
  title: string;
  original_title?: string;
  tagline?: string;
  overview: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  runtime?: number;
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language?: string;
  genre_ids?: number[];
  genres?: Array<{ id: number; name: string }>;
  videos?: { results: TmdbVideo[] };
  credits?: { cast: TmdbCastMember[]; crew: TmdbCrewMember[] };
  keywords?: { keywords?: Array<{ id: number; name: string }>; results?: Array<{ id: number; name: string }> };
}

const TMDB_GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export const GENRE_NAME_TO_TMDB_ID: Record<string, number> = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  "Sci-Fi": 878,
  Thriller: 53,
  War: 10752,
  Western: 37,
};

/**
 * Get configured TMDB API key from environment
 */
export function getTmdbApiKey(): string | null {
  return process.env.TMDB_API_KEY || null;
}

export function getTmdbBaseUrl(): string {
  return process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";
}

export function getTmdbImageBaseUrl(): string {
  return process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p";
}

/**
 * Fetch from TMDB API with query parameters
 */
async function fetchTmdb<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  const apiKey = getTmdbApiKey();
  if (!apiKey) {
    throw new Error("TMDB_API_KEY environment variable is not configured.");
  }

  const baseUrl = getTmdbBaseUrl();
  const url = new URL(`${baseUrl}${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-US");

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 StreamFlix/1.0",
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TMDB API Error ${response.status}: ${errorText}`);
  }

  return (await response.json()) as T;

}

/**
 * Find the best available YouTube trailer from TMDB video results
 */
export function extractBestTrailer(videos?: TmdbVideo[]): {
  key: string | null;
  site: string | null;
  name: string | null;
  type: string | null;
} {
  if (!videos || videos.length === 0) {
    return { key: null, site: null, name: null, type: null };
  }

  // Filter for YouTube videos
  const youtubeVideos = videos.filter((v) => v.site === "YouTube" && v.key);
  if (youtubeVideos.length === 0) {
    return { key: null, site: null, name: null, type: null };
  }

  // 1. Prefer Official Trailer
  const officialTrailer = youtubeVideos.find((v) => v.official && v.type === "Trailer");
  if (officialTrailer) {
    return {
      key: officialTrailer.key,
      site: "YouTube",
      name: officialTrailer.name,
      type: officialTrailer.type,
    };
  }

  // 2. Any Trailer
  const anyTrailer = youtubeVideos.find((v) => v.type === "Trailer");
  if (anyTrailer) {
    return {
      key: anyTrailer.key,
      site: "YouTube",
      name: anyTrailer.name,
      type: anyTrailer.type,
    };
  }

  // 3. Teaser
  const teaser = youtubeVideos.find((v) => v.type === "Teaser");
  if (teaser) {
    return {
      key: teaser.key,
      site: "YouTube",
      name: teaser.name,
      type: teaser.type,
    };
  }

  // 4. Any YouTube video
  const first = youtubeVideos[0];
  return {
    key: first.key,
    site: "YouTube",
    name: first.name,
    type: first.type,
  };
}

/**
 * Fetch detailed movie information including cast, crew, videos, and keywords
 */
export async function fetchMovieDetails(tmdbId: number): Promise<TmdbMovieItem> {
  return await fetchTmdb<TmdbMovieItem>(`/movie/${tmdbId}`, {
    append_to_response: "videos,credits,keywords",
  });
}

/**
 * Normalize TMDB movie into our database schema structure
 */
export function normalizeTmdbMovie(movie: TmdbMovieItem): Omit<InsertItem, "id"> {
  const imageBaseUrl = getTmdbImageBaseUrl();
  const trailer = extractBestTrailer(movie.videos?.results);

  // Extract genres
  let genres: string[] = [];
  if (movie.genres && movie.genres.length > 0) {
    genres = movie.genres.map((g) => g.name);
  } else if (movie.genre_ids && movie.genre_ids.length > 0) {
    genres = movie.genre_ids
      .map((id) => TMDB_GENRE_MAP[id])
      .filter(Boolean) as string[];
  }
  if (genres.length === 0) {
    genres = ["Drama"];
  }

  // Extract director and cast
  let director: string | null = null;
  const cast: string[] = [];
  if (movie.credits) {
    const dir = movie.credits.crew.find((c) => c.job === "Director");
    if (dir) director = dir.name;
    const topCast = movie.credits.cast
      .slice(0, 8)
      .map((c) => c.name);
    cast.push(...topCast);
  }

  // Extract keywords / tags
  const tags: string[] = [...genres];
  if (movie.keywords) {
    const kwList = movie.keywords.keywords || movie.keywords.results || [];
    for (const kw of kwList.slice(0, 10)) {
      if (!tags.includes(kw.name)) tags.push(kw.name);
    }
  }
  for (const c of cast.slice(0, 4)) {
    if (!tags.includes(c)) tags.push(c);
  }
  if (director && !tags.includes(director)) {
    tags.push(director);
  }

  // Parse release year
  let releaseYear = new Date().getFullYear();
  if (movie.release_date) {
    const yr = parseInt(movie.release_date.split("-")[0]);
    if (!isNaN(yr)) releaseYear = yr;
  }

  // Normalized rating (0 to 10 scale or 0-100 percentage match)
  const rating = movie.vote_average ? Math.round(movie.vote_average * 10) / 10 : 7.5;

  const posterUrl = movie.poster_path
    ? `${imageBaseUrl}/w500${movie.poster_path}`
    : null;

  const backdropUrl = movie.backdrop_path
    ? `${imageBaseUrl}/original${movie.backdrop_path}`
    : posterUrl;

  const duration = movie.runtime || 110;

  const trailerUrl = trailer.key
    ? `https://www.youtube.com/watch?v=${trailer.key}`
    : null;

  return {
    tmdbId: movie.id,
    title: movie.title || "Untitled",
    tagline: movie.tagline || null,
    description: movie.overview || "No description available.",
    genres,
    tags,
    rating,
    voteCount: movie.vote_count || 0,
    popularity: movie.popularity || 0,
    releaseYear,
    releaseDate: movie.release_date || null,
    posterUrl,
    backdropUrl,
    logoUrl: null,
    trailerUrl,
    trailerKey: trailer.key,
    trailerSite: trailer.site,
    trailerName: trailer.name,
    duration,
    director,
    cast,
    originalLanguage: movie.original_language || "en",
    country: "US",
    type: "movie",
    metadata: {
      tmdb_id: movie.id,
      vote_average: movie.vote_average,
      popularity: movie.popularity,
    },
  };
}

export interface ImportOptions {
  type: "popular" | "trending" | "top_rated" | "now_playing" | "genre" | "year";
  pages: number;
  genreId?: number;
  year?: number;
}

export interface ImportResult {
  message: string;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  details: string[];
}

/**
 * Import movies from TMDB API in batch with deduplication and metadata enrichment
 */
export async function importMoviesFromTmdb(options: ImportOptions): Promise<ImportResult> {
  const apiKey = getTmdbApiKey();
  if (!apiKey) {
    // If no TMDB API key is present, fallback to curated high-quality bootstrap import
    return await bootstrapCuratedCatalog();
  }

  const pagesToFetch = Math.min(Math.max(1, options.pages || 1), 20);
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const details: string[] = [];

  for (let page = 1; page <= pagesToFetch; page++) {
    try {
      let endpoint = "/movie/popular";
      const params: Record<string, any> = { page };

      if (options.type === "trending") {
        endpoint = "/trending/movie/week";
      } else if (options.type === "top_rated") {
        endpoint = "/movie/top_rated";
      } else if (options.type === "now_playing") {
        endpoint = "/movie/now_playing";
      } else if (options.type === "genre" && options.genreId) {
        endpoint = "/discover/movie";
        params.with_genres = options.genreId;
        params.sort_by = "popularity.desc";
      } else if (options.type === "year" && options.year) {
        endpoint = "/discover/movie";
        params.primary_release_year = options.year;
        params.sort_by = "popularity.desc";
      }

      const listResponse = await fetchTmdb<{ results: TmdbMovieItem[] }>(endpoint, params);
      const results = listResponse.results || [];

      for (const item of results) {
        try {
          // Fetch complete movie details with credits, videos & keywords
          let detailedMovie: TmdbMovieItem;
          try {
            detailedMovie = await fetchMovieDetails(item.id);
          } catch {
            detailedMovie = item;
          }

          const normalized = normalizeTmdbMovie(detailedMovie);

          // Check if already in DB
          const [existing] = await db
            .select()
            .from(itemsTable)
            .where(eq(itemsTable.tmdbId, detailedMovie.id));

          // Compute feature vector for content-based matching
          const featureVectorMap = buildItemVector({
            ...normalized,
            id: existing ? existing.id : 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            featureVector: [],
          } as Item);
          const featureVectorArray = Array.from(featureVectorMap.entries());

          if (existing) {
            await db
              .update(itemsTable)
              .set({
                ...normalized,
                featureVector: featureVectorArray,
                updatedAt: new Date(),
              })
              .where(eq(itemsTable.id, existing.id));
            updated++;
            details.push(`Updated: ${normalized.title} (${normalized.releaseYear})`);
          } else {
            await db.insert(itemsTable).values({
              ...normalized,
              featureVector: featureVectorArray,
            });
            imported++;
            details.push(`Imported: ${normalized.title} (${normalized.releaseYear})`);
          }
        } catch (err: any) {
          failed++;
          details.push(`Failed for TMDB ID ${item.id}: ${err.message}`);
        }
      }
    } catch (err: any) {
      details.push(`Error fetching page ${page}: ${err.message}`);
      break;
    }
  }

  return {
    message: `TMDB import completed. ${imported} movies imported, ${updated} updated, ${failed} failed.`,
    imported,
    updated,
    skipped,
    failed,
    details: details.slice(0, 50),
  };
}

/**
 * Rich Curated Blockbuster Catalog with real YouTube trailer IDs, high-res posters, and backdrops
 */
export const CURATED_BOOTSTRAP_MOVIES: Array<Omit<InsertItem, "id">> = [
  {
    tmdbId: 157336,
    title: "Interstellar",
    tagline: "Mankind was born on Earth. It was never meant to die here.",
    description: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
    genres: ["Sci-Fi", "Adventure", "Drama"],
    tags: ["space travel", "black hole", "wormhole", "quantum physics", "Christopher Nolan", "Matthew McConaughey", "Anne Hathaway"],
    rating: 8.4,
    voteCount: 35000,
    popularity: 145.2,
    releaseYear: 2014,
    releaseDate: "2014-11-05",
    posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/rAiYTPIHVikqw950NX87ttAc8st.jpg",
    trailerKey: "zSWdZVtXT7E",
    trailerSite: "YouTube",
    trailerName: "Interstellar - Official Trailer 3",
    trailerUrl: "https://www.youtube.com/watch?v=zSWdZVtXT7E",
    duration: 169,
    director: "Christopher Nolan",
    cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain", "Michael Caine", "Matt Damon", "Timothée Chalamet"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 157336 },
  },
  {
    tmdbId: 27205,
    title: "Inception",
    tagline: "Your mind is the scene of the crime.",
    description: "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets is offered a chance to regain his old life as payment for a task considered to be impossible: \"inception\", the implantation of another person's idea into a target's subconscious.",
    genres: ["Action", "Sci-Fi", "Adventure"],
    tags: ["dreams", "subconscious", "heist", "mind bending", "Christopher Nolan", "Leonardo DiCaprio", "Joseph Gordon-Levitt"],
    rating: 8.4,
    voteCount: 36000,
    popularity: 130.5,
    releaseYear: 2010,
    releaseDate: "2010-07-15",
    posterUrl: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
    trailerKey: "YoHD9XEInc0",
    trailerSite: "YouTube",
    trailerName: "Inception - Official Trailer",
    trailerUrl: "https://www.youtube.com/watch?v=YoHD9XEInc0",
    duration: 148,
    director: "Christopher Nolan",
    cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page", "Tom Hardy", "Ken Watanabe", "Cillian Murphy"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 27205 },
  },
  {
    tmdbId: 693134,
    title: "Dune: Part Two",
    tagline: "Long live the fighters.",
    description: "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, Paul endeavors to prevent a terrible future only he can foresee.",
    genres: ["Sci-Fi", "Adventure", "Action"],
    tags: ["desert", "spice", "messiah", "Arrakis", "Denis Villeneuve", "Timothée Chalamet", "Zendaya"],
    rating: 8.3,
    voteCount: 5200,
    popularity: 210.8,
    releaseYear: 2024,
    releaseDate: "2024-02-27",
    posterUrl: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520b42.jpg",
    trailerKey: "Way9Dexny3w",
    trailerSite: "YouTube",
    trailerName: "Dune: Part Two | Official Trailer 3",
    trailerUrl: "https://www.youtube.com/watch?v=Way9Dexny3w",
    duration: 166,
    director: "Denis Villeneuve",
    cast: ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Javier Bardem", "Josh Brolin", "Austin Butler", "Florence Pugh"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 693134 },
  },
  {
    tmdbId: 872585,
    title: "Oppenheimer",
    tagline: "The world forever changes.",
    description: "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    genres: ["Drama", "History", "Biography"],
    tags: ["atomic bomb", "Manhattan Project", "quantum physics", "World War II", "Christopher Nolan", "Cillian Murphy", "Robert Downey Jr."],
    rating: 8.1,
    voteCount: 8900,
    popularity: 195.4,
    releaseYear: 2023,
    releaseDate: "2023-07-19",
    posterUrl: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg",
    trailerKey: "uYPbbksJxIg",
    trailerSite: "YouTube",
    trailerName: "Oppenheimer | Official Trailer",
    trailerUrl: "https://www.youtube.com/watch?v=uYPbbksJxIg",
    duration: 180,
    director: "Christopher Nolan",
    cast: ["Cillian Murphy", "Emily Blunt", "Matt Damon", "Robert Downey Jr.", "Florence Pugh", "Rami Malek"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 872585 },
  },
  {
    tmdbId: 155,
    title: "The Dark Knight",
    tagline: "Welcome to a world without rules.",
    description: "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets. The partnership proves to be effective, but they soon find themselves prey to a reign of chaos unleashed by a rising criminal mastermind known to the terrified citizens of Gotham as the Joker.",
    genres: ["Action", "Crime", "Drama"],
    tags: ["Batman", "Joker", "Gotham", "superhero", "vigilante", "Christopher Nolan", "Christian Bale", "Heath Ledger"],
    rating: 8.5,
    voteCount: 32000,
    popularity: 155.0,
    releaseYear: 2008,
    releaseDate: "2008-07-16",
    posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg",
    trailerKey: "EXeTwQWrcwY",
    trailerSite: "YouTube",
    trailerName: "The Dark Knight - Official Trailer",
    trailerUrl: "https://www.youtube.com/watch?v=EXeTwQWrcwY",
    duration: 152,
    director: "Christopher Nolan",
    cast: ["Christian Bale", "Heath Ledger", "Michael Caine", "Gary Oldman", "Aaron Eckhart", "Maggie Gyllenhaal", "Morgan Freeman"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 155 },
  },
  {
    tmdbId: 299534,
    title: "Avengers: Endgame",
    tagline: "Part of the journey is the end.",
    description: "After the devastating events of Avengers: Infinity War, the universe is in ruins due to the efforts of the Mad Titan, Thanos. With the help of remaining allies, the Avengers must assemble once more in order to undo Thanos's actions and restore balance to the universe.",
    genres: ["Action", "Adventure", "Sci-Fi"],
    tags: ["Avengers", "Marvel", "superhero", "time travel", "Thanos", "Robert Downey Jr.", "Chris Evans"],
    rating: 8.3,
    voteCount: 25000,
    popularity: 180.2,
    releaseYear: 2019,
    releaseDate: "2019-04-24",
    posterUrl: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    trailerKey: "TcMBFSGVi1c",
    trailerSite: "YouTube",
    trailerName: "Marvel Studios' Avengers: Endgame - Official Trailer",
    trailerUrl: "https://www.youtube.com/watch?v=TcMBFSGVi1c",
    duration: 181,
    director: "Anthony Russo, Joe Russo",
    cast: ["Robert Downey Jr.", "Chris Evans", "Mark Ruffalo", "Chris Hemsworth", "Scarlett Johansson", "Jeremy Renner", "Paul Rudd"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 299534 },
  },
  {
    tmdbId: 569094,
    title: "Spider-Man: Across the Spider-Verse",
    tagline: "It's how you wear the mask that matters.",
    description: "After reuniting with Gwen Stacy, Brooklyn’s full-time, friendly neighborhood Spider-Man is catapulted across the Multiverse, where he encounters the Spider-Society, a team of Spider-People charged with protecting the Multiverse’s very existence.",
    genres: ["Animation", "Action", "Adventure", "Sci-Fi"],
    tags: ["Spider-Man", "multiverse", "Miles Morales", "animation", "Shameik Moore", "Hailee Steinfeld"],
    rating: 8.4,
    voteCount: 7100,
    popularity: 175.9,
    releaseYear: 2023,
    releaseDate: "2023-05-31",
    posterUrl: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
    trailerKey: "cqGjhVJWtEg",
    trailerSite: "YouTube",
    trailerName: "SPIDER-MAN: ACROSS THE SPIDER-VERSE - Official Trailer #2",
    trailerUrl: "https://www.youtube.com/watch?v=cqGjhVJWtEg",
    duration: 140,
    director: "Joaquim Dos Santos, Kemp Powers, Justin K. Thompson",
    cast: ["Shameik Moore", "Hailee Steinfeld", "Oscar Isaac", "Jake Johnson", "Daniel Kaluuya", "Jason Schwartzman"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 569094 },
  },
  {
    tmdbId: 496243,
    title: "Parasite",
    tagline: "Act like you own the place.",
    description: "All unemployed, Ki-taek's family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.",
    genres: ["Comedy", "Thriller", "Drama"],
    tags: ["social commentary", "class division", "black comedy", "Bong Joon-ho", "Song Kang-ho"],
    rating: 8.5,
    voteCount: 18000,
    popularity: 110.4,
    releaseYear: 2019,
    releaseDate: "2019-05-30",
    posterUrl: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/hiKmpZMGZsrkA3cdEvAC2NDTeM8.jpg",
    trailerKey: "5xH0hhJb2d8",
    trailerSite: "YouTube",
    trailerName: "PARASITE - Official Trailer",
    trailerUrl: "https://www.youtube.com/watch?v=5xH0hhJb2d8",
    duration: 132,
    director: "Bong Joon-ho",
    cast: ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong", "Choi Woo-shik", "Park So-dam", "Lee Jung-eun"],
    originalLanguage: "ko",
    country: "KR",
    type: "movie",
    metadata: { tmdb_id: 496243 },
  },
  {
    tmdbId: 603,
    title: "The Matrix",
    tagline: "Welcome to the Real World.",
    description: "Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents fighting the vast and powerful computers who now rule the earth.",
    genres: ["Action", "Sci-Fi"],
    tags: ["cyberpunk", "simulation", "virtual reality", "AI", "bullet time", "Keanu Reeves", "Lana Wachowski"],
    rating: 8.2,
    voteCount: 26000,
    popularity: 125.0,
    releaseYear: 1999,
    releaseDate: "1999-03-30",
    posterUrl: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/7c9UVPPiTPltouxRVY6N9uugaVA.jpg",
    trailerKey: "vKQi3bBA1y8",
    trailerSite: "YouTube",
    trailerName: "The Matrix (1999) Official Trailer",
    trailerUrl: "https://www.youtube.com/watch?v=vKQi3bBA1y8",
    duration: 136,
    director: "Lana Wachowski, Lilly Wachowski",
    cast: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss", "Hugo Weaving", "Joe Pantoliano"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 603 },
  },
  {
    tmdbId: 129,
    title: "Spirited Away",
    tagline: "Tunnel to a mysterious magical realm.",
    description: "A young girl, Chihiro, becomes trapped in a strange new world of spirits. When her parents undergo a mysterious transformation, she must call upon the courage she never knew she had to free her family.",
    genres: ["Animation", "Family", "Fantasy"],
    tags: ["Studio Ghibli", "Hayao Miyazaki", "spirits", "Japanese animation", "magical"],
    rating: 8.5,
    voteCount: 16000,
    popularity: 115.0,
    releaseYear: 2001,
    releaseDate: "2001-07-20",
    posterUrl: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/mSDsSDwaP3E7dEfUPWy4J0djt4O.jpg",
    trailerKey: "ByXuk9QqQkk",
    trailerSite: "YouTube",
    trailerName: "Spirited Away - Official Trailer",
    trailerUrl: "https://www.youtube.com/watch?v=ByXuk9QqQkk",
    duration: 125,
    director: "Hayao Miyazaki",
    cast: ["Rumi Hiiragi", "Miyu Irino", "Mari Natsuki", "Takashi Naito", "Yasuko Sawaguchi"],
    originalLanguage: "ja",
    country: "JP",
    type: "movie",
    metadata: { tmdb_id: 129 },
  },
  {
    tmdbId: 680,
    title: "Pulp Fiction",
    tagline: "Just because you are a character doesn't mean that you have character.",
    description: "A burger-loving hit man, his philosophical partner, a drug-addled gangster's moll and a washed-up boxer converge in this sprawling, comedic crime caper. Their adventures unfurl in three stories that ingeniously trip back and forth in time.",
    genres: ["Thriller", "Crime"],
    tags: ["cult classic", "nonlinear", "gangster", "dialogue", "Quentin Tarantino", "John Travolta", "Samuel L. Jackson"],
    rating: 8.5,
    voteCount: 28000,
    popularity: 135.0,
    releaseYear: 1994,
    releaseDate: "1994-09-10",
    posterUrl: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
    trailerKey: "s7EdQ4FqbhY",
    trailerSite: "YouTube",
    trailerName: "Pulp Fiction | Official Trailer",
    trailerUrl: "https://www.youtube.com/watch?v=s7EdQ4FqbhY",
    duration: 154,
    director: "Quentin Tarantino",
    cast: ["John Travolta", "Samuel L. Jackson", "Uma Thurman", "Bruce Willis", "Ving Rhames", "Harvey Keitel"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 680 },
  },
  {
    tmdbId: 24428,
    title: "The Avengers",
    tagline: "Some assembly required.",
    description: "When an unexpected enemy emerges and threatens global safety and security, Nick Fury, director of the international peacekeeping agency known as S.H.I.E.L.D., finds himself in need of a team to pull the world back from the brink of disaster.",
    genres: ["Action", "Adventure", "Sci-Fi"],
    tags: ["superhero", "Marvel", "Iron Man", "Captain America", "Thor", "Joss Whedon"],
    rating: 7.7,
    voteCount: 30000,
    popularity: 140.0,
    releaseYear: 2012,
    releaseDate: "2012-04-25",
    posterUrl: "https://image.tmdb.org/t/p/w500/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/9BBTo63ANSmhC4e6r62OJFuK2GL.jpg",
    trailerKey: "eOrNdBpGMv8",
    trailerSite: "YouTube",
    trailerName: "Marvel's The Avengers- Trailer (OFFICIAL)",
    trailerUrl: "https://www.youtube.com/watch?v=eOrNdBpGMv8",
    duration: 143,
    director: "Joss Whedon",
    cast: ["Robert Downey Jr.", "Chris Evans", "Mark Ruffalo", "Chris Hemsworth", "Scarlett Johansson", "Tom Hiddleston"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 24428 },
  },
  {
    tmdbId: 98,
    title: "Gladiator",
    tagline: "A hero will rise.",
    description: "In the year 180, the death of emperor Marcus Aurelius throws the Roman Empire into turmoil. Maximus, one of the Roman army's most capable generals and Aurelius's choice to succeed him, is betrayed by the emperor's corrupt son, Commodus.",
    genres: ["Action", "Drama", "Adventure"],
    tags: ["Rome", "gladiator", "revenge", "epic", "Ridley Scott", "Russell Crowe"],
    rating: 8.2,
    voteCount: 19000,
    popularity: 120.0,
    releaseYear: 2000,
    releaseDate: "2000-05-04",
    posterUrl: "https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
    trailerKey: "owK1qxDselE",
    trailerSite: "YouTube",
    trailerName: "Gladiator - Official Trailer",
    trailerUrl: "https://www.youtube.com/watch?v=owK1qxDselE",
    duration: 155,
    director: "Ridley Scott",
    cast: ["Russell Crowe", "Joaquin Phoenix", "Connie Nielsen", "Oliver Reed", "Richard Harris", "Derek Jacobi"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 98 },
  },
  {
    tmdbId: 244786,
    title: "Whiplash",
    tagline: "The road to greatness can take you to the edge.",
    description: "Under the direction of a ruthless instructor, a talented young drummer begins to pursue perfection at any cost, even his humanity.",
    genres: ["Drama", "Music"],
    tags: ["jazz", "drumming", "obsession", "mentor", "Damien Chazelle", "Miles Teller", "J.K. Simmons"],
    rating: 8.4,
    voteCount: 14500,
    popularity: 105.0,
    releaseYear: 2014,
    releaseDate: "2014-10-10",
    posterUrl: "https://image.tmdb.org/t/p/w500/7fn624j5lj3xTme2SgiLCeuedmO.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/vNXGrknWk3r7p65gS2C5hEwUqH9.jpg",
    trailerKey: "7d_jQycdQGo",
    trailerSite: "YouTube",
    trailerName: "Whiplash - Official Trailer",
    trailerUrl: "https://www.youtube.com/watch?v=7d_jQycdQGo",
    duration: 107,
    director: "Damien Chazelle",
    cast: ["Miles Teller", "J.K. Simmons", "Paul Reiser", "Melissa Benoist", "Austin Stowell"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 244786 },
  },
  {
    tmdbId: 438631,
    title: "Dune",
    tagline: "It begins.",
    description: "Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, must travel to the most dangerous planet in the universe to ensure the future of his family and his people.",
    genres: ["Sci-Fi", "Adventure"],
    tags: ["desert", "Arrakis", "space", "destiny", "Denis Villeneuve", "Timothée Chalamet"],
    rating: 7.8,
    voteCount: 11000,
    popularity: 160.0,
    releaseYear: 2021,
    releaseDate: "2021-09-15",
    posterUrl: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/lzWHmYdfeFiMIY4JaMmtR7GEli3.jpg",
    trailerKey: "8g18jFHCLXk",
    trailerSite: "YouTube",
    trailerName: "DUNE - Official Main Trailer",
    trailerUrl: "https://www.youtube.com/watch?v=8g18jFHCLXk",
    duration: 155,
    director: "Denis Villeneuve",
    cast: ["Timothée Chalamet", "Rebecca Ferguson", "Oscar Isaac", "Josh Brolin", "Stellan Skarsgård", "Zendaya"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 438631 },
  },
  {
    tmdbId: 389,
    title: "12 Angry Men",
    tagline: "Life is in their hands. Death is on their minds.",
    description: "The defense and the prosecution have rested and the jury is filing into the jury room to decide if an 18-year-old youth is guilty or innocent of murdering his father.",
    genres: ["Drama"],
    tags: ["courtroom", "jury", "justice", "classic", "Sidney Lumet", "Henry Fonda"],
    rating: 8.5,
    voteCount: 8500,
    popularity: 90.0,
    releaseYear: 1957,
    releaseDate: "1957-04-10",
    posterUrl: "https://image.tmdb.org/t/p/w500/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/qqHQsStV6exghCM7zbObuYBiYxw.jpg",
    trailerKey: "_13J_9B5jEk",
    trailerSite: "YouTube",
    trailerName: "12 Angry Men (1957) Trailer",
    trailerUrl: "https://www.youtube.com/watch?v=_13J_9B5jEk",
    duration: 96,
    director: "Sidney Lumet",
    cast: ["Henry Fonda", "Lee J. Cobb", "Ed Begley", "E.G. Marshall", "Jack Warden"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 389 },
  },
  {
    tmdbId: 105,
    title: "Back to the Future",
    tagline: "He's the only kid ever to get into trouble before he was born.",
    description: "Eighties teenager Marty McFly is accidentally sent back in time to 1955, inadvertently disrupting his parents' first meeting and attracting his mother's romantic interest.",
    genres: ["Adventure", "Comedy", "Sci-Fi"],
    tags: ["time travel", "DeLorean", "80s", "Doc Brown", "Robert Zemeckis", "Michael J. Fox"],
    rating: 8.3,
    voteCount: 19500,
    popularity: 110.0,
    releaseYear: 1985,
    releaseDate: "1985-07-03",
    posterUrl: "https://image.tmdb.org/t/p/w500/fNOH9f1aA7XRTzl1zrAist9irrP.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/fq3wyOs1RHyz2yfzsb493250rm.jpg",
    trailerKey: "qvsgGtivCgs",
    trailerSite: "YouTube",
    trailerName: "Back to the Future (1985) Official Trailer",
    trailerUrl: "https://www.youtube.com/watch?v=qvsgGtivCgs",
    duration: 116,
    director: "Robert Zemeckis",
    cast: ["Michael J. Fox", "Christopher Lloyd", "Lea Thompson", "Crispin Glover", "Thomas F. Wilson"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 105 },
  },
  {
    tmdbId: 238,
    title: "The Godfather",
    tagline: "An offer you can't refuse.",
    description: "Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family. When organized crime family patriarch, Vito Corleone barely survives an attempt on his life, his youngest son, Michael steps up to take care of the would-be killers.",
    genres: ["Drama", "Crime"],
    tags: ["mafia", "Corleone", "organized crime", "family", "Francis Ford Coppola", "Marlon Brando", "Al Pacino"],
    rating: 8.7,
    voteCount: 20500,
    popularity: 165.0,
    releaseYear: 1972,
    releaseDate: "1972-03-14",
    posterUrl: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/tmU7whst579IZk8aGKlUMYi3i41.jpg",
    trailerKey: "UaVTIH8mujA",
    trailerSite: "YouTube",
    trailerName: "The Godfather - Official Trailer",
    trailerUrl: "https://www.youtube.com/watch?v=UaVTIH8mujA",
    duration: 175,
    director: "Francis Ford Coppola",
    cast: ["Marlon Brando", "Al Pacino", "James Caan", "Robert Duvall", "Diane Keaton"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 238 },
  },
  {
    tmdbId: 278,
    title: "The Shawshank Redemption",
    tagline: "Fear can hold you prisoner. Hope can set you free.",
    description: "Imprisoned in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison, where he puts his accounting skills to work for an amoral warden.",
    genres: ["Drama", "Crime"],
    tags: ["prison", "hope", "friendship", "redemption", "Frank Darabont", "Tim Robbins", "Morgan Freeman"],
    rating: 8.7,
    voteCount: 27000,
    popularity: 170.0,
    releaseYear: 1994,
    releaseDate: "1994-09-23",
    posterUrl: "https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg",
    trailerKey: "PLl99DlL6b4",
    trailerSite: "YouTube",
    trailerName: "The Shawshank Redemption - Official Trailer",
    trailerUrl: "https://www.youtube.com/watch?v=PLl99DlL6b4",
    duration: 142,
    director: "Frank Darabont",
    cast: ["Tim Robbins", "Morgan Freeman", "Bob Gunton", "William Sadler", "Clancy Brown"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 278 },
  },
  {
    tmdbId: 372058,
    title: "Your Name.",
    tagline: "Treasure the experience. Dreams fade away after you wake up.",
    description: "High schoolers Mitsuha and Taki are complete strangers living separate lives in Tokyo and rural Itomori. But suddenly, they start swapping bodies periodically, communicating through notes while trying to uncover the strange cosmic connection between them.",
    genres: ["Animation", "Romance", "Drama", "Fantasy"],
    tags: ["body swap", "comet", "fate", "Tokyo", "Makoto Shinkai", "anime"],
    rating: 8.5,
    voteCount: 11000,
    popularity: 115.0,
    releaseYear: 2016,
    releaseDate: "2016-08-26",
    posterUrl: "https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6qFsxLL9qWuu.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/dIWwZWOPmtjjIPCWnlm2CfZg5mt.jpg",
    trailerKey: "xU47nhruN-Q",
    trailerSite: "YouTube",
    trailerName: "Your Name - Official Trailer",
    trailerUrl: "https://www.youtube.com/watch?v=xU47nhruN-Q",
    duration: 106,
    director: "Makoto Shinkai",
    cast: ["Ryunosuke Kamiki", "Mone Kamishiraishi", "Ryo Narita", "Aoi Yuki", "Nobunaga Shimazaki"],
    originalLanguage: "ja",
    country: "JP",
    type: "movie",
    metadata: { tmdb_id: 372058 },
  }
];

/**
 * Bootstrap curated catalog into database
 */
export async function bootstrapCuratedCatalog(): Promise<ImportResult> {
  let imported = 0;
  let updated = 0;
  let failed = 0;
  const details: string[] = [];

  for (const item of CURATED_BOOTSTRAP_MOVIES) {
    try {
      const [existing] = await db
        .select()
        .from(itemsTable)
        .where(eq(itemsTable.tmdbId, item.tmdbId!));

      const featureVectorMap = buildItemVector({
        ...item,
        id: existing ? existing.id : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        featureVector: [],
      } as Item);
      const featureVectorArray = Array.from(featureVectorMap.entries());

      if (existing) {
        await db
          .update(itemsTable)
          .set({
            ...item,
            featureVector: featureVectorArray,
            updatedAt: new Date(),
          })
          .where(eq(itemsTable.id, existing.id));
        updated++;
        details.push(`Updated: ${item.title} (${item.releaseYear})`);
      } else {
        await db.insert(itemsTable).values({
          ...item,
          featureVector: featureVectorArray,
        });
        imported++;
        details.push(`Imported: ${item.title} (${item.releaseYear})`);
      }
    } catch (err: any) {
      failed++;
      details.push(`Failed for ${item.title}: ${err.message}`);
    }
  }

  return {
    message: `Curated TMDB catalog bootstrap complete. ${imported} movies imported, ${updated} updated, ${failed} failed.`,
    imported,
    updated,
    skipped: 0,
    failed,
    details,
  };
}
