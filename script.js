const CLAN_PASSWORDS = {
  'dünnschiss': 'Chaos Crew',
  megaking: 'kings lobby',
  standartschiss: 'lila langweiler',
  gryffindor: 'Hogwarts',
  hufflepuff: 'Hogwarts',
  ravenclaw: 'Hogwarts',
  slytherin: 'Hogwarts',
};

const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');

const normalizeValue = (value) => value.trim().toLowerCase();

const buildLegacyAccountKey = (name, clan) => `${normalizeValue(name)}::${normalizeValue(clan)}`;

const buildAccountKey = (name, clan, personalPassword) => `${buildLegacyAccountKey(name, clan)}::${encodeURIComponent(personalPassword)}`;

const loadRemoteAccount = async (accountKey) => {
  if (!window.accountStore?.enabled || !accountKey) {
    return null;
  }

  return window.accountStore.getAccount(accountKey);
};

const loadRemoteAccountsByIdentity = async (name, clan) => {
  if (!window.accountStore?.enabled || !name || !clan) {
    return [];
  }

  return window.accountStore.findAccountsByIdentity(name, clan);
};

const saveRemoteAccount = async (accountKey, account) => {
  if (!window.accountStore?.enabled || !accountKey) {
    return;
  }

  await window.accountStore.saveAccount(accountKey, account);
};

const deleteRemoteAccount = async (accountKey) => {
  if (!window.accountStore?.enabled || !accountKey) {
    return;
  }

  await window.accountStore.deleteAccount(accountKey);
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

  if (!window.accountStore) {
    loginMessage.textContent = 'Supabase-Initialisierung fehlgeschlagen. Bitte Browser-Konsole prüfen.';
    loginMessage.className = 'message error';
    return;
  }

  if (!window.accountStore.enabled) {
    const reason = window.accountStore.reason;

    if (reason === 'missing_config') {
      loginMessage.textContent = 'Supabase-Konfiguration fehlt. Bitte `supabase-config.js` ausfüllen.';
    } else if (reason === 'missing_library') {
      loginMessage.textContent = 'Supabase-Bibliothek konnte nicht geladen werden. Bitte Internet/CDN prüfen.';
    } else {
      loginMessage.textContent = 'Supabase ist nicht verbunden. Bitte `supabase-config.js` prüfen.';
    }

    loginMessage.className = 'message error';
    return;
  }

  try {
    const legacyAccountKey = buildLegacyAccountKey(name, clan);
    const newAccountKey = buildAccountKey(name, clan, personalPassword);
    const remoteMatches = await loadRemoteAccountsByIdentity(name, clan);

    const existingAccountMatch = remoteMatches.find((account) => account.personalPassword === personalPassword);
    const conflictingAccount = remoteMatches.find((account) => account.personalPassword !== personalPassword);

    if (!existingAccountMatch && conflictingAccount) {
      loginMessage.textContent = 'Für diesen Namen in diesem Clan existiert schon ein anderes eigenes Passwort.';
      loginMessage.className = 'message error';
      return;
    }

    const currentAccountByKey = await loadRemoteAccount(newAccountKey);
    const legacyRemoteAccount = existingAccountMatch ? null : await loadRemoteAccount(legacyAccountKey);

    const existingAccount = existingAccountMatch ?? currentAccountByKey ?? legacyRemoteAccount ?? {
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

    const previousAccountKey = existingAccount.accountKey ?? (legacyRemoteAccount ? legacyAccountKey : null);

    existingAccount.name = name;
    existingAccount.clan = clan;
    existingAccount.personalPassword = personalPassword;
    existingAccount.accountKey = newAccountKey;

    if (previousAccountKey && previousAccountKey !== newAccountKey) {
      await deleteRemoteAccount(previousAccountKey);
    }

    await saveRemoteAccount(newAccountKey, existingAccount);

    sessionStorage.setItem('activeAccountKey', newAccountKey);
    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error('Login/Speichern über Supabase fehlgeschlagen.', error);
    loginMessage.textContent = 'Supabase ist gerade nicht erreichbar. Bitte später erneut versuchen.';
    loginMessage.className = 'message error';
  }
});
