import { redirectIfNotLoggedIn, getUserName, buildSidebar, API } from "./utils.js";

redirectIfNotLoggedIn();

const userName = getUserName();
const app = document.getElementById("app");

let pomodoroWork  = parseInt(localStorage.getItem("pomo_work")  || "25");
let pomodoroBreak = parseInt(localStorage.getItem("pomo_break") || "5");
let pomodoroCycles = parseInt(localStorage.getItem("pomo_cycles") || "4");
let pomodoroLongBreak = parseInt(localStorage.getItem("pomo_long_break") || "15");

function render() {
  app.innerHTML = buildSidebar("settings") + `
    <div class="main-content">
      <div class="settings-card" style="max-width:600px; margin:0 auto; background:#1e1e1e; padding:2rem; border-radius:12px;">
        
        <h2 style="color:white;margin-bottom:1.5rem">Налаштування акаунту</h2>
        
        <div class="form-group">
          <label class="form-label">Ім'я</label>
          <div style="display:flex;gap:0.5rem">
            <input type="text" class="form-input" id="newName" value="${userName}" style="flex:1"/>
            <button class="btn btn--blue" id="saveName">Зберегти</button>
          </div>
          <p id="nameMsg" style="color:#10b981;font-size:0.875rem;margin-top:0.5rem;min-height:1rem"></p>
        </div>

        <div class="form-group">
          <label class="form-label">Email</label>
          <div style="display:flex;align-items:center;gap:1rem;background:#2a2a2a;padding:0.75rem;border-radius:8px">
            <span id="emailVal" style="color:white;flex:1;font-family:monospace">••••••••••</span>
            <button class="btn btn--gray" id="toggleEmail">Показати</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Пароль</label>
          <div style="display:flex;align-items:center;gap:1rem;background:#2a2a2a;padding:0.75rem;border-radius:8px">
            <span id="passVal" style="color:white;flex:1;font-family:monospace">••••••••••</span>
            <button class="btn btn--gray" id="togglePass">Показати</button>
          </div>
        </div>

        <hr style="border-color:#5a5a5a;margin:2rem 0"/>

        <h3 style="color:white;margin-bottom:1rem">Налаштування Помодоро</h3>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Робота (хв)</label>
            <input type="number" class="form-input" id="pomoWork" value="${pomodoroWork}" min="5" max="120"/>
          </div>
          <div class="form-group">
            <label class="form-label">Мала перерва (хв)</label>
            <input type="number" class="form-input" id="pomoBreak" value="${pomodoroBreak}" min="1" max="60"/>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Циклів до великої перерви</label>
            <input type="number" class="form-input" id="pomoCycles" value="${pomodoroCycles}" min="1" max="10"/>
          </div>
          <div class="form-group">
            <label class="form-label">Велика перерва (хв)</label>
            <input type="number" class="form-input" id="pomoLongBreak" value="${pomodoroLongBreak}" min="5" max="60"/>
          </div>
        </div>
        
        <button class="btn btn--green" id="savePomo" style="width:100%; margin-top:1rem;">Зберегти Помодоро</button>
        <p id="pomoMsg" style="color:#10b981;font-size:0.875rem;margin-top:0.5rem;min-height:1rem"></p>
      </div>
    </div>`;

  // Логіка кнопок
  let emailVisible = false;
  document.getElementById("toggleEmail").onclick = async () => {
    if (!emailVisible) {
      document.getElementById("emailVal").textContent = localStorage.getItem("user_email") || "—";
      emailVisible = true;
      document.getElementById("toggleEmail").textContent = "Сховати";
    } else {
      document.getElementById("emailVal").textContent = "••••••••••";
      emailVisible = false;
      document.getElementById("toggleEmail").textContent = "Показати";
    }
  };

  let passVisible = false;
  document.getElementById("togglePass").onclick = async () => {
    if (!passVisible) {
      document.getElementById("passVal").textContent = "********";
      passVisible = true;
      document.getElementById("togglePass").textContent = "Сховати";
    } else {
      document.getElementById("passVal").textContent = "••••••••••";
      passVisible = false;
      document.getElementById("togglePass").textContent = "Показати";
    }
  };

  document.getElementById("saveName").onclick = () => {
    const newName = document.getElementById("newName").value.trim();
    if (!newName) return;
    localStorage.setItem("user_name", newName);
    document.getElementById("nameMsg").textContent = "Ім'я оновлено!";
    setTimeout(() => document.getElementById("nameMsg").textContent = "", 2000);
  };

  document.getElementById("savePomo").onclick = () => {
    pomodoroWork  = parseInt(document.getElementById("pomoWork").value)  || 25;
    pomodoroBreak = parseInt(document.getElementById("pomoBreak").value) || 5;
    pomodoroCycles = parseInt(document.getElementById("pomoCycles").value) || 4;
    pomodoroLongBreak = parseInt(document.getElementById("pomoLongBreak").value) || 15;
    
    localStorage.setItem("pomo_work",  pomodoroWork);
    localStorage.setItem("pomo_break", pomodoroBreak);
    localStorage.setItem("pomo_cycles", pomodoroCycles);
    localStorage.setItem("pomo_long_break", pomodoroLongBreak);
    
    document.getElementById("pomoMsg").textContent = "Збережено!";
    setTimeout(() => document.getElementById("pomoMsg").textContent = "", 2000);
  };
}

render();