const ACTIVE_ACCOUNT_KEY = sessionStorage.getItem('activeAccountKey');
const clanTitle = document.getElementById('clan-title');
const clanMessage = document.getElementById('clan-message');
const clanSyncStatus = document.getElementById('clan-sync-status');
const clanMembersCount = document.getElementById('clan-members-count');
const clanMembersList = document.getElementById('clan-members-list');

const normalizeValue = (value) => value.trim().toLowerCase();

const loadAccounts = () => {
  const raw = localStorage.getItem('dailyRiddleAccounts');
  return raw ? JSON.parse(raw) : {};
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

const findLocalAccountsByClan = (accounts, clan) => Object.entries(accounts)
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
  clanMembersCount.textContent = `${members.length}`;

  members.forEach((member) => {
    const item = document.createElement('li');
    item.className = 'clan-member-item';

    const name = document.createElement('span');
    name.className = 'clan-member-name';
    name.textContent = member.accountKey === ACTIVE_ACCOUNT_KEY ? `${member.name} (du)` : member.name;

    const points = document.createElement('span');
    points.className = 'clan-member-points';
    points.textContent = `${member.points ?? 0} Punkte`;

    item.append(name, points);
    clanMembersList.appendChild(item);
  });
};

const renderSyncStatus = (remoteEnabled, remoteMembersCount) => {
  if (!remoteEnabled) {
    clanSyncStatus.textContent = 'Cloud-Sync ist deaktiviert. Gerade siehst du nur Accounts von diesem Gerät. Trage in supabase-config.js deine SUPABASE_URL und deinen SUPABASE_ANON_KEY ein, damit alle Geräte dieselben Clan-Mitglieder sehen.';
    clanSyncStatus.className = 'sync-status warning';
    return;
  }

  clanSyncStatus.textContent = remoteMembersCount > 0
    ? 'Cloud-Sync ist aktiv. Die Clan-Liste enthält Accounts von allen verbundenen Geräten.'
    : 'Cloud-Sync ist aktiv, aber es wurden noch keine weiteren Clan-Accounts aus Supabase gefunden.';
  clanSyncStatus.className = 'sync-status success';
};

const initializeClanPage = async () => {
  const accounts = loadAccounts();
  const activeAccount = ACTIVE_ACCOUNT_KEY ? accounts[ACTIVE_ACCOUNT_KEY] : null;

  if (!activeAccount) {
    window.location.href = 'index.html';
    return;
  }

  clanTitle.textContent = activeAccount.clan;
  clanMessage.textContent = '';

  const remoteEnabled = Boolean(window.accountStore?.enabled);
  const localMembers = findLocalAccountsByClan(accounts, activeAccount.clan);
  const remoteMembers = await loadRemoteAccountsByClan(activeAccount.clan);
  const clanMembers = mergeClanMembers([...localMembers, ...remoteMembers, activeAccount]);

  renderClanMembers(clanMembers);
  renderSyncStatus(remoteEnabled, remoteMembers.length);

  if (clanMembers.length === 0) {
    clanMessage.textContent = 'Es wurden noch keine Mitglieder für deinen Clan gefunden.';
    clanMessage.className = 'message error';
    return;
  }

  clanMessage.textContent = `${clanMembers.length} Personen in deinem Clan.`;
  clanMessage.className = 'message success';
};

initializeClanPage();
