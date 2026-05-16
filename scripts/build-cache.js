const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

sharp.cache({
  memory: 50,
  files: 10,
  items: 100
});

sharp.concurrency(2);

const ROOT_FOLDER = path.resolve(__dirname, '..');
const PUBLIC_FOLDER = path.join(ROOT_FOLDER, 'public');
const CACHE_FOLDER = path.join(ROOT_FOLDER, '.cache');

const IMAGE_FOLDER = path.resolve(ROOT_FOLDER, 'private-images');
const LOGO_FOLDER = path.resolve(ROOT_FOLDER, 'private-logos');

const IMAGE_CACHE_FILE = path.join(CACHE_FOLDER, 'images.json');
const LOGO_CACHE_FILE = path.join(CACHE_FOLDER, 'logos.json');
const PREVIEW_FILE = path.join(PUBLIC_FOLDER, 'preview.jpg');

const logoAliases = {
  netflix: 'netflix.png',
  disneyplus: 'disneyplus.png',
  appletv: 'appletv.png',
  foodnetwork: 'foodnetwork.png'
};

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

function writeJson(filePath, data) {
  const tempFile = `${filePath}.tmp`;

  fs.writeFileSync(tempFile, JSON.stringify(data));
  fs.renameSync(tempFile, filePath);
}

async function buildImageCache() {
  const files = fs.readdirSync(IMAGE_FOLDER)
    .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

  const cachedImages = await Promise.all(files.map(async file => {
    const id = makeId(file);
    const filePath = path.join(IMAGE_FOLDER, file);

    const metadata = await sharp(filePath).metadata();

    return {
      id,
      file,
      width: metadata.width,
      height: metadata.height,
      bgColor: await getAverageColor(filePath)
    };
  }));

  writeJson(IMAGE_CACHE_FILE, cachedImages);

  console.log(`Cached ${cachedImages.length} images`);
}

function buildLogoCache() {
  if (!fs.existsSync(LOGO_FOLDER)) {
    console.warn('No private-logos folder found');
    writeJson(LOGO_CACHE_FILE, []);
    return;
  }

  const cachedLogos = [];

  Object.entries(logoAliases).forEach(([alias, file]) => {
    const filePath = path.join(LOGO_FOLDER, file);

    if (!fs.existsSync(filePath)) {
      console.warn(`Logo file missing: ${file}`);
      return;
    }

    const id = makeId(file);

    cachedLogos.push({
      alias,
      id,
      file
    });
  });

  writeJson(LOGO_CACHE_FILE, cachedLogos);

  console.log(`Cached ${cachedLogos.length} logos`);
}

async function buildPreviewImage() {
  const files = fs.readdirSync(IMAGE_FOLDER)
    .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
    .sort();

  if (!files.length) {
    console.warn('No preview image available');
    return;
  }

  const filePath = path.join(IMAGE_FOLDER, files[0]);

  await sharp(filePath)
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 80, progressive: true })
    .toFile(PREVIEW_FILE);

  console.log('Generated preview.jpg');
}

async function main() {
  fs.mkdirSync(CACHE_FOLDER, { recursive: true });
  fs.mkdirSync(PUBLIC_FOLDER, { recursive: true });

  await buildImageCache();
  buildLogoCache();
  await buildPreviewImage();

  console.log('Static cache build complete');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});