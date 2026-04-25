const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Private image folder
const IMAGE_FOLDER = path.join(__dirname, 'private-images');

// List images
app.get('/api/list-images', (req, res) => {
  fs.readdir(IMAGE_FOLDER, (err, files) => {
    if (err) return res.status(500).send('Error reading folder');

    const images = files.filter(file =>
      /\.(jpg|jpeg|png|webp)$/i.test(file)
    );

    res.json(images);
  });
});

// Serve images securely
app.get('/api/image', (req, res) => {
  const file = req.query.name;

  if (!file) return res.status(400).send('Missing filename');

  const filePath = path.join(IMAGE_FOLDER, file);

  // Prevent path traversal
  if (!filePath.startsWith(IMAGE_FOLDER)) {
    return res.status(403).send('Forbidden');
  }

  res.sendFile(filePath);
});

app.listen(3000, () => {
  console.log('Running at http://localhost:3000');
});
