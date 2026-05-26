// toBayt server — auth is handled by Supabase on the frontend.
// This server only stores domain data (providers, posts, bookings, threads) in a JSON file.
//
// NOTE: there are no auth checks here. The X-Admin-Shortcut header or a Supabase
// access token may be sent by the client for tracing, but the server simply trusts
// the caller. Add proper auth before going to production.

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// SEED DATA
// ============================================================
const SEED_PROVIDERS = [
  { id:"p1", name:"Layla", specialty:"Private Chef", cat:"cooking", rating:4.9, reviews:124, priceFrom:280, city:"Doha", distance:3.2, verified:true, bio:"Mediterranean & Levantine cuisine. 12 years cooking for Doha families. I bring everything — ingredients, plates, the magic.", cover:"warm-orange", status:"approved", services:[{id:"s1",title:"Family Dinner (4–6 ppl)",duration:180,price:480,locType:"client_home"},{id:"s2",title:"Cooking Class — Mezze",duration:120,price:280,locType:"both"},{id:"s3",title:"Weekly Meal Prep",duration:240,price:620,locType:"client_home"}] },
  { id:"p2", name:"Khalid", specialty:"Fitness Coach", cat:"fitness", rating:4.8, reviews:89, priceFrom:150, city:"Doha", distance:1.8, verified:true, bio:"Strength and conditioning. Former national team. I'll meet you at your gym, your living room, or my studio in West Bay.", cover:"deep-teal", status:"approved", services:[{id:"s4",title:"1-on-1 Strength Session",duration:60,price:180,locType:"both"},{id:"s5",title:"12-week Transformation",duration:60,price:150,locType:"both"}] },
  { id:"p3", name:"Aisha", specialty:"Arabic Tutor", cat:"languages", rating:5.0, reviews:56, priceFrom:120, city:"Doha", distance:5.1, verified:true, bio:"Modern Standard Arabic & Khaleeji dialect. Patient, structured, and a little obsessed with grammar.", cover:"soft-saffron", status:"approved", services:[{id:"s6",title:"Conversational Arabic — 1hr",duration:60,price:120,locType:"both"},{id:"s7",title:"Kids Arabic Reading",duration:45,price:100,locType:"client_home"}] },
  { id:"p5", name:"Maya", specialty:"Beauty Specialist", cat:"beauty", rating:4.9, reviews:203, priceFrom:200, city:"Doha", distance:2.4, verified:true, bio:"Bridal makeup, skincare consultations, and at-home spa treatments.", cover:"blush", status:"approved", services:[{id:"s9",title:"At-home Spa Facial",duration:75,price:320,locType:"client_home"},{id:"s10",title:"Bridal Makeup Trial",duration:90,price:450,locType:"both"}] },
  { id:"p6", name:"Yusuf", specialty:"Math Tutor", cat:"tutoring", rating:4.8, reviews:78, priceFrom:110, city:"Doha", distance:4.0, verified:true, bio:"IGCSE & IB Math. Engineer by training, teacher by accident — and I never went back.", cover:"deep-teal", status:"approved", services:[{id:"s11",title:"IGCSE Math — 1hr",duration:60,price:110,locType:"both"}] },
  { id:"p7", name:"Nour", specialty:"Nutritionist", cat:"wellness", rating:4.9, reviews:67, priceFrom:200, city:"Doha", distance:2.6, verified:true, bio:"Registered dietitian. I build sustainable plans around how you actually live — not how Instagram thinks you should.", cover:"soft-saffron", status:"approved", services:[{id:"s12",title:"Nutrition Consultation",duration:60,price:220,locType:"both"},{id:"s13",title:"8-week Plan + Check-ins",duration:60,price:200,locType:"both"}] },
];

