import { buildSidebar, escapeHtml, ICONS, requireAuth } from './utils.js';

const userName0 = requireAuth();
if (!userName0) throw new Error('not auth');

let view    = 'main';
let userName = userName0;
let newName  = '';

function render() {
  const app = document.getElementById('app');
  app.innerHTML = buildSidebar('settings', 'month', ()=>{}) + buildSettings();
  attachEvents();
}

function buildSettings() {
  return `
    <div class="main-content" style="align-items:center;justify-content:center;position:relative">
      <button class="back-btn" id="backBtn">
        ${ICONS.back} Повернутися до планера
      </button>

      <div class="settings-card">
        ${view === 'main'       ? buildMain()       : ''}
        ${view === 'info'       ? buildInfo()       : ''}
        ${view === 'changeName' ? buildChangeName() : ''}
        ${view === 'pomodoro'   ? buildPomodoro()   : ''}
      </div>
    </div>`;
}

function buildMain() {
  return `
    <h2 style="color:white;font-size:1.5rem;font-weight:600;text-align:center;margin-bottom:2.5rem">Налаштування акаунту</h2>

    <div style="display:flex;align-items:center;gap:1.5rem;margin-bottom:2.5rem">
      <div style="width:5rem;height:5rem;background:#d1d5db;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        ${ICONS.userLg}
      </div>
      <h3 style="color:white;font-size:1.25rem;margin:0">${escapeHtml(userName)}</h3>
    </div>

    <button class="btn btn--gray btn--full" id="goInfoBtn"
            style="display:flex;align-items:center;gap:1rem;font-size:1.125rem;margin-bottom:1rem;justify-content:flex-start">
      ${ICONS.star} <span>Особиста інформація</span>
    </button>
    <button class="btn btn--gray btn--full" id="goChangeNameBtn"
            style="display:flex;align-items:center;gap:1rem;font-size:1.125rem;margin-bottom:1rem;justify-content:flex-start">
      ${ICONS.star} <span>Змінити ім'я</span>
    </button>
    <button class="btn btn--gray btn--full" id="goPomodoroBtn"
            style="display:flex;align-items:center;gap:1rem;font-size:1.125rem;margin-bottom:1rem;justify-content:flex-start">
      ${ICONS.star} <span>Налаштування Помодоро</span>
    </button>
    <button class="btn btn--red btn--full" id="logoutBtn"
            style="display:flex;align-items:center;gap:1rem;font-size:1.125rem;justify-content:flex-start">
      ${ICONS.star} <span>Вийти з акаунту</span>
    </button>`;
}

function buildInfo() {
  const email    = localStorage.getItem('userEmail')    || 'email@example.com';
  const password = localStorage.getItem('userPassword') || '********';
  const rows = [["Ім'я", userName], ['Email', email], ['Пароль', password]];
  return `
    <h2 style="color:white;font-size:1.5rem;font-weight:600;text-align:center;margin-bottom:2.5rem">Особиста інформація</h2>
    ${rows.map(([label, value]) => `
      <div class="settings-info-row">
        <div class="settings-info-label">${label}</div>
        <div class="settings-info-value">${escapeHtml(value)}</div>
      </div>`).join('')}
    <button class="btn btn--gray btn--full" id="backToMainBtn" style="font-size:1.125rem">Назад</button>`;
}

function buildChangeName() {
  return `
    <h2 style="color:white;font-size:1.5rem;font-weight:600;text-align:center;margin-bottom:2.5rem">Змінити ім'я</h2>

    <div class="settings-info-label" style="margin-bottom:0.5rem">Поточне ім'я</div>
    <div class="settings-info-row" style="margin-bottom:1.5rem">
      <div class="settings-info-value">${escapeHtml(userName)}</div>
    </div>

    <div class="settings-info-label" style="margin-bottom:0.5rem">Нове ім'я</div>
    <input id="newNameInput" class="form-input form-input--full"
           type="text" placeholder="Введіть нове ім'я"
           value="${escapeHtml(newName)}" autocomplete="off"/>

    <div class="form-row">
      <button class="btn btn--green btn--full" id="saveNameBtn" style="font-size:1.125rem">Зберегти</button>
      <button class="btn btn--gray  btn--full" id="cancelNameBtn" style="font-size:1.125rem">Скасувати</button>
    </div>`;
}

function buildPomodoro() {
  const pWork = localStorage.getItem('pomodoroWork') || '25';
  const pBreak = localStorage.getItem('pomodoroBreak') || '5';
  return `
    <h2 style="color:white;font-size:1.5rem;font-weight:600;text-align:center;margin-bottom:2.5rem">Налаштування Помодоро</h2>

    <div class="settings-info-label" style="margin-bottom:0.5rem">Час роботи (хвилин)</div>
    <input id="pomodoroWorkInput" class="form-input form-input--full" type="number" min="1" value="${escapeHtml(pWork)}" />

    <div class="settings-info-label" style="margin-bottom:0.5rem">Час відпочинку (хвилин)</div>
    <input id="pomodoroBreakInput" class="form-input form-input--full" type="number" min="1" value="${escapeHtml(pBreak)}" />

    <div class="form-row">
      <button class="btn btn--green btn--full" id="savePomodoroBtn" style="font-size:1.125rem">Зберегти</button>
      <button class="btn btn--gray  btn--full" id="cancelPomodoroBtn" style="font-size:1.125rem">Скасувати</button>
    </div>`;
}

function attachEvents() {
  document.getElementById('backBtn')?.addEventListener('click', () => { window.location.href = '/planner.html'; });

  document.getElementById('goInfoBtn')?.addEventListener('click', () => { view='info'; render(); });
  document.getElementById('goChangeNameBtn')?.addEventListener('click', () => { view='changeName'; newName=''; render(); });
  document.getElementById('goPomodoroBtn')?.addEventListener('click', () => { view='pomodoro'; render(); });

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/index.html';
  });

  document.getElementById('backToMainBtn')?.addEventListener('click', () => { view='main'; render(); });
  document.getElementById('cancelNameBtn')?.addEventListener('click', () => { view='main'; newName=''; render(); });
  document.getElementById('cancelPomodoroBtn')?.addEventListener('click', () => { view='main'; render(); });

  // Збереження імені
  document.getElementById('saveNameBtn')?.addEventListener('click', () => {
    const input = document.getElementById('newNameInput');
    const val   = input?.value.trim();
    if (val) {
      localStorage.setItem('userName', val);
      userName = val;
      view = 'main';
      render();
    }
  });

  document.getElementById('newNameInput')?.addEventListener('keydown', e => {
    if (e.key==='Enter') document.getElementById('saveNameBtn')?.click();
  });

  // Збереження Помодоро
  document.getElementById('savePomodoroBtn')?.addEventListener('click', () => {
    const w = document.getElementById('pomodoroWorkInput')?.value;
    const b = document.getElementById('pomodoroBreakInput')?.value;
    if (w && b) {
      localStorage.setItem('pomodoroWork', w);
      localStorage.setItem('pomodoroBreak', b);
      view = 'main';
      render();
    }
  });

  document.querySelector('.sidebar__title')?.addEventListener('click', () => { window.location.href = '/planner.html'; });
}

render();