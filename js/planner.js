import {
  DAYS_OF_WEEK, CURRENT_MONTH,
  getDayTasks, saveDayTasks,
  getScheduleCache, saveScheduleCache,
  fetchSchedule, parseTime,
  buildSidebar, escapeHtml, ICONS, requireAuth,
  stringToColor
} from './utils.js';


// ── Auth ──────────────────────────────────────────────────────────
const userName = requireAuth();
if (!userName) throw new Error('not auth');

// ── State ─────────────────────────────────────────────────────────
let viewMode     = localStorage.getItem('viewMode') || 'day';
let selectedDay  = parseInt(localStorage.getItem('selectedDay') || '1');
let dayTasks     = getDayTasks();
let schedCache   = getScheduleCache();
let formState    = null;   // null = hidden
let editTaskId   = null;

// ── Helpers ───────────────────────────────────────────────────────
const EMPTY_FORM = () => ({
  text: '', type: 'routine', eventMode: 'auto',
  start: '', end: '', duration: '60', priority: '5', recurrence: 'none'
});

function rawTasks(day) { return dayTasks[day] || []; }
function cachedSchedule(day) { return schedCache[day] || null; }

function sortQueue(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return (parseInt(b.priority)||0) - (parseInt(a.priority)||0);
  });
}

function saveAndClearCache(updated) {
  dayTasks = updated;
  saveDayTasks(updated);
  delete schedCache[selectedDay];
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
  let cells = '';
  for (let day = 1; day <= 31; day++) {
    const sched = cachedSchedule(day);
    const raw   = rawTasks(day);
    const tasks = sched
      ? [...sched].sort((a,b)=>(a.startTime||'99:99').localeCompare(b.startTime||'99:99'))
      : sortQueue(raw);
    cells += buildMonthCell(day, tasks);
  }
  return `
    <div class="main-content">
      <h2 style="color:white;font-size:1.25rem;margin-bottom:1rem">${CURRENT_MONTH}</h2>
      <div class="month-grid">${cells}</div>
    </div>`;
}

