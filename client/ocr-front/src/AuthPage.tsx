const container = document.getElementById('container');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

showRegister.addEventListener('click', () => {
  container.classList.add('active');
});

showLogin.addEventListener('click', () => {
  container.classList.remove('active');
});

// Prevent actual submission — this is a front-end demo only.
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = loginForm.querySelector('.btn-primary');
  const original = btn.textContent;
  btn.textContent = 'Signing in…';
  setTimeout(() => { btn.textContent = original; }, 1200);
});

registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = registerForm.querySelector('.btn-primary');
  const original = btn.textContent;
  btn.textContent = 'Creating account…';
  setTimeout(() => { btn.textContent = original; }, 1200);
});