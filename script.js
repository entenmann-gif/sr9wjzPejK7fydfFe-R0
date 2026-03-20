const CLAN_PASSWORDS = {
  'dünnschiss': 'Chaos Crew',
  megaking: 'kings lobby',
  standartschiss: 'lila langweiler',
};

const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');

const normalizeValue = (value) => value.trim().toLowerCase();

const buildLegacyAccountKey = (name, clan) => `${normalizeValue(name)}::${normalizeValue(clan)}`;

const buildAccountKey = (name, clan, personalPassword) => `${buildLegacyAccountKey(name, clan)}::${encodeURIComponent(personalPassword)}`;

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

const loadRemoteAccountsByIdentity = async (name, clan) => {
  if (!window.accountStore?.enabled) {
    return [];
  }

  try {
    return await window.accountStore.findAccountsByIdentity(name, clan);
  } catch (error) {
    console.warn('Supabase konnte passende Accounts nicht laden.', error);
    return [];
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

const deleteRemoteAccount = async (accountKey) => {
  if (!window.accountStore?.enabled) {
    return;
  }

  try {
    await window.accountStore.deleteAccount(accountKey);
  } catch (error) {
    console.warn('Supabase konnte einen alten Account nicht löschen.', error);
  }
};

const findLocalAccountsByIdentity = (accounts, name, clan) => Object.entries(accounts)
  .filter(([, account]) => normalizeValue(account.name) === normalizeValue(name)
    && normalizeValue(account.clan) === normalizeValue(clan))
  .map(([accountKey, account]) => ({ ...account, accountKey }));

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
  const legacyAccountKey = buildLegacyAccountKey(name, clan);
  const newAccountKey = buildAccountKey(name, clan, personalPassword);
  const localMatches = findLocalAccountsByIdentity(accounts, name, clan);
  const remoteMatches = await loadRemoteAccountsByIdentity(name, clan);
  const existingAccountMatch = [...remoteMatches, ...localMatches]
    .find((account) => account.personalPassword === personalPassword);
  const conflictingAccount = [...remoteMatches, ...localMatches]
    .find((account) => account.personalPassword !== personalPassword);

  if (!existingAccountMatch && conflictingAccount) {
    loginMessage.textContent = 'Für diesen Namen in diesem Clan existiert schon ein anderes eigenes Passwort.';
    loginMessage.className = 'message error';
    return;
  }

  const legacyRemoteAccount = existingAccountMatch ? null : await loadRemoteAccount(legacyAccountKey);
  const legacyLocalAccount = existingAccountMatch ? null : accounts[legacyAccountKey];
  const existingAccount = existingAccountMatch ?? legacyRemoteAccount ?? legacyLocalAccount ?? {
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

  const previousAccountKey = existingAccount.accountKey ?? (legacyLocalAccount ? legacyAccountKey : null);

  existingAccount.name = name;
  existingAccount.clan = clan;
  existingAccount.personalPassword = personalPassword;
  existingAccount.accountKey = newAccountKey;

  if (previousAccountKey && previousAccountKey !== newAccountKey) {
    delete accounts[previousAccountKey];
    await deleteRemoteAccount(previousAccountKey);
  }

  accounts[newAccountKey] = existingAccount;

  saveAccounts(accounts);
  await saveRemoteAccount(newAccountKey, existingAccount);

  sessionStorage.setItem('activeAccountKey', newAccountKey);
  window.location.href = 'dashboard.html';
});
