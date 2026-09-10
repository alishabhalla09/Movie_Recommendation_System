# 🚀 StreamFlix — Deployment Guide

Bhai, is guide mein tujhe **3 options** bataunga — free se paid tak. Portfolio ke liye sabse best option ek-ek step mein explain karunga.

---

## 🎯 Deployment Options — Kaun Sa Choose Karo?

| Option | Cost | Difficulty | Best For |
|--------|------|------------|----------|
| **Option 1: Railway** | Free ($5 credit/month) | ⭐⭐ Easy | Portfolio + Resume |
| **Option 2: Render** | Free tier available | ⭐⭐⭐ Medium | Low traffic apps |
| **Option 3: VPS (DigitalOcean)** | $6/month | ⭐⭐⭐⭐ Hard | Production apps |

> **Recommendation:** B.Tech portfolio ke liye **Railway** best hai — Docker support, free tier, aur sab kuch ek jagah manage hota hai.

---

## ✅ Option 1: Railway (Recommended)

### Kya Hoga?

```
Railway Platform pe:
├── PostgreSQL database (managed)
├── Redis (managed)  
├── Python ML Service (Docker)
├── Node.js API Server (Docker)
└── React Frontend (Static Deploy)
    → Vercel ya Netlify pe (free)
```

### Step 1: Code GitHub Par Upload Karo

Pehle GitHub par repository banao aur code push karo:

```bash
# GitHub par naya repo banao: https://github.com/new
# Phir terminal mein:

cd /Users/himanshugahalyan/Desktop/Media-Hub

git init
git add .
git commit -m "Initial commit - StreamFlix ML Recommendation System"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/streamflix.git
git push -u origin main
```

> ⚠️ **Important:** `.env` files push mat karna! `.gitignore` check karo.

### Step 2: Railway Account Banao

1. **https://railway.app** par jao
2. **"Start a New Project"** click karo
3. **GitHub se Login** karo (free hai)
4. **$5 free credit** automatically milta hai

### Step 3: PostgreSQL Database Add Karo

```
1. Railway Dashboard → "+ New" → "Database" → "PostgreSQL"
2. Database create hoga
3. "Variables" tab mein jao → DATABASE_URL copy kar lo
   (Kuch aisa dikhega: postgresql://postgres:xxxxx@railway.app:5432/railway)
```

### Step 4: Redis Add Karo

```
1. Railway Dashboard → "+ New" → "Database" → "Redis"
2. "Variables" tab mein jao → REDIS_URL copy kar lo
```

### Step 5: Python ML Service Deploy Karo

```
1. Railway Dashboard → "+ New" → "GitHub Repo"
2. Apna repo select karo
3. "Root Directory" set karo: artifacts/recommender-service
4. Railway khud Dockerfile detect karega
5. "Variables" section mein add karo:
   DATABASE_URL = (Step 3 wala URL)
   PORT = 8000
6. Deploy karo!
7. Deploy hone ke baad URL copy karo (jaise: https://recommender-xxx.railway.app)
```

### Step 6: Node.js API Server Deploy Karo

```
1. Railway Dashboard → "+ New" → "GitHub Repo"
2. Same repo select karo
3. "Root Directory": . (root)
4. "Dockerfile Path": artifacts/api-server/Dockerfile
5. "Variables" section mein add karo:
   DATABASE_URL = (Step 3 wala URL)
   REDIS_URL = (Step 4 wala URL)
   RECOMMENDER_URL = (Step 5 ka URL, jaise https://recommender-xxx.railway.app)
   JWT_SECRET = koi_bhi_random_string_likho_yahan
   PORT = 5000
6. Deploy karo!
7. URL copy karo (jaise: https://api-xxx.railway.app)
```

### Step 7: Frontend Deploy Karo (Vercel — Free)

Frontend static build karo aur Vercel par deploy karo:

