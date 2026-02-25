import {
  DAYS_OF_WEEK,
  apiGetTasks, apiSaveDayTasks,
  getScheduleCache, saveScheduleCache,
  fetchSchedule, parseTime,
  buildSidebar, escapeHtml, ICONS, requireAuth,
  stringToColor
} from './utils.js';

// ── Auth ──────────────────────────────────────────────────────────
const userName = requireAuth();
if (!userName) throw new Error('not auth');

// ── State ─────────────────────────────────────────────────────────
let viewMode       = localStorage.getItem('viewMode') || 'day';
let selectedDay    = parseInt(localStorage.getItem('selectedDay') || '1');
let selectedMonth  = parseInt(localStorage.getItem('selectedMonth') || '2'); // 1=січень, 2=лютий, ..., 12=грудень
let dayTasks       = {};       // loaded from DB
let schedCache     = getScheduleCache();
let formState      = null;
let editTaskId     = null;

// ── Month names (українською) ─────────────────────────────────────
const MONTH_NAMES = [
  '', 'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
];

// ── Days in each month (без урахування високосного року для простоти) ──
const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// ── Load tasks from DB on start ───────────────────────────────────
async function loadTasks() {
  dayTasks = await apiGetTasks(userName);
  render();
}

// ── Helpers ───────────────────────────────────────────────────────
const EMPTY_FORM = () => ({
  text: '', type: 'routine', eventMode: 'auto',
  start: '', end: '', duration: '60', priority: '5', recurrence: 'none'
});

function rawTasks(day, month) { 
  const key = `${month}-${day}`;
  return dayTasks[key] || []; 
}

function cachedSchedule(day, month) { 
  const key = `${month}-${day}`;
  return schedCache[key] || null; 
}

function sortQueue(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return (parseInt(b.priority)||0) - (parseInt(a.priority)||0);
  });
}

async function saveAndClearCache(updated, month, day) {
  dayTasks = updated;
  const key = `${month}-${day}`;
  await apiSaveDayTasks(userName, day, month, updated[key] || []);
  delete schedCache[key];
  saveScheduleCache(schedCache);
}

// ── Render ────────────────────────────────────────────────────────
function render() {
  const app = document.getElementById('app');
  app.innerHTML = buildSidebar('planner', viewMode) + buildMain();
  attachEvents();
}

function buildMain() {
  if (viewMode === 'month') return buildMonthView();
  return buildDayView();
}

