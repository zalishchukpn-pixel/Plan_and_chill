// ===== planner.js =====
import {
  redirectIfNotLoggedIn, getUserName, buildSidebar,
  fetchAllTasks, saveTasksForDay, generatePlan,
  genId, priorityColor, minsToTime, timeToMins
} from "./utils.js";

redirectIfNotLoggedIn();

const userName = getUserName();
const app = document.getElementById("app");

// State
let allTasks = {};         // { "2026-03-05": [...], "2026-03-28": [...] }
let currentDay = new Date().getDate();
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let viewMode = "day";      // "day" | "month"
let schedule = [];
let pomodoroWork  = parseInt(localStorage.getItem("pomo_work")  || "25");
let pomodoroBreak = parseInt(localStorage.getItem("pomo_break") || "5");

// ---- Helpers ----
function dayKey(day, month, year) {
  return `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

function currentKey() {
  return dayKey(currentDay, currentMonth, currentYear);
}

// ---- Bootstrap ----
(async () => {
  allTasks = await fetchAllTasks(userName);
  render();
})();

// ---- Render root ----
function render() {
  window.__sidebarViewChange = (mode) => { viewMode = mode; schedule = []; render(); };
  app.innerHTML = buildSidebar("planner", viewMode) + `<div class="main-content" id="mainContent"></div>`;
  const sidebarDay = document.getElementById("sidebarDayBtn");
  const sidebarMonth = document.getElementById("sidebarMonthBtn");
  if (sidebarDay) sidebarDay.onclick = () => { viewMode = "day"; schedule = []; render(); };
  if (sidebarMonth) sidebarMonth.onclick = () => { viewMode = "month"; schedule = []; render(); };
  const main = document.getElementById("mainContent");
  viewMode === "day" ? renderDayView(main) : renderMonthView(main);
}

// ============================================================
// DAY VIEW
// ============================================================
function renderDayView(container) {
  const key = currentKey();
  const tasks = allTasks[key] || [];
  const today = new Date();
  const isToday = currentDay === today.getDate() &&
                  currentMonth === today.getMonth() &&
                  currentYear === today.getFullYear();

  container.innerHTML = `
    <div class="day-nav">
      <button class="btn btn--gray btn--icon" id="prevDay">&#8592;</button>
      <h2 class="day-nav__title">${currentDay} ${monthName(currentMonth)} ${currentYear}</h2>
      <button class="btn btn--gray btn--icon" id="nextDay">&#8594;</button>
    </div>

    <div class="controls-row">
      <button class="btn btn--blue" id="addTaskBtn">+ Додати подію або рутину</button>
      <button class="btn btn--amber" id="genBtn">Згенерувати розклад</button>
      ${schedule.length ? `<button class="btn btn--gray btn--sm" id="clearSched">Змінити список завдань</button>` : ""}
    </div>

    <div id="taskFormArea"></div>

    ${schedule.length ? renderTimeline(schedule) : renderTaskList(tasks)}
  `;

  document.getElementById("prevDay").onclick = () => changeDay(-1);
  document.getElementById("nextDay").onclick = () => changeDay(1);
  document.getElementById("addTaskBtn").onclick = () => showTaskForm(tasks);
  document.getElementById("genBtn").onclick = async () => {
    const res = await generatePlan(tasks, pomodoroWork, pomodoroBreak, isToday);
    schedule = res.schedule || [];
    render();
  };
  const clrBtn = document.getElementById("clearSched");
  if (clrBtn) clrBtn.onclick = () => { schedule = []; render(); };

  container.querySelectorAll(".task-delete-btn").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const key = currentKey();
      allTasks[key] = (allTasks[key] || []).filter(t => t.id !== id);
      await saveTasksForDay(userName, key, allTasks[key] || []);
      schedule = [];
      render();
    };
  });
}

function renderTaskList(tasks) {
  if (!tasks.length) return `<p class="empty-state">Немає задач на цей день. Додай першу!</p>`;
  return `<div id="taskList">${tasks.map(t => taskCard(t)).join("")}</div>`;
}

function taskCard(t) {
  const color = t.type === "routine" ? "var(--gray-badge)" : priorityColor(t.priority);
  const meta  = t.type === "routine"
    ? `${minsToTime(t.startTime || 0)} — ${minsToTime(t.endTime || 0)}`
    : `Тривалість: ${t.duration || 60} хв · Пріоритет: ${t.priority || 5}`;
  return `
    <div class="task-item ${t.type==='routine'?'task-item--routine':''}" style="--task-color:${color}">
      <div>
        <span class="task-badge">${t.type === "routine" ? "рутина" : "подія"}</span>
        <span class="task-name">${t.text}</span>
        <div class="task-meta">${meta}</div>
      </div>
      <div class="task-actions">
        <button class="btn btn--red btn--sm task-delete-btn" data-id="${t.id}">Видалити</button>
      </div>
    </div>`;
}

// ---- Timeline з підтримкою накладання (колонки) ----
function renderTimeline(sched) {
  const PX_PER_MIN = 1;

  // Визначаємо колонки для елементів що накладаються
  const items = sched.map(item => ({
    ...item,
    startMins: timeToMins(item.startTime),
    endMins:   timeToMins(item.endTime),
    col: 0,
    totalCols: 1,
  }));

  // Групуємо накладання
  for (let i = 0; i < items.length; i++) {
    const usedCols = new Set();
    for (let j = 0; j < i; j++) {
      if (items[j].endMins > items[i].startMins && items[j].startMins < items[i].endMins) {
        usedCols.add(items[j].col);
      }
    }
    let col = 0;
    while (usedCols.has(col)) col++;
    items[i].col = col;
  }

  // Визначаємо totalCols для кожного елементу в групі
  for (let i = 0; i < items.length; i++) {
    let maxCol = items[i].col;
    for (let j = 0; j < items.length; j++) {
      if (j !== i && items[j].endMins > items[i].startMins && items[j].startMins < items[i].endMins) {
        if (items[j].col > maxCol) maxCol = items[j].col;
      }
    }
    items[i].totalCols = maxCol + 1;
  }

  const LABEL_WIDTH = 48; // px для годинних міток

  const blocks = items.map(item => {
    const top    = item.startMins * PX_PER_MIN;
    const height = Math.max((item.endMins - item.startMins) * PX_PER_MIN, 20);
    const cls    = item.type === "routine" ? "timeline__block--routine"
                 : item.isAuto ? "timeline__block--auto"
                 : "timeline__block--event";
    const colW   = `calc((100% - ${LABEL_WIDTH}px) / ${item.totalCols})`;
    const left   = `calc(${LABEL_WIDTH}px + ${item.col} * (100% - ${LABEL_WIDTH}px) / ${item.totalCols})`;
    return `
      <div class="timeline__block ${cls}" style="top:${top}px;height:${height}px;width:${colW};left:${left};position:absolute">
        <div class="timeline__block-time">${item.startTime} — ${item.endTime}</div>
        <div class="timeline__block-name">${item.text}</div>
      </div>`;
  }).join("");

  const hourLines = Array.from({length:25},(_,i)=>`
    <div class="timeline__hour-line" style="top:${i*60}px">
      <span class="timeline__hour-label">${String(i).padStart(2,"0")}:00</span>
    </div>`).join("");

  return `<div class="timeline" style="height:1440px;position:relative">${hourLines}${blocks}</div>`;
}

// ---- Add task form ----
function showTaskForm(existingTasks) {
  const area = document.getElementById("taskFormArea");
  area.innerHTML = `
    <div class="form-card">
      <div class="tab-group">
        <button class="tab-btn tab-btn--blue" id="tabEvent">Подія</button>
        <button class="tab-btn tab-btn--inactive" id="tabRoutine">Рутина</button>
      </div>
      <div id="formFields"></div>
    </div>`;

  let taskType = "event";
  renderFormFields(taskType);

  document.getElementById("tabEvent").onclick   = () => { taskType = "event";   renderFormFields(taskType); };
  document.getElementById("tabRoutine").onclick = () => { taskType = "routine"; renderFormFields(taskType); };

  function renderFormFields(type) {
    const f = document.getElementById("formFields");
    if (type === "routine") {
      f.innerHTML = `
        <input class="form-input form-input--full" id="fText" placeholder="Назва рутини" />
        <div class="form-row">
          <div class="form-group"><label class="form-label">Початок</label>
            <input type="time" class="form-input" id="fStart" value="08:00"/></div>
          <div class="form-group"><label class="form-label">Кінець</label>
            <input type="time" class="form-input" id="fEnd" value="09:00"/></div>
        </div>
        <div class="controls-row">
          <button class="btn btn--green" id="fSave">Зберегти</button>
          <button class="btn btn--gray" id="fCancel">Скасувати</button>
        </div>`;
    } else {
      f.innerHTML = `
        <input class="form-input form-input--full" id="fText" placeholder="Назва події" />
        <div class="form-row">
          <div class="form-group"><label class="form-label">Тривалість (хв)</label>
            <input type="number" class="form-input" id="fDuration" value="60" min="5"/></div>
          <div class="form-group"><label class="form-label">Пріоритет (1–5)</label>
            <input type="number" class="form-input" id="fPriority" value="3" min="1" max="5"/></div>
        </div>
        <div class="tab-group" id="modeGroup">
          <button class="tab-btn-outline tab-btn-outline--active" id="modeAuto">Автопідбір</button>
          <button class="tab-btn-outline tab-btn-outline--inactive" id="modeManual">Вручну</button>
        </div>
        <div id="manualTimeFields" style="display:none" class="form-row">
          <div class="form-group"><label class="form-label">Початок</label>
            <input type="time" class="form-input" id="fStart" value="10:00"/></div>
          <div class="form-group"><label class="form-label">Кінець</label>
            <input type="time" class="form-input" id="fEnd" value="11:00"/></div>
        </div>
        <div class="controls-row">
          <button class="btn btn--green" id="fSave">Зберегти</button>
          <button class="btn btn--gray" id="fCancel">Скасувати</button>
        </div>`;

      let eventMode = "auto";
      document.getElementById("modeAuto").onclick = () => {
        eventMode = "auto";
        document.getElementById("manualTimeFields").style.display = "none";
        document.getElementById("modeAuto").classList.replace("tab-btn-outline--inactive","tab-btn-outline--active");
        document.getElementById("modeManual").classList.replace("tab-btn-outline--active","tab-btn-outline--inactive");
      };
      document.getElementById("modeManual").onclick = () => {
        eventMode = "manual";
        document.getElementById("manualTimeFields").style.display = "flex";
        document.getElementById("modeManual").classList.replace("tab-btn-outline--inactive","tab-btn-outline--active");
        document.getElementById("modeAuto").classList.replace("tab-btn-outline--active","tab-btn-outline--inactive");
      };

      document.getElementById("fSave").onclick = async () => {
        const text = document.getElementById("fText").value.trim();
        if (!text) return;
        const task = {
          id: genId(), text, type: "event",
          duration: parseInt(document.getElementById("fDuration").value) || 60,
          priority: parseInt(document.getElementById("fPriority").value) || 3,
          eventMode,
        };
        if (eventMode === "manual") {
          task.startTime = timeToMins(document.getElementById("fStart").value);
          task.endTime   = timeToMins(document.getElementById("fEnd").value);
        }
        const key = currentKey();
        existingTasks.push(task);
        allTasks[key] = existingTasks;
        await saveTasksForDay(userName, key, existingTasks);
        schedule = [];
        render();
      };
      document.getElementById("fCancel").onclick = () => { area.innerHTML = ""; };
      return;
    }

    // Routine save
    document.getElementById("fSave").onclick = async () => {
      const text = document.getElementById("fText").value.trim();
      if (!text) return;
      const task = {
        id: genId(), text, type: "routine",
        startTime: timeToMins(document.getElementById("fStart").value),
        endTime:   timeToMins(document.getElementById("fEnd").value),
      };
      const key = currentKey();
      existingTasks.push(task);
      allTasks[key] = existingTasks;
      await saveTasksForDay(userName, key, existingTasks);
      schedule = [];
      render();
    };
    document.getElementById("fCancel").onclick = () => { area.innerHTML = ""; };
  }
}

// ============================================================
// MONTH VIEW
// ============================================================
function renderMonthView(container) {
  const weekdays = ["Пн","Вт","Ср","Чт","Пт","Сб","Нд"];
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const offset   = (firstDay + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(`<div class="month-cell--empty"></div>`);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dayKey(d, currentMonth, currentYear);
    const tasks = allTasks[key] || [];
    const chips = tasks.slice(0,3).map(t =>
      `<div class="month-chip ${t.type==='routine'?'month-chip--routine':'month-chip--event'}">${t.text}</div>`
    ).join("");
    const more = tasks.length > 3 ? `<div class="month-more">+${tasks.length-3}</div>` : "";
    cells.push(`
      <button class="month-cell" data-day="${d}">
        <div class="month-cell__day">${d}</div>
        ${chips}${more}
      </button>`);
  }

  container.innerHTML = `
    <div class="month-nav">
      <button class="btn btn--gray btn--icon" id="prevMonth">&#8592;</button>
      <h2 class="day-nav__title" style="margin:0 1rem">${monthName(currentMonth)} ${currentYear}</h2>
      <button class="btn btn--gray btn--icon" id="nextMonth">&#8594;</button>
    </div>
    <div class="month-weekdays">${weekdays.map(w=>`<div class="month-weekday-header">${w}</div>`).join("")}</div>
    <div class="month-grid">${cells.join("")}</div>`;

  document.getElementById("prevMonth").onclick = () => {
    currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } render();
  };
  document.getElementById("nextMonth").onclick = () => {
    currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } render();
  };

  container.querySelectorAll(".month-cell").forEach(btn => {
    btn.onclick = () => {
      currentDay = parseInt(btn.dataset.day);
      viewMode = "day";
      schedule = [];
      render();
    };
  });
}

// ---- Helpers ----
function changeDay(delta) {
  const d = new Date(currentYear, currentMonth, currentDay + delta);
  currentDay   = d.getDate();
  currentMonth = d.getMonth();
  currentYear  = d.getFullYear();
  schedule = [];
  render();
}

function monthName(m) {
  return ["Січень","Лютий","Березень","Квітень","Травень","Червень",
          "Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"][m];
}
