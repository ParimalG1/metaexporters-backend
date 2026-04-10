// ═══════════════════════════════════════════════════
//  MetaExporters — Backend API Server
//  Stack: Node.js + Express
//  Deploy: Replit (or any Node host)
//  Endpoints:
//    GET  /api/metals/prices
//    GET  /api/listings
//    GET  /api/waitlist
//    POST /api/waitlist
// ═══════════════════════════════════════════════════

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────
app.use(cors());                        // allow all origins (fine for a public API)
app.use(express.json());

// ── Data file paths ─────────────────────────────────
const DATA_DIR      = path.join(__dirname, 'data');
const WAITLIST_FILE = path.join(DATA_DIR, 'waitlist.json');
const LISTINGS_FILE = path.join(DATA_DIR, 'listings.json');

// Make sure the /data folder exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Helpers ─────────────────────────────────────────
function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {}
  return fallback;
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ── Seed listings if none exist ──────────────────────
function seedListings() {
  if (fs.existsSync(LISTINGS_FILE)) return;
  const sample = [
    { id:'L001', metalType:'Copper', grade:'No.2', weightTons:120, countryCode:'DE', status:'active', priceUsd:null, seller:{ name:'Rhein Metals GmbH', country:'DE' }, createdAt: new Date(Date.now()-2*60000).toISOString() },
    { id:'L002', metalType:'Aluminium', grade:'6061 Alloy', weightTons:45, countryCode:'US', status:'active', priceUsd:null, seller:{ name:'Pacific Scrap LLC', country:'US' }, createdAt: new Date(Date.now()-8*60000).toISOString() },
    { id:'L003', metalType:'Steel', grade:'HMS 1&2', weightTons:500, countryCode:'GB', status:'active', priceUsd:null, seller:{ name:'BritScrap Ltd', country:'GB' }, createdAt: new Date(Date.now()-15*60000).toISOString() },
    { id:'L004', metalType:'Brass', grade:'Yellow Brass', weightTons:30, countryCode:'AE', status:'active', priceUsd:null, seller:{ name:'Gulf Metal Trading', country:'AE' }, createdAt: new Date(Date.now()-40*60000).toISOString() },
    { id:'L005', metalType:'Nickel', grade:'200 Series', weightTons:18, countryCode:'IN', status:'active', priceUsd:null, seller:{ name:'Bharat Scrap Co.', country:'IN' }, createdAt: new Date(Date.now()-90*60000).toISOString() },
  ];
  writeJson(LISTINGS_FILE, sample);
  console.log('✔ Sample listings seeded.');
}
seedListings();

// ── Seed waitlist if none exist ──────────────────────
function seedWaitlist() {
  if (fs.existsSync(WAITLIST_FILE)) return;
  writeJson(WAITLIST_FILE, []);
  console.log('✔ Empty waitlist created.');
}
seedWaitlist();

// ════════════════════════════════════════════════════
//  METAL PRICE ENGINE
//  Base LME prices with small random walk every call
//  so the ticker always shows live-looking movement.
// ════════════════════════════════════════════════════
const BASE_PRICES = {
  COPPER:    9420,
  ALUMINIUM: 2310,
  STEEL:      540,
  BRASS:     6100,
  NICKEL:   16400,
  ZINC:      2870,
  LEAD:      2060,
  TIN:      27800,
};

// Carry state between requests so prices drift realistically
let currentPrices = { ...BASE_PRICES };
let lastPriceTime = 0;

function getMetalPrices() {
  const now = Date.now();
  // Recalculate at most every 30 s (matches frontend refresh interval)
  if (now - lastPriceTime > 30_000) {
    lastPriceTime = now;
    for (const [symbol, base] of Object.entries(BASE_PRICES)) {
      // Random walk ±0.4 % per tick, clamped to ±3 % from base
      const drift  = (Math.random() - 0.5) * 0.008 * currentPrices[symbol];
      let newPrice = currentPrices[symbol] + drift;
      const lo     = base * 0.97;
      const hi     = base * 1.03;
      newPrice     = Math.max(lo, Math.min(hi, newPrice));
      currentPrices[symbol] = +newPrice.toFixed(0);
    }
  }

  return Object.entries(currentPrices).map(([symbol, price]) => {
    const base          = BASE_PRICES[symbol];
    const changePercent = +((price - base) / base * 100).toFixed(2);
    return { symbol, priceUsd: price, changePercent };
  });
}

