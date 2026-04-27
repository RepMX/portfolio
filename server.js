const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

app.get('/api/list-images', (req, res) => {
  try {
    res.json(getImages());
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

app.listen(3000, () => {
  console.log('Running at http://localhost:3000');
});