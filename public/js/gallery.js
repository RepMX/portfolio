function initGallery(options = {}) {
  const {
    galleryId = 'gallery',
    scrollRootId = 'scroll-root',
    triggerId = 'load-trigger',
    yearId = 'year',
    batchSize = 10,
    minColumnWidth = 320,
    maxColumns = 4,
    preloadDistance = 300,
    imageLoadDelayMin = 20,
    imageLoadDelayMax = 80,
    listEndpoint = '/api/list-images',
    imageEndpoint = '/api/image'
  } = options;

  let allFiles = [];
  let renderedFiles = [];
  let loadedCount = 0;
  let columns = [];
  let isLoading = false;
  let imageMetaCache = new Map();

  const scrollRoot = document.getElementById(scrollRootId);
  const gallery = document.getElementById(galleryId);
  const trigger = document.getElementById(triggerId);

  if (!gallery || !trigger) return;

  const yearEl = document.getElementById(yearId);
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function imageUrl(file) {
    return `${imageEndpoint}?id=${encodeURIComponent(file.id)}`;
  }

  function updateScrollbarWidth() {
    if (!scrollRoot) return;

    const scrollbarWidth = scrollRoot.offsetWidth - scrollRoot.clientWidth;
    document.documentElement.style.setProperty(
      '--scrollbar-width',
      `${scrollbarWidth}px`
    );
  }

  function getColumnCount() {
    const calculatedColumns = Math.floor(gallery.clientWidth / minColumnWidth);
    return Math.max(1, Math.min(maxColumns, calculatedColumns));
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

  async function createImageItem(file) {
    const div = document.createElement('div');
    div.className = 'item';
    div.style.backgroundColor = file.backgroundColor || '#080806';
    div.style.aspectRatio = `${file.width} / ${file.height}`;

    const img = document.createElement('img');
    img.fetchPriority = loadedCount < batchSize ? 'high' : 'auto';
    img.alt = 'Photo by Jedy Sukandra';
    img.loading = 'eager';
    img.decoding = 'async';
    img.dataset.src = imageUrl(file);

    div.appendChild(img);
    return div;
  }

  async function renderFiles(files) {
    const items = await Promise.all(files.map(createImageItem));

    items.forEach(item => {
      getShortestColumn().appendChild(item);
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        items.forEach(item => {
          const img = item.querySelector('img');
          img.onload = () => img.classList.add('loaded');
          img.onerror = () => img.classList.add('loaded');
          const delay = imageLoadDelayMin + Math.random() * (imageLoadDelayMax - imageLoadDelayMin);

          setTimeout(() => {
            img.src = img.dataset.src;
            img.decode?.()
              .then(() => img.classList.add('loaded'))
              .catch(() => img.classList.add('loaded'));

            setTimeout(() => {
              img.classList.add('loaded');
            }, 1000);

            setTimeout(() => {
              item.style.backgroundColor = '#080806';
            }, 1200);
          }, delay);
        });
      });
    });
    
    updateScrollbarWidth();
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

  async function loadUntilScreenFilled() {
    const root = scrollRoot || document.documentElement;

    while (
      loadedCount < allFiles.length &&
      root.scrollHeight < root.clientHeight + preloadDistance
    ) {
      await loadMore(batchSize);
    }

    updateScrollbarWidth();
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
    root: scrollRoot || null,
    rootMargin: `${preloadDistance}px`,
    threshold: 0
  });

  function shuffle(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  fetch(listEndpoint)
    .then(res => res.json())
    .then(async files => {
      allFiles = shuffle(files);
      buildColumns();

      await loadUntilScreenFilled();

      requestAnimationFrame(() => {
        updateScrollbarWidth();
        requestAnimationFrame(updateScrollbarWidth);
      });

      if (loadedCount < allFiles.length) {
        observer.observe(trigger);
      }
    });

  window.addEventListener('load', updateScrollbarWidth);

  let resizeTimer;
  let lastColumnCount = getColumnCount();

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(async () => {
      updateScrollbarWidth();

      const newColumnCount = getColumnCount();
      if (newColumnCount === lastColumnCount) return;

      lastColumnCount = newColumnCount;

      const currentScroll = scrollRoot ? scrollRoot.scrollTop : window.scrollY;

      await rebuildMasonry();
      await loadUntilScreenFilled();

      requestAnimationFrame(() => {
        if (scrollRoot) {
          scrollRoot.scrollTo(0, currentScroll);
        } else {
          window.scrollTo(0, currentScroll);
        }
      });
    }, 250);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initGallery();
});
