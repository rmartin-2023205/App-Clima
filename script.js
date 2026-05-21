/* =============================================
   CLIMAAPP - JavaScript Principal
   API utilizada: Open-Meteo (gratuita, sin API key)
   ============================================= */

// ============ REFERENCIAS AL DOM ============
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const loader = document.getElementById('loader');
const errorMsg = document.getElementById('error-msg');
const weatherCard = document.getElementById('weather-card');
const forecastContainer = document.getElementById('forecast-container');
const favoritesContainer = document.getElementById('favorites-container');
const noFavorites = document.getElementById('no-favorites');
const favBtn = document.getElementById('fav-btn');
const favIcon = document.getElementById('fav-icon');
const favText = document.getElementById('fav-text');
const contactForm = document.getElementById('contact-form');
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const iconOpen = document.getElementById('icon-open');
const iconClose = document.getElementById('icon-close');

// Carrusel de Fotos
const carouselSlides = document.querySelectorAll('.carousel-slide');

// Datos de la última búsqueda (se usan para guardar favoritos)
let currentCity = null;

// ============ MAPEO DE CÓDIGOS DE CLIMA ============
const weatherCodes = {
  0:  { icon: '☀️', desc: 'Cielo despejado' },
  1:  { icon: '🌤️', desc: 'Mayormente despejado' },
  2:  { icon: '⛅', desc: 'Parcialmente nublado' },
  3:  { icon: '☁️', desc: 'Nublado' },
  45: { icon: '🌫️', desc: 'Niebla' },
  48: { icon: '🌫️', desc: 'Niebla con escarcha' },
  51: { icon: '🌦️', desc: 'Llovizna ligera' },
  53: { icon: '🌦️', desc: 'Llovizna moderada' },
  55: { icon: '🌦️', desc: 'Llovizna intensa' },
  61: { icon: '🌧️', desc: 'Lluvia ligera' },
  63: { icon: '🌧️', desc: 'Lluvia moderada' },
  65: { icon: '🌧️', desc: 'Lluvia intensa' },
  66: { icon: '🌨️', desc: 'Lluvia helada ligera' },
  67: { icon: '🌨️', desc: 'Lluvia helada intensa' },
  71: { icon: '❄️', desc: 'Nevada ligera' },
  73: { icon: '❄️', desc: 'Nevada moderada' },
  75: { icon: '❄️', desc: 'Nevada intensa' },
  77: { icon: '🌨️', desc: 'Granizo' },
  80: { icon: '🌧️', desc: 'Chubascos ligeros' },
  81: { icon: '🌧️', desc: 'Chubascos moderados' },
  82: { icon: '🌧️', desc: 'Chubascos intensos' },
  85: { icon: '🌨️', desc: 'Chubascos de nieve ligeros' },
  86: { icon: '🌨️', desc: 'Chubascos de nieve intensos' },
  95: { icon: '⛈️', desc: 'Tormenta eléctrica' },
  96: { icon: '⛈️', desc: 'Tormenta con granizo ligero' },
  99: { icon: '⛈️', desc: 'Tormenta con granizo fuerte' }
};

function getWeatherInfo(code) {
  return weatherCodes[code] || { icon: '🌡️', desc: 'Desconocido' };
}

