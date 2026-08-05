// KopaBridge customer portal — shared helpers.
// Plain JS, no build step, no framework: served as static files by nginx
// alongside the API it talks to.

const API_BASE = '/api/v1';
const TOKEN_KEY = 'kopabridge_token';

/* ---------- token / session ---------- */

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Client-side JWT payload decode, for UI purposes only (which nav links
// to show, whose data to fetch). This is never trusted as an auth
// decision — every actual permission check happens server-side.
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const json = decodeURIComponent(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getCurrentUser() {
  const token = getToken();
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload) return null;
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    clearToken();
    return null;
  }
  return { userId: payload.sub, email: payload.email, role: payload.role };
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

function requireAdmin(user) {
  if (user.role !== 'admin') {
    window.location.href = 'dashboard.html?denied=1';
    return false;
  }
  return true;
}

function logout() {
  clearToken();
  window.location.href = 'index.html';
}

/* ---------- API calls ---------- */

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  let body = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message =
      (body && (Array.isArray(body.message) ? body.message.join(', ') : body.message)) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  return body;
}

/* ---------- shared render helpers ---------- */

function ratingClass(rating) {
  return String(rating || '').toLowerCase().replace(/\s+/g, '-');
}

function statusClass(status) {
  return String(status || '').toLowerCase();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Renders the signature segmented meter — a nod to the LED charge
// readout on a physical PAYGo solar controller — for a given score.
function renderMeterSegments(score) {
  const total = 10;
  const filled = Math.round((score / 100) * total);
  let html = '';
  for (let i = 0; i < total; i++) {
    const isFilled = i < filled;
    const color = isFilled ? meterSegmentColor(score) : 'rgba(246,242,231,0.14)';
    html += `<div class="seg" style="background:${color}"></div>`;
  }
  return html;
}

function meterSegmentColor(score) {
  if (score >= 75) return '#4c7a5d';
  if (score >= 50) return '#e8a33d';
  return '#b65c43';
}

function renderMeterCard({ score, rating, totalPayments, paid, late, missed, accountLabel }) {
  if (score == null) {
    return `
      <div class="meter-top">
        <span class="meter-eyebrow">Credit standing</span>
      </div>
      <p class="meter-empty">No connected energy account yet — connect a provider below to generate a credit score.</p>
    `;
  }

  return `
    <div class="meter-top">
      <span class="meter-eyebrow">Credit standing</span>
      <span class="meter-account">${escapeHtml(accountLabel || '')}</span>
    </div>
    <div class="meter-score-row">
      <span class="meter-score">${score}</span>
      <span class="meter-rating pill ${ratingClass(rating)}">${escapeHtml(rating)}</span>
    </div>
    <div class="meter-segments">${renderMeterSegments(score)}</div>
    <div class="meter-scale">
      <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
    </div>
    <div class="meter-summary">
      <span class="meter-stat"><b>${totalPayments ?? 0}</b>payments</span>
      <span class="meter-stat"><b>${paid ?? 0}</b>on time</span>
      <span class="meter-stat"><b>${late ?? 0}</b>late</span>
      <span class="meter-stat"><b>${missed ?? 0}</b>missed</span>
    </div>
  `;
}
