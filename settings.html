// ===== settings.js =====
import { redirectIfNotLoggedIn, getUserName, buildSidebar, API } from "./utils.js";

redirectIfNotLoggedIn();

const userName = getUserName();
const app = document.getElementById("app");

let pomodoroWork  = parseInt(localStorage.getItem("pomo_work")  || "25");
let pomodoroBreak = parseInt(localStorage.getItem("pomo_break") || "5");

function render() {
  app.innerHTML = buildSidebar("settings") + `
    <div class="main-content" style="align-items:center;justify-content:center">
      <div class="settings-card">
        <h2 style="color:white;margin-bottom:1.5rem">Налаштування</h2>

        <!-- Акаунт -->
        <h3 style="color:white;margin-bottom:1rem">Акаунт</h3>

        <div class="settings-info-row">
          <div class="settings-info-label">Ім'я</div>
          <div class="settings-info-value" id="nameDisplay">${userName}</div>
        </div>

        <div class="settings-reveal-row">
          <div class="settings-info-label">Email</div>
          <div class="settings-reveal-value">
            <span id="emailVal" class="settings-hidden-val">••••••••••</span>
            <button class="btn-reveal" id="toggleEmail">Показати</button>
          </div>
        </div>

        <div class="settings-reveal-row">
          <div class="settings-info-label">Пароль</div>
          <div class="settings-reveal-value">
            <span id="passVal" class="settings-hidden-val">••••••••••</span>
            <button class="btn-reveal" id="togglePass">Показати</button>
          </div>
        </div>

        <div style="margin:1.25rem 0 0">
          <label class="form-label" style="display:block;margin-bottom:0.5rem">Нове ім'я</label>
          <input class="form-input form-input--full" id="newName" placeholder="Введіть нове ім'я" value="${userName}"/>
          <p id="nameMsg" style="color:#10b981;font-size:0.875rem;margin-top:0.25rem;min-height:1rem"></p>
          <button class="btn btn--blue" id="saveName">Зберегти ім'я</button>
        </div>

        <hr style="border-color:#5a5a5a;margin:1.5rem 0"/>

        <!-- Помодоро -->
        <h3 style="color:white;margin-bottom:1rem">Налаштування Помодоро</h3>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Робота (хв)</label>
            <input type="number" class="form-input" id="pomoWork" value="${pomodoroWork}" min="5" max="120"/>
          </div>
          <div class="form-group">
            <label class="form-label">Перерва (хв)</label>
            <input type="number" class="form-input" id="pomoBreak" value="${pomodoroBreak}" min="1" max="60"/>
          </div>
        </div>
        <button class="btn btn--green" id="savePomo">Зберегти Помодоро</button>
        <p id="pomoMsg" style="color:#10b981;font-size:0.875rem;margin-top:0.5rem;min-height:1rem"></p>
      </div>
    </div>`;

  // Toggle email
  let emailVisible = false;
  document.getElementById("toggleEmail").onclick = async () => {
    if (!emailVisible) {
      try {
        const res = await fetch(`${API}/user-info/${encodeURIComponent(userName)}`);
        if (res.ok) {
          const data = await res.json();
          document.getElementById("emailVal").textContent = data.email || "—";
        } else {
          document.getElementById("emailVal").textContent = localStorage.getItem("user_email") || "—";
        }
      } catch {
        document.getElementById("emailVal").textContent = localStorage.getItem("user_email") || "—";
      }
      emailVisible = true;
      document.getElementById("toggleEmail").textContent = "Сховати";
    } else {
      document.getElementById("emailVal").textContent = "••••••••••";
      emailVisible = false;
      document.getElementById("toggleEmail").textContent = "Показати";
    }
  };

  // Toggle password
  let passVisible = false;
  document.getElementById("togglePass").onclick = async () => {
    if (!passVisible) {
      try {
        const res = await fetch(`${API}/user-info/${encodeURIComponent(userName)}`);
        if (res.ok) {
          const data = await res.json();
          document.getElementById("passVal").textContent = data.password || "—";
        } else {
          document.getElementById("passVal").textContent = localStorage.getItem("user_password") || "—";
        }
      } catch {
        document.getElementById("passVal").textContent = localStorage.getItem("user_password") || "—";
      }
      passVisible = true;
      document.getElementById("togglePass").textContent = "Сховати";
    } else {
      document.getElementById("passVal").textContent = "••••••••••";
      passVisible = false;
      document.getElementById("togglePass").textContent = "Показати";
    }
  };

  // Save name
  document.getElementById("saveName").onclick = async () => {
    const newName = document.getElementById("newName").value.trim();
    if (!newName) return;
    localStorage.setItem("user_name", newName);
    document.getElementById("nameDisplay").textContent = newName;
    document.getElementById("nameMsg").textContent = "Ім'я оновлено!";
    setTimeout(() => document.getElementById("nameMsg").textContent = "", 2000);
  };

  // Save pomodoro
  document.getElementById("savePomo").onclick = () => {
    pomodoroWork  = parseInt(document.getElementById("pomoWork").value)  || 25;
    pomodoroBreak = parseInt(document.getElementById("pomoBreak").value) || 5;
    localStorage.setItem("pomo_work",  pomodoroWork);
    localStorage.setItem("pomo_break", pomodoroBreak);
    document.getElementById("pomoMsg").textContent = "Збережено!";
    setTimeout(() => document.getElementById("pomoMsg").textContent = "", 2000);
  };
}

render();
