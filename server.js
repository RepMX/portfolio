const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const app = express();

const PUBLIC_FOLDER = path.join(__dirname, 'public');

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

app.get('/sitemap.xml', (req, res) => {
  const pages = getStaticPages();
  const lastmod = new Date().toISOString().split('T')[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
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

const IMAGE_FOLDER = path.resolve(__dirname, 'private-images');

let rebuildTimer;
let isRebuilding = false;
let imageMap = new Map();
let cachedImages = [];

function makeId(filename) {
  return crypto
    .createHash('sha256')
    .update(filename)
    .digest('hex')
    .slice(0, 16);
}

async function getAverageColor(filePath) {
  try {
    const { data } = await sharp(filePath)
      .resize(1, 1)
      .raw()
      .toBuffer({ resolveWithObject: true });

    return `#${[data[0], data[1], data[2]]
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')}`;
  } catch {
    return '#080806';
  }
}

async function buildImageCache() {
  const files = fs.readdirSync(IMAGE_FOLDER)
    .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

  imageMap = new Map();

  cachedImages = await Promise.all(files.map(async file => {
    const id = makeId(file);
    const filePath = path.join(IMAGE_FOLDER, file);

    imageMap.set(id, file);

    const metadata = await sharp(filePath).metadata();

    return {
      id,
      width: metadata.width,
      height: metadata.height,
      bgColor: await getAverageColor(filePath)
    };
  }));

  console.log(`Cached ${cachedImages.length} images`);
}

function scheduleImageCacheRebuild() {
  clearTimeout(rebuildTimer);

  rebuildTimer = setTimeout(async () => {
    if (isRebuilding) return;

    try {
      isRebuilding = true;
      console.log('Private image folder changed. Rebuilding image cache...');
      await buildImageCache();
      console.log('Image cache rebuilt.');
    } catch (err) {
      console.error('Failed to rebuild image cache:', err);
    } finally {
      isRebuilding = false;
    }
  }, 800);
}

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

app.get('/preview.jpg', async (req, res) => {
  try {
    const files = fs.readdirSync(IMAGE_FOLDER)
      .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
      .sort();

    if (!files.length) return res.status(404).send('No preview image available');

    const filePath = path.join(IMAGE_FOLDER, files[0]);

    const buffer = await sharp(filePath)
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 82, progressive: true })
      .toBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating preview');
  }
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_FOLDER, '404', 'index.html'));
});

buildImageCache().then(() => {
  fs.watch(IMAGE_FOLDER, (eventType, filename) => {
    if (!filename) return;
    if (!/\.(jpg|jpeg|png|webp)$/i.test(filename)) return;
    scheduleImageCacheRebuild();
  });
  app.listen(3000, () => {
    console.log('Running at http://localhost:3000');
  });
});