```bash
# Pehle production build banao
cd /Users/himanshugahalyan/Desktop/Media-Hub/artifacts/streamflix

# Environment variable set karo (Railway API ka URL use karo)
echo "VITE_API_URL=https://api-xxx.railway.app" > .env.production

# Build karo
pnpm run build
# Ek 'dist' folder banega
```

Phir Vercel par deploy karo:

```
1. https://vercel.com par jao → GitHub se login karo
2. "New Project" → Apna GitHub repo select karo
3. "Root Directory" ke saamne "Edit" dabao aur `artifacts/streamflix` select karo
130. 5. **IMPORTANT:** "Build & Development Settings" mein "Output Directory" ke aage `Override` on karo aur wahan `dist` likho. (Framework Preset me 'Vite' select hoga).
   VITE_API_URL = https://api-xxx.railway.app (Step 6 ka URL)
7. Deploy karo!
8. Vercel free URL milega: https://streamflix-xxx.vercel.app
```

### Step 8: Database Seed Karo (Data Import)

Railway database mein MovieLens data import karo:

Railway ke Postgres me "Public Networking" enable karo, wahan se naya Public URL lo aur apne laptop me ye run karo:

```bash
# Local machine se Railway database mein seed karo
DATABASE_URL="postgresql://postgres:xxxxx@mainline.proxy.rlwy.net:40423/railway" pnpm --filter @workspace/scripts run seed
```

> **🔥 IMPORTANT FIX:** Seeding ke baad, Postgres ka user ID sequence atak jata hai. Signup chalane ke liye ek extra command run karni zaroori hai:
```bash
# Isi folder me run karo
DATABASE_URL="Wahi_Public_URL_Yahan_Daalo" npx tsx -e "
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\"SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))\").then(() => process.exit(0));
"
```

### Step 9: Test Karo!

```
✅ https://streamflix-xxx.vercel.app kholao
✅ Signup karo
✅ Movies select karo (onboarding)
✅ Recommendations check karo
🎉 Deploy complete!
```

---

## 🔧 Option 2: Render (Alternative Free Option)

Render mein free tier hai but:
- ❌ 15 min inactivity ke baad sleep mode
- ❌ Cold start — pehla request slow hoga (30-60 sec)
- ✅ Credit card nahi chahiye

### Steps:

```
1. https://render.com → GitHub se login karo

2. PostgreSQL:
   New → PostgreSQL → Free tier

3. ML Service:
   New → Web Service → GitHub repo
   Root: artifacts/recommender-service
   Build: pip install -r requirements.txt
   Start: uvicorn main:app --host 0.0.0.0 --port $PORT

4. API Server:
   New → Web Service → GitHub repo
   Runtime: Docker
   Dockerfile: artifacts/api-server/Dockerfile

5. Frontend:
   New → Static Site → GitHub repo
   Root: artifacts/streamflix
   Build: pnpm install && pnpm run build
   Publish: dist
```

---

## 💪 Option 3: DigitalOcean VPS (Most Control)

Agar $6/month afford kar sakte ho toh yeh best hai production ke liye.

### Step 1: Droplet Create Karo

```
1. https://digitalocean.com → Account banao
2. "Create Droplet" → Ubuntu 22.04
3. Plan: Basic → $6/month (1GB RAM, 1 CPU)
4. Region: Bangalore (BLR1) — India ke liye fast
5. SSH Key add karo
```

### Step 2: Server Setup Karo

```bash
# SSH karo server mein
ssh root@YOUR_SERVER_IP

# Docker install karo
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin -y

# Code clone karo
git clone https://github.com/YOUR_USERNAME/streamflix.git
cd streamflix
```

### Step 3: Environment Variables Set Karo

```bash
# .env file banao
cat > .env << EOF
POSTGRES_USER=postgres
POSTGRES_PASSWORD=SuperSecretPassword123!
POSTGRES_DB=mediahub
DATABASE_URL=postgresql://postgres:SuperSecretPassword123!@db:5432/mediahub
REDIS_URL=redis://redis:6379/0
RECOMMENDER_URL=http://recommender:8000
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars
VITE_API_URL=http://YOUR_SERVER_IP:5001
EOF
```

