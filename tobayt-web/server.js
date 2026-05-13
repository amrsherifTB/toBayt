const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tobayt-dev-secret-change-this-in-production-please';
const DB_PATH = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================================
// SEED DATA — used on first run / when DB is empty
// =====================================================================
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
  { id:"post2", providerId:"p2", proofKind:"collab", caption:"Bundled service with Nour: one strength session plus one nutrition consultation. Same week, one payment. Built for clients who don't want to coordinate two providers themselves.", likes:412, time:"5h", coverTone:"deep-teal", isCollab:true, collabPartnerId:"p7", collab:{ title:"Train + Eat — Joint Coaching Bundle", description:"1 strength session with Khalid + 1 nutrition consultation with Nour. Booked together, paid once.", regularPrice:420, bundlePrice:350, duration:"2 sessions · 60 min each" } },
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
    { id:uuidv4(), from:"provider", text:"Got it. I'll plan a mezze spread, no eggplant. I'll arrive 90 min before with everything I need.", time:"2 days ago", read:true },
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

// =====================================================================
// DB (JSON file persistence)
// =====================================================================
let db = {
  users: [],
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
      db.users = data.users || [];
      db.providers = (data.providers && data.providers.length) ? data.providers : SEED_PROVIDERS.slice();
      db.posts = (data.posts && data.posts.length) ? data.posts : SEED_POSTS.slice();
      db.bookings = data.bookings || SEED_BOOKINGS.slice();
      db.threads = data.threads || JSON.parse(JSON.stringify(SEED_THREADS));
      console.log(`📂 Loaded data.json — ${db.users.length} users, ${db.providers.length} providers, ${db.bookings.length} bookings`);
    } else {
      saveDb();
      console.log('📂 Created data.json with seed data');
    }
  } catch(e) {
    console.error('⚠ Failed to load data.json:', e.message);
  }
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

const categories = [
  { id:"cooking", label:"Cooking" }, { id:"fitness", label:"Fitness" },
  { id:"wellness", label:"Wellness" }, { id:"languages", label:"Languages" },
  { id:"beauty", label:"Beauty" }, { id:"tutoring", label:"Tutoring" },
];

// =====================================================================
// AUTH MIDDLEWARE
// =====================================================================
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), JWT_SECRET); } catch(e) {}
  }
  next();
}

function sanitizeUser(u) {
  if (!u) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role, providerId: u.providerId || null, createdAt: u.createdAt };
}

