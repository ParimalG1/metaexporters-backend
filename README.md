# MetaExporters API — Deploy Guide

## What's in this folder

| File | What it does |
|---|---|
| `server.js` | The entire backend — all API routes |
| `package.json` | Lists the packages Node needs to install |
| `data/` | Created automatically — stores all your data as JSON files |

---

## How to deploy FREE in 5 minutes — Railway.app

Railway is the easiest way to host a Node.js backend.
No credit card needed for the free tier.

### Step 1 — Create a free account
Go to → https://railway.app
Click "Start a New Project" and sign up with GitHub (recommended).

### Step 2 — Upload your backend files to GitHub first
1. Go to https://github.com and create a free account
2. Click the "+" button → "New repository"
3. Name it "metaexporters-backend" → click "Create repository"
4. Click "uploading an existing file" → drag in server.js and package.json
5. Click "Commit changes"

### Step 3 — Deploy on Railway
1. Go to https://railway.app → "New Project"
2. Choose "Deploy from GitHub repo"
3. Select your "metaexporters-backend" repo
4. Railway will auto-detect it's a Node.js app and deploy it

### Step 4 — Set environment variables (important!)
In Railway, click your service → "Variables" tab → add:
```
JWT_SECRET = any-long-random-string-you-make-up-keep-it-secret
PORT = 3000
```

### Step 5 — Get your URL
Railway gives you a public URL like:
https://metaexporters-api-production.up.railway.app

### Step 6 — Update your frontend
In your index.html, find this line and replace the URL:
```javascript
var API_BASE = 'https://YOUR-RAILWAY-URL.up.railway.app/api';
```

Then re-upload index.html to Netlify — done!

---

## Alternative: Render.com (also free)

1. Go to → https://render.com
2. Sign up → "New" → "Web Service"
3. Connect GitHub repo with your backend files
4. Set Build Command: npm install
5. Set Start Command: node server.js
6. Add environment variable: JWT_SECRET = your-secret-here
7. Click Deploy — done!

---

## All API Endpoints

### No login needed
| Method | URL | What it does |
|---|---|---|
| GET | /api/metals/prices | All 12 live metal prices |
| GET | /api/metals/prices/COPPER | Single metal price |
| GET | /api/listings | Browse all listings |
| GET | /api/listings/:id | Single listing |
| GET | /api/payments/fx-rates | Live FX rates |
| POST | /api/waitlist | Join waitlist |
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login — get token |

### Needs login (send token in header: Authorization: Bearer YOUR_TOKEN)
| Method | URL | What it does |
|---|---|---|
| GET | /api/users/me | Your profile |
| PUT | /api/users/me | Update profile |
| PUT | /api/users/me/kyc | Update KYC status |
| POST | /api/listings | Create a listing |
| PUT | /api/listings/:id | Edit your listing |
| DELETE | /api/listings/:id | Delete your listing |
| GET | /api/listings/:id/price-suggestion | AI price suggestion |
| POST | /api/listings/:id/bids | Place a bid |
| PUT | /api/bids/:id | Accept / reject / counter |
| GET | /api/listings/:id/chat | Read chat messages |
| POST | /api/listings/:id/chat | Send a chat message |
| POST | /api/documents/bill-of-lading | Generate document |
| POST | /api/documents/certificate-of-origin | Generate document |
| POST | /api/documents/customs-declaration | Generate document |
| POST | /api/documents/packing-list | Generate document |
| POST | /api/documents/full-set | All 4 documents at once |
| POST | /api/shipments | Create shipment |
| GET | /api/shipments | Your shipments |
| GET | /api/shipments/:id | Shipment details + milestones |
| PUT | /api/shipments/:id/status | Update status |
| POST | /api/shipments/:id/milestones | Add tracking milestone |
| POST | /api/payments/invoice | Create invoice |
| GET | /api/payments/invoices | Your invoices |

---
© 2025 MetaExporters
