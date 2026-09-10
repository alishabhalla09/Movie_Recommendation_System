import { db, itemsTable, usersTable, interactionsTable, watchlistTable, reviewsTable, watchProgressTable, Item } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Curated high-quality blockbuster catalog with real YouTube trailers, posters & backdrops
const SEED_MOVIES = [
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
    description: "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.",
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
    description: "After the devastating events of Avengers: Infinity War, the universe is in ruins due to the efforts of the Mad Titan, Thanos. With the help of remaining allies, the Avengers must assemble once more.",
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
    description: "After reuniting with Gwen Stacy, Brooklyn’s full-time, friendly neighborhood Spider-Man is catapulted across the Multiverse, where he encounters the Spider-Society.",
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
    director: "Joaquim Dos Santos, Kemp Powers",
    cast: ["Shameik Moore", "Hailee Steinfeld", "Oscar Isaac", "Jake Johnson", "Daniel Kaluuya"],
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
    cast: ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong", "Choi Woo-shik", "Park So-dam"],
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
    tags: ["cyberpunk", "simulation", "virtual reality", "AI", "bullet time", "Keanu Reeves"],
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
    cast: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss", "Hugo Weaving"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 603 },
  },
  {
    tmdbId: 129,
    title: "Spirited Away",
    tagline: "Tunnel to a mysterious magical realm.",
    description: "A young girl, Chihiro, becomes trapped in a strange new world of spirits. When her parents undergo a mysterious transformation, she must call upon the courage she never knew she had.",
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
    cast: ["Rumi Hiiragi", "Miyu Irino", "Mari Natsuki"],
    originalLanguage: "ja",
    country: "JP",
    type: "movie",
    metadata: { tmdb_id: 129 },
  },
  {
    tmdbId: 680,
    title: "Pulp Fiction",
    tagline: "Just because you are a character doesn't mean that you have character.",
    description: "A burger-loving hit man, his philosophical partner, a drug-addled gangster's moll and a washed-up boxer converge in this sprawling, comedic crime caper.",
    genres: ["Thriller", "Crime"],
    tags: ["cult classic", "nonlinear", "gangster", "dialogue", "Quentin Tarantino", "John Travolta"],
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
    cast: ["John Travolta", "Samuel L. Jackson", "Uma Thurman", "Bruce Willis"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 680 },
  },
  {
    tmdbId: 238,
    title: "The Godfather",
    tagline: "An offer you can't refuse.",
    description: "Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family. When organized crime family patriarch, Vito Corleone barely survives an attempt on his life, his youngest son, Michael steps up.",
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
    description: "Imprisoned in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison.",
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
    cast: ["Tim Robbins", "Morgan Freeman", "Bob Gunton", "William Sadler"],
    originalLanguage: "en",
    country: "US",
    type: "movie",
    metadata: { tmdb_id: 278 },
  },
  {
    tmdbId: 372058,
    title: "Your Name.",
    tagline: "Treasure the experience. Dreams fade away after you wake up.",
    description: "High schoolers Mitsuha and Taki are complete strangers living separate lives in Tokyo and rural Itomori. But suddenly, they start swapping bodies periodically.",
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
    cast: ["Ryunosuke Kamiki", "Mone Kamishiraishi", "Ryo Narita"],
    originalLanguage: "ja",
    country: "JP",
    type: "movie",
    metadata: { tmdb_id: 372058 },
  }
];

