const CLAN_PASSWORDS = {
  'dünnschiss': 'Chaos Crew',
  megaking: 'kings lobby',
  standartschiss: 'lila langweiler',
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

const loadRemoteAccount = async (accountKey) => {
  if (!window.accountStore?.enabled) {
    return null;
  }

  try {
    return await window.accountStore.getAccount(accountKey);
  } catch (error) {
    console.warn('Supabase konnte beim Laden nicht erreicht werden.', error);
    return null;
  }
};

const saveRemoteAccount = async (accountKey, account) => {
  if (!window.accountStore?.enabled) {
    return;
  }

  try {
    await window.accountStore.saveAccount(accountKey, account);
  } catch (error) {
    console.warn('Supabase konnte beim Speichern nicht erreicht werden.', error);
  }
};

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = document.getElementById('name').value.trim();
  const password = document.getElementById('password').value.trim();
  const personalPassword = document.getElementById('personal-password').value.trim();
  const clan = CLAN_PASSWORDS[password];

  if (!name || !clan || !personalPassword) {
    loginMessage.textContent = 'Name, Clan-Passwort oder eigenes Passwort ist falsch bzw. fehlt.';
    loginMessage.className = 'message error';
    return;
  }

  const accounts = loadAccounts();
  const accountKey = `${name.toLowerCase()}::${clan.toLowerCase()}`;
  const remoteAccount = await loadRemoteAccount(accountKey);

  const existingAccount = remoteAccount ?? accounts[accountKey] ?? {
    name,
    clan,
    points: 0,
    lastSolvedDate: null,
    personalPassword,
  };

  if (existingAccount.personalPassword && existingAccount.personalPassword !== personalPassword) {
    loginMessage.textContent = 'Dein eigenes Zugangspasswort ist falsch.';
    loginMessage.className = 'message error';
    return;
  }

  existingAccount.name = name;
  existingAccount.clan = clan;
  existingAccount.personalPassword = personalPassword;
  accounts[accountKey] = existingAccount;

  saveAccounts(accounts);
  await saveRemoteAccount(accountKey, existingAccount);

  sessionStorage.setItem('activeAccountKey', accountKey);
  window.location.href = 'dashboard.html';
});
