import { apiRegister, apiLogin } from './utils.js';

// If already logged in → redirect
if (localStorage.getItem('userName')) {
  window.location.href = '/planner.html';
}

const loginBtn   = document.getElementById('loginBtn');
const nameInput  = document.getElementById('nameInput');
const emailInput = document.getElementById('emailInput');
const passInput  = document.getElementById('passwordInput');
const errorMsg   = document.getElementById('errorMsg');

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
}

async function handle() {
  const email = emailInput.value.trim();
  const password = passInput.value.trim();
  const name = nameInput.value.trim();
  const infoMsg = document.getElementById('idMsg');

  if (!email || !password) {
    showError('Введіть email та пароль');
    return;
  }

  errorMsg.hidden = true;
  loginBtn.disabled = true;

  try {
    // check if email is correct
    const checkRes = await fetch(`http://localhost:8000/check-email/${encodeURIComponent(email)}`);
    const { exists } = await checkRes.json();

    if (!exists) {
      if (nameInput.hidden) {
        nameInput.hidden = false;
        infoMsg.textContent = "Цей email не зареєстрований. Введіть ім'я, щоб створити акаунт.";
        infoMsg.hidden = false;
        loginBtn.textContent = 'Зареєструватися';
        loginBtn.disabled = false;
        return;
      } 

      if (!name) {
        showError('Будь ласка, введіть ім’я для реєстрації');
        loginBtn.disabled = false;
        return;
      }
      const regData = await apiRegister(name, email, password);
      saveAndRedirect(regData.name, email, password);
    } else {
      // if user exists, login
      const loginData = await apiLogin(email, password);
      saveAndRedirect(loginData.name, email, password);
    }
  } catch (err) {
    showError(err.message || 'Помилка доступу');
    loginBtn.disabled = false;
  }
}

function saveAndRedirect(name, email, password) {
  localStorage.setItem('userName', name);
  localStorage.setItem('userEmail', email);
  localStorage.setItem('userPassword', password);
  window.location.href = '/planner.html';
}

loginBtn.addEventListener('click', handle);
[nameInput, emailInput, passInput].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') handle(); });
});
