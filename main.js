// Create blurred globe
const globe = Globe()(document.getElementById('globeViz'))
  .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
  .showAtmosphere(true)
  .atmosphereColor('lightskyblue')
  .atmosphereAltitude(0.25);

// Important countries
const importantCountries = [
  "United States of America",
  "Jamaica",
  "Germany",
  "United Kingdom",
  "Japan",
  "Spain",
  "Netherlands",
  "South Korea"
];

// Active country
let activeCountry = null;

// Function to dynamically determine country colors
const getPolygonCapColor = polygon => {
  if (!importantCountries.includes(polygon.properties.ADMIN)) {
    return 'rgba(100, 100, 100, 0.1)';
  }
  return (polygon.properties.ADMIN === activeCountry)
    ? 'rgba(255, 255, 0, 0.8)'  // Highlight active country
    : 'rgba(255, 215, 0, 0.6)'; // Gold for important but inactive
};

let lastCoords = null;
let lastSection = null;
let allArcs = [];

const audio = document.getElementById('bg-music');
audio.volume = 0.5;

// Setup ripple canvas
const { canvas: rippleCanvas, ctx: rippleCtx } = createRippleCanvas();
const title = document.getElementById('title');

const cityTargets = {
  "section-60s-70s-jamaica": { lat: 17.9712, lng: -76.7936, name: "Kingston, Jamaica" },
  "section-70s-munich": { lat: 48.1351, lng: 11.5820, name: "Munich, Germany" },
  "section-70s-nyc": { lat: 40.7128, lng: -74.0060, name: "New York City, USA" },
  "section-70s-tokyo": { lat: 35.6762, lng: 139.6503, name: "Tokyo, Japan" },
  "section-80s-detroit": { lat: 42.3314, lng: -83.0458, name: "Detroit, USA" },
  "section-80s-chicago": { lat: 41.8781, lng: -87.6298, name: "Chicago, USA" },
  "section-80s-london": { lat: 51.5072, lng: -0.1276, name: "London, UK" },
  "section-80s-berlin": { lat: 52.5200, lng: 13.4050, name: "Berlin, Germany" },
  "section-80s-ibiza": { lat: 38.9089, lng: 1.4329, name: "Ibiza, Spain" },
  "section-90s-manchester": { lat: 53.4808, lng: -2.2426, name: "Manchester, UK" },
  "section-90s-frankfurt": { lat: 50.1109, lng: 8.6821, name: "Frankfurt, Germany" },
  "section-90s-london-dubstep": { lat: 51.5072, lng: -0.1276, name: "London, UK" },
  "section-2000s-miami": { lat: 25.7617, lng: -80.1918, name: "Miami, USA" },
  "section-2010s-lasvegas": { lat: 36.1699, lng: -115.1398, name: "Las Vegas, USA" },
  "section-2010s-amsterdam": { lat: 52.3676, lng: 4.9041, name: "Amsterdam, Netherlands" },
  "section-2020s-seoul": { lat: 37.5665, lng: 126.9780, name: "Seoul, South Korea" }
};

// Start ripple immediately
drawStaticRipple();

// Fetch countries
fetch('countries/countries.geo.json')
  .then(res => res.json())
  .then(countries => {
    globe.polygonsData(countries.features)
      .polygonCapColor(getPolygonCapColor)
      .polygonSideColor(() => 'rgba(75, 0, 130, 0.8)')
      .polygonStrokeColor(() => 'white')
      .polygonAltitude(0.01);

    // Only setup scrolling AFTER globe is ready
    setupScrollBehavior();
  });

// Auto-rotate globe
globe.controls().autoRotate = true;
globe.controls().autoRotateSpeed = 0.3;

// Click scroll-down
document.getElementById('scrollDown').addEventListener('click', () => {
  document.getElementById('intro').scrollIntoView({ behavior: 'smooth' });
});

// Blur globe + fade title on scroll
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const landingHeight = document.getElementById('intro').offsetTop;
  const scrollProgress = Math.min(scrollY / landingHeight, 1);
  const blurValue = 8 * (1 - scrollProgress);
  document.getElementById('globeViz').style.filter = `blur(${blurValue}px)`;
  document.getElementById('title').style.opacity = 1 - scrollProgress;
});

// Resume audio on click
document.body.addEventListener('click', initAudioContext, { once: true });

