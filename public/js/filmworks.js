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
            <div class="film-thumbnail"
                 data-video="${project.link}">
                <img
                    src="https://i.ytimg.com/vi/${project.link}/hqdefault.jpg"
                    alt="${project.title}">
                <button class="film-play-button">▶</button>
            </div>

            <div class="film-meta">
                <h2>${project.title}</h2>
                <div>${project.year}</div>
                <div>${project.network}</div>
                <div>${project.role}</div>
            </div>
        </div>
    `;

    const thumbnail = container.querySelector('.film-thumbnail');

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