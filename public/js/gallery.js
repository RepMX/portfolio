let allFiles = [];
let renderedFiles = [];
let loadedCount = 0;
let columns = [];
let isLoading = false;
let imageMetaCache = new Map();

const initialBatchSize = 20;
const batchSize = 10;
const minColumnWidth = 320;
const preloadDistance = 300;

const gallery = document.getElementById('gallery');
const trigger = document.getElementById('load-trigger');

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

function getColumnCount() {
  return Math.max(1, Math.floor(gallery.clientWidth / minColumnWidth));
}

function buildColumns() {
  gallery.innerHTML = '';
  columns = [];

  const count = getColumnCount();

  for (let i = 0; i < count; i++) {
    const col = document.createElement('div');
    col.className = 'masonry-column';
    gallery.appendChild(col);
    columns.push(col);
  }
}

function getShortestColumn() {
  return columns.reduce((shortest, col) =>
    col.offsetHeight < shortest.offsetHeight ? col : shortest
  , columns[0]);
}

function getImageMeta(file) {
  if (imageMetaCache.has(file.id)) {
    return Promise.resolve(imageMetaCache.get(file));
  }

  return new Promise(resolve => {
    const probe = new Image();
    probe.src = `/api/image?id=${encodeURIComponent(file.id)}`;

    probe.onload = () => {
      const meta = {
        width: probe.naturalWidth || 3,
        height: probe.naturalHeight || 2
      };

      imageMetaCache.set(file.id, meta);
      resolve(meta);
    };

    probe.onerror = () => {
      const meta = { width: 3, height: 2 };
      imageMetaCache.set(file.id, meta);
      resolve(meta);
    };
  });
}

async function createImageItem(file) {
  const meta = await getImageMeta(file);

  const div = document.createElement('div');
  div.className = 'item';
  div.style.aspectRatio = `${meta.width} / ${meta.height}`;

  const img = document.createElement('img');
  img.src = `/api/image?id=${encodeURIComponent(file.id)}`;
  img.loading = 'lazy';
  img.decoding = 'async';

  img.onload = () => img.classList.add('loaded');
  img.onerror = () => img.classList.add('loaded');

  div.appendChild(img);
  return div;
}

async function renderFiles(files) {
  const items = await Promise.all(files.map(createImageItem));

  items.forEach(item => {
    getShortestColumn().appendChild(item);
  });
}

async function loadMore(count) {
  if (isLoading || loadedCount >= allFiles.length) return;

  isLoading = true;
  observer.unobserve(trigger);

  const nextFiles = allFiles.slice(loadedCount, loadedCount + count);

  loadedCount += nextFiles.length;
  renderedFiles.push(...nextFiles);

  await renderFiles(nextFiles);

  isLoading = false;

  if (loadedCount >= allFiles.length) {
    observer.disconnect();
    trigger.remove();
  } else {
    observer.observe(trigger);
  }
}

async function rebuildMasonry() {
  buildColumns();
  await renderFiles(renderedFiles);
}

const observer = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) {
    loadMore(batchSize);
  }
}, {
  rootMargin: `${preloadDistance}px`
});

function shuffle(array) {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

fetch('/api/list-images')
  .then(res => res.json())
  .then(files => {
    allFiles = shuffle(files);
    buildColumns();
    loadMore(initialBatchSize);

    if (loadedCount < allFiles.length) {
      observer.observe(trigger);
    }
  });

let resizeTimer;
let lastColumnCount = 0;

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(async () => {
    const newColumnCount = getColumnCount();

    if (newColumnCount === lastColumnCount) return;

    lastColumnCount = newColumnCount;

    const currentScroll = window.scrollY;

    await rebuildMasonry();

    requestAnimationFrame(() => {
      window.scrollTo(0, currentScroll);
    });
  }, 250);
});
