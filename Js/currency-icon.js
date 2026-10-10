/**
 * Currency Icon Utility - Asere Shops
 * Detecta país del usuario y devuelve el icono de moneda apropiado
 * Europa (SEPA/IBAN) → € (Euro) | Resto → $ (Zelle)
 * NO realiza conversión de moneda, solo cambia el símbolo visual
 * Incluye selector manual en header con persistencia en localStorage
 */

const EUROPEAN_IBAN_COUNTRIES = new Set([
  // Eurozona
  'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT',
  'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES',
  // UE no euro pero SEPA
  'BG', 'HR', 'CZ', 'DK', 'HU', 'PL', 'RO', 'SE',
  // EEE
  'IS', 'LI', 'NO',
  // Microestados / Otros SEPA
  'CH', 'GB', 'MC', 'SM', 'VA', 'AD',
  // Balcanes occidentales (SEPA extendido)
  'RS', 'ME', 'MK', 'AL', 'BA',
  // Otros
  'GE', 'MD', 'XK' // Kosovo
]);

const CURRENCY_CACHE_KEY = 'asereshops_currency_info';
const MANUAL_CURRENCY_KEY = 'asereshops_manual_currency';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas

let cachedCurrencyInfo = null;
let userManualCurrency = null; // 'EUR' | 'USD' | null

/**
 * Verifica si un código de país usa Euro/IBAN
 * @param {string} countryCode - Código ISO 3166-1 alpha-2
 * @returns {boolean}
 */
function isEuropeanIBANCountry(countryCode) {
  if (!countryCode) return false;
  return EUROPEAN_IBAN_COUNTRIES.has(countryCode.toUpperCase());
}

/**
 * Obtiene info de moneda basada en código de país
 * @param {string} countryCode - Código ISO 3166-1 alpha-2
 * @returns {Object} { icon, iconClass, label, countryCode }
 */
function getCurrencyInfoByCountry(countryCode) {
  const isEuro = isEuropeanIBANCountry(countryCode);
  
  if (isEuro) {
    return {
      icon: '€',
      iconClass: 'euro',
      label: 'EUR',
      countryCode: countryCode?.toUpperCase() || 'EU'
    };
  }
  return {
    icon: '$',
    iconClass: 'dollar',
    label: 'Zelle',
    countryCode: countryCode?.toUpperCase() || 'US'
  };
}

/**
 * Carga preferencia manual de moneda desde localStorage
 * @returns {string|null} 'EUR' | 'USD' | null
 */
function loadManualCurrencyPreference() {
  try {
    const saved = localStorage.getItem(MANUAL_CURRENCY_KEY);
    if (saved === 'EUR' || saved === 'USD') {
      userManualCurrency = saved;
      return saved;
    }
    return null;
  } catch (error) {
    console.warn('[Currency] Error leyendo preferencia manual:', error);
    return null;
  }
}

/**
 * Carga info de moneda desde localStorage (cache automático) si es válida
 * @returns {Object|null}
 */
function loadCurrencyFromCache() {
  try {
    const cached = localStorage.getItem(CURRENCY_CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const now = Date.now();
    
    // Verificar expiración (24 horas)
    if (data.timestamp && (now - data.timestamp) < CACHE_DURATION_MS) {
      return data;
    }
    
    // Cache expirado
    localStorage.removeItem(CURRENCY_CACHE_KEY);
    return null;
  } catch (error) {
    console.warn('[Currency] Error leyendo cache:', error);
    localStorage.removeItem(CURRENCY_CACHE_KEY);
    return null;
  }
}

/**
 * Guarda info de moneda en localStorage (cache automático)
 * @param {Object} currencyInfo
 */
function saveCurrencyToCache(currencyInfo) {
  try {
    const data = {
      ...currencyInfo,
      timestamp: Date.now()
    };
    localStorage.setItem(CURRENCY_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('[Currency] Error guardando cache:', error);
  }
}

/**
 * Detecta país del usuario via ipapi.co
 * @returns {Promise<Object>} Currency info
 */
async function fetchUserCurrencyInfo() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const countryCode = data.country_code || 'US';
    
    return getCurrencyInfoByCountry(countryCode);
  } catch (error) {
    console.warn('[Currency] Error detectando país, usando default Zelle:', error);
    return getCurrencyInfoByCountry('US');
  }
}

/**
 * Inicializa la detección de moneda (async, con cache)
 * @returns {Promise<Object>} Currency info
 */
