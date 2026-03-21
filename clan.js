const ACTIVE_ACCOUNT_KEY = sessionStorage.getItem('activeAccountKey');
const clanTitle = document.getElementById('clan-title');
const clanMessage = document.getElementById('clan-message');
const clanMembersCount = document.getElementById('clan-members-count');
const clanMembersList = document.getElementById('clan-members-list');

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
  clanMembersCount.textContent = `${members.length}`;

  members.forEach((member) => {
    const item = document.createElement('li');
    item.className = 'clan-member-item';

    const name = document.createElement('span');
    name.className = 'clan-member-name';
    name.textContent = member.accountKey === ACTIVE_ACCOUNT_KEY ? `${member.name} (du)` : member.name;

    const points = document.createElement('span');
    points.className = 'clan-member-points';
    points.textContent = `${member.points ?? 0} R coin`;

    item.append(name, points);
    clanMembersList.appendChild(item);
  });
};

const initializeClanPage = async () => {
  if (!ACTIVE_ACCOUNT_KEY || !window.accountStore?.enabled) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const activeAccount = await loadRemoteAccount(ACTIVE_ACCOUNT_KEY);

    if (!activeAccount) {
      sessionStorage.removeItem('activeAccountKey');
      window.location.href = 'index.html';
      return;
    }

    activeAccount.accountKey = ACTIVE_ACCOUNT_KEY;

    clanTitle.textContent = activeAccount.clan;
    clanMessage.textContent = '';

    const remoteMembers = await loadRemoteAccountsByClan(activeAccount.clan);
    const clanMembers = mergeClanMembers([...remoteMembers, activeAccount]);

    renderClanMembers(clanMembers);

    if (clanMembers.length === 0) {
      clanMessage.textContent = 'Es wurden noch keine Mitglieder für deinen Clan gefunden.';
      clanMessage.className = 'message error';
      return;
    }

    clanMessage.textContent = `${clanMembers.length} Personen in deinem Clan.`;
    clanMessage.className = 'message success';
  } catch (error) {
    console.error('Clan-Seite konnte Supabase-Daten nicht laden.', error);
    window.location.href = 'index.html';
  }
};

initializeClanPage();