const SEED_POSTS = [
  { id:"post1", providerId:"p1", proofKind:"outcome", serviceTitle:"Family Dinner (4–6 ppl)", caption:"Family dinner for the Al-Mansouri table tonight. Lamb ouzi, three salads, knafeh. Booked 9 days in advance, finished on schedule.", likes:234, time:"2h", coverTone:"warm-orange", proofBadge:"Verified booking" },
  { id:"post2", providerId:"p2", proofKind:"collab", caption:"Bundled service with Nour: one strength session plus one nutrition consultation. Same week, one payment.", likes:412, time:"5h", coverTone:"deep-teal", isCollab:true, collabPartnerId:"p7", collab:{ title:"Train + Eat — Joint Coaching Bundle", description:"1 strength session with Khalid + 1 nutrition consultation with Nour. Booked together, paid once.", regularPrice:420, bundlePrice:350, duration:"2 sessions · 60 min each" } },
  { id:"post3", providerId:"p3", proofKind:"outcome", serviceTitle:"Kids Arabic Reading", caption:"Six weeks in with one of my younger students. Parents wanted reading fluency before school starts in September — we're on track.", likes:87, time:"1d", coverTone:"soft-saffron", proofBadge:"Verified booking" },
  { id:"post4", providerId:"p2", proofKind:"outcome", serviceTitle:"12-week Transformation", caption:"Twelve weeks of work with a client who couldn't do an unassisted pull-up in week one. Patient consistency over hero workouts.", likes:198, time:"2d", coverTone:"deep-teal", proofBadge:"Verified booking" },
];

const SEED_BOOKINGS = [
  { id:"b1", providerId:"p1", providerName:"Layla", providerCover:"warm-orange", serviceTitle:"Cooking Class — Mezze", serviceId:"s2", date:new Date(Date.now()+5*86400000).toISOString(), slot:"18:00", when:"Thu May 14 · 18:00", locType:"client_home", total:292, status:"confirmed", userId:null },
  { id:"b2", providerId:"p2", providerName:"Khalid", providerCover:"deep-teal", serviceTitle:"1-on-1 Strength Session", serviceId:"s4", date:new Date(Date.now()+8*86400000).toISOString(), slot:"07:00", when:"Sun May 17 · 07:00", locType:"provider_location", total:192, status:"approved", userId:null },
  { id:"b3", providerId:"p3", providerName:"Aisha", providerCover:"soft-saffron", serviceTitle:"Conversational Arabic", serviceId:"s6", date:new Date(Date.now()-7*86400000).toISOString(), slot:"17:00", when:"Sat May 2 · 17:00", locType:"client_home", total:132, status:"completed", userId:null },
];

const SEED_THREADS = {
  b1: [
    { id:uuidv4(), system:true, icon:"calendar", text:"Booking confirmed by Layla", time:"3 days ago" },
    { id:uuidv4(), from:"provider", text:"Looking forward to it. Any allergies or strong preferences I should plan around?", time:"3 days ago", read:true },
    { id:uuidv4(), from:"client", text:"Nothing serious — my husband doesn't love eggplant but everyone else is fine. Aim for 6 people.", time:"3 days ago" },
    { id:uuidv4(), from:"provider", text:"Quick check — is parking available at The Pearl? And is there an oven I can use?", time:"12 min ago", read:false },
  ],
  b2: [
    { id:uuidv4(), system:true, icon:"calendar", text:"Booking sent to Khalid · waiting for acceptance", time:"1 hour ago" },
    { id:uuidv4(), system:true, icon:"check", text:"Khalid accepted your booking", time:"30 min ago" },
    { id:uuidv4(), from:"provider", text:"Confirmed for the session at the West Bay studio. Bring water and trainers, that's it.", time:"30 min ago", read:false },
  ],
  b3: [
    { id:uuidv4(), system:true, icon:"check", text:"Session completed", time:"1 week ago" },
    { id:uuidv4(), from:"provider", text:"Worksheets I mentioned — I emailed them too. See you next time.", time:"1 week ago", read:true },
    { id:uuidv4(), from:"client", text:"Got them, thank you Aisha!", time:"1 week ago" },
  ],
};

// ============================================================
// JSON FILE PERSISTENCE
// ============================================================
let db = {
  providers: SEED_PROVIDERS.slice(),
  posts: SEED_POSTS.slice(),
  bookings: SEED_BOOKINGS.slice(),
  threads: JSON.parse(JSON.stringify(SEED_THREADS)),
};

function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const data = JSON.parse(raw);
      db.providers = (data.providers && data.providers.length) ? data.providers : SEED_PROVIDERS.slice();
      db.posts = (data.posts && data.posts.length) ? data.posts : SEED_POSTS.slice();
      db.bookings = data.bookings || SEED_BOOKINGS.slice();
      db.threads = data.threads || JSON.parse(JSON.stringify(SEED_THREADS));
      console.log(`📂 Loaded data.json — ${db.providers.length} providers, ${db.bookings.length} bookings`);
    } else { saveDb(); console.log('📂 Created data.json with seed data'); }
  } catch(e) { console.error('⚠ Failed to load data.json:', e.message); }
}