async function getUserCurrencyInfo() {
  // 1. Verificar preferencia manual (tiene prioridad)
  if (userManualCurrency) {
    const manualInfo = getCurrencyInfoByCountry(userManualCurrency === 'EUR' ? 'ES' : 'US');
    cachedCurrencyInfo = manualInfo;
    return manualInfo;
  }
  
  // 2. Verificar cache en memoria
  if (cachedCurrencyInfo) {
    return cachedCurrencyInfo;
  }
  
  // 3. Verificar localStorage (cache automático)
  const cached = loadCurrencyFromCache();
  if (cached) {
    cachedCurrencyInfo = cached;
    return cachedCurrencyInfo;
  }
  
  // 4. Fetch desde API
  const currencyInfo = await fetchUserCurrencyInfo();
  
  // 5. Cachear en memoria y localStorage
  cachedCurrencyInfo = currencyInfo;
  saveCurrencyToCache(currencyInfo);
  
  return currencyInfo;
}

/**
 * Obtiene info de moneda sincrónicamente (usa preferencia manual, cache o default)
 * @returns {Object} Currency info
 */
function getCurrentCurrencyInfo() {
  // Prioridad 1: Preferencia manual del usuario
  if (userManualCurrency) {
    return getCurrencyInfoByCountry(userManualCurrency === 'EUR' ? 'ES' : 'US');
  }
  
  // Prioridad 2: Cache en memoria
  if (cachedCurrencyInfo) return cachedCurrencyInfo;
  
  // Prioridad 3: Cache automático en localStorage
  const cached = loadCurrencyFromCache();
  if (cached) {
    cachedCurrencyInfo = cached;
    return cached;
  }
  
  // Default a Zelle si no hay nada
  return getCurrencyInfoByCountry('US');
}

/**
 * Formatea un precio con el símbolo de moneda apropiado
 * @param {number|string} price - Precio numérico
 * @param {Object} [currencyInfo] - Info de moneda (opcional, usa actual si no se pasa)
 * @returns {string} HTML con símbolo + precio formateado
 */
function formatPrice(price, currencyInfo = null) {
  const info = currencyInfo || getCurrentCurrencyInfo();
  const numericPrice = Number(price);
  
  if (isNaN(numericPrice)) {
    return `<span class="currency-symbol ${info.iconClass}"></span>0.00`;
  }
  
  return `<span class="currency-symbol ${info.iconClass}"></span>${numericPrice.toFixed(2)}`;
}

/**
 * Formatea precio solo con el símbolo (para casos donde ya se tiene el número formateado)
 * @param {Object} [currencyInfo]
 * @returns {string} HTML del símbolo
 */
function formatCurrencySymbol(currencyInfo = null) {
  const info = currencyInfo || getCurrentCurrencyInfo();
  return `<span class="currency-symbol ${info.iconClass}"></span>`;
}

/**
 * Actualiza solo los símbolos de moneda en la UI (ligero, sin re-renderizar productos)
 * @param {Object} currencyInfo
 */
function updateCurrencyUIOnly(currencyInfo) {
  // Actualizar botón del header
  const btnIcon = document.getElementById('currency-btn-icon');
  const btnLabel = document.getElementById('currency-btn-label');
  const btn = document.querySelector('.currency-btn');
  
  if (btnIcon) {
    btnIcon.className = `currency-symbol ${currencyInfo.iconClass}`;
  }
  if (btnLabel) {
    btnLabel.textContent = currencyInfo.label;
  }
  if (btn) {
    btn.classList.remove('active');
  }
  
  // Actualizar símbolo en carrito
  const cartSymbol = document.getElementById('cart-currency-symbol');
  if (cartSymbol) {
    cartSymbol.className = `currency-symbol ${currencyInfo.iconClass}`;
    cartSymbol.innerHTML = '';
  }
  
  // Actualizar símbolos en precios existentes en el DOM
  // Buscar todos los .currency-symbol y actualizar su clase
  document.querySelectorAll('.currency-symbol').forEach(el => {
    el.className = `currency-symbol ${currencyInfo.iconClass}`;
  });
}

/**
 * Aplica la info de moneda a la UI (botón header, carrito, re-renderiza todo)
 * @param {Object} currencyInfo
 */
function applyCurrencyInfo(currencyInfo) {
  // Actualizar botón del header
  const btnIcon = document.getElementById('currency-btn-icon');
  const btnLabel = document.getElementById('currency-btn-label');
  const btn = document.querySelector('.currency-btn');
  
  if (btnIcon) {
    btnIcon.className = `currency-symbol ${currencyInfo.iconClass}`;
  }
  if (btnLabel) {
    btnLabel.textContent = currencyInfo.label;
  }
  if (btn) {
    btn.classList.toggle('active', false); // Reset dropdown state
  }
  
  // Actualizar símbolo en carrito
  const cartSymbol = document.getElementById('cart-currency-symbol');
  if (cartSymbol) {
    cartSymbol.className = `currency-symbol ${currencyInfo.iconClass}`;
    cartSymbol.innerHTML = '';
  }
  
  // Re-renderizar todo
  if (typeof renderProducts === 'function') renderProducts();
  if (typeof renderBestSellers === 'function') renderBestSellers();
  if (typeof updateCart === 'function') updateCart();
  if (typeof renderCategoryCard === 'function') renderCategoryCard();
  if (typeof updateOrderSummary === 'function') updateOrderSummary();
  
  // Disparar evento para otros listeners
  window.dispatchEvent(new CustomEvent('currencyChanged', { 
    detail: currencyInfo 
  }));
}