// =====================================================================
// AUTH ROUTES
// =====================================================================
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, role, providerData } = req.body || {};
    if (!email || !password || !name || !role) return res.status(400).json({ error: 'Missing required fields' });
    if (!['client', 'provider'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
    const cleanEmail = String(email).trim().toLowerCase();
    if (cleanEmail === '1234') return res.status(400).json({ error: 'This email is reserved' });
    if (db.users.find(u => u.email === cleanEmail)) return res.status(409).json({ error: 'An account with this email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    let providerId = null;

    if (role === 'provider') {
      providerId = `p-${userId.slice(0, 8)}`;
      const pd = providerData || {};
      db.providers.push({
        id: providerId,
        name: (pd.displayName || name).trim(),
        specialty: (pd.specialty || '').trim() || 'Service Provider',
        cat: pd.category || 'wellness',
        rating: 0, reviews: 0,
        priceFrom: Number(pd.priceFrom) || 100,
        city: 'Doha', distance: 5,
        verified: false,
        bio: (pd.bio || '').trim(),
        cover: pd.cover || 'warm-orange',
        services: Array.isArray(pd.services) && pd.services.length ? pd.services : [
          { id: `s-${uuidv4().slice(0,8)}`, title: `${(pd.specialty || 'Session').trim()} — 60min`, duration: 60, price: Number(pd.priceFrom) || 100, locType: 'both' }
        ],
        status: 'pending',
        residency: pd.residency || '',
        userId,
        createdAt: new Date().toISOString(),
      });
    }

    const user = { id: userId, email: cleanEmail, passwordHash, name: name.trim(), role, providerId, createdAt: new Date().toISOString() };
    db.users.push(user);
    saveDb();

    const token = jwt.sign({ id: userId, email: cleanEmail, role, providerId }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (e) {
    console.error('Signup error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    // === ADMIN BACKDOOR ===
    // email "1234" + password "1234" → instant admin access, no DB account needed.
    if (String(email).trim() === '1234' && String(password) === '1234') {
      const adminUser = { id: 'admin-shortcut', email: 'admin@tobayt.qa', name: 'Admin', role: 'admin', providerId: null };
      const token = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ token, user: adminUser });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = db.users.find(u => u.email === cleanEmail);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, providerId: user.providerId }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: sanitizeUser(user) });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  if (req.user.id === 'admin-shortcut') {
    return res.json({ id: 'admin-shortcut', email: 'admin@tobayt.qa', name: 'Admin', role: 'admin', providerId: null });
  }
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(sanitizeUser(user));
});

// =====================================================================
// PROVIDERS
// =====================================================================
app.get('/api/providers', optionalAuth, (req, res) => {
  const { cat, q, verified, maxPrice, maxDistance, minRating, sort, includePending } = req.query;
  let result = db.providers.slice();
  if (req.user?.role !== 'admin' || includePending !== 'true') {
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

app.get('/api/providers/pending', authMiddleware, adminOnly, (req, res) => {
  res.json(db.providers.filter(p => p.status === 'pending'));
});

app.put('/api/providers/:id/status', authMiddleware, adminOnly, (req, res) => {
  const { status } = req.body || {};
  if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const idx = db.providers.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Provider not found' });
  db.providers[idx].status = status;
  if (status === 'approved') db.providers[idx].verified = true;
  saveDb();
  res.json(db.providers[idx]);
});

app.get('/api/providers/:id', (req, res) => {
  const provider = db.providers.find(p => p.id === req.params.id);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });
  res.json(provider);
});

app.put('/api/providers/:id', authMiddleware, (req, res) => {
  const idx = db.providers.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Provider not found' });
  const provider = db.providers[idx];
  if (req.user.role !== 'admin' && provider.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const allowed = ['name', 'specialty', 'bio', 'city', 'priceFrom', 'cat', 'cover', 'services'];
  for (const k of allowed) if (k in req.body) provider[k] = req.body[k];
  db.providers[idx] = provider;
  saveDb();
  res.json(provider);
});

// =====================================================================
// POSTS
// =====================================================================
app.get('/api/posts', (req, res) => res.json(db.posts));

app.post('/api/posts', authMiddleware, (req, res) => {
  if (req.user.role !== 'provider' && req.user.role !== 'admin') return res.status(403).json({ error: 'Provider account required' });
  const provider = db.providers.find(p => p.id === req.user.providerId);
  const post = {
    id: `post-${uuidv4().slice(0,8)}`,
    providerId: req.user.providerId,
    caption: req.body.caption || '',
    serviceTitle: req.body.serviceTitle || '',
    likes: 0, time: 'Just now',
    coverTone: provider?.cover || 'warm-orange',
    proofBadge: 'Just posted',
    proofKind: 'outcome',
  };
  db.posts.unshift(post);
  saveDb();
  res.status(201).json(post);
});

// =====================================================================
// CATEGORIES
// =====================================================================
app.get('/api/categories', (req, res) => res.json(categories));

// =====================================================================
// BOOKINGS
// =====================================================================
app.get('/api/bookings', optionalAuth, (req, res) => {
  if (!req.user || req.user.role === 'admin') return res.json(db.bookings);
  if (req.user.role === 'provider') return res.json(db.bookings.filter(b => b.providerId === req.user.providerId));
  return res.json(db.bookings.filter(b => b.userId === req.user.id || b.userId === null));
});

app.post('/api/bookings', optionalAuth, (req, res) => {
  const booking = { id: uuidv4(), ...req.body, userId: req.user?.id || null, createdAt: new Date().toISOString() };
  db.bookings.unshift(booking);
  db.threads[booking.id] = [
    { id: uuidv4(), system: true, icon: 'calendar', text: `Booking request sent to ${booking.providerName}`, time: 'Just now' },
  ];
  saveDb();
  res.status(201).json(booking);
});

app.put('/api/bookings/:id', optionalAuth, (req, res) => {
  const idx = db.bookings.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.bookings[idx] = { ...db.bookings[idx], ...req.body };
  saveDb();
  res.json(db.bookings[idx]);
});

// =====================================================================
// THREADS
// =====================================================================
app.get('/api/threads/:bookingId', (req, res) => {
  res.json(db.threads[req.params.bookingId] || []);
});

app.post('/api/threads/:bookingId', optionalAuth, (req, res) => {
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

// =====================================================================
// USERS (admin only)
// =====================================================================
app.get('/api/users', authMiddleware, adminOnly, (req, res) => {
  res.json(db.users.map(sanitizeUser));
});

// =====================================================================
// CATCH-ALL — serve index.html for client-side routing
// =====================================================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🏠 toBayt server running at http://localhost:${PORT}`);
  console.log(`   Admin shortcut: email "1234"  password "1234"\n`);
});
