import { storage } from './storage.js';

const form = document.getElementById('settings-form');
const displayName = document.getElementById('displayName');
const weekStartsOn = document.getElementById('weekStartsOn');
const showCompleted = document.getElementById('showCompletedOnCalendar');
const message = document.getElementById('settings-message');

const current = storage.getSettings();
displayName.value = current.displayName;
weekStartsOn.value = current.weekStartsOn;
showCompleted.checked = current.showCompletedOnCalendar;

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const result = storage.saveSettings({
    displayName: displayName.value,
    weekStartsOn: weekStartsOn.value,
    showCompletedOnCalendar: showCompleted.checked,
  });

  message.textContent = result.ok ? 'Settings saved.' : result.error;
  message.classList.toggle('status-message--error', !result.ok);
  message.hidden = false;
});