function buildMonthCell(day, tasks) {
  const chips = tasks.slice(0,4).map(t => {
    let cls = 'month-chip--event';
    let style = '';
    
    // Очищаємо назву для місячного вигляду
    const cleanName = t.text.replace(' (Помодоро)', '');
    
    if (t.type === 'routine') {
      cls = 'month-chip--routine';
    } else {
      if (t.isAuto) cls = 'month-chip--auto';
      style = `background-color: ${stringToColor(cleanName)}; border: none;`;
    }
    
    const timeLabel = t.startTime ? t.startTime : (t.priority ? `★${t.priority}` : '');
    
    // Використовуємо cleanName у підказці (title) та тексті (span)
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
  const dayName   = DAYS_OF_WEEK[(selectedDay-1) % 7];
  const isGenerated = !!cachedSchedule(selectedDay);
  const displayTasks = isGenerated
    ? [...cachedSchedule(selectedDay)].sort((a,b)=>(a.startTime||'99:99').localeCompare(b.startTime||'99:99'))
    : sortQueue(rawTasks(selectedDay));

  return `
    <div class="main-content">
      <div class="day-nav">
        <button class="btn btn--gray btn--sm" id="prevDayBtn">←</button>
        <h2 class="day-nav__title">${selectedDay} ${CURRENT_MONTH}, ${dayName}</h2>
        <button class="btn btn--gray btn--sm" id="nextDayBtn">→</button>
      </div>

      <div class="panel">
        <!-- Controls -->
        <div class="controls-row" id="controlsRow">
          ${buildControls(isGenerated)}
        </div>

        <!-- Form -->
        ${formState ? buildForm() : ''}

        <!-- List header -->
        <h3 class="panel__header">
          ${isGenerated ? 'Ваш розклад' : 'Черга завдань'}
        </h3>

        <!-- Content -->
        ${isGenerated ? buildTimeline(displayTasks) : buildQueue(displayTasks)}
      </div>
    </div>`;
}

function buildControls(isGenerated) {
  if (formState) return '';
  if (isGenerated) {
    return `<button class="btn btn--amber" id="clearScheduleBtn">Змінити список завдань</button>`;
  }
  const hasTasks = rawTasks(selectedDay).length > 0;
  return `
    <button class="btn btn--blue" id="openFormBtn">+ Додати подію або рутину</button>
    ${hasTasks ? `<button class="btn btn--green" id="generateBtn">Згенерувати розклад</button>` : ''}
  `;
}

function buildForm() {
  const f = formState;
  const showTimeInputs = f.type==='routine' || (f.type==='event' && f.eventMode==='manual');

  return `
    <div class="form-card">
      <!-- Type tabs -->
      <div class="tab-group">
        <button class="tab-btn ${f.type==='routine' ? 'tab-btn--gray' : 'tab-btn--inactive'}" data-type="routine">Рутина (сталий час)</button>
        <button class="tab-btn ${f.type==='event'   ? 'tab-btn--blue' : 'tab-btn--inactive'}" data-type="event">Подія (гнучка)</button>
      </div>

      <!-- Name -->
      <input id="formText" class="form-input form-input--full" type="text"
             placeholder="Назва..." value="${escapeHtml(f.text)}"/>

      <!-- Event mode -->
      ${f.type==='event' ? `
        <div class="tab-group" style="margin-bottom:1rem">
          <button class="tab-btn-outline ${f.eventMode==='auto'   ? 'tab-btn-outline--active':'tab-btn-outline--inactive'}" data-mode="auto">Автопідбір</button>
          <button class="tab-btn-outline ${f.eventMode==='manual' ? 'tab-btn-outline--active':'tab-btn-outline--inactive'}" data-mode="manual">Вказати час вручну</button>
        </div>` : ''}

      <!-- Time inputs or duration/priority -->
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

      <!-- Recurrence (routine only, not editing) -->
      ${(f.type==='routine' && !editTaskId) ? `
        <div class="form-group" style="margin-bottom:1rem">
          <label class="form-label">Повторюваність</label>
          <select id="formRecurrence" class="form-input">
            <option value="none"   ${f.recurrence==='none'   ?'selected':''}>Тільки сьогодні</option>
            <option value="daily"  ${f.recurrence==='daily'  ?'selected':''}>Щодня</option>
            <option value="weekly" ${f.recurrence==='weekly' ?'selected':''}>Щотижня в цей день</option>
          </select>
        </div>` : ''}

      <!-- Actions -->
      <div class="form-row">
        <button class="btn btn--green btn--full" id="saveTaskBtn">${editTaskId ? 'Оновити' : 'Зберегти'}</button>
        <button class="btn btn--red   btn--full" id="cancelFormBtn">Скасувати</button>
      </div>
    </div>`;
}

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
            <div class="task-meta task-meta--priority" style="color:#fff;opacity:0.9">★ Пріоритет: ${task.priority} | ⏱ ${task.duration} хв</div>` : ''}
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

function buildTimeline(tasks) {
  const hourLines = Array.from({length:25},(_,i)=>`
    <div class="timeline__hour-line" style="top:${i*60*1.2}px">
      <span class="timeline__hour-label">${i.toString().padStart(2,'0')}:00</span>
    </div>`).join('');

  const blocks = tasks.map(task => {
    if (!task.startTime || !task.endTime) return '';
    const startMins = parseTime(task.startTime);
    const endMins   = parseTime(task.endTime);
    const top    = startMins * 1.2;
    const height = (endMins - startMins) * 1.2;
    
    let cls = 'timeline__block--event';
    let style = `top:${top}px;height:${height}px;`;
    
    // Очищаємо назву від "(Помодоро)" і для кольору, і для тексту
    const cleanName = task.text.replace(' (Помодоро)', '');
    
    if (task.type === 'routine') {
        cls = 'timeline__block--routine';
    } else {
        style += `background-color: ${stringToColor(cleanName)};`;
        if (task.isAuto) cls = 'timeline__block--auto';
    }
    
    // Тепер виводимо cleanName замість task.text
    return `
      <div class="timeline__block ${cls}" style="${style}">
        <div class="timeline__block-name">${escapeHtml(cleanName)}</div>
      </div>`;
  }).join('');

  return `<div class="timeline">${hourLines}${blocks}</div>`;
}

// ── Events ────────────────────────────────────────────────────────
function attachEvents() {
  // Sidebar toggle view
  const toggleBtn = document.getElementById('toggleViewBtn');
  if (toggleBtn) toggleBtn.addEventListener('click', () => {
    viewMode = viewMode==='month' ? 'day' : 'month';
    localStorage.setItem('viewMode', viewMode);
    render();
  });

  // Month cell click
  document.querySelectorAll('.month-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      selectedDay = parseInt(cell.dataset.day);
      viewMode = 'day';
      localStorage.setItem('selectedDay', selectedDay);
      localStorage.setItem('viewMode', 'day');
      render();
    });
  });

  // Day nav
  const prevBtn = document.getElementById('prevDayBtn');
  const nextBtn = document.getElementById('nextDayBtn');
  if (prevBtn) prevBtn.addEventListener('click', () => { selectedDay = Math.max(1, selectedDay-1); localStorage.setItem('selectedDay', selectedDay); render(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { selectedDay = Math.min(31, selectedDay+1); localStorage.setItem('selectedDay', selectedDay); render(); });

  // Open form
  const openFormBtn = document.getElementById('openFormBtn');
  if (openFormBtn) openFormBtn.addEventListener('click', () => { formState = EMPTY_FORM(); editTaskId = null; render(); });

  // Generate schedule
  const generateBtn = document.getElementById('generateBtn');
  if (generateBtn) generateBtn.addEventListener('click', async () => {
    const tasks = rawTasks(selectedDay);
    if (!tasks.length) return;
    generateBtn.disabled = true;
    generateBtn.textContent = '⏳ Генерую...';
    const result = await fetchSchedule(tasks);
    schedCache[selectedDay] = result;
    saveScheduleCache(schedCache);
    render();
  });

  // Clear schedule
  const clearBtn = document.getElementById('clearScheduleBtn');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    delete schedCache[selectedDay];
    saveScheduleCache(schedCache);
    render();
  });

  // Form type tabs
  document.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => { formState.type = btn.dataset.type; render(); });
  });

  // Form mode tabs
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => { formState.eventMode = btn.dataset.mode; render(); });
  });

  // Save task
  const saveBtn = document.getElementById('saveTaskBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveTask);

  // Cancel form
  const cancelBtn = document.getElementById('cancelFormBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => { formState = null; editTaskId = null; render(); });

  // Edit / Delete buttons
  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => startEdit(btn.dataset.edit));
  });
  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => removeTask(btn.dataset.del));
  });
}

function saveTask() {
  // Collect current form values
  const textEl  = document.getElementById('formText');
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
    id: editTaskId || Date.now().toString(),
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

  if (editTaskId) {
    updated[selectedDay] = (updated[selectedDay]||[]).map(t => t.id===editTaskId ? taskObj : t);
  } else {
    let daysToAdd = [selectedDay];
    if (formState.type==='routine') {
      if (formState.recurrence==='daily') {
        daysToAdd = Array.from({length: 31-selectedDay+1}, (_,i)=>selectedDay+i);
      } else if (formState.recurrence==='weekly') {
        daysToAdd = [];
        for (let d=selectedDay; d<=31; d+=7) daysToAdd.push(d);
      }
    }
    daysToAdd.forEach(d => {
      updated[d] = [...(updated[d]||[]), { ...taskObj, id: taskObj.id+'-'+d }];
    });
  }

  saveAndClearCache(updated);
  formState  = null;
  editTaskId = null;
  render();
}

function startEdit(id) {
  const task = rawTasks(selectedDay).find(t => t.id===id);
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

function removeTask(id) {
  const updated = { ...dayTasks };
  updated[selectedDay] = (updated[selectedDay]||[]).filter(t => t.id!==id);
  saveAndClearCache(updated);
  render();
}

// ── Init ──────────────────────────────────────────────────────────
render();