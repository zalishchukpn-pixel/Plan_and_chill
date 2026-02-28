// ===== index.js — логіка входу та реєстрації =====
const API = "http://142.93.107.164:8000";

const nameInput     = document.getElementById("nameInput");
const emailInput    = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn      = document.getElementById("loginBtn");
const errorMsg      = document.getElementById("errorMsg");

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
}

loginBtn.addEventListener("click", async () => {
  const name     = nameInput.value.trim();
  const email    = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!name || !email || !password) {
    showError("Будь ласка, заповніть усі поля.");
    return;
  }

  // Check if email already exists
  try {
    const checkRes = await fetch(`${API}/check-email/${encodeURIComponent(email)}`);
    const checkData = await checkRes.json();

    if (checkData.exists) {
      // Login
      const loginRes = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!loginRes.ok) {
        const err = await loginRes.json();
        showError(err.detail || "Невірний пароль або email.");
        return;
      }
      const loginData = await loginRes.json();
      localStorage.setItem("user_name", loginData.name);
    } else {
      // Register
      const regRes = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!regRes.ok) {
        const err = await regRes.json();
        showError(err.detail || "Помилка реєстрації.");
        return;
      }
      const regData = await regRes.json();
      localStorage.setItem("user_name", regData.name);
    }

    window.location.href = "planner.html";
  } catch (e) {
    showError("Не вдалося підключитися до сервера. Переконайтесь, що бекенд запущений.");
  }
});