// ============ FUNCIONES DE API ============
async function buscarCiudad(nombre) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nombre)}&count=1&language=es`;
  const response = await fetch(url);

  if (!response.ok) throw new Error('Error en la búsqueda');

  const data = await response.json();
  if (!data.results || data.results.length === 0) return null;
  return data.results[0];
}

async function obtenerClima(lat, lon) {
  const params = [
    `latitude=${lat}`,
    `longitude=${lon}`,
    'current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
    'daily=weather_code,temperature_2m_max,temperature_2m_min',
    'timezone=auto',
    'forecast_days=7'
  ].join('&');

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const response = await fetch(url);

  if (!response.ok) throw new Error('Error al obtener el clima');
  return await response.json();
}

// ============ RENDERIZADO DE DATOS ============
function mostrarClimaActual(city, weather) {
  const current = weather.current;
  const info = getWeatherInfo(current.weather_code);

  document.getElementById('w-city').textContent = city.name + (city.admin1 ? `, ${city.admin1}` : '');
  document.getElementById('w-date').textContent = formatearFecha(current.time);
  document.getElementById('w-temp').textContent = `${Math.round(current.temperature_2m)}°`;
  document.getElementById('w-desc').textContent = info.desc;
  document.getElementById('w-icon').textContent = info.icon;

  document.getElementById('w-feels').textContent = `${Math.round(current.apparent_temperature)}°C`;
  document.getElementById('w-humidity').textContent = `${current.relative_humidity_2m}%`;
  document.getElementById('w-wind').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  document.getElementById('w-time').textContent = formatearHora(current.time);

  actualizarBotonFavorito(city.name);

  weatherCard.classList.remove('hidden');
  weatherCard.classList.add('animate-slide-up');
}

function mostrarPronostico(weather) {
  const daily = weather.daily;
  forecastContainer.innerHTML = '';

  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  for (let i = 0; i < daily.time.length; i++) {
    const fecha = new Date(daily.time[i] + 'T00:00:00');
    const info = getWeatherInfo(daily.weather_code[i]);
    const esHoy = i === 0;

    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.style.animationDelay = `${i * 0.08}s`;
    card.classList.add('animate-slide-up');

    card.innerHTML = `
      <p class="text-sm font-bold ${esHoy ? 'text-sun' : 'text-sky/80'} mb-3">
        ${esHoy ? 'Hoy' : dias[fecha.getDay()]}
      </p>
      <span class="text-4xl block mb-3">${info.icon}</span>
      <p class="text-lg font-bold text-sun">${Math.round(daily.temperature_2m_max[i])}°</p>
      <p class="text-sm text-sky/40">${Math.round(daily.temperature_2m_min[i])}°</p>
    `;

    forecastContainer.appendChild(card);
  }
}

// ============ FAVORITOS (localStorage) ============
function obtenerFavoritos() {
  const data = localStorage.getItem('climaapp_favoritos');
  return data ? JSON.parse(data) : [];
}

function guardarFavoritos(favoritos) {
  localStorage.setItem('climaapp_favoritos', JSON.stringify(favoritos));
}

function toggleFavorito() {
  if (!currentCity) return;

  let favoritos = obtenerFavoritos();
  const nombre = currentCity.name;
  const existe = favoritos.some(f => f.name === nombre);

  if (existe) {
    favoritos = favoritos.filter(f => f.name !== nombre);
  } else {
    favoritos.push({
      name: currentCity.name,
      latitude: currentCity.latitude,
      longitude: currentCity.longitude,
      country: currentCity.country || '',
      admin1: currentCity.admin1 || ''
    });
  }

  guardarFavoritos(favoritos);
  actualizarBotonFavorito(nombre);
  renderizarFavoritos();
}

function actualizarBotonFavorito(nombre) {
  const favoritos = obtenerFavoritos();
  const esFavorito = favoritos.some(f => f.name === nombre);

  favIcon.textContent = esFavorito ? '★' : '☆';
  favText.textContent = esFavorito ? 'Guardada' : 'Guardar';
  favBtn.classList.toggle('border-sun', esFavorito);
  favBtn.classList.toggle('bg-sun/10', esFavorito);
  favBtn.classList.toggle('text-sun', esFavorito);
}

function eliminarFavorito(nombre) {
  let favoritos = obtenerFavoritos();
  favoritos = favoritos.filter(f => f.name !== nombre);
  guardarFavoritos(favoritos);
  renderizarFavoritos();

  if (currentCity && currentCity.name === nombre) {
    actualizarBotonFavorito(nombre);
  }
}

function renderizarFavoritos() {
  const favoritos = obtenerFavoritos();

  if (favoritos.length === 0) {
    favoritesContainer.innerHTML = '';
    favoritesContainer.appendChild(noFavorites);
    noFavorites.classList.remove('hidden');
    return;
  }

  noFavorites.classList.add('hidden');
  favoritesContainer.innerHTML = '';

  favoritos.forEach((fav, index) => {
    const card = document.createElement('div');
    card.className = 'favorite-card animate-slide-up';
    card.style.animationDelay = `${index * 0.05}s`;

    card.innerHTML = `
      <div class="flex items-center gap-3 flex-1 min-w-0" onclick="buscarFavorito('${fav.name.replace(/'/g, "\\'")}')">
        <span class="text-2xl text-sky">📍</span>
        <div class="min-w-0">
          <p class="font-bold truncate text-white">${fav.name}</p>
          <p class="text-xs text-sky/50 truncate">${fav.admin1 ? fav.admin1 + ', ' : ''}${fav.country}</p>
        </div>
      </div>
      <button class="delete-btn p-2 rounded-lg hover:bg-ocean/20 text-sky/40 hover:text-sun transition-all" 
              onclick="event.stopPropagation(); eliminarFavorito('${fav.name.replace(/'/g, "\\'")}')" 
              title="Eliminar">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    `;

    favoritesContainer.appendChild(card);
  });
}

async function buscarFavorito(nombre) {
  cityInput.value = nombre;
  realizarBusqueda(nombre);
}

// ============ BÚSQUEDA PRINCIPAL ============
async function realizarBusqueda(nombre) {
  loader.classList.remove('hidden');
  errorMsg.classList.add('hidden');
  weatherCard.classList.add('hidden');

  try {
    const city = await buscarCiudad(nombre);

    if (!city) {
      loader.classList.add('hidden');
      errorMsg.classList.remove('hidden');
      return;
    }

    const weather = await obtenerClima(city.latitude, city.longitude);
    currentCity = city;

    loader.classList.add('hidden');
    mostrarClimaActual(city, weather);
    mostrarPronostico(weather);

    setTimeout(() => {
      document.getElementById('clima-actual').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

  } catch (error) {
    console.error('Error al buscar clima:', error);
    loader.classList.add('hidden');
    errorMsg.classList.remove('hidden');
  }
}

// ============ UTILIDADES DE FORMATO ============
function formatearFecha(isoString) {
  const fecha = new Date(isoString);
  const opciones = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  const texto = fecha.toLocaleDateString('es-ES', opciones);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Formato de hora en 24h
function formatearHora(isoString) {
  const fecha = new Date(isoString);
  return fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ============ FORMULARIO DE CONTACTO ============
function manejarContacto(e) {
  e.preventDefault();

  const nombre = document.getElementById('contact-name');
  const email = document.getElementById('contact-email');
  const mensaje = document.getElementById('contact-message');
  let valido = true;

  if (nombre.value.trim().length < 2) valido = false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value.trim())) valido = false;
  if (mensaje.value.trim().length < 5) valido = false;

  if (!valido) {
    alert("Por favor llena todos los campos correctamente.");
    return;
  }

  contactForm.reset();
  document.getElementById('contact-success').classList.remove('hidden');

  setTimeout(() => {
    document.getElementById('contact-success').classList.add('hidden');
  }, 4000);
}

// ============ MENÚ MÓVIL ============
function toggleMenu() {
  mobileMenu.classList.toggle('hidden');
  iconOpen.classList.toggle('hidden');
  iconClose.classList.toggle('hidden');
}

// ============ ROTACIÓN AUTOMÁTICA DEL CARRUSEL ============
let slideIndex = 0;
function rotarCarrusel() {
  if (carouselSlides.length === 0) return;
  carouselSlides.forEach(slide => slide.classList.remove('active'));
  slideIndex = (slideIndex + 1) % carouselSlides.length;
  carouselSlides[slideIndex].classList.add('active');
}

function inicializarCarrusel() {
  setInterval(rotarCarrusel, 4000); // Rota cada 4 segundos
}

// ============ INDICADOR DE SECCIÓN ACTIVA ============
function inicializarObserverSecciones() {
  const secciones = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[data-section], .mobile-nav-link[data-section]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        const seccionMap = {
          'inicio': 'quienes-somos',
          'clima-actual': 'quienes-somos',
          'pronostico': 'quienes-somos',
          'favoritos': 'quienes-somos',
          'quienes-somos': 'quienes-somos',
          'acerca': 'acerca',
          'mision-vision': 'mision-vision',
          'productos': 'productos',
          'proveedores': 'proveedores',
          'clientes': 'clientes',
          'contacto': 'contacto'
        };

        const seccionActiva = seccionMap[id] || id;

        navLinks.forEach(link => {
          link.classList.toggle('active', link.dataset.section === seccionActiva);
        });
      }
    });
  }, {
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
  });

  secciones.forEach(section => observer.observe(section));
}

// ============ INICIALIZACIÓN ============
function inicializar() {
  document.getElementById('footer-year').textContent = new Date().getFullYear();

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const ciudad = cityInput.value.trim();
    if (ciudad.length > 0) {
      realizarBusqueda(ciudad);
    }
  });

  favBtn.addEventListener('click', toggleFavorito);
  contactForm.addEventListener('submit', manejarContacto);
  menuToggle.addEventListener('click', toggleMenu);

  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.add('hidden');
      iconOpen.classList.remove('hidden');
      iconClose.classList.add('hidden');
    });
  });

  renderizarFavoritos();
  inicializarObserverSecciones();
  inicializarCarrusel();
}

document.addEventListener('DOMContentLoaded', inicializar);