// ── MONTH VIEW ────────────────────────────────────────────────────
function buildMonthView() {
  const daysInMonth = DAYS_IN_MONTH[selectedMonth];
  const year = new Date().getFullYear();

  // Який день тижня є 1-е число (0=нд,1=пн...6=сб) → переводимо в пн-based (0=пн...6=нд)
  const rawFirst = new Date(year, selectedMonth - 1, 1).getDay();
  const firstWeekday = rawFirst === 0 ? 6 : rawFirst - 1; // 0=пн, 6=нд

  // Заголовки днів тижня
  const weekHeaders = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд']
    .map(d => `<div class="month-weekday-header">${d}</div>`)
    .join('');

  // Порожні клітинки-зсуви на початку
  let cells = '';
  for (let i = 0; i < firstWeekday; i++) {
    cells += `<div class="month-cell month-cell--empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const sched = cachedSchedule(day, selectedMonth);
    const raw   = rawTasks(day, selectedMonth);
    const tasks = sched
      ? [...sched].sort((a,b)=>(a.startTime||'99:99').localeCompare(b.startTime||'99:99'))
      : sortQueue(raw);
    cells += buildMonthCell(day, tasks);
  }

  return `
    <div class="main-content">
      <div class="month-nav">
        <button class="btn btn--gray btn--sm" id="prevMonthBtn">←</button>
        <h2 style="color:white;font-size:1.25rem;margin:0 1rem">${MONTH_NAMES[selectedMonth]} ${year}</h2>
        <button class="btn btn--gray btn--sm" id="nextMonthBtn">→</button>
      </div>
      <div class="month-weekdays">${weekHeaders}</div>
      <div class="month-grid">${cells}</div>
    </div>`;
}

function buildMonthCell(day, tasks) {
  const chips = tasks.slice(0,4).map(t => {
    let cls = 'month-chip--event';
    let style = '';
    const cleanName = t.text.replace(' (Помодоро)', '');
    if (t.type === 'routine') {
      cls = 'month-chip--routine';
    } else {
      if (t.isAuto) cls = 'month-chip--auto';
      style = `background-color: ${stringToColor(cleanName)}; border: none;`;
    }
    const timeLabel = t.startTime ? t.startTime : (t.priority ? `П:${t.priority}` : '');
    return `<div class="month-chip ${cls}" style="${style}" title="${escapeHtml(timeLabel+' - '+cleanName)}">
      ${timeLabel ? `<span class="month-chip__time">${escapeHtml(timeLabel)}</span>` : ''}
      <span>${escapeHtml(cleanName)}</span>
    </div>`;
  }).join('');
  const more = tasks.length > 4 ? `<div class="month-more">+${tasks.length-4} завдань</div>` : '';
  return `
    <div class="month-cell" data-day="${day}">
      <div class="month-cell__day">${day}</div>
      <div style="flex:1;overflow:hidden;display:flex;flex-direction:column">
        ${chips}${more}
      </div>
    </div>`;
}

// ── DAY VIEW ──────────────────────────────────────────────────────
function buildDayView() {
  const _dow = new Date(new Date().getFullYear(), selectedMonth - 1, selectedDay).getDay();
  const dayName = DAYS_OF_WEEK[_dow === 0 ? 6 : _dow - 1];
  const isGenerated = !!cachedSchedule(selectedDay, selectedMonth);
  const displayTasks = isGenerated
    ? [...cachedSchedule(selectedDay, selectedMonth)].sort((a,b)=>(a.startTime||'99:99').localeCompare(b.startTime||'99:99'))
    : sortQueue(rawTasks(selectedDay, selectedMonth));

  return `
    <div class="main-content">
      <div class="day-nav">
        <button class="btn btn--gray btn--sm" id="prevDayBtn">←</button>
        <h2 class="day-nav__title">${selectedDay} ${MONTH_NAMES[selectedMonth]}, ${dayName}</h2>
        <button class="btn btn--gray btn--sm" id="nextDayBtn">→</button>
      </div>

      <div class="panel">
        <div class="controls-row" id="controlsRow">
          ${buildControls(isGenerated)}
        </div>
        ${formState ? buildForm() : ''}
        <h3 class="panel__header">
          ${isGenerated ? 'Ваш розклад' : 'Черга завдань'}
        </h3>
        ${isGenerated ? buildTimeline(displayTasks) : buildQueue(displayTasks)}
      </div>
    </div>`;
}

function buildControls(isGenerated) {
  if (formState) return '';
  if (isGenerated) {
    return `<button class="btn btn--amber" id="clearScheduleBtn">Змінити список завдань</button>`;
  }
  const hasTasks = rawTasks(selectedDay, selectedMonth).length > 0;
  return `
    <button class="btn btn--blue" id="openFormBtn">+ Додати подію або рутину</button>
    ${hasTasks ? `<button class="btn btn--green" id="generateBtn">Згенерувати розклад</button>` : ''}
  `;
}

// ── Форма (без змін) ──────────────────────────────────────────────
function buildForm() {
  const f = formState;
  const showTimeInputs = f.type==='routine' || (f.type==='event' && f.eventMode==='manual');
  return `
    <div class="form-card">
      <div class="tab-group">
        <button class="tab-btn ${f.type==='routine' ? 'tab-btn--gray' : 'tab-btn--inactive'}" data-type="routine">Рутина (сталий час)</button>
        <button class="tab-btn ${f.type==='event'   ? 'tab-btn--blue' : 'tab-btn--inactive'}" data-type="event">Подія (гнучка)</button>
      </div>
      <input id="formText" class="form-input form-input--full" type="text"
             placeholder="Назва..." value="${escapeHtml(f.text)}"/>
      ${f.type==='event' ? `
        <div class="tab-group" style="margin-bottom:1rem">
          <button class="tab-btn-outline ${f.eventMode==='auto'   ? 'tab-btn-outline--active':'tab-btn-outline--inactive'}" data-mode="auto">Автопідбір</button>
          <button class="tab-btn-outline ${f.eventMode==='manual' ? 'tab-btn-outline--active':'tab-btn-outline--inactive'}" data-mode="manual">Вказати час вручну</button>
        </div>` : ''}
      ${showTimeInputs ? `
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Час початку</label>
            <input id="formStart" class="form-input" type="time" value="${escapeHtml(f.start)}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Час кінця</label>
            <input id="formEnd" class="form-input" type="time" value="${escapeHtml(f.end)}"/>
          </div>
        </div>` : `
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Тривалість (хвилин)</label>
            <input id="formDuration" class="form-input" type="number" value="${escapeHtml(f.duration)}" placeholder="60"/>
          </div>
          <div class="form-group">
            <label class="form-label">Пріоритет (1-10)</label>
            <input id="formPriority" class="form-input" type="number" min="1" max="10" value="${escapeHtml(f.priority)}" placeholder="5"/>
          </div>
        </div>`}
      ${(f.type==='routine' && !editTaskId) ? `
        <div class="form-group" style="margin-bottom:1rem">
          <label class="form-label">Повторюваність</label>
          <select id="formRecurrence" class="form-input">
            <option value="none"   ${f.recurrence==='none'   ?'selected':''}>Тільки сьогодні</option>
            <option value="daily"  ${f.recurrence==='daily'  ?'selected':''}>Щодня</option>
            <option value="weekly" ${f.recurrence==='weekly' ?'selected':''}>Щотижня в цей день</option>
          </select>
        </div>` : ''}
      <div class="form-row">
        <button class="btn btn--green btn--full" id="saveTaskBtn">${editTaskId ? 'Оновити' : 'Зберегти'}</button>
        <button class="btn btn--red   btn--full" id="cancelFormBtn">Скасувати</button>
      </div>
    </div>`;
}

// ── Queue (без змін) ──────────────────────────────────────────────
function buildQueue(tasks) {
  if (!tasks.length) return `<p class="empty-state">Немає запланованих справ. Додайте щось у чергу!</p>`;
  return tasks.map(task => {
    const isRoutine = task.type === 'routine';
    const bgColor = isRoutine ? '' : `background-color: ${stringToColor(task.text)};`;
    return `
      <div class="task-item ${isRoutine ? 'task-item--routine' : ''}" style="${bgColor}">
        <div>
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span class="task-badge" style="background:rgba(0,0,0,0.3)">${isRoutine ? 'Рутина' : 'Подія'}</span>
            <span class="task-name">${escapeHtml(task.text)}</span>
          </div>
          ${task.type==='event' && !task.startTime ? `
            <div class="task-meta task-meta--priority" style="color:#fff;opacity:0.9">Пріоритет: ${task.priority} | ${task.duration} хв</div>` : ''}
          ${(task.startTime || task.endTime) ? `
            <div class="task-meta task-meta--time" style="color:#fff;opacity:0.9"> ${task.startTime||''}${task.endTime ? ' - '+task.endTime : ''}</div>` : ''}
        </div>
        <div class="task-actions">
          <button class="btn btn--gray btn--icon" data-edit="${escapeHtml(task.id)}" title="Редагувати">${ICONS.edit}</button>
          <button class="btn btn--red  btn--icon" data-del="${escapeHtml(task.id)}"  title="Видалити">${ICONS.trash}</button>
        </div>
      </div>`;
  }).join('');
}

// ── Timeline з підтримкою накладання подій ────────────────────────
function buildTimeline(tasks) {
  const hourLines = Array.from({length:25},(_,i)=>`
    <div class="timeline__hour-line" style="top:${i*60*1.2}px">
      <span class="timeline__hour-label">${i.toString().padStart(2,'0')}:00</span>
    </div>`).join('');

  // Крок 1 — розкладаємо всі події по рівнях (колонках)
  const levels = [];
  const placed = [];

  tasks.forEach(task => {
    if (!task.startTime || !task.endTime) return;
    const start = parseTime(task.startTime);
    const end   = parseTime(task.endTime);

    let level = 0;
    while (true) {
      const conflict = (levels[level] || []).some(p => !(end <= p.start || start >= p.end));
      if (!conflict) break;
      level++;
    }
    if (!levels[level]) levels[level] = [];
    levels[level].push({ start, end, task });
    placed.push({ task, level, start, end });
  });

  // Крок 2 — тепер знаємо скільки всього колонок
  const totalLevels = Math.max(1, levels.length);

  // Крок 3 — для кожної події рахуємо span (скільки вільних колонок праворуч вона може зайняти)
  const getSpan = (start, end, level) => {
    let span = 1;
    for (let next = level + 1; next < totalLevels; next++) {
      const blocked = (levels[next] || []).some(p => !(end <= p.start || start >= p.end));
      if (blocked) break;
      span++;
    }
    return span;
  };

  // Зона годинних міток займає 4.5rem зліва — решта ширини ділиться між колонками
  // Використовуємо CSS calc щоб правильно відняти ці 4.5rem
  const blocks = placed.map(({ task, level, start, end }) => {
    const top    = start * 1.2;
    const height = (end - start) * 1.2;
    const span   = getSpan(start, end, level);

    // Ширина всієї зони подій = 100% - 4.5rem - 1rem (правий відступ)
    // Ділимо її на totalLevels колонок
    const leftOffset  = `calc(4.5rem + (100% - 5.5rem) / ${totalLevels} * ${level})`;
    const blockWidth  = `calc((100% - 5.5rem) / ${totalLevels} * ${span} - 4px)`;

    let cls = 'timeline__block--event';
    let style = `top:${top}px; height:${height}px; left:${leftOffset}; width:${blockWidth}; right:auto;`;

    const cleanName = task.text.replace(' (Помодоро)', '');
    if (task.type === 'routine') {
      cls = 'timeline__block--routine';
    } else {
      style += `background-color: ${stringToColor(cleanName)};`;
      if (task.isAuto) cls = 'timeline__block--auto';
    }

    return `
      <div class="timeline__block ${cls}" style="${style}">
        <div class="timeline__block-name">${escapeHtml(cleanName)}</div>
      </div>`;
  }).join('');

  return `
    <div class="timeline" style="position: relative;">
      ${hourLines}
      ${blocks}
    </div>`;
}

// ── Events ────────────────────────────────────────────────────────
function attachEvents() {
  document.getElementById('toggleViewBtn')?.addEventListener('click', () => {
    viewMode = viewMode==='month' ? 'day' : 'month';
    localStorage.setItem('viewMode', viewMode);
    render();
  });

  // Місяць ← →
  document.getElementById('prevMonthBtn')?.addEventListener('click', () => {
    selectedMonth = Math.max(1, selectedMonth - 1);
    localStorage.setItem('selectedMonth', selectedMonth);
    render();
  });

  document.getElementById('nextMonthBtn')?.addEventListener('click', () => {
    selectedMonth = Math.min(12, selectedMonth + 1);
    localStorage.setItem('selectedMonth', selectedMonth);
    render();
  });

  document.querySelectorAll('.month-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      selectedDay = parseInt(cell.dataset.day);
      viewMode = 'day';
      localStorage.setItem('selectedDay', selectedDay);
      localStorage.setItem('viewMode', 'day');
      render();
    });
  });

  document.getElementById('prevDayBtn')?.addEventListener('click', () => {
    if (selectedDay > 1) {
      selectedDay--;
    } else if (selectedMonth > 1) {
      selectedMonth--;
      selectedDay = DAYS_IN_MONTH[selectedMonth];
    }
    localStorage.setItem('selectedDay', selectedDay);
    localStorage.setItem('selectedMonth', selectedMonth);
    render();
  });

  document.getElementById('nextDayBtn')?.addEventListener('click', () => {
    const daysInMonth = DAYS_IN_MONTH[selectedMonth];
    if (selectedDay < daysInMonth) {
      selectedDay++;
    } else if (selectedMonth < 12) {
      selectedMonth++;
      selectedDay = 1;
    }
    localStorage.setItem('selectedDay', selectedDay);
    localStorage.setItem('selectedMonth', selectedMonth);
    render();
  });

  document.getElementById('openFormBtn')?.addEventListener('click', () => {
    formState = EMPTY_FORM(); editTaskId = null; render();
  });

  document.getElementById('generateBtn')?.addEventListener('click', async () => {
    const tasks = rawTasks(selectedDay, selectedMonth);
    if (!tasks.length) return;
    const btn = document.getElementById('generateBtn');
    btn.disabled = true;
    btn.textContent = 'Генерую...';
    const result = await fetchSchedule(tasks);
    const key = `${selectedMonth}-${selectedDay}`;
    schedCache[key] = result;
    saveScheduleCache(schedCache);
    render();
  });

  document.getElementById('clearScheduleBtn')?.addEventListener('click', () => {
    const key = `${selectedMonth}-${selectedDay}`;
    delete schedCache[key];
    saveScheduleCache(schedCache);
    render();
  });

  document.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => { formState.type = btn.dataset.type; render(); });
  });
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => { formState.eventMode = btn.dataset.mode; render(); });
  });

  document.getElementById('saveTaskBtn')?.addEventListener('click', saveTask);
  document.getElementById('cancelFormBtn')?.addEventListener('click', () => {
    formState = null; editTaskId = null; render();
  });

  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => startEdit(btn.dataset.edit));
  });
  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => removeTask(btn.dataset.del));
  });
}

async function saveTask() {
  const textEl = document.getElementById('formText');
  if (!textEl) return;
  formState.text = textEl.value;

  const startEl = document.getElementById('formStart');
  const endEl   = document.getElementById('formEnd');
  const durEl   = document.getElementById('formDuration');
  const priEl   = document.getElementById('formPriority');
  const recEl   = document.getElementById('formRecurrence');

  if (startEl) formState.start = startEl.value;
  if (endEl)   formState.end   = endEl.value;
  if (durEl)   formState.duration = durEl.value;
  if (priEl)   formState.priority = priEl.value;
  if (recEl)   formState.recurrence = recEl.value;

  if (!formState.text.trim()) return;

  const showTimeInputs = formState.type==='routine' || (formState.type==='event' && formState.eventMode==='manual');
  if (showTimeInputs && formState.start && formState.end && formState.start >= formState.end) {
    alert('Помилка: Час початку має бути меншим за час кінця!');
    return;
  }

  const taskObj = {
    id:   editTaskId || Date.now().toString(),
    text: formState.text,
    type: formState.type,
  };

  if (formState.type==='routine') {
    taskObj.startTime = formState.start || undefined;
    taskObj.endTime   = formState.end   || undefined;
  } else {
    taskObj.eventMode = formState.eventMode;
    if (formState.eventMode==='auto') {
      taskObj.duration = formState.duration || 60;
      taskObj.priority = parseInt(formState.priority) || 5;
    } else {
      taskObj.startTime = formState.start || undefined;
      taskObj.endTime   = formState.end   || undefined;
    }
  }

  const updated = { ...dayTasks };
  const key = `${selectedMonth}-${selectedDay}`;

  if (editTaskId) {
    updated[key] = (updated[key]||[]).map(t => t.id===editTaskId ? taskObj : t);
    await saveAndClearCache(updated, selectedMonth, selectedDay);
  } else {
    let daysToAdd = [{month: selectedMonth, day: selectedDay}];
    if (formState.type==='routine') {
      if (formState.recurrence==='daily') {
        // Додаємо щодня до кінця року (спрощено — до кінця грудня)
        for (let m = selectedMonth; m <= 12; m++) {
          const startDay = (m === selectedMonth) ? selectedDay : 1;
          const endDay   = DAYS_IN_MONTH[m];
          for (let d = startDay; d <= endDay; d++) {
            daysToAdd.push({month: m, day: d});
          }
        }
      } else if (formState.recurrence==='weekly') {
        let d = selectedDay;
        let m = selectedMonth;
        while (m <= 12) {
          daysToAdd.push({month: m, day: d});
          d += 7;
          if (d > DAYS_IN_MONTH[m]) {
            m++;
            d = d - DAYS_IN_MONTH[m-1];
          }
        }
      }
    }

    // Зберігаємо по днях
    for (const {month, day} of daysToAdd) {
      const dayKey = `${month}-${day}`;
      const newTask = { ...taskObj, id: taskObj.id + '-' + dayKey };
      updated[dayKey] = [...(updated[dayKey]||[]), newTask];
      await apiSaveDayTasks(userName, day, month, updated[dayKey]);
    }
    dayTasks = updated;
    delete schedCache[key];
    saveScheduleCache(schedCache);
  }

  formState  = null;
  editTaskId = null;
  render();
}

function startEdit(id) {
  const task = rawTasks(selectedDay, selectedMonth).find(t => t.id===id);
  if (!task) return;
  editTaskId = id;
  formState = {
    text:       task.text,
    type:       task.type,
    eventMode:  task.eventMode || 'auto',
    start:      task.startTime || '',
    end:        task.endTime   || '',
    duration:   task.duration  || '60',
    priority:   task.priority  || '5',
    recurrence: 'none',
  };
  render();
}

async function removeTask(id) {
  const updated = { ...dayTasks };
  const key = `${selectedMonth}-${selectedDay}`;
  updated[key] = (updated[key]||[]).filter(t => t.id!==id);
  await saveAndClearCache(updated, selectedMonth, selectedDay);
  render();
}

// ── Init ──────────────────────────────────────────────────────────
loadTasks();