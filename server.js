const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const IMAGE_FOLDER = path.resolve(__dirname, 'private-images');
let imageMap = new Map();

function makeId(filename) {
  return crypto
    .createHash('sha256')
    .update(filename)
    .digest('hex')
    .slice(0, 16);
}

function getImages() {
  const files = fs.readdirSync(IMAGE_FOLDER)
    .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

  imageMap = new Map();

  const images = files.map(file => {
    const id = makeId(file);
    imageMap.set(id, file);
    return { id };
  });

  return images;
}

async function getAverageColor(filePath) {
  try {
    const { dominant } = await sharp(filePath)
      .resize(1, 1)
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data }) => ({
        dominant: `#${[data[0], data[1], data[2]]
          .map(v => v.toString(16).padStart(2, '0'))
          .join('')}`
      }));

    return dominant;
  } catch {
    return '#080806';
  }
}

app.get('/api/list-images', async (req, res) => {
  try {
    const files = fs.readdirSync(IMAGE_FOLDER)
      .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

    imageMap.clear();

    const images = await Promise.all(files.map(async file => {
      const id = makeId(file);
      const filePath = path.join(IMAGE_FOLDER, file);

      imageMap.set(id, file);

      return {
        id,
        backgroundColor: await getAverageColor(filePath)
      };
    }));

    res.json(images);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error reading folder');
  }
});

app.get('/api/image', (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).send('Missing image id');

    if (imageMap.size === 0) getImages();

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

    if (!files.length) {
      return res.status(404).send('No preview image available');
    }

    const filePath = path.join(IMAGE_FOLDER, files[0]);

    const buffer = await sharp(filePath)
      .resize(1200, 630, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 82,
        progressive: true
      })
      .toBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating preview');
  }
});

app.listen(3000, () => {
  console.log('Running at http://localhost:3000');
});