// ════════════════════════════════════════════════════
//  ROUTES
// ════════════════════════════════════════════════════

// ── Health check ─────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'MetaExporters API', version: '1.0.0' });
});

// ─────────────────────────────────────────────────────
//  GET /api/metals/prices
//  Returns live-ish LME prices for all metals.
// ─────────────────────────────────────────────────────
app.get('/api/metals/prices', (_req, res) => {
  const prices = getMetalPrices();
  res.json({
    success:   true,
    updatedAt: new Date().toISOString(),
    prices,
  });
});

// ─────────────────────────────────────────────────────
//  GET /api/listings
//  Query params:
//    status  = active | all          (default: all)
//    metal   = COPPER | STEEL | ...  (optional filter)
//    limit   = number                (default: 20)
// ─────────────────────────────────────────────────────
app.get('/api/listings', (req, res) => {
  let listings = readJson(LISTINGS_FILE, []);
  const { status, metal, limit = 20 } = req.query;

  if (status) listings = listings.filter(l => l.status === status);
  if (metal)  listings = listings.filter(l => l.metalType.toUpperCase() === metal.toUpperCase());

  // Attach current price to each listing
  const prices = getMetalPrices();
  listings = listings.map(l => {
    const priceData = prices.find(p => l.metalType.toUpperCase().startsWith(p.symbol));
    return { ...l, priceUsd: priceData ? priceData.priceUsd : null };
  });

  res.json({
    success:  true,
    total:    listings.length,
    listings: listings.slice(0, +limit),
  });
});

// ─────────────────────────────────────────────────────
//  GET /api/waitlist
//  Returns total count (not emails — privacy).
// ─────────────────────────────────────────────────────
app.get('/api/waitlist', (_req, res) => {
  const list = readJson(WAITLIST_FILE, []);
  res.json({ success: true, total: list.length });
});

// ─────────────────────────────────────────────────────
//  POST /api/waitlist
//  Body: { email, name, company?, country? }
//  Returns 409 if email already registered.
// ─────────────────────────────────────────────────────
app.post('/api/waitlist', (req, res) => {
  const { email, name, company, country } = req.body;

  // Basic validation
  if (!email || !name) {
    return res.status(400).json({ success: false, error: 'email and name are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address.' });
  }

  const list  = readJson(WAITLIST_FILE, []);
  const exists = list.find(e => e.email.toLowerCase() === email.toLowerCase());

  if (exists) {
    return res.status(409).json({ success: false, error: 'Email already on the waitlist.' });
  }

  const entry = {
    id:        `W${String(list.length + 1).padStart(4, '0')}`,
    email:     email.toLowerCase().trim(),
    name:      name.trim(),
    company:   company  || null,
    country:   country  || null,
    joinedAt:  new Date().toISOString(),
  };

  list.push(entry);
  writeJson(WAITLIST_FILE, list);

  console.log(`✔ New waitlist entry: ${entry.name} <${entry.email}> — total: ${list.length}`);

  return res.status(201).json({
    success:  true,
    message:  'You have been added to the waitlist!',
    position: list.length,
    total:    list.length,
  });
});

// ─────────────────────────────────────────────────────
//  POST /api/listings   (optional — for future use)
//  Create a new listing.
// ─────────────────────────────────────────────────────
app.post('/api/listings', (req, res) => {
  const { metalType, grade, weightTons, countryCode, sellerName } = req.body;
  if (!metalType || !weightTons) {
    return res.status(400).json({ success: false, error: 'metalType and weightTons are required.' });
  }

  const listings = readJson(LISTINGS_FILE, []);
  const listing  = {
    id:          `L${String(listings.length + 1).padStart(3, '0')}`,
    metalType:   metalType.trim(),
    grade:       grade        || 'Mixed',
    weightTons:  +weightTons,
    countryCode: countryCode  || 'XX',
    status:      'active',
    priceUsd:    null,
    seller:      { name: sellerName || 'Anonymous', country: countryCode || 'XX' },
    createdAt:   new Date().toISOString(),
  };

  listings.push(listing);
  writeJson(LISTINGS_FILE, listings);

  return res.status(201).json({ success: true, listing });
});

// ── 404 catch-all ────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// ── Start ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   MetaExporters API — running!       ║
  ║   http://localhost:${PORT}               ║
  ╚══════════════════════════════════════╝

  Endpoints:
    GET  /api/metals/prices
    GET  /api/listings
    GET  /api/waitlist
    POST /api/waitlist
    POST /api/listings
  `);
});
