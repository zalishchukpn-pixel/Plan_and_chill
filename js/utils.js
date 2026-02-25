// ===== SHARED STATE & UTILS =====

export const DAYS_OF_WEEK = ['Понеділок','Вівторок','Середа','Четвер',"П'ятниця",'Субота','Неділя'];
export const CURRENT_MONTH = 'Лютий';

const API = 'http://localhost:8000';

// --- Auth API ---
export async function apiRegister(name, email, password) {
  const res = await fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Помилка реєстрації');
  return data;
}

export async function apiLogin(email, password) {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Невірний email або пароль');
  return data; // { ok: true, name }
}

// --- Tasks API ---
export async function apiGetTasks(userName) {
  try {
    const res = await fetch(`${API}/tasks/${encodeURIComponent(userName)}`);
    return await res.json(); // { "1": [...], "2": [...] }
  } catch {
    return {};
  }
}

export async function apiSaveDayTasks(userName, day, tasks) {
  try {
    await fetch(`${API}/tasks/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: userName, day, tasks }),
    });
  } catch (err) {
    console.error('Помилка збереження задач:', err);
  }
}

// --- Schedule cache (session only, not persisted) ---
export function getScheduleCache() {
  try { return JSON.parse(sessionStorage.getItem('scheduleCache') || '{}'); }
  catch { return {}; }
}

export function saveScheduleCache(obj) {
  sessionStorage.setItem('scheduleCache', JSON.stringify(obj));
}

// --- Time helpers ---
export function timeToMins(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function minsToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function parseTime(timeStr) {
  return timeToMins(timeStr);
}

// --- API schedule ---
export async function fetchSchedule(tasksForDay) {
  const converted = tasksForDay.map(t => ({
    ...t,
    startTime: t.startTime ? timeToMins(t.startTime) : null,
    endTime:   t.endTime   ? timeToMins(t.endTime)   : null,
    duration:  parseInt(t.duration)  || 60,
    priority:  parseInt(t.priority)  || 5,
  }));

  const pWork  = parseInt(localStorage.getItem('pomodoroWork'))  || 25;
  const pBreak = parseInt(localStorage.getItem('pomodoroBreak')) || 5;

  try {
    const res = await fetch(`${API}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tasks: converted,
        pomodoro_work: pWork,
        pomodoro_break: pBreak,
        is_today: false,
      }),
    });
    const data = await res.json();
    return data.schedule;
  } catch (err) {
    console.error("Помилка зв'язку з бекендом:", err);
    return tasksForDay;
  }
}

// --- SVG Icons ---
export const ICONS = {
  user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>`,

  userLg: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>`,

  star: `<svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>`,

  trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>`,

  edit: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`,

  back: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>`,
};

// --- Auth guard ---
export function requireAuth() {
  if (!localStorage.getItem('userName')) {
    window.location.href = '/index.html';
    return null;
  }
  return localStorage.getItem('userName');
}

// --- Sidebar builder ---
export function buildSidebar(activePage, viewMode) {
  const userName = localStorage.getItem('userName') || '';
  const isSettings = activePage === 'settings';
  const isPlanner  = activePage === 'planner';

  return `
    <aside class="sidebar">
      <button class="sidebar__title" onclick="window.location.href='/planner.html'">Планер</button>

      <div class="sidebar__user">
        <div class="sidebar__avatar">${ICONS.user}</div>
        <span>${escapeHtml(userName)}</span>
      </div>

      <button class="sidebar__btn ${isSettings ? 'sidebar__btn--active' : ''}"
              onclick="window.location.href='/settings.html'">
        ${ICONS.star} <span>Налаштування</span>
      </button>

      ${isPlanner ? `
        <button class="sidebar__btn" id="toggleViewBtn">
          ${ICONS.star}
          <span>${viewMode === 'month' ? 'Вигляд дня' : 'Вигляд місяця'}</span>
        </button>
      ` : ''}
    </aside>
  `;
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// --- Color palette ---
const PALETTE = [
  '#E63946', '#F4A261', '#2A9D8F', '#264653', '#8AB17D',
  '#B5838D', '#6D6875', '#457B9D', '#1D3557', '#E07A5F',
  '#3D405B', '#81B29A', '#9B5DE5', '#F15BB5', '#00B4D8',
  '#90BE6D', '#43AA8B', '#577590', '#C9184A', '#7209B7'
];

export function stringToColor(taskName) {
  let colorMap = {};
  try { colorMap = JSON.parse(localStorage.getItem('taskColors') || '{}'); } catch (e) {}
  if (colorMap[taskName]) return colorMap[taskName];
  const usedColors = Object.values(colorMap);
  let available = PALETTE.filter(c => !usedColors.includes(c));
  if (available.length === 0) available = PALETTE;
  const chosen = available[Math.floor(Math.random() * available.length)];
  colorMap[taskName] = chosen;
  localStorage.setItem('taskColors', JSON.stringify(colorMap));
  return chosen;
}
