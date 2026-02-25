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
  const name     = nameInput.value.trim();
  const email    = emailInput.value.trim();
  const password = passInput.value.trim();

  if (!name || !email || !password) {
    showError('Будь ласка, заповніть всі поля');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = '...';

  try {
    // Try to login first
    let result;
    try {
      result = await apiLogin(email, password);
    } catch (loginErr) {
      // If login fails → try register (new user)
      try {
        result = await apiRegister(name, email, password);
      } catch (regErr) {
        throw new Error(regErr.message);
      }
    }

    // Save to localStorage for quick access
    localStorage.setItem('userName',     result.name);
    localStorage.setItem('userEmail',    email);
    localStorage.setItem('userPassword', password);

    window.location.href = '/planner.html';
  } catch (err) {
    showError(err.message || 'Помилка входу');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Увійти';
  }
}

loginBtn.addEventListener('click', handle);
[nameInput, emailInput, passInput].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') handle(); });
});
