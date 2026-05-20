/* =============================================
   CLIMAAPP - JavaScript Principal
   API utilizada: Open-Meteo (gratuita, sin API key)
   - Geocoding: geocoding-api.open-meteo.com
   - Weather:   api.open-meteo.com
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

// Datos de la última búsqueda (se usan para guardar favoritos)
let currentCity = null;

// ============ MAPEO DE CÓDIGOS DE CLIMA ============
// Open-Meteo usa códigos numéricos (WMO) para describir el clima.
// Aquí mapeamos cada código a un emoji y una descripción en español.
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

/* Devuelve el icono y descripción de un código de clima.
   Si el código no existe en el mapa, retorna un valor por defecto. */
function getWeatherInfo(code) {
  return weatherCodes[code] || { icon: '🌡️', desc: 'Desconocido' };
}

// ============ FUNCIONES DE API ============

/* Busca coordenadas de una ciudad usando la API de geocoding de Open-Meteo.
   Retorna el primer resultado o null si no se encontró. */
async function buscarCiudad(nombre) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nombre)}&count=1&language=es`;
  const response = await fetch(url);

  if (!response.ok) throw new Error('Error en la búsqueda');

  const data = await response.json();

  // Si no hay resultados, la API no incluye la propiedad "results"
  if (!data.results || data.results.length === 0) return null;

  return data.results[0];
}

/* Obtiene los datos del clima actual y pronóstico de 7 días.
   Recibe latitud y longitud de la ciudad. */
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

/* Muestra los datos del clima actual en la tarjeta principal */
function mostrarClimaActual(city, weather) {
  const current = weather.current;
  const info = getWeatherInfo(current.weather_code);

  // Ciudad y fecha
  document.getElementById('w-city').textContent = city.name + (city.admin1 ? `, ${city.admin1}` : '');
  document.getElementById('w-date').textContent = formatearFecha(current.time);
  document.getElementById('w-temp').textContent = `${Math.round(current.temperature_2m)}°`;
  document.getElementById('w-desc').textContent = info.desc;
  document.getElementById('w-icon').textContent = info.icon;

  // Detalles
  document.getElementById('w-feels').textContent = `${Math.round(current.apparent_temperature)}°C`;
  document.getElementById('w-humidity').textContent = `${current.relative_humidity_2m}%`;
  document.getElementById('w-wind').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  document.getElementById('w-time').textContent = formatearHora(current.time);

  // Actualizar estado del botón favorito
  actualizarBotonFavorito(city.name);

  // Mostrar tarjeta con animación
  weatherCard.classList.remove('hidden');
  weatherCard.classList.add('animate-slide-up');
}

/* Genera las tarjetas del pronóstico de 7 días */
function mostrarPronostico(weather) {
  const daily = weather.daily;
  forecastContainer.innerHTML = '';

  // Nombres cortos de los días de la semana en español
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  for (let i = 0; i < daily.time.length; i++) {
    const fecha = new Date(daily.time[i] + 'T00:00:00');
    const info = getWeatherInfo(daily.weather_code[i]);
    const esHoy = i === 0;

    const card = document.createElement('div');
    card.className = 'forecast-card';
    // Animación escalonada: cada tarjeta aparece con un ligero retraso
    card.style.animationDelay = `${i * 0.08}s`;
    card.classList.add('animate-slide-up');

    card.innerHTML = `
      <p class="text-sm font-semibold ${esHoy ? 'text-cyan-400' : 'text-slate-300'} mb-3">
        ${esHoy ? 'Hoy' : dias[fecha.getDay()]}
      </p>
      <span class="text-4xl block mb-3">${info.icon}</span>
      <p class="text-lg font-bold">${Math.round(daily.temperature_2m_max[i])}°</p>
      <p class="text-sm text-slate-500">${Math.round(daily.temperature_2m_min[i])}°</p>
    `;

    forecastContainer.appendChild(card);
  }
}

// ============ FAVORITOS (localStorage) ============

/* Obtiene la lista de ciudades favoritas guardadas */
function obtenerFavoritos() {
  const data = localStorage.getItem('climaapp_favoritos');
  return data ? JSON.parse(data) : [];
}

/* Guarda la lista de favoritos en localStorage */
function guardarFavoritos(favoritos) {
  localStorage.setItem('climaapp_favoritos', JSON.stringify(favoritos));
}

/* Agrega o elimina la ciudad actual de favoritos */
function toggleFavorito() {
  if (!currentCity) return;

  let favoritos = obtenerFavoritos();
  const nombre = currentCity.name;
  const existe = favoritos.some(f => f.name === nombre);

  if (existe) {
    // Eliminar de favoritos
    favoritos = favoritos.filter(f => f.name !== nombre);
  } else {
    // Agregar a favoritos (guardamos nombre, lat, lon y país)
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

/* Actualiza el aspecto del botón favorito según si la ciudad está guardada */
function actualizarBotonFavorito(nombre) {
  const favoritos = obtenerFavoritos();
  const esFavorito = favoritos.some(f => f.name === nombre);

  favIcon.textContent = esFavorito ? '★' : '☆';
  favText.textContent = esFavorito ? 'Guardada' : 'Guardar';
  favBtn.classList.toggle('border-cyan-400', esFavorito);
  favBtn.classList.toggle('bg-cyan-400/10', esFavorito);
  favBtn.classList.toggle('text-cyan-400', esFavorito);
}

/* Elimina una ciudad específica de favoritos */
function eliminarFavorito(nombre) {
  let favoritos = obtenerFavoritos();
  favoritos = favoritos.filter(f => f.name !== nombre);
  guardarFavoritos(favoritos);
  renderizarFavoritos();

  // Si la ciudad eliminada es la que está mostrándose, actualizar botón
  if (currentCity && currentCity.name === nombre) {
    actualizarBotonFavorito(nombre);
  }
}

/* Renderiza las tarjetas de ciudades favoritas */
function renderizarFavoritos() {
  const favoritos = obtenerFavoritos();

  // Mostrar u ocultar mensaje de "sin favoritos"
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
        <span class="text-2xl">📍</span>
        <div class="min-w-0">
          <p class="font-semibold truncate">${fav.name}</p>
          <p class="text-sm text-slate-400 truncate">${fav.admin1 ? fav.admin1 + ', ' : ''}${fav.country}</p>
        </div>
      </div>
      <button class="delete-btn p-2 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-all" 
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

/* Busca el clima de una ciudad favorita al hacer clic */
async function buscarFavorito(nombre) {
  cityInput.value = nombre;
  // Scroll al hero para ver los resultados
  document.getElementById('inicio').scrollIntoView({ behavior: 'smooth' });
  // Pequeña espera para que termine el scroll
  await new Promise(r => setTimeout(r, 400));
  realizarBusqueda(nombre);
}

// ============ BÚSQUEDA PRINCIPAL ============

/* Función principal que coordina la búsqueda:
   1. Busca la ciudad (geocoding)
   2. Obtiene el clima
   3. Muestra los resultados o errores */
async function realizarBusqueda(nombre) {
  // Mostrar loader y ocultar resultados anteriores
  loader.classList.remove('hidden');
  errorMsg.classList.add('hidden');
  weatherCard.classList.add('hidden');

  try {
    // Paso 1: Buscar coordenadas de la ciudad
    const city = await buscarCiudad(nombre);

    if (!city) {
      // Ciudad no encontrada
      loader.classList.add('hidden');
      errorMsg.classList.remove('hidden');
      return;
    }

    // Paso 2: Obtener datos del clima con las coordenadas
    const weather = await obtenerClima(city.latitude, city.longitude);

    // Guardar referencia a la ciudad actual
    currentCity = city;

    // Paso 3: Mostrar resultados
    loader.classList.add('hidden');
    mostrarClimaActual(city, weather);
    mostrarPronostico(weather);

  } catch (error) {
    // Manejo de errores de red u otros
    console.error('Error al buscar clima:', error);
    loader.classList.add('hidden');
    errorMsg.classList.remove('hidden');
  }
}

// ============ UTILIDADES DE FORMATO ============

/* Formatea una fecha ISO a formato legible en español */
function formatearFecha(isoString) {
  const fecha = new Date(isoString);
  const opciones = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  // Capitalizar primera letra
  const texto = fecha.toLocaleDateString('es-ES', opciones);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/* Extrae la hora de un string ISO y la formatea (HH:MM) */
function formatearHora(isoString) {
  const fecha = new Date(isoString);
  return fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ============ FORMULARIO DE CONTACTO ============

/* Valida y maneja el envío del formulario de contacto */
function manejarContacto(e) {
  e.preventDefault();

  const nombre = document.getElementById('contact-name');
  const email = document.getElementById('contact-email');
  const mensaje = document.getElementById('contact-message');
  let valido = true;

  // Limpiar errores previos
  document.querySelectorAll('.error-text').forEach(el => el.classList.add('hidden'));

  // Validar nombre
  if (nombre.value.trim().length < 2) {
    nombre.nextElementSibling.classList.remove('hidden');
    valido = false;
  }

  // Validar correo con expresión regular simple
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value.trim())) {
    email.nextElementSibling.classList.remove('hidden');
    valido = false;
  }

  // Validar mensaje
  if (mensaje.value.trim().length < 5) {
    mensaje.nextElementSibling.classList.remove('hidden');
    valido = false;
  }

  if (!valido) return;

  // Simular envío exitoso
  contactForm.reset();
  document.getElementById('contact-success').classList.remove('hidden');

  // Ocultar mensaje de éxito después de 4 segundos
  setTimeout(() => {
    document.getElementById('contact-success').classList.add('hidden');
  }, 4000);
}

// ============ MENÚ MÓVIL ============

/* Alterna la visibilidad del menú hamburguesa en móviles */
function toggleMenu() {
  mobileMenu.classList.toggle('hidden');
  iconOpen.classList.toggle('hidden');
  iconClose.classList.toggle('hidden');
}

// ============ INDICADOR DE SECCIÓN ACTIVA ============

/* Usa IntersectionObserver para detectar qué sección está visible
   y resaltar el link correspondiente en el navbar */
function inicializarObserverSecciones() {
  const secciones = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[data-section], .mobile-nav-link[data-section]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        // Mapear IDs de sección a data-section de los links
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

// ============ ANIMACIONES SCROLL REVEAL ============

/* Anima elementos cuando entran al viewport */
function inicializarScrollReveal() {
  const elementsToAnimate = document.querySelectorAll('.glass-card, .product-card, .forecast-card, .favorite-card');
  
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.1
  });

  elementsToAnimate.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    revealObserver.observe(el);
  });
}

// ============ NAVBAR SCROLL EFFECT ============

/* Cambia la apariencia del navbar al hacer scroll */
function inicializarNavbarScroll() {
  const navbar = document.getElementById('navbar');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('navbar-scrolled');
    } else {
      navbar.classList.remove('navbar-scrolled');
    }
  });
}

// ============ INICIALIZACIÓN ============

/* Configura todos los event listeners y carga datos iniciales */
function inicializar() {
  // Año automático en el footer
  document.getElementById('footer-year').textContent = new Date().getFullYear();

  // Evento de búsqueda
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const ciudad = cityInput.value.trim();
    if (ciudad.length > 0) {
      realizarBusqueda(ciudad);
    }
  });

  // Botón de favorito
  favBtn.addEventListener('click', toggleFavorito);

  // Formulario de contacto
  contactForm.addEventListener('submit', manejarContacto);

  // Menú móvil
  menuToggle.addEventListener('click', toggleMenu);

  // Cerrar menú móvil al hacer clic en un link
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.add('hidden');
      iconOpen.classList.remove('hidden');
      iconClose.classList.add('hidden');
    });
  });

  // Cargar favoritos guardados
  renderizarFavoritos();

  // Activar observer de secciones para el navbar
  inicializarObserverSecciones();

  // Activar scroll reveal
  inicializarScrollReveal();

  // Activar efecto de scroll en navbar
  inicializarNavbarScroll();
}

// Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializar);
