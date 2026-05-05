const pageHeading = document.getElementById('page-heading');
const navOverlay = document.getElementById('nav-overlay');

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

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

function goHome() {
  if (window.location.pathname === '/') {
    window.location.reload();
  } else {
    window.location.href = '/';
  }
}

if (pageHeading && navOverlay) {
  if (canHover) {
    pageHeading.addEventListener('pointerenter', openNav);

    pageHeading.addEventListener('pointerleave', () => {
      closeNav(220);
    });

    navOverlay.addEventListener('pointerenter', openNav);

    navOverlay.addEventListener('pointerleave', () => {
      closeNav(220);
    });
  }

  pageHeading.addEventListener('click', event => {
    event.preventDefault();

    if (document.body.classList.contains('nav-open')) {
      goHome();
    } else {
      openNav();
    }
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