let saveTimer = null;
function saveDb() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }
    catch(e) { console.error('⚠ Failed to save data.json:', e.message); }
  }, 50);
}

loadDb();

// ============================================================
// CALLER IDENTITY (best-effort, no verification)
// ============================================================
function callerInfo(req) {
  const isAdmin = req.headers['x-admin-shortcut'] === '1';
  // We don't verify Supabase JWTs here — the frontend handles auth.
  // If you want to verify, decode the payload (NOT for security, only for caller ID):
  let userId = null;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const payload = JSON.parse(Buffer.from(auth.slice(7).split('.')[1], 'base64').toString('utf8'));
      userId = payload?.sub || null;
    } catch (e) {}
  }
  return { isAdmin, userId };
}

// ============================================================
// PROVIDERS
// ============================================================
app.get('/api/providers', (req, res) => {
  const { cat, q, verified, maxPrice, maxDistance, minRating, sort, includePending } = req.query;
  const { isAdmin } = callerInfo(req);
  let result = db.providers.slice();
  if (!isAdmin || includePending !== 'true') {
    result = result.filter(p => (p.status || 'approved') === 'approved');
  }
  if (cat && cat !== 'all') result = result.filter(p => p.cat === cat);
  if (q) result = result.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.specialty.toLowerCase().includes(q.toLowerCase()));
  if (verified === 'true') result = result.filter(p => p.verified);
  if (maxPrice) result = result.filter(p => p.priceFrom <= Number(maxPrice));
  if (maxDistance) result = result.filter(p => p.distance <= Number(maxDistance));
  if (minRating) result = result.filter(p => p.rating >= Number(minRating));
  if (sort === 'price_asc') result.sort((a,b) => a.priceFrom - b.priceFrom);
  else if (sort === 'price_desc') result.sort((a,b) => b.priceFrom - a.priceFrom);
  else if (sort === 'rating') result.sort((a,b) => b.rating - a.rating);
  else if (sort === 'distance') result.sort((a,b) => a.distance - b.distance);
  else if (sort === 'popular') result.sort((a,b) => b.reviews - a.reviews);
  res.json(result);
});

// Admin-only — list pending applications
app.get('/api/providers/pending', (req, res) => {
  res.json(db.providers.filter(p => p.status === 'pending'));
});

// Admin — approve/reject
app.put('/api/providers/:id/status', (req, res) => {
  const { status } = req.body || {};
  if (!['approved','rejected','pending'].includes(status)) return res.status(400).json({ error:'Invalid status' });
  const idx = db.providers.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error:'Provider not found' });
  db.providers[idx].status = status;
  if (status === 'approved') db.providers[idx].verified = true;
  saveDb();
  res.json(db.providers[idx]);
});

app.get('/api/providers/:id', (req, res) => {
  const provider = db.providers.find(p => p.id === req.params.id);
  if (!provider) return res.status(404).json({ error:'Provider not found' });
  res.json(provider);
});

// Provider self-update OR create on signup (uses userId from request body)
app.post('/api/providers', (req, res) => {
  const b = req.body || {};
  if (!b.userId || !b.name) return res.status(400).json({ error:'userId and name are required' });
  // If a provider with this userId already exists, replace it
  const existing = db.providers.findIndex(p => p.userId === b.userId);
  const id = existing >= 0 ? db.providers[existing].id : b.userId;
  const provider = {
    id,
    userId: b.userId,
    name: b.name,
    specialty: b.specialty || 'Service Provider',
    cat: b.cat || 'wellness',
    rating: 0,
    reviews: 0,
    priceFrom: Number(b.priceFrom) || 100,
    city: b.city || 'Doha',
    distance: 5,
    verified: false,
    bio: b.bio || '',
    cover: b.cover || 'warm-orange',
    avatarUrl: b.avatarUrl || null,
    idUrl: b.idUrl || null,
    residency: b.residency || '',
    services: Array.isArray(b.services) && b.services.length ? b.services : [
      { id:`s-${uuidv4().slice(0,8)}`, title:`${b.specialty || 'Session'} — 60min`, duration:60, price:Number(b.priceFrom) || 100, locType:'both' }
    ],
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  if (existing >= 0) db.providers[existing] = { ...db.providers[existing], ...provider };
  else db.providers.push(provider);
  saveDb();
  res.status(201).json(provider);
});

app.put('/api/providers/:id', (req, res) => {
  const idx = db.providers.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error:'Provider not found' });
  const allowed = ['name','specialty','bio','city','priceFrom','cat','cover','services','avatarUrl'];
  for (const k of allowed) if (k in req.body) db.providers[idx][k] = req.body[k];
  saveDb();
  res.json(db.providers[idx]);
});

