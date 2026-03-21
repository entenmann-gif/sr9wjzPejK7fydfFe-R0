const ACTIVE_ACCOUNT_KEY = sessionStorage.getItem('activeAccountKey');
const MARKETPLACE_ACCESS_MINIMUM = 700;
const accountName = document.getElementById('account-name');
const accountClanName = document.getElementById('account-clan-name');
const accountPoints = document.getElementById('account-points');
const riddleQuestion = document.getElementById('riddle-question');
const riddleForm = document.getElementById('riddle-form');
const riddleMessage = document.getElementById('riddle-message');
const logoutButton = document.getElementById('logout-button');
const marketplaceButton = document.getElementById('marketplace-button');
const marketplacePanel = document.getElementById('marketplace-panel');
const marketplaceCloseButton = document.getElementById('marketplace-close-button');
const marketplaceMessage = document.getElementById('marketplace-message');
const marketplaceListings = document.getElementById('marketplace-listings');
const ownedItemsList = document.getElementById('owned-items-list');

const normalizeValue = (value) => value.trim().toLowerCase();
const formatCoins = (value) => `${value ?? 0} R coin`;

const loadRemoteAccount = async (accountKey) => {
  if (!window.accountStore?.enabled || !accountKey) {
    return null;
  }

  return window.accountStore.getAccount(accountKey);
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
let marketplaceState = [];

const renderAccount = () => {
  accountName.textContent = activeAccount.name;
  accountClanName.textContent = activeAccount.clan;
  accountPoints.textContent = formatCoins(activeAccount.points);
  riddleQuestion.textContent = DAILY_RIDDLE.question;
};

const renderMarketplaceList = (container, items, createAction) => {
  container.innerHTML = '';

  if (items.length === 0) {
    const emptyState = document.createElement('li');
    emptyState.className = 'marketplace-empty';
    emptyState.textContent = 'Gerade nichts verfügbar.';
    container.appendChild(emptyState);
    return;
  }

  items.forEach((listing) => {
    const item = document.createElement('li');
    item.className = 'marketplace-item';

    const info = document.createElement('div');
    info.className = 'marketplace-item-info';

    const title = document.createElement('strong');
    title.textContent = listing.itemName;

    const meta = document.createElement('span');
    const sellerText = listing.ownerName ? `Verkäufer: ${listing.ownerName}` : 'Startangebot';
    meta.textContent = `${formatCoins(listing.price)} · ${sellerText}`;

    info.append(title, meta);
    item.appendChild(info);
    item.appendChild(createAction(listing));
    container.appendChild(item);
  });
};

const renderMarketplace = () => {
  const availableListings = marketplaceState.filter((listing) => listing.isListed);
  const ownedItems = marketplaceState.filter(
    (listing) => listing.ownerAccountKey === ACTIVE_ACCOUNT_KEY && !listing.isListed,
  );

  renderMarketplaceList(marketplaceListings, availableListings, (listing) => {
    const actionButton = document.createElement('button');
    actionButton.className = 'button marketplace-action';
    actionButton.type = 'button';

    if (listing.ownerAccountKey === ACTIVE_ACCOUNT_KEY) {
      actionButton.disabled = true;
      actionButton.textContent = 'Dein Angebot';
    } else {
      actionButton.textContent = 'Kaufen';
      actionButton.addEventListener('click', () => {
        void buyMarketplaceItem(listing.itemKey);
      });
    }

    return actionButton;
  });

  renderMarketplaceList(ownedItemsList, ownedItems, (listing) => {
    const actionButton = document.createElement('button');
    actionButton.className = 'button secondary-button marketplace-action';
    actionButton.type = 'button';
    actionButton.textContent = `Für ${formatCoins(listing.defaultPrice)} verkaufen`;
    actionButton.addEventListener('click', () => {
      void sellMarketplaceItem(listing.itemKey);
    });
    return actionButton;
  });
};

const refreshMarketplace = async () => {
  if (!window.accountStore?.enabled) {
    marketplaceState = [];
    renderMarketplace();
    return;
  }

  marketplaceState = await window.accountStore.ensureMarketplaceSeeded();
  renderMarketplace();
};

const setMarketplaceMessage = (text, type) => {
  marketplaceMessage.textContent = text;
  marketplaceMessage.className = `message ${type}`;
};

const buyMarketplaceItem = async (itemKey) => {
  try {
    await refreshMarketplace();
    const listing = marketplaceState.find((entry) => entry.itemKey === itemKey);

    if (!listing || !listing.isListed) {
      setMarketplaceMessage('Dieser Gegenstand ist nicht mehr im Tauschhaus verfügbar.', 'error');
      return;
    }

    if (listing.ownerAccountKey === ACTIVE_ACCOUNT_KEY) {
      setMarketplaceMessage('Dein eigenes Angebot kannst du nicht selbst kaufen.', 'error');
      return;
    }

    if ((activeAccount.points ?? 0) < listing.price) {
      setMarketplaceMessage(`Dir fehlen R coin. Du brauchst ${formatCoins(listing.price)}.`, 'error');
      return;
    }

    activeAccount.points -= listing.price;
    await saveRemoteAccount(ACTIVE_ACCOUNT_KEY, activeAccount);

    if (listing.ownerAccountKey) {
      const sellerAccount = await loadRemoteAccount(listing.ownerAccountKey);

      if (sellerAccount) {
        sellerAccount.points = (sellerAccount.points ?? 0) + listing.price;
        await saveRemoteAccount(listing.ownerAccountKey, sellerAccount);
      }
    }

    const updatedListing = {
      ...listing,
      ownerAccountKey: ACTIVE_ACCOUNT_KEY,
      ownerName: activeAccount.name,
      isListed: false,
      price: listing.defaultPrice,
    };

    await window.accountStore.saveMarketplaceListing(updatedListing);
    renderAccount();
    await refreshMarketplace();

    setMarketplaceMessage(
      listing.ownerName
        ? `${listing.itemName} gekauft. ${formatCoins(listing.price)} wurden an ${listing.ownerName} überwiesen.`
        : `${listing.itemName} gekauft. Der Gegenstand liegt jetzt in deinen Sachen.`,
      'success',
    );
  } catch (error) {
    console.error('Kauf im Tauschhaus fehlgeschlagen.', error);
    setMarketplaceMessage('Das Tauschhaus konnte den Kauf nicht speichern. Bitte erneut versuchen.', 'error');
  }
};

const sellMarketplaceItem = async (itemKey) => {
  try {
    await refreshMarketplace();
    const listing = marketplaceState.find((entry) => entry.itemKey === itemKey);

    if (!listing || listing.ownerAccountKey !== ACTIVE_ACCOUNT_KEY || listing.isListed) {
      setMarketplaceMessage('Dieser Gegenstand kann gerade nicht verkauft werden.', 'error');
      return;
    }

    const updatedListing = {
      ...listing,
      isListed: true,
      price: listing.defaultPrice,
      ownerName: activeAccount.name,
    };

    await window.accountStore.saveMarketplaceListing(updatedListing);
    await refreshMarketplace();
    setMarketplaceMessage(
      `${listing.itemName} steht jetzt für ${formatCoins(listing.defaultPrice)} im Tauschhaus.`,
      'success',
    );
  } catch (error) {
    console.error('Verkauf im Tauschhaus fehlgeschlagen.', error);
    setMarketplaceMessage('Der Gegenstand konnte nicht ins Tauschhaus gestellt werden.', 'error');
  }
};

const openMarketplace = async () => {
  if (!activeAccount) {
    return;
  }

  if ((activeAccount.points ?? 0) < MARKETPLACE_ACCESS_MINIMUM) {
    marketplacePanel.hidden = true;
    riddleMessage.textContent = `Du brauchst mindestens ${formatCoins(MARKETPLACE_ACCESS_MINIMUM)}, um das Tauschhaus zu betreten.`;
    riddleMessage.className = 'message error';
    return;
  }

  marketplacePanel.hidden = false;

  try {
    await refreshMarketplace();
    setMarketplaceMessage('Willkommen im R coin Tauschhaus.', 'success');
  } catch (error) {
    console.error('Tauschhaus konnte nicht geladen werden.', error);
    setMarketplaceMessage('Das Tauschhaus ist gerade nicht verfügbar. Prüfe die Supabase-Tabellen.', 'error');
  }
};

const closeMarketplace = () => {
  marketplacePanel.hidden = true;
  marketplaceMessage.textContent = '';
  marketplaceMessage.className = 'message';
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
  } catch (error) {
    console.error('Dashboard konnte Supabase-Daten nicht laden.', error);
    window.location.href = 'index.html';
  }
};

void initializeDashboard();

marketplaceButton?.addEventListener('click', () => {
  void openMarketplace();
});

marketplaceCloseButton?.addEventListener('click', closeMarketplace);

riddleForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!activeAccount) {
    return;
  }

  const answer = document.getElementById('riddle-answer').value.trim();

  if (activeAccount.lastSolvedDate === todayKey()) {
    riddleMessage.textContent = 'Du hast das heutige Rätsel schon gelöst und deine 100 R coin bereits bekommen.';
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

    riddleMessage.textContent = `Richtig! Du bekommst ${DAILY_RIDDLE.rewardPoints} R coin für das heutige Rätsel.`;
    riddleMessage.className = 'message success';
    riddleForm.reset();
  } catch (error) {
    console.error('Supabase konnte die R coin nicht speichern.', error);
    riddleMessage.textContent = 'Speichern in Supabase fehlgeschlagen. Bitte erneut versuchen.';
    riddleMessage.className = 'message error';
  }
});

logoutButton?.addEventListener('click', () => {
  sessionStorage.removeItem('activeAccountKey');
  window.location.href = 'index.html';
});
