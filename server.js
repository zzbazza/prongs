const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs').promises;
const config = require('./config');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: config.SESSION_MAX_AGE,
    httpOnly: true
  }
}));

// Static files
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/content', express.static(path.join(__dirname, 'content')));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.authenticated) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes
app.get('/login', (req, res) => {
  if (req.session.authenticated) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { password } = req.body;

  if (password === config.ACCESS_PASSWORD) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Nesprávné heslo' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Load metadata from JSON file
async function loadMetadata() {
  try {
    const metadataPath = path.join(__dirname, config.CONTENT_DIR, 'metadata.json');
    const data = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading metadata:', error);
    return { items: [] };
  }
}

// API endpoint to get all items from metadata
app.get('/api/items', requireAuth, async (req, res) => {
  try {
    const metadata = await loadMetadata();
    const { category, search } = req.query;

    let items = metadata.items;

    // Filter by category
    if (category) {
      items = items.filter(item =>
        item.categories && item.categories.includes(category)
      );
    }

    // Filter by search keywords
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(item => {
        const titleMatch = item.title?.toLowerCase().includes(searchLower);
        const descMatch = item.description?.toLowerCase().includes(searchLower);
        const keywordMatch = item.keywords?.some(k => k.toLowerCase().includes(searchLower));
        return titleMatch || descMatch || keywordMatch;
      });
    }

    res.json({ items });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Chyba při načítání položek' });
  }
});

// API endpoint to get all categories
app.get('/api/categories', requireAuth, async (req, res) => {
  try {
    const metadata = await loadMetadata();
    const categoriesSet = new Set();

    metadata.items.forEach(item => {
      if (item.categories) {
        item.categories.forEach(cat => categoriesSet.add(cat));
      }
    });

    const categories = Array.from(categoriesSet).sort((a, b) =>
      a.localeCompare(b, 'cs')
    );

    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Chyba při načítání kategorií' });
  }
});

// Main app
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(config.PORT, () => {
  console.log(`Server běží na http://localhost:${config.PORT}`);
});
