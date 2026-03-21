const windowSupabaseUrl = typeof window.SUPABASE_URL === 'string' ? window.SUPABASE_URL : '';
const windowSupabaseAnonKey = typeof window.SUPABASE_ANON_KEY === 'string' ? window.SUPABASE_ANON_KEY : '';

// Fallback: unterstützt auch Konfigurationen, die SUPABASE_URL/SUPABASE_ANON_KEY
// direkt auf globalThis setzen.
const globalSupabaseUrl = typeof globalThis.SUPABASE_URL === 'string' ? globalThis.SUPABASE_URL : '';
const globalSupabaseAnonKey = typeof globalThis.SUPABASE_ANON_KEY === 'string' ? globalThis.SUPABASE_ANON_KEY : '';

const resolvedSupabaseUrl = (windowSupabaseUrl || globalSupabaseUrl).trim();
const resolvedSupabaseAnonKey = (windowSupabaseAnonKey || globalSupabaseAnonKey).trim();

const hasSupabaseConfig = Boolean(resolvedSupabaseUrl && resolvedSupabaseAnonKey);
const hasSupabaseLib = Boolean(window.supabase?.createClient);

const accountStoreReason = !hasSupabaseConfig
  ? 'missing_config'
  : (!hasSupabaseLib ? 'missing_library' : 'ok');

const supabaseClient = accountStoreReason === 'ok'
  ? window.supabase.createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey)
  : null;

const MARKETPLACE_ITEMS = [
  { itemKey: 'feder', itemName: 'Feder', defaultPrice: 300 },
  { itemKey: 'gehstock', itemName: 'Gehstock', defaultPrice: 500 },
  { itemKey: 'buch', itemName: 'Buch', defaultPrice: 700 },
];

const mapRowToAccount = (row) => ({
  accountKey: row.account_key,
  name: row.name,
  clan: row.clan,
  points: row.points ?? 0,
  lastSolvedDate: row.last_solved_date,
  personalPassword: row.personal_password,
});

const mapAccountToRow = (accountKey, account) => ({
  account_key: accountKey,
  name: account.name,
  clan: account.clan,
  points: account.points ?? 0,
  last_solved_date: account.lastSolvedDate ?? null,
  personal_password: account.personalPassword,
});

const mapRowToMarketplaceListing = (row) => ({
  itemKey: row.item_key,
  itemName: row.item_name,
  defaultPrice: row.default_price ?? row.price ?? 0,
  price: row.price ?? row.default_price ?? 0,
  ownerAccountKey: row.owner_account_key,
  ownerName: row.owner_name,
  isListed: Boolean(row.is_listed),
});

const mapMarketplaceListingToRow = (listing) => ({
  item_key: listing.itemKey,
  item_name: listing.itemName,
  default_price: listing.defaultPrice,
  price: listing.price,
  owner_account_key: listing.ownerAccountKey ?? null,
  owner_name: listing.ownerName ?? null,
  is_listed: Boolean(listing.isListed),
});

window.accountStore = {
  enabled: Boolean(supabaseClient),
  reason: accountStoreReason,
  marketplaceItems: MARKETPLACE_ITEMS,

  async getAccount(accountKey) {
    if (!supabaseClient || !accountKey) {
      return null;
    }

    const { data, error } = await supabaseClient
      .from('daily_riddle_accounts')
      .select('*')
      .eq('account_key', accountKey)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapRowToAccount(data) : null;
  },

  async findAccountsByIdentity(name, clan) {
    if (!supabaseClient || !name || !clan) {
      return [];
    }

    const { data, error } = await supabaseClient
      .from('daily_riddle_accounts')
      .select('*')
      .eq('name', name)
      .eq('clan', clan);

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapRowToAccount);
  },

  async findAccountsByClan(clan) {
    if (!supabaseClient || !clan) {
      return [];
    }

    const { data, error } = await supabaseClient
      .from('daily_riddle_accounts')
      .select('*')
      .eq('clan', clan)
      .order('points', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapRowToAccount);
  },

  async saveAccount(accountKey, account) {
    if (!supabaseClient || !accountKey) {
      return;
    }

    const payload = mapAccountToRow(accountKey, account);
    const { error } = await supabaseClient
      .from('daily_riddle_accounts')
      .upsert(payload, { onConflict: 'account_key' });

    if (error) {
      throw error;
    }
  },

  async deleteAccount(accountKey) {
    if (!supabaseClient || !accountKey) {
      return;
    }

    const { error } = await supabaseClient
      .from('daily_riddle_accounts')
      .delete()
      .eq('account_key', accountKey);

    if (error) {
      throw error;
    }
  },

  async ensureMarketplaceSeeded() {
    if (!supabaseClient) {
      return [];
    }

    const { data, error } = await supabaseClient
      .from('daily_riddle_marketplace')
      .select('*');

    if (error) {
      throw error;
    }

    const existingItemKeys = new Set((data ?? []).map((listing) => listing.item_key));
    const missingRows = MARKETPLACE_ITEMS
      .filter((item) => !existingItemKeys.has(item.itemKey))
      .map((item) => ({
        item_key: item.itemKey,
        item_name: item.itemName,
        default_price: item.defaultPrice,
        price: item.defaultPrice,
        owner_account_key: null,
        owner_name: null,
        is_listed: true,
      }));

    if (missingRows.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('daily_riddle_marketplace')
        .upsert(missingRows, { onConflict: 'item_key' });

      if (insertError) {
        throw insertError;
      }
    }

    return this.listMarketplaceListings();
  },

  async listMarketplaceListings() {
    if (!supabaseClient) {
      return [];
    }

    const { data, error } = await supabaseClient
      .from('daily_riddle_marketplace')
      .select('*')
      .order('default_price', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapRowToMarketplaceListing);
  },

  async saveMarketplaceListing(listing) {
    if (!supabaseClient || !listing?.itemKey) {
      return;
    }

    const payload = mapMarketplaceListingToRow(listing);
    const { error } = await supabaseClient
      .from('daily_riddle_marketplace')
      .upsert(payload, { onConflict: 'item_key' });

    if (error) {
      throw error;
    }
  },
};
