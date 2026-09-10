# 🎬 StreamFlix — Netflix-Style Hybrid Movie Recommendation System

> **B.Tech AI/ML Portfolio Project**  
> Ek full-stack application jo bilkul Netflix jaise kaam karta hai — personalized movie recommendations, real ML model, aur modern UI.

---

## 📖 Table of Contents

1. [Project Kya Hai?](#project-kya-hai)
2. [Tech Stack (Kya Kya Use Hua?)](#tech-stack)
3. [Architecture — Sab Kaise Connected Hai?](#architecture)
4. [ML System — Prediction Kaise Hoti Hai?](#ml-system)
5. [Setup & Chalaane Ka Tarika](#setup)
6. [Pehli Baar Use Kaise Karein?](#pehli-baar-use)
7. [Posters Kaise Aate Hain?](#posters)
8. [Project Structure](#project-structure)
9. [Common Problems & Solutions](#common-problems)

---

## 🎯 Project Kya Hai?

**StreamFlix** ek Netflix jaisi movie streaming aur recommendation app hai. Isme:

- ✅ **Account bana sakte hain** (Signup/Login)
- ✅ **Onboarding** — pehli baar 5+ movies select karte hain apni pasand ki
- ✅ **Home page** — Netflix jaise "Trending Now", "New Releases", "Top Picks For You" rows dikhti hain
- ✅ **Real AI/ML Model** — Aapki activity dekhkar suggestions deta hai
- ✅ **Movie Detail Page** — Similar movies, ratings, cast info
- ✅ **Search** — Koi bhi movie search karo
- ✅ **Watchlist** — Baad mein dekhne ke liye save karo

---

## 🛠 Tech Stack

| Layer | Technology | Kaam Kya Karta Hai |
|-------|-----------|-------------------|
| **Frontend** | React + TypeScript + Vite | Netflix jaisi UI dikhata hai |
| **Backend API** | Node.js + Express | Frontend aur DB ke beech bridge |
| **ML Service** | Python + FastAPI | Recommendations calculate karta hai |
| **Database** | PostgreSQL | Saara data store karta hai |
| **Cache** | Redis | Fast responses ke liye |
| **ML Model** | ALS (Alternating Least Squares) | Real collaborative filtering |
| **Data** | MovieLens 100K Dataset | 9,742 movies, 100,000 ratings |

---

## 🏗 Architecture

### Simple Diagram

```
Browser (Aap)
    |
    | (click/search/watch)
    ↓
React Frontend  ─────────────────────────────────→  IMDB/Pollinations
(Port 5173)                                          (poster images)
    |
    | (API calls)
    ↓
Node.js API Server
(Port 5001)
    |            |                    |
    ↓            ↓                    ↓
PostgreSQL    Redis Cache      Python ML Service
(Database)   (fast access)       (Port 8000)
                                      |
                                      ↓
                               ALS Model (trains on
                               user interaction data)
```

### Flow Ka Matlab:

1. **Aap** browser mein kuch karte ho (movie click, watch, rate)
2. **React Frontend** yeh action API server ko bhejta hai
3. **API Server** data database mein save karta hai
4. **API Server** Python ML service ko "retrain" ka signal deta hai
5. **Python ML** naye data par model dobara train karta hai
6. **Agla request** pe aapko personalized recommendations milti hain

---

## 🤖 ML System — Prediction Kaise Hoti Hai?

### Step 1: Data Collection (Kya Data Collect Hota Hai?)

Jab bhi aap koi action karte ho, woh database mein save hota hai:

```
Action          →  Weight (Importance)
─────────────────────────────────────
Movie Purchase  →  5 (Sabse Strong Signal)
Movie Rate      →  4
Movie Watch     →  3
Movie Click     →  2
Movie View      →  1 (Sabse Weak Signal)
```

### Step 2: ALS Model (Kaise Sikhta Hai?)

**ALS = Alternating Least Squares** — yeh ek Collaborative Filtering algorithm hai.

**Simple Explanation:**
> Maan lo Netflix ko pata hai ki aapne "Avengers", "Iron Man", "Spider-Man" liked kiya. Aur ek aur user ne bhi yehi movies liked kiya aur uske saath "Captain America" bhi. Toh ALS kehta hai — "Aap dono ka taste similar hai, toh aapko bhi Captain America recommend karo!"

**Technical Process:**
```
1. Saare users aur movies ek badi matrix mein daal do
   
   [User 1] →  [Movie A: 5, Movie B: 0, Movie C: 3]
   [User 2] →  [Movie A: 0, Movie B: 4, Movie C: 5]
   [User 3] →  [Movie A: 3, Movie B: 5, Movie C: 0]

2. ALS yeh matrix ko 2 chhoti matrices mein tod deta hai:
   - User Vectors (har user ki "taste profile")
   - Item Vectors (har movie ki "feature profile")

3. Recommendation = Aapke User Vector ko Item Vectors se multiply karo
   → Jis movie ka score highest aaye, woh recommend karo!
```

**Parameters used in this project:**
- `factors = 50` — 50 hidden features
- `iterations = 20` — 20 baar train karo
- `regularization = 0.1` — overfitting rokne ke liye

### Step 3: Hybrid System (3-Layer Recommendation)

Sirf ek method nahi, 3 layers ka system hai:

```
Layer 1: Trending (Popularity-Based)
─────────────────────────────────────
- Last 72 hours ke interactions dekho
- Sabse zyada clicked/watched movies ko trending dikhao
- Yeh anonymous users ke liye bhi kaam karta hai

Layer 2: Content-Based Filtering (Item Similarity)
───────────────────────────────────────────────────
- Har movie ke genres, tags dekhke "feature vector" banate hain
- Example: "Avengers" = {action: 0.4, sci-fi: 0.3, adventure: 0.3}
- Cosine Similarity se similar movies dhundho
- "Because You Watched X..." rows isi se aati hain

Layer 3: Collaborative Filtering (ALS ML Model)
─────────────────────────────────────────────────
- Python ALS model use karta hai
- Users ke taste patterns dekho
- Similar taste wale users ki liked movies recommend karo
- "Top Picks For You" row isi se aati hai
```

### Step 4: Cold Start Problem (Naye User Ko Kya Dikhayein?)

**Problem:** Naye user ke paas koi history nahi — kaise recommend karein?

**Solution:** Onboarding!
1. Signup ke baad 5+ movies select karo
2. Yeh selections "watch" events ke roop mein save hote hain
3. ALS model turant retrain hota hai in preferences ke saath
4. Ab user ke paas history hai → personalized recommendations milti hain

---

## ⚙️ Setup — Project Kaise Chalayein?

### Prerequisites (Pehle Yeh Install Karo)

```bash
# Check karein ki installed hain:
node --version      # v18+ chahiye
docker --version    # Docker Desktop chahiye
pnpm --version      # pnpm chahiye
python3 --version   # Python 3.10+ chahiye
```

### Step 1: Code Download Karo

```bash
git clone <repository-url>
cd Media-Hub
```

### Step 2: Dependencies Install Karo

```bash
pnpm install
```

### Step 3: Python ML Service Setup Karo

```bash
cd artifacts/recommender-service
python3 -m venv venv
source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
cd ../..
```

### Step 4: Database Seed Karo (Pehli Baar Sirf)

```bash
# MovieLens dataset download karo aur scripts/data/ mein rakh do
# Phir:
DATABASE_URL="postgresql://postgres:password@localhost:5432/mediahub" pnpm --filter @workspace/scripts run seed
```

### Step 5: Project Chalao!

```bash
pnpm run dev
```

Yeh command automatically:
- ✅ Docker se PostgreSQL database start karta hai
- ✅ Docker se Redis cache start karta hai
- ✅ Node.js API server port 5001 par start karta hai
- ✅ React frontend port 5173 par start karta hai
- ✅ Python ML service port 8000 par start karta hai

### Step 6: Browser Mein Kholein

```
http://localhost:5173
```

---

## 🎬 Pehli Baar Use Kaise Karein?

### 1. Account Banao

- **Sign Up** par click karo
- Email aur password daalo
- Account ban jayega!

### 2. Onboarding (Movie Preferences)

- Pehli baar login ke baad **"Pick Your Favorites"** screen aayegi
- **Kam se kam 5 movies** select karo jo tumhe pasand hain
- **Continue** dabao
- ML model turant train hona shuru ho jayega tumhare taste ke hisaab se!

### 3. Home Page

- **Trending Now** — Sabse popular movies
- **New Releases** — Naye movies
- **Top Picks For You** — AI ne aapke liye choose kiye
- **Because You Watched...** — Similar movies

### 4. Movie Par Click Karo

- Details, rating, genres dikhengi
- **Similar Movies** section mein related movies hongi
- ML model real-time mein yeh calculate karta hai

### 5. Search

- Navigation mein Search icon par click karo
- Koi bhi movie name likhao
- Results instantly aayenge

---

## 🖼 Posters Kaise Aate Hain?

Movie posters 3-step process se aate hain:

```
Step 1: Database Check
  → Kya DB mein poster_url save hai?
  → Yes → Direct dikha do (Fastest!)
  → No → Step 2

Step 2: IMDB API
  → Movie title se IMDB suggestion API call karo
  → Real movie poster URL milti hai
  → URL DB mein save karo (agla request fast hoga)
  → No result → Step 3

Step 3: AI-Generated Poster (Pollinations.ai)
  → "Movie poster for [Title] cinematic dark" prompt
  → AI se generate hua poster dikha do
  → Humesha kuch na kuch dikhega!
```

### Bulk Poster Update (One-Time Script)

Agar saare movies ke posters seedha DB mein save karne ho:

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/mediahub" \
  NODE_PATH="/Users/.../node_modules/.pnpm/pg@8.22.0/node_modules" \
  node scripts/update-posters.cjs
```

Yeh script IMDB se ~8000+ movies ke posters fetch karke DB mein save karta hai.

---

## 📁 Project Structure

```
Media-Hub/
│
├── artifacts/
│   ├── streamflix/              ← React Frontend
│   │   └── src/
│   │       ├── pages/           ← Home, Search, Login, Onboarding
│   │       └── components/      ← PosterCard, HeroBanner, ItemCarousel
│   │
│   ├── api-server/              ← Node.js Backend API
│   │   └── src/
│   │       ├── routes/          ← auth, items, recommendations, interactions
│   │       └── lib/             ← recommendations.ts (3-layer ML logic)
│   │
│   └── recommender-service/     ← Python ML Service
│       ├── model.py             ← ALS Model (training + prediction)
│       └── main.py              ← FastAPI server
│
├── lib/
│   ├── db/                      ← Database schema (Drizzle ORM)
│   └── api-client-react/        ← Frontend hooks for API calls
│
├── scripts/
│   ├── src/seed.ts              ← MovieLens data import script
│   └── update-posters.cjs       ← Bulk poster fetch script
│
├── docker-compose.yml           ← PostgreSQL + Redis containers
└── package.json                 ← Root workspace config
```

---

## 🔌 API Endpoints (Important Ones)

| Endpoint | Method | Kaam |
|----------|--------|------|
| `/api/auth/signup` | POST | Naya account banao |
| `/api/auth/login` | POST | Login karo |
| `/api/auth/onboard` | POST | Pehli baar movie preferences save karo |
| `/api/recommendations/home` | GET | Home page ke liye saari rows |
| `/api/recommendations/similar/:id` | GET | Kisi movie ki similar movies |
| `/api/items/trending` | GET | Trending movies |
| `/api/search?q=avengers` | GET | Search karo |
| `/api/interactions` | POST | Watch/click/rate event log karo |
| `/api/images/poster?title=...` | GET | IMDB se poster URL fetch karo |

---

## 🚨 Common Problems & Solutions

### Problem 1: Login kaam nahi kar raha

**Cause:** macOS AirPlay port 5000 use karta hai jo API se conflict karta hai.

**Solution:** Hamara API port 5001 par hai. Check karo ki `VITE_API_URL=http://localhost:5001` set hai.

### Problem 2: Images nahi dikh rahe

**Solution 1:** Browser hard refresh karo (`Cmd + Shift + R`)

**Solution 2:** Poster update script chalao:
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/mediahub" \
  NODE_PATH="$(pwd)/node_modules/.pnpm/pg@8.22.0/node_modules" \
  node scripts/update-posters.cjs
```

### Problem 3: "Top Picks For You" nahi dikh raha

**Cause:** Naye user ke liye model abhi train nahi hua.

**Solution:** Onboarding mein 5+ movies select karo. ML model automatically train hoga.

### Problem 4: Python ML service crash ho rahi hai

```bash
cd artifacts/recommender-service
source venv/bin/activate
pip install -r requirements.txt
```

### Problem 5: Database connect nahi ho raha

Check karo ki Docker chal raha hai:
```bash
docker compose up -d db redis
docker compose ps   # Status check
```

---

## 📊 Dataset Info

**MovieLens 100K Dataset** use kiya gaya hai:

| File | Content |
|------|---------|
| `movies.csv` | 9,742 movies — title, genres, year |
| `ratings.csv` | 100,836 ratings — userId, movieId, rating |

Yeh dataset University of Minnesota ka open-source dataset hai aur machine learning research ke liye freely available hai.

---

## 🎓 B.Tech Portfolio Highlights

Is project mein jo ML concepts implement hue hain:

1. **Collaborative Filtering** — ALS Matrix Factorization (Netflix Prize winning approach)
2. **Content-Based Filtering** — TF-style vector similarity with Cosine Similarity
3. **Hybrid Recommendation** — Dono approaches combine kiye
4. **Cold-Start Problem Solution** — Onboarding flow se solve kiya
5. **Implicit Feedback** — Explicit ratings ki jagah user behavior (clicks, watches) use kiya
6. **Real-time Retraining** — Har interaction ke baad model update hota hai
7. **Scalable Architecture** — Microservices (separate ML service, API, Frontend)

---

## 👨‍💻 Developer Info

**Alisha Bhalla** — B.Tech AI/ML Student

- Project: Netflix-Style Hybrid Movie Recommendation System
- Dataset: MovieLens 100K
- Architecture: Full-Stack MLOps with Microservices

---

*StreamFlix is a portfolio project — not affiliated with Netflix Inc.*
