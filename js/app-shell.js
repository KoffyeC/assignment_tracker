import { session } from './session.js';

if (session.isSignedOut()) {
  window.location.replace('login.html');
} else {
  renderSidebar();
  setActiveNavigation();
  wireLogout();
}

function renderSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar === null) return;

  sidebar.replaceChildren();

  const brand = document.createElement('a');
  brand.className = 'sidebar__brand';
  brand.href = 'index.html';
  brand.textContent = 'Student Planner';

  const nav = document.createElement('nav');
  nav.className = 'sidebar__nav';
  nav.setAttribute('aria-label', 'Student Planner');

  const mainLinks = document.createElement('div');
  mainLinks.className = 'sidebar__links';
  for (const item of [
    ['dashboard', 'index.html', '⌂', 'Dashboard'],
    ['assignments', 'assignments.html', '▣', 'Assignments'],
    ['notes', 'notes.html', '▤', 'Notes'],
    ['calendar', 'calendar.html', '□', 'Calendar'],
    ['settings', 'settings.html', '⚙', 'Settings'],
  ]) {
    mainLinks.append(createNavLink(...item));
  }

  const footer = document.createElement('div');
  footer.className = 'sidebar__footer';
  const logout = document.createElement('button');
  logout.className = 'sidebar__link sidebar__logout';
  logout.id = 'logout-button';
  logout.type = 'button';
  logout.append(createIcon('↪'), document.createTextNode('Log Out'));
  footer.append(logout);

  nav.append(mainLinks, footer);
  sidebar.append(brand, nav);
}

function createNavLink(section, href, icon, label) {
  const link = document.createElement('a');
  link.className = 'sidebar__link';
  link.href = href;
  link.dataset.nav = section;
  link.append(createIcon(icon), document.createTextNode(label));
  return link;
}

function createIcon(text) {
  const icon = document.createElement('span');
  icon.className = 'sidebar__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = text;
  return icon;
}

function setActiveNavigation() {
  const section = document.body.dataset.section;
  for (const link of document.querySelectorAll('[data-nav]')) {
    if (link.dataset.nav === section) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

function wireLogout() {
  const button = document.getElementById('logout-button');
  if (button === null) return;

  button.addEventListener('click', () => {
    session.signOut();
    window.location.replace('login.html?signedOut=1');
  });
}
