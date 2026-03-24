# Deploy Guide — Our Calendar v5

## 1. Firebase Setup (5 min)
- console.firebase.google.com → Create project → Realtime Database → europe-west1 → test mode
- Project settings → web app → copy config → paste into `src/firebase.js`

## 2. GitHub
- Create repo `our-calendar` → upload all files → commit

## 3. Vercel
- vercel.com → Import repo → Deploy
- Settings → Environment Variables → Add:
  - `ANTHROPIC_API_KEY` (from console.anthropic.com)
  - `FIREBASE_DATABASE_URL` (same as in firebase.js)
- Redeploy

## 4. iPhones
- Open URL in Safari → Share → Add to Home Screen (both phones)

## Features
- 🔄 Recurring events · ☀️ Weather · 🎂 Birthdays/Anniversaries
- 😊 Mood tags · 💕 Plan a Date (AI) · ✈️ Guest itinerary (AI)
- 📰 Monthly wrap (AI) · 🎯 Couples goals · 🧠 AI Concierge
- 📲 Push notifications · 🏆 Restaurant rankings · 📍 Map
- 📸 Gallery · 📝 Wishlist · 🔗 Auto-links
