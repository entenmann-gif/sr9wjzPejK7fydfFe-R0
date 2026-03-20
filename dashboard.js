const ACTIVE_ACCOUNT_KEY = sessionStorage.getItem('activeAccountKey');
const accountName = document.getElementById('account-name');
const accountClan = document.getElementById('account-clan');
const accountPoints = document.getElementById('account-points');
const riddleQuestion = document.getElementById('riddle-question');
const riddleForm = document.getElementById('riddle-form');
const riddleMessage = document.getElementById('riddle-message');
const logoutButton = document.getElementById('logout-button');
const clanMembersPanel = document.getElementById('clan-members-panel');
const clanMembersList = document.getElementById('clan-members-list');
const clanMembersCount = document.getElementById('clan-members-count');

const loadAccounts = () => {
  const raw = localStorage.getItem('dailyRiddleAccounts');
  return raw ? JSON.parse(raw) : {};
};

const saveAccounts = (accounts) => {
  localStorage.setItem('dailyRiddleAccounts', JSON.stringify(accounts));
};

const normalizeValue = (value) => value.trim().toLowerCase();

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

const loadRemoteAccountsByClan = async (clan) => {
  if (!window.accountStore?.enabled) {
    return [];
  }

  try {
    return await window.accountStore.findAccountsByClan(clan);
  } catch (error) {
    console.warn('Supabase konnte Clan-Mitglieder nicht laden.', error);
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

const todayKey = () => new Date().toISOString().slice(0, 10);

// HIER KANNST DU DAS RÄTSEL UND DIE LÖSUNG IM CODE ÄNDERN.
const DAILY_RIDDLE = {
  question: '1+1',
  answer: '2',
  rewardPoints: 100,
};

const accounts = loadAccounts();
const activeAccount = ACTIVE_ACCOUNT_KEY ? accounts[ACTIVE_ACCOUNT_KEY] : null;

const findLocalAccountsByClan = (allAccounts, clan) => Object.entries(allAccounts)
  .filter(([, account]) => normalizeValue(account.clan) === normalizeValue(clan))
  .map(([accountKey, account]) => ({ ...account, accountKey }));

const mergeClanMembers = (members) => {
  const merged = new Map();

  members.forEach((member) => {
    const memberKey = member.accountKey ?? `${normalizeValue(member.name)}::${normalizeValue(member.clan)}`;
    const existingMember = merged.get(memberKey);

    if (!existingMember || (member.points ?? 0) >= (existingMember.points ?? 0)) {
      merged.set(memberKey, member);
    }
  });

  return [...merged.values()].sort((left, right) => {
    if ((right.points ?? 0) !== (left.points ?? 0)) {
      return (right.points ?? 0) - (left.points ?? 0);
    }

    return left.name.localeCompare(right.name, 'de');
  });
};

const renderClanMembers = (members) => {
  clanMembersList.innerHTML = '';
  clanMembersCount.textContent = `${members.length} Mitglied${members.length === 1 ? '' : 'er'}`;

  members.forEach((member) => {
    const item = document.createElement('li');
    item.className = 'clan-member-item';

    const name = document.createElement('span');
    name.className = 'clan-member-name';
    name.textContent = member.name;

    const points = document.createElement('span');
    points.className = 'clan-member-points';
    points.textContent = `${member.points ?? 0} Punkte`;

    if (member.accountKey === ACTIVE_ACCOUNT_KEY) {
      const youBadge = document.createElement('span');
      youBadge.className = 'clan-member-badge';
      youBadge.textContent = 'Du';
      name.appendChild(youBadge);
    }

    item.append(name, points);
    clanMembersList.appendChild(item);
  });
};

const updateClanMembers = async () => {
  const localMembers = findLocalAccountsByClan(loadAccounts(), activeAccount.clan);
  const remoteMembers = await loadRemoteAccountsByClan(activeAccount.clan);
  const clanMembers = mergeClanMembers([...localMembers, ...remoteMembers, activeAccount]);
  renderClanMembers(clanMembers);
};

if (!activeAccount) {
  window.location.href = 'index.html';
} else {
  const renderAccount = () => {
    accountName.textContent = activeAccount.name;
    accountClan.textContent = activeAccount.clan;
    accountPoints.textContent = `${activeAccount.points} Punkte`;
    riddleQuestion.textContent = DAILY_RIDDLE.question;
  };

  const hydrateFromSupabase = async () => {
    const remoteAccount = await loadRemoteAccount(ACTIVE_ACCOUNT_KEY);

    if (!remoteAccount) {
      return;
    }

    Object.assign(activeAccount, remoteAccount);
    accounts[ACTIVE_ACCOUNT_KEY] = activeAccount;
    saveAccounts(accounts);
    renderAccount();
    await updateClanMembers();
  };

  renderAccount();
  updateClanMembers();
  hydrateFromSupabase();

  accountClan?.addEventListener('click', async () => {
    const isExpanded = accountClan.getAttribute('aria-expanded') === 'true';
    const nextExpanded = !isExpanded;

    accountClan.setAttribute('aria-expanded', String(nextExpanded));
    clanMembersPanel.hidden = !nextExpanded;

    if (nextExpanded) {
      await updateClanMembers();
    }
  });

  riddleForm?.addEventListener('submit', async (event) => {
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
    await saveRemoteAccount(ACTIVE_ACCOUNT_KEY, activeAccount);
    renderAccount();
    await updateClanMembers();

    riddleMessage.textContent = `Richtig! Du bekommst ${DAILY_RIDDLE.rewardPoints} Punkte für das heutige Rätsel.`;
    riddleMessage.className = 'message success';
    riddleForm.reset();
  });

  logoutButton?.addEventListener('click', () => {
    sessionStorage.removeItem('activeAccountKey');
    window.location.href = 'index.html';
  });
}