/**
 * Selecciona moneda manualmente (EUR o USD)
 * @param {string} currencyCode - 'EUR' o 'USD'
 */
function selectCurrency(currencyCode) {
  if (currencyCode !== 'EUR' && currencyCode !== 'USD') {
    console.warn('[Currency] Código de moneda inválido:', currencyCode);
    return;
  }
  
  userManualCurrency = currencyCode;
  localStorage.setItem(MANUAL_CURRENCY_KEY, currencyCode);
  
  const currencyInfo = getCurrencyInfoByCountry(currencyCode === 'EUR' ? 'ES' : 'US');
  applyCurrencyInfo(currencyInfo);
  
  // Cerrar dropdown
  const dropdown = document.getElementById('currency-dropdown');
  if (dropdown) {
    dropdown.classList.remove('active');
  }
}

/**
 * Resetea a detección automática (elimina preferencia manual)
 */
function resetCurrencyAuto() {
  userManualCurrency = null;
  localStorage.removeItem(MANUAL_CURRENCY_KEY);
  
  // Recargar detección automática
  getUserCurrencyInfo().then(currencyInfo => {
    applyCurrencyInfo(currencyInfo);
  }).catch(console.error);
  
  // Cerrar dropdown
  const dropdown = document.getElementById('currency-dropdown');
  if (dropdown) {
    dropdown.classList.remove('active');
  }
}

/**
 * Alterna visibilidad del dropdown de moneda
 */
function toggleCurrencySelector() {
  const dropdown = document.getElementById('currency-dropdown');
  const btn = document.querySelector('.currency-btn');
  
  if (!dropdown) return;
  
  const isActive = dropdown.classList.contains('active');
  
  if (isActive) {
    dropdown.classList.remove('active');
    if (btn) btn.classList.remove('active');
  } else {
    dropdown.classList.add('active');
    if (btn) btn.classList.add('active');
  }
}

/**
 * Cierra el dropdown al hacer click fuera
 */
function closeCurrencyDropdown(event) {
  const selector = document.getElementById('currency-selector');
  const dropdown = document.getElementById('currency-dropdown');
  const btn = document.querySelector('.currency-btn');
  
  if (!selector || !dropdown) return;
  
  if (!selector.contains(event.target)) {
    dropdown.classList.remove('active');
    if (btn) btn.classList.remove('active');
  }
}

/**
 * Fuerza actualización de moneda (útil para testing o cambio manual)
 * @param {string} countryCode - Código de país para forzar
 */
function forceCurrencyUpdate(countryCode) {
  const currencyInfo = getCurrencyInfoByCountry(countryCode);
  cachedCurrencyInfo = currencyInfo;
  saveCurrencyToCache(currencyInfo);
  
  // Disparar evento personalizado para que la UI se actualice
  window.dispatchEvent(new CustomEvent('currencyChanged', { 
    detail: currencyInfo 
  }));
  
  return currencyInfo;
}

/**
 * Limpia el cache de moneda (para testing o logout)
 */
function clearCurrencyCache() {
  cachedCurrencyInfo = null;
  localStorage.removeItem(CURRENCY_CACHE_KEY);
}

// Cerrar dropdown al hacer click fuera
document.addEventListener('click', closeCurrencyDropdown);

// Cerrar dropdown con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const dropdown = document.getElementById('currency-dropdown');
    const btn = document.querySelector('.currency-btn');
    if (dropdown && dropdown.classList.contains('active')) {
      dropdown.classList.remove('active');
      if (btn) btn.classList.remove('active');
    }
  }
});

// Exponer globalmente para uso en otros scripts
window.CurrencyIcon = {
  getUserCurrencyInfo,
  getCurrentCurrencyInfo,
  formatPrice,
  formatCurrencySymbol,
  forceCurrencyUpdate,
  clearCurrencyCache,
  isEuropeanIBANCountry,
  EUROPEAN_IBAN_COUNTRIES,
  // Nuevas funciones de selector manual
  selectCurrency,
  resetCurrencyAuto,
  toggleCurrencySelector,
  applyCurrencyInfo,
  updateCurrencyUIOnly,
  loadManualCurrencyPreference
};

// Auto-inicializar al cargar (no bloqueante)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    // Cargar preferencia manual primero
    loadManualCurrencyPreference();
    // Luego inicializar detección automática
    await getUserCurrencyInfo().catch(console.error);
    // Aplicar a UI
    const info = getCurrentCurrencyInfo();
    applyCurrencyInfo(info);
  });
} else {
  loadManualCurrencyPreference();
  getUserCurrencyInfo().then(info => {
    applyCurrencyInfo(info);
  }).catch(console.error);
}