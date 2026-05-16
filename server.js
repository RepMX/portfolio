const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

const PUBLIC_FOLDER = path.join(__dirname, 'public');
const CACHE_FOLDER = path.join(__dirname, 'cache');

const IMAGE_FOLDER = path.resolve(__dirname, 'private-images');
const LOGO_FOLDER = path.resolve(__dirname, 'private-logos');

const IMAGE_CACHE_FILE = path.join(CACHE_FOLDER, 'images.json');
const LOGO_CACHE_FILE = path.join(CACHE_FOLDER, 'logos.json');

let logoMap = new Map();
let logoAliasMap = new Map();

let imageMap = new Map();
let cachedImages = [];

function getStaticPages() {
  const pages = [
    {
      url: 'https://jedy.cc/',
      priority: '1.0',
      changefreq: 'weekly'
    }
  ];

  const entries = fs.readdirSync(PUBLIC_FOLDER, { withFileTypes: true });

  entries.forEach(entry => {
    if (!entry.isDirectory()) return;

    const indexPath = path.join(PUBLIC_FOLDER, entry.name, 'index.html');

    if (!fs.existsSync(indexPath)) return;

    pages.push({
      url: `https://jedy.cc/${entry.name}/`,
      priority: '0.8',
      changefreq: 'monthly'
    });
  });

  return pages;
}

function loadImageCache() {
  if (!fs.existsSync(IMAGE_CACHE_FILE)) {
    throw new Error('Missing cache/images.json. Run: node scripts/build-cache.js');
  }

  const records = JSON.parse(fs.readFileSync(IMAGE_CACHE_FILE, 'utf8'));

  imageMap = new Map();

  cachedImages = records.map(({ file, ...image }) => {
    imageMap.set(image.id, file);
    return image;
  });

  console.log(`Loaded ${cachedImages.length} cached images`);
}

function loadLogoCache() {
  if (!fs.existsSync(LOGO_CACHE_FILE)) {
    console.warn('Missing cache/logos.json. Run: node scripts/build-cache.js');
    return;
  }

  const records = JSON.parse(fs.readFileSync(LOGO_CACHE_FILE, 'utf8'));

  logoMap = new Map();
  logoAliasMap = new Map();

  records.forEach(({ alias, id, file }) => {
    logoMap.set(id, file);
    logoAliasMap.set(alias, id);
  });

  console.log(`Loaded ${logoMap.size} cached logos`);
}

app.get('/sitemap.xml', (req, res) => {
  const pages = getStaticPages();
  const lastmod = new Date().toISOString().split('T')[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="https://shop.jedy.cc/default-sitemap.xsl?sitemap=root"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9" 
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages.map(page => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(xml);
});

app.use(express.static(PUBLIC_FOLDER));

app.get('/api/list-images', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(cachedImages);
});

app.get('/api/image', (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).send('Missing image id');

    const file = imageMap.get(id);
    if (!file) return res.status(404).send('Image not found');

    const filePath = path.resolve(IMAGE_FOLDER, file);

    if (!filePath.startsWith(IMAGE_FOLDER + path.sep)) {
      return res.status(403).send('Forbidden');
    }

    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error serving image');
  }
});

app.get('/api/list-logos', (req, res) => {
  try {
    const logos = {};

    for (const [alias, id] of logoAliasMap.entries()) {
      logos[alias] = `/api/logo?id=${encodeURIComponent(id)}`;
    }

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(logos);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating logo map');
  }
});

app.get('/api/logo', (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).send('Missing logo id');
    }

    const file = logoMap.get(id);

    if (!file) {
      return res.status(404).send('Logo not found');
    }

    const filePath = path.resolve(LOGO_FOLDER, file);

    if (!filePath.startsWith(LOGO_FOLDER + path.sep)) {
      return res.status(403).send('Forbidden');
    }

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error serving logo');
  }
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_FOLDER, '404', 'index.html'));
});

loadImageCache();
loadLogoCache();

app.listen(3000, () => {
  console.log('Running at http://localhost:3000');
});