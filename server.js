const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
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

// Recursively scan configs folder and build category hierarchy
async function scanConfigsDirectory(dirPath, categoryPath = []) {
  const result = {
    categories: [],
    items: []
  };

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    // First, read metadata.json if it exists
    let categoryMetadata = null;
    const metadataFile = path.join(dirPath, 'metadata.json');
    try {
      const metadataContent = await fs.readFile(metadataFile, 'utf-8');
      categoryMetadata = JSON.parse(metadataContent);
    } catch (err) {
      // No metadata.json in this folder, that's okay
    }

    // Read and merge all items*.json files in current directory
    const itemFiles = entries.filter(entry =>
      entry.isFile() &&
      entry.name.endsWith('.json') &&
      entry.name !== 'metadata.json'
    );

    for (const file of itemFiles) {
      try {
        const filePath = path.join(dirPath, file.name);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        if (data.items && Array.isArray(data.items)) {
          // Add category path to each item
          const itemsWithCategory = data.items.map(item => ({
            ...item,
            categoryPath: [...categoryPath],
            categoryId: categoryPath.join('/')
          }));
          result.items.push(...itemsWithCategory);
        }
      } catch (err) {
        console.error(`Error reading ${file.name}:`, err);
      }
    }

    // Process subdirectories (subcategories)
    const subdirs = entries.filter(entry => entry.isDirectory());

    for (const subdir of subdirs) {
      const subdirPath = path.join(dirPath, subdir.name);
      const subdirCategoryPath = [...categoryPath, subdir.name];

      // Recursively scan subdirectory
      const subdirResult = await scanConfigsDirectory(subdirPath, subdirCategoryPath);

      // Read subdirectory metadata
      let subdirMetadata = null;
      try {
        const subdirMetadataFile = path.join(subdirPath, 'metadata.json');
        const subdirMetadataContent = await fs.readFile(subdirMetadataFile, 'utf-8');
        subdirMetadata = JSON.parse(subdirMetadataContent);
      } catch (err) {
        // Use folder name as fallback
        subdirMetadata = {
          title: subdir.name,
          icon: '📁'
        };
      }

      // Add subcategory to hierarchy
      result.categories.push({
        id: subdir.name,
        path: subdirCategoryPath,
        pathString: subdirCategoryPath.join('/'),
        title: subdirMetadata.title || subdir.name,
        icon: subdirMetadata.icon || '📁',
        icon_path: subdirMetadata.icon_path || null,
        filter: subdirMetadata.filter !== undefined ? subdirMetadata.filter : true,
        description: subdirMetadata.description || '',
        parentPath: categoryPath,
        subcategories: subdirResult.categories,
        itemCount: subdirResult.items.length
      });

      // Merge items from subdirectories
      result.items.push(...subdirResult.items);
    }

    return result;
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
    return result;
  }
}

// Load all metadata and build complete structure
async function loadMetadata() {
  try {
    const configsPath = path.join(__dirname, config.CONTENT_DIR, 'configs');

    // Check if configs directory exists
    try {
      await fs.access(configsPath);
    } catch (err) {
      console.log('configs directory does not exist, falling back to legacy metadata.json');
      // Try legacy metadata.json
      try {
        const legacyPath = path.join(__dirname, config.CONTENT_DIR, 'metadata.json');
        const data = await fs.readFile(legacyPath, 'utf-8');
        const parsed = JSON.parse(data);
        return {
          categories: [],
          items: parsed.items || [],
          isLegacy: true
        };
      } catch (legacyErr) {
        return { categories: [], items: [], isLegacy: true };
      }
    }

    const result = await scanConfigsDirectory(configsPath);
    return {
      categories: result.categories,
      items: result.items,
      isLegacy: false
    };
  } catch (error) {
    console.error('Error loading metadata:', error);
    return { categories: [], items: [], isLegacy: true };
  }
}

// API endpoint to get all items from metadata
app.get('/api/items', async (req, res) => {
  try {
    const metadata = await loadMetadata();
    const { category, search } = req.query;

    let items = metadata.items;

    // Filter by category (supports hierarchical paths like "photos/buildings/churches")
    if (category) {
      items = items.filter(item => {
        if (metadata.isLegacy) {
          // Legacy mode: check categories array
          return item.categories && item.categories.includes(category);
        } else {
          // New mode: check categoryId matches or starts with category path
          return item.categoryId === category || item.categoryId?.startsWith(category + '/');
        }
      });
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

// API endpoint to get all categories (hierarchical)
app.get('/api/categories', async (req, res) => {
  try {
    const metadata = await loadMetadata();
    const { parent } = req.query;

    if (metadata.isLegacy) {
      // Legacy mode: return flat list
      const categoriesSet = new Set();
      metadata.items.forEach(item => {
        if (item.categories) {
          item.categories.forEach(cat => categoriesSet.add(cat));
        }
      });
      const categories = Array.from(categoriesSet).sort((a, b) =>
        a.localeCompare(b, 'cs')
      );
      res.json({ categories, isLegacy: true });
    } else {
      // New mode: return hierarchical categories
      if (parent) {
        // Find categories at specific level
        const parentParts = parent.split('/');
        let currentLevel = metadata.categories;

        for (const part of parentParts) {
          const found = currentLevel.find(cat => cat.id === part);
          if (found) {
            currentLevel = found.subcategories;
          } else {
            return res.json({ categories: [], isLegacy: false });
          }
        }

        res.json({ categories: currentLevel, isLegacy: false });
      } else {
        // Return top-level categories
        res.json({ categories: metadata.categories, isLegacy: false });
      }
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Chyba při načítání kategorií' });
  }
});

// Main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(config.PORT, () => {
  console.log(`Server běží na http://localhost:${config.PORT}`);
});