// Mouse move tilts title
document.addEventListener('mousemove', (event) => {
  const x = (event.clientX / window.innerWidth) - 0.5;
  const y = (event.clientY / window.innerHeight) - 0.5;
  rotateX = y * 10;
  rotateY = x * 20;
  updateTitleTransform();
});

// ====== Helper functions ======

function setupScrollBehavior() {
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
    if (entry.isIntersecting) {
        const sectionId = entry.target.id;
        if (cityTargets[sectionId] && sectionId !== lastSection) {
        const { lat, lng, name } = cityTargets[sectionId];

        // Determine activeCountry
        if (name.includes("USA")) activeCountry = "United States of America";
        else if (name.includes("Jamaica")) activeCountry = "Jamaica";
        else if (name.includes("Germany")) activeCountry = "Germany";
        else if (name.includes("United Kingdom") || name.includes("London") || name.includes("Manchester")) activeCountry = "United Kingdom";
        else if (name.includes("Japan")) activeCountry = "Japan";
        else if (name.includes("Spain") || name.includes("Ibiza")) activeCountry = "Spain";
        else if (name.includes("Netherlands")) activeCountry = "Netherlands";
        else if (name.includes("South Korea")) activeCountry = "South Korea";
        else activeCountry = null;

        // Update globe colors
        globe.polygonCapColor(getPolygonCapColor);
        globe.polygonsData(globe.polygonsData()); // This line should trigger the re-evaluation

        // Draw arc
        if (lastCoords) {
            allArcs.push({
            startLat: lastCoords.lat,
            startLng: lastCoords.lng,
            endLat: lat,
            endLng: lng,
            color: ['white']
            });
            globe.arcsData(allArcs);
        }

        lastCoords = { lat, lng };
        lastSection = sectionId;
        globe.pointOfView({ lat, lng, altitude: 1.5 }, 2000);
        }
    }
    });
}, { threshold: 0.5 });

Object.keys(cityTargets).forEach(sectionId => {
    const sectionEl = document.getElementById(sectionId);
    if (sectionEl) {
    observer.observe(sectionEl);
    }
});
}

let titleScale = 1;
let rotateX = 0, rotateY = 0;

function createRippleCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  document.body.appendChild(canvas);
  canvas.style.display = 'none';
  return { canvas, ctx };
}

function drawStaticRipple() {
  rippleCtx.fillStyle = 'white';
  rippleCtx.fillRect(0, 0, rippleCanvas.width, rippleCanvas.height);
  rippleCtx.fillStyle = 'purple';
  rippleCtx.beginPath();
  for (let x = 0; x < rippleCanvas.width; x++) {
    const y = rippleCanvas.height / 2 + Math.sin(x / 30) * 10;
    rippleCtx.lineTo(x, y);
  }
  rippleCtx.lineTo(rippleCanvas.width, rippleCanvas.height);
  rippleCtx.lineTo(0, rippleCanvas.height);
  rippleCtx.closePath();
  rippleCtx.fill();
  title.style.backgroundImage = `url(${rippleCanvas.toDataURL()})`;
}

function initAudioContext() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaElementSource(audio);
  const analyser = audioContext.createAnalyser();
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function animateBreathing() {
    analyser.getByteFrequencyData(dataArray);
    let avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    avg = avg / 255;
    titleScale = 1 + avg * 0.2;
    updateTitleTransform();
    requestAnimationFrame(animateBreathing);
  }

  function animateRipples() {
    analyser.getByteFrequencyData(dataArray);
    let avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    rippleCtx.clearRect(0, 0, rippleCanvas.width, rippleCanvas.height);
    rippleCtx.fillStyle = 'white';
    rippleCtx.fillRect(0, 0, rippleCanvas.width, rippleCanvas.height);
    rippleCtx.fillStyle = 'purple';
    rippleCtx.beginPath();
    const waveHeight = avg / 1;
    const waveLength = 30;
    for (let x = 0; x < rippleCanvas.width; x++) {
      const y = rippleCanvas.height / 2 + Math.sin(x / waveLength + Date.now() / 300) * waveHeight;
      rippleCtx.lineTo(x, y);
    }
    rippleCtx.lineTo(rippleCanvas.width, rippleCanvas.height);
    rippleCtx.lineTo(0, rippleCanvas.height);
    rippleCtx.closePath();
    rippleCtx.fill();
    title.style.backgroundImage = `url(${rippleCanvas.toDataURL()})`;
    requestAnimationFrame(animateRipples);
  }

  animateBreathing();
  animateRipples();
}

function updateTitleTransform() {
  title.style.transform = `scale(${titleScale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
}
