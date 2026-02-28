// ===== planner.js =====
import {
  redirectIfNotLoggedIn, getUserName, buildSidebar,
  fetchAllTasks, saveTasksForDay, generatePlan,
  genId, eventColor, minsToTime, timeToMins,
  getRecurringRoutines, saveRecurringRoutines
} from "./utils.js";

redirectIfNotLoggedIn();

const userName = getUserName();
const app = document.getElementById("app");

let allTasks = {};
let currentDay = new Date().getDate();
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let viewMode = "day";       // "day" | "month"
let dayMode = "schedule";   // "schedule" | "edit"
let schedule = [];
let pomodoroWork  = parseInt(localStorage.getItem("pomo_work")  || "25");
let pomodoroBreak = parseInt(localStorage.getItem("pomo_break") || "5");

function dayKey(day, month, year) {
  return `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}
function currentKey() { return dayKey(currentDay, currentMonth, currentYear); }

function getTasksForCurrentDay() {
  const key = currentKey();
  const stored = allTasks[key] || [];
  const recurring = getRecurringRoutines(userName);
  const dow = new Date(currentYear, currentMonth, currentDay).getDay();
  const toAdd = recurring
    .filter(r => r.repeatDays?.includes(dow) && !stored.some(t => t.routineId === r.id))
    .map(r => ({ id: genId(), routineId: r.id, text: r.text, type: "routine", startTime: r.startTime, endTime: r.endTime, isRecurring: true }));
  return [...stored, ...toAdd];
}

async function regenerateSchedule() {
  const tasks = getTasksForCurrentDay();
  if (!tasks.length) { schedule = []; return; }
  const today = new Date();
  const isToday = currentDay===today.getDate() && currentMonth===today.getMonth() && currentYear===today.getFullYear();
  const res = await generatePlan(tasks, pomodoroWork, pomodoroBreak, isToday);
  schedule = res.schedule || [];
}

// ---- Bootstrap ----
(async () => {
  allTasks = await fetchAllTasks(userName);
  await regenerateSchedule();
  render();
})();

// ---- Render ----
function render() {
  app.innerHTML = buildSidebar("planner", viewMode) + `<div class="main-content" id="mainContent"></div>`;
  document.getElementById("sidebarDayBtn")?.addEventListener("click", () => { viewMode="day"; render(); });
  document.getElementById("sidebarMonthBtn")?.addEventListener("click", () => { viewMode="month"; render(); });
  viewMode === "day" ? renderDayView(document.getElementById("mainContent")) : renderMonthView(document.getElementById("mainContent"));
}

// ============================================================
// DAY VIEW
// ============================================================
function renderDayView(container) {
  container.innerHTML = `
    <div class="day-nav">
      <button class="btn btn--gray btn--icon" id="prevDay">&#8592;</button>
      <h2 class="day-nav__title">${currentDay} ${monthName(currentMonth)} ${currentYear}</h2>
      <button class="btn btn--gray btn--icon" id="nextDay">&#8594;</button>
    </div>

    <div class="mode-toggle-row">
      <button class="mode-btn ${dayMode==='schedule'?'mode-btn--active':''}" id="modeScheduleBtn">Розклад</button>
      <button class="mode-btn ${dayMode==='edit'?'mode-btn--active':''}" id="modeEditBtn">Редагувати</button>
    </div>

    <div id="dayContent"></div>`;

  document.getElementById("prevDay").onclick = async () => {
    const d = new Date(currentYear, currentMonth, currentDay - 1);
    currentDay=d.getDate(); currentMonth=d.getMonth(); currentYear=d.getFullYear();
    await regenerateSchedule(); render();
  };
  document.getElementById("nextDay").onclick = async () => {
    const d = new Date(currentYear, currentMonth, currentDay + 1);
    currentDay=d.getDate(); currentMonth=d.getMonth(); currentYear=d.getFullYear();
    await regenerateSchedule(); render();
  };

  document.getElementById("modeScheduleBtn").onclick = () => { dayMode="schedule"; renderDayContent(); };
  document.getElementById("modeEditBtn").onclick     = () => { dayMode="edit";     renderDayContent(); };

  renderDayContent();
}

function renderDayContent() {
  const container = document.getElementById("dayContent");
  dayMode === "schedule" ? renderScheduleMode(container) : renderEditMode(container);
}

// ---- РОЗКЛАД ----
function renderScheduleMode(container) {
  if (!schedule.length) {
    container.innerHTML = `<p class="empty-state">Немає розкладу. Перейди в <strong>Редагувати</strong> щоб додати події.</p>`;
    return;
  }
  container.innerHTML = renderTimeline(schedule);
}

// ---- РЕДАГУВАТИ ----
function renderEditMode(container) {
  const tasks = getTasksForCurrentDay();
  container.innerHTML = `
    <div class="edit-top-row">
      <button class="btn btn--blue" id="addTaskBtn">+ Додати подію або рутину</button>
      <button class="btn btn--gray" id="showScheduleBtn">Показати розклад</button>
    </div>
    <div id="taskFormArea"></div>
    ${renderTaskList(tasks)}`;

  document.getElementById("addTaskBtn").onclick = () => showTaskForm(getTasksForCurrentDay());
  document.getElementById("showScheduleBtn").onclick = () => { dayMode="schedule"; renderDayContent(); };

  container.querySelectorAll(".task-delete-btn").forEach(btn => {
    btn.onclick = async () => {
      const { id, recurring, routineId } = btn.dataset;
      if (recurring === "true" && routineId) {
        saveRecurringRoutines(userName, getRecurringRoutines(userName).filter(r => r.id !== routineId));
      } else {
        const key = currentKey();
        allTasks[key] = (allTasks[key] || []).filter(t => t.id !== id);
        await saveTasksForDay(userName, key, allTasks[key]);
      }
      await regenerateSchedule();
      renderEditMode(document.getElementById("dayContent"));
    };
  });
}

function renderTaskList(tasks) {
  if (!tasks.length) return `<p class="empty-state">Немає задач. Натисни "+ Додати".</p>`;
  return `<div class="task-list">${tasks.map(taskCard).join("")}</div>`;
}

function taskCard(t) {
  const bg  = t.type === "routine" ? "#6b7280" : eventColor(t.text);
  const clr = t.type === "routine" ? "#fff" : "#1a1a1a";
  const meta = t.type === "routine"
    ? `${minsToTime(t.startTime||0)} — ${minsToTime(t.endTime||0)}${t.isRecurring?" · щотижня":""}`
    : `${t.duration||60} хв · пріоритет ${t.priority||3}`;
  return `
    <div class="task-item" style="background:${bg};color:${clr}">
      <div class="task-item__info">
        <span class="task-badge" style="color:${clr}">${t.type==="routine"?(t.isRecurring?"щотижня":"рутина"):"подія"}</span>
        <span class="task-name">${t.text}</span>
        <div class="task-meta" style="opacity:0.7">${meta}</div>
      </div>
      <button class="task-delete-btn"
        style="background:rgba(0,0,0,0.12);color:${clr};border:none;padding:0.35rem 0.75rem;border-radius:6px;cursor:pointer;font-size:0.8rem;white-space:nowrap"
        data-id="${t.id}"
        data-recurring="${t.isRecurring||false}"
        data-routine-id="${t.routineId||""}"
      >Видалити</button>
    </div>`;
}

// ---- Timeline ----
function renderTimeline(sched) {
  const items = sched.map(item => ({
    ...item,
    startMins: timeToMins(item.startTime),
    endMins:   timeToMins(item.endTime),
    col: 0, totalCols: 1,
  }));
  for (let i = 0; i < items.length; i++) {
    const used = new Set();
    for (let j = 0; j < i; j++)
      if (items[j].endMins > items[i].startMins && items[j].startMins < items[i].endMins) used.add(items[j].col);
    let col = 0; while (used.has(col)) col++;
    items[i].col = col;
  }
  for (let i = 0; i < items.length; i++) {
    let max = items[i].col;
    for (let j = 0; j < items.length; j++)
      if (j!==i && items[j].endMins>items[i].startMins && items[j].startMins<items[i].endMins && items[j].col>max) max=items[j].col;
    items[i].totalCols = max + 1;
  }
  const LW = 48;
  const blocks = items.map(item => {
    const top    = item.startMins;
    const height = Math.max(item.endMins - item.startMins, 20);
    const bg     = item.type==="routine" ? "#6b7280" : eventColor(item.text);
    const clr    = item.type==="routine" ? "#fff" : "#1a1a1a";
    const w      = `calc((100% - ${LW}px) / ${item.totalCols})`;
    const left   = `calc(${LW}px + ${item.col} * (100% - ${LW}px) / ${item.totalCols})`;
    return `<div class="timeline__block" style="top:${top}px;height:${height}px;width:${w};left:${left};background:${bg};color:${clr}">
      <div class="timeline__block-time">${item.startTime} — ${item.endTime}</div>
      <div class="timeline__block-name">${item.text}</div>
    </div>`;
  }).join("");
  const hours = Array.from({length:25},(_,i)=>`
    <div class="timeline__hour-line" style="top:${i*60}px">
      <span class="timeline__hour-label">${String(i).padStart(2,"0")}:00</span>
    </div>`).join("");
  return `<div class="timeline" style="height:1440px;position:relative">${hours}${blocks}</div>`;
}

// ---- Форма додавання ----
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
  renderFields(taskType);
  document.getElementById("tabEvent").onclick   = () => { taskType="event";   renderFields(taskType); };
  document.getElementById("tabRoutine").onclick = () => { taskType="routine"; renderFields(taskType); };

  function renderFields(type) {
    const f = document.getElementById("formFields");
    if (type === "routine") {
      f.innerHTML = `
        <input class="form-input form-input--full" id="fText" placeholder="Назва рутини"/>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Початок</label><input type="time" class="form-input" id="fStart" value="08:00"/></div>
          <div class="form-group"><label class="form-label">Кінець</label><input type="time" class="form-input" id="fEnd" value="09:00"/></div>
        </div>
        <div class="repeat-section">
          <label class="form-label" style="display:block;margin-bottom:0.5rem">Повторювати щотижня</label>
          <div class="weekday-picker">
            ${["Нд","Пн","Вт","Ср","Чт","Пт","Сб"].map((d,i)=>`<label class="weekday-chip"><input type="checkbox" class="weekday-cb" value="${i}"/><span>${d}</span></label>`).join("")}
          </div>
          <p class="repeat-hint">Без вибору — лише на цей день</p>
        </div>
        <div class="controls-row" style="margin-top:1rem">
          <button class="btn btn--green" id="fSave">Зберегти</button>
          <button class="btn btn--gray" id="fCancel">Скасувати</button>
        </div>`;
      document.getElementById("fSave").onclick = async () => {
        const text = document.getElementById("fText").value.trim(); if (!text) return;
        const startTime = timeToMins(document.getElementById("fStart").value);
        const endTime   = timeToMins(document.getElementById("fEnd").value);
        const days = [...document.querySelectorAll(".weekday-cb:checked")].map(c=>parseInt(c.value));
        if (days.length) {
          const recs = getRecurringRoutines(userName);
          recs.push({ id: genId(), text, startTime, endTime, repeatDays: days });
          saveRecurringRoutines(userName, recs);
        } else {
          const key = currentKey();
          existingTasks.push({ id: genId(), text, type: "routine", startTime, endTime });
          allTasks[key] = existingTasks;
          await saveTasksForDay(userName, key, existingTasks);
        }
        await regenerateSchedule();
        renderEditMode(document.getElementById("dayContent"));
      };
      document.getElementById("fCancel").onclick = () => { area.innerHTML=""; };
    } else {
      f.innerHTML = `
        <input class="form-input form-input--full" id="fText" placeholder="Назва події"/>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Тривалість (хв)</label><input type="number" class="form-input" id="fDuration" value="60" min="5"/></div>
          <div class="form-group"><label class="form-label">Пріоритет (1–5)</label><input type="number" class="form-input" id="fPriority" value="3" min="1" max="5"/></div>
        </div>
        <div class="tab-group">
          <button class="tab-btn-outline tab-btn-outline--active" id="modeAuto">Автопідбір</button>
          <button class="tab-btn-outline tab-btn-outline--inactive" id="modeManual">Вручну</button>
        </div>
        <div id="manualTimeFields" style="display:none" class="form-row">
          <div class="form-group"><label class="form-label">Початок</label><input type="time" class="form-input" id="fStart" value="10:00"/></div>
          <div class="form-group"><label class="form-label">Кінець</label><input type="time" class="form-input" id="fEnd" value="11:00"/></div>
        </div>
        <div class="controls-row">
          <button class="btn btn--green" id="fSave">Зберегти</button>
          <button class="btn btn--gray" id="fCancel">Скасувати</button>
        </div>`;
      let mode = "auto";
      document.getElementById("modeAuto").onclick = () => {
        mode="auto"; document.getElementById("manualTimeFields").style.display="none";
        document.getElementById("modeAuto").classList.replace("tab-btn-outline--inactive","tab-btn-outline--active");
        document.getElementById("modeManual").classList.replace("tab-btn-outline--active","tab-btn-outline--inactive");
      };
      document.getElementById("modeManual").onclick = () => {
        mode="manual"; document.getElementById("manualTimeFields").style.display="flex";
        document.getElementById("modeManual").classList.replace("tab-btn-outline--inactive","tab-btn-outline--active");
        document.getElementById("modeAuto").classList.replace("tab-btn-outline--active","tab-btn-outline--inactive");
      };
      document.getElementById("fSave").onclick = async () => {
        const text = document.getElementById("fText").value.trim(); if (!text) return;
        const task = { id: genId(), text, type:"event",
          duration: parseInt(document.getElementById("fDuration").value)||60,
          priority: parseInt(document.getElementById("fPriority").value)||3,
          eventMode: mode };
        if (mode==="manual") {
          task.startTime = timeToMins(document.getElementById("fStart").value);
          task.endTime   = timeToMins(document.getElementById("fEnd").value);
        }
        const key = currentKey();
        existingTasks.push(task);
        allTasks[key] = existingTasks;
        await saveTasksForDay(userName, key, existingTasks);
        await regenerateSchedule();
        renderEditMode(document.getElementById("dayContent"));
      };
      document.getElementById("fCancel").onclick = () => { area.innerHTML=""; };
    }
  }
}

// ============================================================
// MONTH VIEW
// ============================================================
function renderMonthView(container) {
  const weekdays = ["Пн","Вт","Ср","Чт","Пт","Сб","Нд"];
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const offset   = (firstDay + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth+1, 0).getDate();
  const recurring = getRecurringRoutines(userName);

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(`<div class="month-cell--empty"></div>`);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dayKey(d, currentMonth, currentYear);
    const stored = allTasks[key] || [];
    const dow = new Date(currentYear, currentMonth, d).getDay();
    const recForDay = recurring
      .filter(r => r.repeatDays?.includes(dow) && !stored.some(t => t.routineId===r.id))
      .map(r => ({ text: r.text, type: "routine" }));
    const tasks = [...stored, ...recForDay];
    const chips = tasks.slice(0,3).map(t => {
      const bg  = t.type==="routine" ? "#6b7280" : eventColor(t.text);
      const clr = t.type==="routine" ? "#fff" : "#1a1a1a";
      return `<div class="month-chip" style="background:${bg};color:${clr}">${t.text}</div>`;
    }).join("");
    const more = tasks.length > 3 ? `<div class="month-more">+${tasks.length-3}</div>` : "";
    cells.push(`<button class="month-cell" data-day="${d}"><div class="month-cell__day">${d}</div>${chips}${more}</button>`);
  }

  container.innerHTML = `
    <div class="month-nav">
      <button class="btn btn--gray btn--icon" id="prevMonth">&#8592;</button>
      <h2 class="day-nav__title" style="margin:0 1rem">${monthName(currentMonth)} ${currentYear}</h2>
      <button class="btn btn--gray btn--icon" id="nextMonth">&#8594;</button>
    </div>
    <div class="month-weekdays">${weekdays.map(w=>`<div class="month-weekday-header">${w}</div>`).join("")}</div>
    <div class="month-grid">${cells.join("")}</div>`;

  document.getElementById("prevMonth").onclick = () => { currentMonth--; if(currentMonth<0){currentMonth=11;currentYear--;} render(); };
  document.getElementById("nextMonth").onclick = () => { currentMonth++; if(currentMonth>11){currentMonth=0;currentYear++;} render(); };
  container.querySelectorAll(".month-cell").forEach(btn => {
    btn.onclick = async () => {
      currentDay=parseInt(btn.dataset.day); viewMode="day"; dayMode="schedule";
      await regenerateSchedule(); render();
    };
  });
}

function monthName(m) {
  return ["Січень","Лютий","Березень","Квітень","Травень","Червень",
          "Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"][m];
}
