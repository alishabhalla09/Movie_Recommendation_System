import { Router, type IRouter } from "express";

const router: IRouter = Router();

// In-memory cache to prevent spamming IMDB
const imageCache = new Map<string, string>();

router.get("/images/poster", async (req, res): Promise<void> => {
  try {
    const title = req.query.title as string;
    if (!title) {
      res.status(400).json({ error: "Title required" });
      return;
    }

    const cacheKey = title.toLowerCase().trim();
    if (imageCache.has(cacheKey)) {
      res.json({ url: imageCache.get(cacheKey) });
      return;
    }

    // Clean up title (remove special chars, etc)
    const cleanTitle = cacheKey.replace(/[^a-z0-9\s]/g, '').trim();
    const firstLetter = cleanTitle.charAt(0) || 'a';
    const queryStr = encodeURIComponent(cleanTitle.replace(/\s+/g, '_'));

    const imdbUrl = `https://v3.sg.media-imdb.com/suggestion/${firstLetter}/${queryStr}.json`;
    
    const response = await fetch(imdbUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    });

    if (!response.ok) {
      res.json({ url: null });
      return;
    }

    const data: any = await response.json();
    let imageUrl = null;

    if (data.d && data.d.length > 0) {
      // Find first result that is a movie/series and has an image
      for (const item of data.d) {
        if (item.i && item.i.imageUrl) {
          imageUrl = item.i.imageUrl;
          break;
        }
      }
    }

    if (imageUrl) {
      imageCache.set(cacheKey, imageUrl);
    }
    
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.json({ url: imageUrl });
  } catch (error) {
    console.error("Failed to fetch image from IMDB", error);
    res.json({ url: null });
  }
});

export default router;
