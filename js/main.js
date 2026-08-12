import {
  signIn,
  getToken,
  logOut,
  graphql,
  USER_QUERY,
  XP_QUERY,
  PROGRESS_QUERY,
} from './api.js';
import { formatXp } from './format.js';
import { lineChart, barChart, donutChart } from './charts.js';

const loginView = document.getElementById('login-view');
const profileView = document.getElementById('profile-view');
const form = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const profileError = document.getElementById('profile-error');
const loading = document.getElementById('loading');

const setText = (id, value) => {
  document.getElementById(id).textContent = value;
};

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
    showProfile();
  } catch (err) {
    loginError.textContent = err.message;
  } finally {
    button.disabled = false;
  }
});

document.getElementById('logout').addEventListener('click', () => {
  logOut();
  showLogin();
});

const isCursus = (row) => !row.path.includes('piscine');

const projectName = (transaction) =>
  (transaction.object && transaction.object.name) || transaction.path.split('/').pop();

async function loadProfile() {
  loading.hidden = false;
  profileError.textContent = '';

  try {
    const [userData, xpData, progressData] = await Promise.all([
      graphql(USER_QUERY),
      graphql(XP_QUERY),
      graphql(PROGRESS_QUERY, { type: 'project' }),
    ]);

    render(
      userData.user[0],
      xpData.transaction.filter(isCursus),
      progressData.progress.filter(isCursus)
    );
  } catch (err) {
    if (/jwt|unauthor/i.test(err.message)) {
      logOut();
      showLogin('Your session has expired. Please sign in again.');
      return;
    }
    profileError.textContent = `Could not load your profile: ${err.message}`;
  } finally {
    loading.hidden = true;
  }
}

function render(user, transactions, progress) {
  setText('user-login', user.login);
  setText('session-login', user.login);
  setText('user-name', `${user.firstName} ${user.lastName}`);
  setText('user-email', user.email);
  setText('user-id', user.id);

  const totalXp = transactions.reduce((sum, t) => sum + t.amount, 0);
  setText('total-xp', formatXp(totalXp));
  setText('xp-count', `across ${transactions.length} transactions`);

  setText('audit-ratio', user.auditRatio.toFixed(1));
  setText('audit-up', formatXp(user.totalUp));
  setText('audit-down', formatXp(user.totalDown));

  const graded = progress.filter((p) => p.grade !== null);
  const passed = graded.filter((p) => p.grade >= 1).length;
  setText('projects-passed', `${passed} / ${graded.length}`);

  drawGraphs(transactions, passed, graded.length - passed);
}

function drawGraphs(transactions, passed, failed) {
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
  donutChart(document.getElementById('chart-pass-fail'), passed, failed);
}

if (getToken()) showProfile();
else showLogin();