async function run() {
  console.log("🎬 Starting StreamFlix TMDB Catalog Seeding...");

  // 1. Insert or update Movies
  console.log(`Inserting ${SEED_MOVIES.length} blockbuster TMDB movies...`);
  const insertedMovies: Item[] = [];

  for (const movie of SEED_MOVIES) {
    const [existing] = await db
      .select()
      .from(itemsTable)
      .where(eq(itemsTable.tmdbId, movie.tmdbId));

    if (existing) {
      const [updated] = await db
        .update(itemsTable)
        .set({ ...movie, updatedAt: new Date() })
        .where(eq(itemsTable.id, existing.id))
        .returning();
      insertedMovies.push(updated);
    } else {
      const [created] = await db.insert(itemsTable).values(movie).returning();
      insertedMovies.push(created);
    }
  }

  // 2. Create Admin and Demo Users
  console.log("Creating default Admin and Demo users...");
  const passwordHash = await bcrypt.hash("streamflix123", 10);

  const defaultUsers = [
    { email: "admin@streamflix.com", passwordHash, isAdmin: true, preferences: { hasOnboarded: true, favoriteGenres: ["Sci-Fi", "Action"] } },
    { email: "demo@streamflix.com", passwordHash, isAdmin: false, preferences: { hasOnboarded: true, favoriteGenres: ["Sci-Fi", "Drama"] } },
    { email: "sarah@streamflix.com", passwordHash, isAdmin: false, preferences: { hasOnboarded: true, favoriteGenres: ["Animation", "Comedy"] } },
    { email: "alex@streamflix.com", passwordHash, isAdmin: false, preferences: { hasOnboarded: true, favoriteGenres: ["Action", "Crime"] } },
  ];

  const dbUsers = [];
  for (const u of defaultUsers) {
    const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, u.email));
    if (existingUser) {
      dbUsers.push(existingUser);
    } else {
      const [created] = await db.insert(usersTable).values(u).returning();
      dbUsers.push(created);
    }
  }

  const [adminUser, demoUser] = dbUsers;

  // 3. Seed Watchlist & Watch Progress for Demo User
  if (demoUser && insertedMovies.length > 3) {
    console.log("Seeding Demo user watchlist & watch progress...");
    // Add Interstellar & Dune Part Two to Watchlist
    for (const movie of [insertedMovies[0], insertedMovies[2]]) {
      if (movie) {
        try {
          await db.insert(watchlistTable).values({ userId: demoUser.id, itemId: movie.id }).onConflictDoNothing();
        } catch {}
      }
    }

    // Add Continue Watching entry for Inception (65% watched)
    if (insertedMovies[1]) {
      try {
        await db.insert(watchProgressTable).values({
          userId: demoUser.id,
          itemId: insertedMovies[1].id,
          positionSeconds: 5800,
          durationSeconds: 8880,
          percentage: 65,
          completed: false,
        }).onConflictDoNothing();
      } catch {}
    }
  }

  // 4. Seed Rich Interaction Events
  console.log("Seeding interaction events for recommendation model...");
  for (const user of dbUsers) {
    for (let i = 0; i < insertedMovies.length; i++) {
      const movie = insertedMovies[i];
      if (!movie) continue;

      // Seed varied events: rate, like, watch, click, trailer_play
      const eventTypes = ["view", "click", "trailer_play", "watch", "watch_75", "like"];
      const randomEvent = eventTypes[i % eventTypes.length];
      const rating = 8.0 + (i % 3) * 0.5;

      try {
        await db.insert(interactionsTable).values({
          userId: user.id,
          itemId: movie.id,
          eventType: randomEvent,
          rating: randomEvent === "like" ? rating : null,
          watchDuration: 1800,
        });
      } catch {}
    }
  }

  // 5. Seed Reviews
  if (insertedMovies[0] && demoUser) {
    try {
      await db.insert(reviewsTable).values({
        userId: demoUser.id,
        itemId: insertedMovies[0].id,
        rating: 10,
        comment: "An absolute masterpiece. Hans Zimmer's score paired with Christopher Nolan's visionary sci-fi is unforgettable.",
      }).onConflictDoNothing();
    } catch {}
  }

  console.log("✅ StreamFlix TMDB Database Seed Complete!");
  console.log("Admin credentials: admin@streamflix.com / streamflix123");
  console.log("Demo credentials:  demo@streamflix.com / streamflix123");

  // 6. Trigger Python Recommender retrain
  try {
    const recommenderUrl = process.env.RECOMMENDER_URL || "http://localhost:8000";
    const res = await fetch(`${recommenderUrl}/train`, { method: "POST" });
    if (res.ok) {
      console.log("Recommendation engine retraining triggered!");
    }
  } catch (err: any) {
    console.log("Recommender service offline, will train on service startup.");
  }

  process.exit(0);
}

run().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
