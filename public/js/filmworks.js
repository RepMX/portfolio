const container = document.querySelector('.filmworks-slider');

let projects = [];
let currentIndex = 0;
let autoRotate;

async function loadProjects() {
    const response = await fetch('/filmworks/filmworks.json');
    projects = await response.json();

    renderSlide();
    startRotation();
}

function renderSlide() {
    const project = projects[currentIndex];

    container.innerHTML = `
        <div class="film-slide">

            <button class="film-arrow film-arrow-prev">
                &#10094;
            </button>

            <div class="film-thumbnail">
                <img
                    src="https://i.ytimg.com/vi/${project.link}/maxresdefault.jpg"
                    alt="${project.title}">
                <button class="film-play-button">
                    <span></span>
                </button>
            </div>

            <button class="film-arrow film-arrow-next">
                &#10095;
            </button>

            <div class="film-meta">
                <h2>${project.title}</h2>

                <div class="film-network-year">
                    ${project.network} • ${project.year}
                </div>

                <div class="film-role">
                    ${project.role}
                </div>
            </div>

            <div class="film-dots"></div>
        </div>
    `;

    const thumbnail = container.querySelector('.film-thumbnail');
    const dots = container.querySelector('.film-dots');

    container.querySelector('.film-arrow-prev')
        .addEventListener('click', () => {
            stopRotation();
            currentIndex = (currentIndex - 1 + projects.length) % projects.length;
            renderSlide();
            startRotation();
        });

    container.querySelector('.film-arrow-next')
        .addEventListener('click', () => {
            stopRotation();
            currentIndex = (currentIndex + 1) % projects.length;
            renderSlide();
            startRotation();
        });

    dots.innerHTML = projects.map((_, index) => `
        <button class="film-dot ${index === currentIndex ? 'active' : ''}"
                data-index="${index}">
        </button>
    `).join('');

    dots.querySelectorAll('.film-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            stopRotation();
            currentIndex = Number(dot.dataset.index);
            renderSlide();
            startRotation();
        });
    });

    thumbnail.addEventListener('click', () => {
        stopRotation();

        thumbnail.innerHTML = `
            <iframe
                src="https://www.youtube.com/embed/${project.link}?autoplay=1"
                title="${project.title}"
                allow="accelerometer; autoplay; encrypted-media"
                allowfullscreen>
            </iframe>
        `;
    });
}

function nextSlide() {
    currentIndex++;

    if (currentIndex >= projects.length) {
        currentIndex = 0;
    }

    renderSlide();
}

function startRotation() {
    autoRotate = setInterval(nextSlide, 5000);
}

function stopRotation() {
    clearInterval(autoRotate);
}

loadProjects();