### Step 4: Deploy Karo

```bash
# Build aur start karo
docker compose up -d --build

# Data seed karo
docker compose exec api-server sh -c "cd /app/scripts && pnpm run seed"

# Status check karo
docker compose ps
```

### Step 5: Domain + SSL (Optional)

```bash
# Nginx install karo (reverse proxy)
apt install nginx certbot python3-certbot-nginx -y

# Config banao
nano /etc/nginx/sites-available/streamflix
```

```nginx
server {
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5173;
    }
    
    location /api {
        proxy_pass http://localhost:5001;
    }
}
```

```bash
# SSL certificate (free)
certbot --nginx -d yourdomain.com

# Nginx restart
systemctl restart nginx
```

---

## 📋 Environment Variables Reference

Yeh saari variables production mein set karni hain:

| Variable | Value | Service |
|----------|-------|---------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | API + ML |
| `REDIS_URL` | `redis://host:6379/0` | API |
| `RECOMMENDER_URL` | `https://your-ml-service.railway.app` | API |
| `JWT_SECRET` | Koi bhi random 32+ char string | API |
| `VITE_API_URL` | `https://your-api.railway.app` | Frontend |
| `PORT` | `5000` (API), `8000` (ML) | Both |

### Secure JWT Secret Generate Karna:

```bash
# Terminal mein chalao — random secure key milegi
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: a3f8b2c9d1e4... (yeh copy kar lo JWT_SECRET mein)
```

---

## 🔒 Security Checklist (Deploy Karne Se Pehle)

```
☐ Database password change karo (default "password" mat rakhna!)
☐ JWT_SECRET strong rakho (32+ characters)
☐ .env file .gitignore mein hai
☐ --reload flag production mein hatao (docker-compose mein already hata diya)
☐ CORS sirf apne domain ke liye allow karo
```

---

## 📊 Cost Summary

| Platform | Monthly Cost | Free Tier |
|----------|-------------|-----------|
| Railway | $0 ($5 credit) | 500 hours/month |
| Vercel (Frontend) | $0 | Unlimited |
| Render | $0 | Free (slow) |
| DigitalOcean | $6/month | Nahi |
| Supabase (DB only) | $0 | 500MB free |

> **Portfolio ke liye total cost: ₹0 (Free!)** — Railway + Vercel combination use karo.

---

## 🆘 Deploy Karte Waqt Problems?

### "Build failed" error:
```bash
# Local mein build test karo pehle
docker compose build
```

### "Database connection refused":
```bash
# Check karo DATABASE_URL sahi hai
# Connection string format: postgresql://user:pass@host:port/dbname
```

### "Port already in use":
```bash
# Local ports free karo
lsof -ti :5001 | xargs kill -9
lsof -ti :8000 | xargs kill -9
```

### Railway deployment stuck:
```
1. Railway Dashboard → Logs tab check karo
2. Error message dekho
3. Environment variables dobara check karo
```

---

## 📱 Deployment ke Baad Share Kaise Karo?

Portfolio mein add karne ke liye:

```markdown
## 🎬 StreamFlix — AI Movie Recommendation System

Live Demo: https://streamflix-xxx.vercel.app

**Tech:** React, Node.js, Python, PostgreSQL, ALS Collaborative Filtering
**Dataset:** MovieLens 100K (9,742 movies, 100,000 ratings)

Features:
- Netflix-style UI with personalized recommendations
- Hybrid ML: ALS Collaborative Filtering + Content-Based Filtering
- Cold-start problem solved via onboarding flow
- Real-time model retraining on user interactions
```

---

*Bhai, Railway + Vercel combination try karo — free hai aur portfolio ke liye perfect! 🚀*
