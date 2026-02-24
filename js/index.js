// If already logged in → redirect
  if (localStorage.getItem('userName')) {
    window.location.href = '/planner.html';
  }

  const loginBtn    = document.getElementById('loginBtn');
  const nameInput   = document.getElementById('nameInput');
  const emailInput  = document.getElementById('emailInput');
  const passInput   = document.getElementById('passwordInput');
  const errorMsg    = document.getElementById('errorMsg');

  function handle() {
    const name     = nameInput.value.trim();
    const email    = emailInput.value.trim();
    const password = passInput.value.trim();

    if (name && email && password) {
      localStorage.setItem('userName',     name);
      localStorage.setItem('userEmail',    email);
      localStorage.setItem('userPassword', password);
      window.location.href = '/planner.html';
    } else {
      errorMsg.textContent = 'Будь ласка, заповніть всі поля';
      errorMsg.hidden = false;
    }
  }

  loginBtn.addEventListener('click', handle);

  [nameInput, emailInput, passInput].forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') handle(); });
  });
