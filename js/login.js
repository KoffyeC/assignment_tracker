import { session } from './session.js';

const params = new URLSearchParams(window.location.search);
const message = document.getElementById('login-message');

if (params.get('signedOut') === '1') {
  message.textContent = 'You have been logged out.';
  message.hidden = false;
}

document.getElementById('login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  session.signIn();
  window.location.replace('index.html');
});
