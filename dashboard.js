const ACTIVE_ACCOUNT_KEY = sessionStorage.getItem('activeAccountKey');
const accountName = document.getElementById('account-name');
const accountClan = document.getElementById('account-clan');
const accountPoints = document.getElementById('account-points');
const riddleQuestion = document.getElementById('riddle-question');
const riddleForm = document.getElementById('riddle-form');
const riddleMessage = document.getElementById('riddle-message');
const logoutButton = document.getElementById('logout-button');

const loadAccounts = () => {
  const raw = localStorage.getItem('dailyRiddleAccounts');
  return raw ? JSON.parse(raw) : {};
};

const saveAccounts = (accounts) => {
  localStorage.setItem('dailyRiddleAccounts', JSON.stringify(accounts));
};

const todayKey = () => new Date().toISOString().slice(0, 10);

// HIER KANNST DU DAS RÄTSEL UND DIE LÖSUNG IM CODE ÄNDERN.
const DAILY_RIDDLE = {
  question: '1 + 1',
  answer: '2',
  rewardPoints: 100,
};

const accounts = loadAccounts();
const activeAccount = ACTIVE_ACCOUNT_KEY ? accounts[ACTIVE_ACCOUNT_KEY] : null;

if (!activeAccount) {
  window.location.href = 'index.html';
} else {
  const renderAccount = () => {
    accountName.textContent = activeAccount.name;
    accountClan.textContent = activeAccount.clan;
    accountPoints.textContent = `${activeAccount.points} Punkte`;
    riddleQuestion.textContent = DAILY_RIDDLE.question;
  };

  renderAccount();

  riddleForm?.addEventListener('submit', (event) => {
    event.preventDefault();

    const answer = document.getElementById('riddle-answer').value.trim();

    if (activeAccount.lastSolvedDate === todayKey()) {
      riddleMessage.textContent = 'Du hast das heutige Rätsel schon gelöst und deine 100 Punkte bereits bekommen.';
      riddleMessage.className = 'message error';
      return;
    }

    if (answer !== DAILY_RIDDLE.answer) {
      riddleMessage.textContent = 'Leider falsch. Versuch es noch einmal.';
      riddleMessage.className = 'message error';
      return;
    }

    activeAccount.points += DAILY_RIDDLE.rewardPoints;
    activeAccount.lastSolvedDate = todayKey();
    accounts[ACTIVE_ACCOUNT_KEY] = activeAccount;
    saveAccounts(accounts);
    renderAccount();

    riddleMessage.textContent = `Richtig! Du bekommst ${DAILY_RIDDLE.rewardPoints} Punkte für das heutige Rätsel.`;
    riddleMessage.className = 'message success';
    riddleForm.reset();
  });

  logoutButton?.addEventListener('click', () => {
    sessionStorage.removeItem('activeAccountKey');
    window.location.href = 'index.html';
  });
}
