const container = document.querySelector('.filmworks-slider');

let projects = [];
let currentIndex = 0;
let autoRotate;

// Cached UI element references
const ui = {
    thumbnail: null,
    meta: null, 
    title: null,
    networkYear: null,
    role: null,
    dotsContainer: null
};

async function loadProjects() {
    try {
        const response = await fetch('/filmworks/filmworks.json');
        if (!response.ok) throw new Error('Data endpoint unreachable');
        
        projects = await response.json();
        if (projects.length === 0) return;

        initializeSliderMarkup();
        renderSlide('next'); // Initial slide slides in from the right
        startRotation();
    } catch (error) {
        console.error('Slider Initialization Failed:', error);
    }
}

function initializeSliderMarkup() {
    // The main framework is injected exactly ONCE here
    container.innerHTML = `
        <div class="film-slide">
            <div class="film-viewer">
                <button class="film-arrow film-arrow-prev" aria-label="Previous Slide">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <div class="film-thumbnail"></div>
                <button class="film-arrow film-arrow-next" aria-label="Next Slide">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
            </div>
            <div class="film-meta">
                <h2 class="film-title"></h2>
                <div class="film-network-year"></div>
                <div class="film-role"></div>
            </div>
            <div class="film-dots"></div>
        </div>
    `;

    ui.thumbnail = container.querySelector('.film-thumbnail');
    ui.meta = container.querySelector('.film-meta');
    ui.title = container.querySelector('.film-title');
    ui.networkYear = container.querySelector('.film-network-year');
    ui.role = container.querySelector('.film-role');
    ui.dotsContainer = container.querySelector('.film-dots');

    container.querySelector('.film-arrow-prev').addEventListener('click', () => navigateSlide(-1));
    container.querySelector('.film-arrow-next').addEventListener('click', () => navigateSlide(1));

    // The dot elements are created precisely once here
    ui.dotsContainer.innerHTML = projects.map((_, index) => `
        <button class="film-dot" data-index="${index}"></button>
    `).join('');

    ui.dotsContainer.querySelectorAll('.film-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            // Determine relative direction based on dot index matching
            const direction = Number(dot.dataset.index) < currentIndex ? 'prev' : 'next';
            currentIndex = Number(dot.dataset.index);
            updateViewWithRotationReset(direction);
        });
    });

    ui.thumbnail.addEventListener('click', () => {
        if (ui.thumbnail.querySelector('iframe')) return;
        stopRotation();

        const project = projects[currentIndex];
        ui.thumbnail.innerHTML = `
            <iframe
                src="https://www.youtube.com/embed/${project.link}?autoplay=1"
                title="${project.title}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
            </iframe>
        `;
    });
}

function navigateSlide(direction) {
    currentIndex = (currentIndex + direction + projects.length) % projects.length;
    // Map -1 to 'prev' logic, Map 1 to 'next' logic
    const directionString = direction === -1 ? 'prev' : 'next';
    updateViewWithRotationReset(directionString);
}

function updateViewWithRotationReset(direction) {
    stopRotation();
    renderSlide(direction);
    startRotation();
}

function renderSlide(direction = 'next') {
    const project = projects[currentIndex];
    if (!project) return;

    // FIX: Dynamically switch animation names based on slider direction context
    const animationName = direction === 'prev' ? 'filmFadeLeft' : 'filmFadeRight';

    ui.thumbnail.style.animation = 'none';
    ui.meta.style.animation = 'none';
    ui.thumbnail.offsetHeight; // Trigger DOM reflow to re-verify animation states
    ui.meta.offsetHeight;
    ui.thumbnail.style.animation = `${animationName} .4s ease`;
    ui.meta.style.animation = `${animationName} .4s ease`;

    // Swap structural layout assets seamlessly inside the locked container
    ui.thumbnail.innerHTML = `
        <img src="https://i.ytimg.com/vi/${project.link}/maxresdefault.jpg" alt="${project.title}">
        <button class="film-play-button"><span></span></button>
    `;

    ui.title.textContent = project.title;
    ui.networkYear.textContent = `${project.network} • ${project.year}`;
    ui.role.textContent = project.role;

    // Fast class toggling instead of rebuilding the dots
    ui.dotsContainer.querySelectorAll('.film-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === currentIndex);
    });
}

function nextSlide() {
    currentIndex = (currentIndex + 1) % projects.length;
    renderSlide('next'); // Auto rotation always moves forward / right
}

function startRotation() {
    autoRotate = setInterval(nextSlide, 5000);
}

function stopRotation() {
    clearInterval(autoRotate);
}

loadProjects();