// ============================================================
// POSTS
// ============================================================
app.get('/api/posts', (req, res) => res.json(db.posts));

app.post('/api/posts', (req, res) => {
  const b = req.body || {};
  const provider = db.providers.find(p => p.id === b.providerId);
  const post = {
    id: `post-${uuidv4().slice(0,8)}`,
    providerId: b.providerId,
    caption: b.caption || '',
    serviceTitle: b.serviceTitle || '',
    imageUrl: b.imageUrl || null,
    likes: 0,
    time: 'Just now',
    coverTone: b.coverTone || provider?.cover || 'warm-orange',
    proofBadge: b.proofBadge || 'Just posted',
    proofKind: b.proofKind || 'outcome',
  };
  db.posts.unshift(post);
  saveDb();
  res.status(201).json(post);
});

// ============================================================
// CATEGORIES
// ============================================================
app.get('/api/categories', (req, res) => res.json([
  { id:"cooking", label:"Cooking" }, { id:"fitness", label:"Fitness" },
  { id:"wellness", label:"Wellness" }, { id:"languages", label:"Languages" },
  { id:"beauty", label:"Beauty" }, { id:"tutoring", label:"Tutoring" },
]));

// ============================================================
// BOOKINGS
// ============================================================
app.get('/api/bookings', (req, res) => {
  const { isAdmin, userId } = callerInfo(req);
  if (isAdmin || !userId) return res.json(db.bookings);
  // Real user: their bookings + provider records where they're the provider
  res.json(db.bookings.filter(b => b.userId === userId || b.providerId === userId));
});

app.post('/api/bookings', (req, res) => {
  const { userId } = callerInfo(req);
  const booking = { id: uuidv4(), ...req.body, userId: userId || req.body.userId || null, createdAt: new Date().toISOString() };
  db.bookings.unshift(booking);
  db.threads[booking.id] = [
    { id: uuidv4(), system: true, icon: 'calendar', text: `Booking request sent to ${booking.providerName}`, time: 'Just now' },
  ];
  saveDb();
  res.status(201).json(booking);
});

app.put('/api/bookings/:id', (req, res) => {
  const idx = db.bookings.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.bookings[idx] = { ...db.bookings[idx], ...req.body };
  saveDb();
  res.json(db.bookings[idx]);
});

// ============================================================
// THREADS
// ============================================================
app.get('/api/threads/:bookingId', (req, res) => {
  res.json(db.threads[req.params.bookingId] || []);
});

app.post('/api/threads/:bookingId', (req, res) => {
  const { bookingId } = req.params;
  if (!db.threads[bookingId]) db.threads[bookingId] = [];
  const msg = { id: uuidv4(), ...req.body, time: 'Just now' };
  db.threads[bookingId].push(msg);
  if (req.body.from === 'client') {
    db.threads[bookingId] = db.threads[bookingId].map(m => m.from === 'provider' ? { ...m, read: true } : m);
  }
  saveDb();
  res.status(201).json(msg);
});

app.post('/api/threads/:bookingId/read', (req, res) => {
  const { bookingId } = req.params;
  if (db.threads[bookingId]) {
    db.threads[bookingId] = db.threads[bookingId].map(m => m.from === 'provider' ? { ...m, read: true } : m);
    saveDb();
  }
  res.json({ ok: true });
});

// ============================================================
// USERS (admin demo only — no real list since users live in Supabase)
// ============================================================
app.get('/api/users', (req, res) => {
  // Backend doesn't store users anymore — they're in Supabase Auth.
  // We can derive a list from provider records.
  const providerUsers = db.providers.filter(p => p.userId).map(p => ({
    id: p.userId, email: '(see Supabase)', name: p.name, role: 'provider', providerId: p.id,
  }));
  res.json(providerUsers);
});

// ============================================================
// CATCH-ALL — serve index.html for client-side routing
// ============================================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🏠 toBayt server running at http://localhost:${PORT}`);
  console.log(`   Auth: Supabase (frontend)`);
  console.log(`   Admin shortcut: email "1234" password "1234"\n`);
});
