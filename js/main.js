import {
  signIn,
  getToken,
  logOut,
  graphql,
  PROFILE_QUERY,
} from './api.js';
import { formatXp } from './format.js';
import { lineChart, barChart, auditChart } from './charts.js';

const loginView = document.getElementById('login-view');
const profileView = document.getElementById('profile-view');
const form = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const profileError = document.getElementById('profile-error');
const loading = document.getElementById('loading');

const setText = (id, value) => {
  document.getElementById(id).textContent = value;
};

let flashMessage = '';

function applyRoute() {
  const authed = Boolean(getToken());
  const hash = location.hash;

  if (!hash) {
    location.hash = authed ? '#/home' : '#/login';
    return;
  }
  if (hash === '#/home' && !authed) {
    location.hash = '#/login';
    return;
  }
  if (hash !== '#/home' && authed) {
    location.hash = '#/home';
    return;
  }

  if (hash === '#/home') showProfile();
  else showLogin(flashMessage);
  flashMessage = '';
}

function goToHome() {
  if (location.hash === '#/home') applyRoute();
  else location.hash = '#/home';
}

function goToLogin(message = '') {
  flashMessage = message;
  if (location.hash === '#/login') applyRoute();
  else location.hash = '#/login';
}

function showLogin(message = '') {
  profileView.hidden = true;
  loginView.hidden = false;
  loginError.textContent = message;
}

function showProfile() {
  loginView.hidden = true;
  profileView.hidden = false;
  loadProfile();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.textContent = '';

  const identifier = form.identifier.value.trim();
  const password = form.password.value;

  if (!identifier || !password) {
    loginError.textContent = 'Please enter your username or email and your password.';
    return;
  }

  const button = form.querySelector('button');
  button.disabled = true;

  try {
    await signIn(identifier, password);
    form.reset();
    goToHome();
  } catch (err) {
    loginError.textContent = err.message;
  } finally {
    button.disabled = false;
  }
});

document.getElementById('logout').addEventListener('click', () => {
  logOut();
  goToLogin();
});

const MODULE_PATH = '/bahrain/bh-module';
const PISCINE_JS_PATH = `${MODULE_PATH}/piscine-js/`;

const isModule = (row) =>
  (row.path === MODULE_PATH || row.path.startsWith(`${MODULE_PATH}/`))
  && !row.path.startsWith(PISCINE_JS_PATH);

const projectName = (transaction) =>
  (transaction.object && transaction.object.name) || transaction.path.split('/').pop();

async function loadProfile() {
  loading.hidden = false;
  profileError.textContent = '';

  try {
    const data = await graphql(PROFILE_QUERY, { types: ['xp', 'level'] });

    render(data.user[0], data.transaction.filter(isModule));
  } catch (err) {
    if (/jwt|unauthor/i.test(err.message)) {
      logOut();
      goToLogin('Your session has expired. Please sign in again.');
      return;
    }
    profileError.textContent = `Could not load your profile: ${err.message}`;
  } finally {
    loading.hidden = true;
  }
}

function render(user, transactions) {
  setText('user-login', user.login);
  setText('session-login', user.login);
  setText('user-name', `${user.firstName} ${user.lastName}`);
  setText('user-email', user.email);
  setText('user-id', user.id);

  const xpRows = transactions.filter((t) => t.type === 'xp');
  const levelRows = transactions.filter((t) => t.type === 'level');

  const totalXp = xpRows.reduce((sum, t) => sum + t.amount, 0);
  setText('total-xp', formatXp(totalXp));
  setText('xp-count', `across ${xpRows.length} transactions`);

  setText('audit-ratio', user.auditRatio.toFixed(1));
  setText('audit-up', formatXp(user.totalUp));
  setText('audit-down', formatXp(user.totalDown));

  const level = levelRows.length > 0 ? Math.max(...levelRows.map((t) => t.amount)) : null;
  setText('level', level === null ? '—' : String(level));

  drawGraphs(xpRows, user.totalUp, user.totalDown);
}

function drawGraphs(transactions, auditUp, auditDown) {
  let running = 0;
  const points = transactions.map((t) => {
    running += t.amount;
    return { time: new Date(t.createdAt).getTime(), xp: running };
  });

  const totals = new Map();
  for (const t of transactions) {
    const name = projectName(t);
    totals.set(name, (totals.get(name) || 0) + t.amount);
  }

  const byProject = [...totals]
    .map(([name, xp]) => ({ name, xp }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10);

  lineChart(document.getElementById('chart-xp-time'), points);
  barChart(document.getElementById('chart-xp-project'), byProject);
  auditChart(document.getElementById('chart-audit'), auditUp, auditDown);
}

window.addEventListener('hashchange', applyRoute);
applyRoute();
