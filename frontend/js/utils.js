// ===== utils.js =====
export const API = "http://localhost:8000";

export function getUserName() { return localStorage.getItem("user_name"); }
export function redirectIfNotLoggedIn() {
  if (!getUserName()) window.location.href = "index.html";
}
export function minsToTime(mins) {
  const h = Math.floor(mins / 60) % 24, m = mins % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
export function timeToMins(timeStr) {
  const [h, m] = timeStr.split(":").map(Number); return h * 60 + m;
}
export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---- Кольори подій по імені ----
const EVENT_COLORS = [
  "#F0F4C3","#E1F5FE","#F3E5F5","#E8F5E9","#FFF9C4",
  "#FCE4EC","#E0F7FA","#F9FBE7","#FFF3E0","#F1F8E9",
  "#EDE7F6","#E0F2F1","#FFFDE7","#F5F5F5","#EFEBE9"
];

const COLOR_STORE_KEY = "event_colors_map";
function getColorMap() {
  try { return JSON.parse(localStorage.getItem(COLOR_STORE_KEY) || "{}"); } catch { return {}; }
}
function saveColorMap(map) {
  localStorage.setItem(COLOR_STORE_KEY, JSON.stringify(map));
}
export function eventColor(name) {
  if (!name) return EVENT_COLORS[0];
  const key = name.toLowerCase().trim();
  const map = getColorMap();
  if (map[key]) return map[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const color = EVENT_COLORS[h % EVENT_COLORS.length];
  map[key] = color;
  saveColorMap(map);
  return color;
}

export const PRIORITY_COLORS = ["#ef4444","#f59e0b","#3b82f6","#10b981","#8b5cf6"];
export function priorityColor(p) {
  return PRIORITY_COLORS[((p || 1) - 1) % PRIORITY_COLORS.length];
}

// ---- Sidebar ----
export function buildSidebar(activePage, viewMode = null) {
  const user = getUserName() || "Гість";
  const viewToggle = (activePage === "planner" && viewMode !== null) ? `
      <div class="sidebar__section-label">Вигляд</div>
      <div class="sidebar__toggle">
        <button class="sidebar__toggle-btn ${viewMode==='day'?'sidebar__toggle-btn--active':''}" id="sidebarDayBtn">День</button>
        <button class="sidebar__toggle-btn ${viewMode==='month'?'sidebar__toggle-btn--active':''}" id="sidebarMonthBtn">Місяць</button>
      </div>` : "";

  const html = `
    <button class="burger-btn" id="burgerBtn" aria-label="Меню">
      <span></span><span></span><span></span>
    </button>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <aside class="sidebar" id="sidebar">
      <button class="sidebar__title" onclick="window.location.href='planner.html'">Plan &amp;<br>Chill</button>
      <div class="sidebar__user">
        <div class="sidebar__avatar">
          <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
        </div>
        <span>${user}</span>
      </div>
      <button class="sidebar__btn ${activePage==='planner'?'sidebar__btn--active':''}" onclick="window.location.href='planner.html'">
        <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z"/></svg>
        Планер
      </button>
      <button class="sidebar__btn ${activePage==='settings'?'sidebar__btn--active':''}" onclick="window.location.href='settings.html'">
        <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M19.14 12.94a7.07 7.07 0 000-1.88l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.61-.22l-2.39.96a7.02 7.02 0 00-1.62-.94l-.36-2.54A.49.49 0 0014 2h-4a.49.49 0 00-.49.42l-.36 2.54a7.02 7.02 0 00-1.62.94l-2.39-.96a.49.49 0 00-.61.22L2.61 8.48a.49.49 0 00.12.64l2.03 1.58a7.2 7.2 0 000 1.88l-2.03 1.58a.49.49 0 00-.12.64l1.92 3.32c.13.23.4.31.61.22l2.39-.96c.5.36 1.04.67 1.62.94l.36 2.54c.07.25.28.43.49.43h4c.21 0 .42-.18.49-.42l.36-2.54a7.02 7.02 0 001.62-.94l2.39.96c.23.09.48.01.61-.22l1.92-3.32a.49.49 0 00-.12-.64zM12 15.6a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z"/></svg>
        Налаштування
      </button>
      ${viewToggle}
      <button class="sidebar__btn" style="margin-top:auto" onclick="localStorage.clear();window.location.href='index.html'">
        <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
        Вийти
      </button>
    </aside>`;

  setTimeout(() => {
    const burger = document.getElementById("burgerBtn");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if (!burger || !sidebar || !overlay) return;
    const open  = () => { sidebar.classList.add("sidebar--open"); overlay.classList.add("sidebar-overlay--visible"); burger.classList.add("burger-btn--open"); };
    const close = () => { sidebar.classList.remove("sidebar--open"); overlay.classList.remove("sidebar-overlay--visible"); burger.classList.remove("burger-btn--open"); };
    burger.addEventListener("click", () => sidebar.classList.contains("sidebar--open") ? close() : open());
    overlay.addEventListener("click", close);
  }, 0);

  return html;
}

// ---- API helpers ----
export async function fetchAllTasks(userName) {
  const res = await fetch(`${API}/tasks/${encodeURIComponent(userName)}`);
  return res.ok ? res.json() : {};
}
export async function saveTasksForDay(userName, day, tasks) {
  await fetch(`${API}/tasks/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_name: userName, day, tasks }),
  });
}
export function getRecurringRoutines(userName) {
  try { return JSON.parse(localStorage.getItem(`recurring_routines_${userName}`) || "[]"); } catch { return []; }
}
export function saveRecurringRoutines(userName, routines) {
  localStorage.setItem(`recurring_routines_${userName}`, JSON.stringify(routines));
}
export async function generatePlan(tasks, pomodoroWork, pomodoroBreak, isToday) {
  const res = await fetch(`${API}/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks, pomodoro_work: pomodoroWork, pomodoro_break: pomodoroBreak, is_today: isToday }),
  });
  return res.ok ? res.json() : { schedule: [] };
}
