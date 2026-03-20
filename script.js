const CLAN_PASSWORDS = {
  'dünnschiss': 'Chaos Crew',
};

const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');

const loadAccounts = () => {
  const raw = localStorage.getItem('dailyRiddleAccounts');
  return raw ? JSON.parse(raw) : {};
};

const saveAccounts = (accounts) => {
  localStorage.setItem('dailyRiddleAccounts', JSON.stringify(accounts));
};

loginForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.getElementById('name').value.trim();
  const password = document.getElementById('password').value.trim();
  const clan = CLAN_PASSWORDS[password];

  if (!name || !clan) {
    loginMessage.textContent = 'Name oder Passwort ist falsch. Ohne gültiges Clan-Passwort kommst du nicht rein.';
    loginMessage.className = 'message error';
    return;
  }

  const accounts = loadAccounts();
  const accountKey = `${name.toLowerCase()}::${clan.toLowerCase()}`;
  const existingAccount = accounts[accountKey] ?? {
    name,
    clan,
    points: 0,
    lastSolvedDate: null,
  };

  existingAccount.name = name;
  existingAccount.clan = clan;
  accounts[accountKey] = existingAccount;
  saveAccounts(accounts);

  sessionStorage.setItem('activeAccountKey', accountKey);
  window.location.href = 'dashboard.html';
});
