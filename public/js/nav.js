const pageHeading = document.getElementById('page-heading');
const navOverlay = document.getElementById('nav-overlay');

let navCloseTimer;

function openNav() {
  clearTimeout(navCloseTimer);
  document.body.classList.add('nav-open');
}

function closeNav(delay = 180) {
  clearTimeout(navCloseTimer);

  navCloseTimer = setTimeout(() => {
    document.body.classList.remove('nav-open');
  }, delay);
}

if (pageHeading && navOverlay) {
  pageHeading.addEventListener('pointerenter', openNav);

  pageHeading.addEventListener('pointerleave', () => {
    closeNav(220);
  });

  navOverlay.addEventListener('pointerenter', openNav);
  navOverlay.addEventListener('pointerleave', () => {
    closeNav(220);
  });

  navOverlay.addEventListener('click', event => {
    if (event.target.classList.contains('nav-backdrop')) {
      closeNav(0);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeNav(0);
    }
  });
}
