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

const normalizeValue = (value) => value.trim().toLowerCase();

const loadRemoteAccount = async (accountKey) => {
  if (!window.accountStore?.enabled || !accountKey) {
    return null;
  }

  return window.accountStore.getAccount(accountKey);
};

const loadRemoteAccountsByClan = async (clan) => {
  if (!window.accountStore?.enabled || !clan) {
    return [];
  }

  return window.accountStore.findAccountsByClan(clan);
};

const saveRemoteAccount = async (accountKey, account) => {
  if (!window.accountStore?.enabled || !accountKey) {
    return;
  }

  await window.accountStore.saveAccount(accountKey, account);
};

const todayKey = () => new Date().toISOString().slice(0, 10);

// HIER KANNST DU DAS RÄTSEL UND DIE LÖSUNG IM CODE ÄNDERN.
const DAILY_RIDDLE = {
  question: 'was ist au 79?',
  answer: 'gold',
  rewardPoints: 100,
};

let activeAccount = null;

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
  const remoteMembers = await loadRemoteAccountsByClan(activeAccount.clan);
  const clanMembers = mergeClanMembers([...remoteMembers, activeAccount]);
  renderClanMembers(clanMembers);
};

const renderAccount = () => {
  accountName.textContent = activeAccount.name;
  accountClan.textContent = activeAccount.clan;
  accountPoints.textContent = `${activeAccount.points} Punkte`;
  riddleQuestion.textContent = DAILY_RIDDLE.question;
};

const initializeDashboard = async () => {
  if (!ACTIVE_ACCOUNT_KEY || !window.accountStore?.enabled) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const remoteAccount = await loadRemoteAccount(ACTIVE_ACCOUNT_KEY);

    if (!remoteAccount) {
      sessionStorage.removeItem('activeAccountKey');
      window.location.href = 'index.html';
      return;
    }

    activeAccount = { ...remoteAccount, accountKey: ACTIVE_ACCOUNT_KEY };
    renderAccount();
    await updateClanMembers();
  } catch (error) {
    console.error('Dashboard konnte Supabase-Daten nicht laden.', error);
    window.location.href = 'index.html';
  }
};

initializeDashboard();

accountClan?.addEventListener('click', async () => {
  if (!activeAccount) {
    return;
  }

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

  if (!activeAccount) {
    return;
  }

  const answer = document.getElementById('riddle-answer').value.trim();

  if (activeAccount.lastSolvedDate === todayKey()) {
    riddleMessage.textContent = 'Du hast das heutige Rätsel schon gelöst und deine 100 Punkte bereits bekommen.';
    riddleMessage.className = 'message error';
    return;
  }

  if (normalizeValue(answer) !== normalizeValue(DAILY_RIDDLE.answer)) {
    riddleMessage.textContent = 'Leider falsch. Versuch es noch einmal.';
    riddleMessage.className = 'message error';
    return;
  }

  activeAccount.points += DAILY_RIDDLE.rewardPoints;
  activeAccount.lastSolvedDate = todayKey();

  try {
    await saveRemoteAccount(ACTIVE_ACCOUNT_KEY, activeAccount);
    renderAccount();
    await updateClanMembers();

    riddleMessage.textContent = `Richtig! Du bekommst ${DAILY_RIDDLE.rewardPoints} Punkte für das heutige Rätsel.`;
    riddleMessage.className = 'message success';
    riddleForm.reset();
  } catch (error) {
    console.error('Supabase konnte die Punkte nicht speichern.', error);
    riddleMessage.textContent = 'Speichern in Supabase fehlgeschlagen. Bitte erneut versuchen.';
    riddleMessage.className = 'message error';
  }
});

logoutButton?.addEventListener('click', () => {
  sessionStorage.removeItem('activeAccountKey');
  window.location.href = 'index.html';
});
