const container = document.querySelector('.filmworks-slider');

let projects = [];
let currentIndex = 0;
let autoRotate;

const ui = {
    slide: null,
    thumbnail: null,
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
        renderSlide();
        startRotation();
    } catch (error) {
        console.error('Slider Initialization Failed:', error);
    }
}

function initializeSliderMarkup() {
    // Injected ultra-thin modern minimalist SVG arrows instead of text strings
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

    ui.slide = container.querySelector('.film-slide');
    ui.thumbnail = container.querySelector('.film-thumbnail');
    ui.title = container.querySelector('.film-title');
    ui.networkYear = container.querySelector('.film-network-year');
    ui.role = container.querySelector('.film-role');
    ui.dotsContainer = container.querySelector('.film-dots');

    container.querySelector('.film-arrow-prev').addEventListener('click', () => navigateSlide(-1));
    container.querySelector('.film-arrow-next').addEventListener('click', () => navigateSlide(1));

    ui.dotsContainer.innerHTML = projects.map((_, index) => `
        <button class="film-dot" data-index="${index}"></button>
    `).join('');

    ui.dotsContainer.querySelectorAll('.film-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            currentIndex = Number(dot.dataset.index);
            updateViewWithRotationReset();
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
    updateViewWithRotationReset();
}

function updateViewWithRotationReset() {
    stopRotation();
    renderSlide();
    startRotation();
}

function renderSlide() {
    const project = projects[currentIndex];
    if (!project) return;

    ui.slide.style.animation = 'none';
    ui.slide.offsetHeight; 
    ui.slide.style.animation = 'filmFade .4s ease';

    ui.thumbnail.innerHTML = `
        <img src="https://i.ytimg.com/vi/${project.link}/maxresdefault.jpg" alt="${project.title}">
        <button class="film-play-button"><span></span></button>
    `;

    ui.title.textContent = project.title;
    ui.networkYear.textContent = `${project.network} • ${project.year}`;
    ui.role.textContent = project.role;

    ui.dotsContainer.querySelectorAll('.film-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === currentIndex);
    });
}

function nextSlide() {
    currentIndex = (currentIndex + 1) % projects.length;
    renderSlide();
}

function startRotation() {
    autoRotate = setInterval(nextSlide, 5000);
}

function stopRotation() {
    clearInterval(autoRotate);
}

loadProjects();