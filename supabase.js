const windowSupabaseUrl = typeof window.SUPABASE_URL === 'string' ? window.SUPABASE_URL : '';
const windowSupabaseAnonKey = typeof window.SUPABASE_ANON_KEY === 'string' ? window.SUPABASE_ANON_KEY : '';

// Fallback: unterstützt auch Konfigurationen, die SUPABASE_URL/SUPABASE_ANON_KEY
// als globale Variablen (ohne window.-Prefix) deklarieren.
const globalSupabaseUrl = typeof SUPABASE_URL === 'string' ? SUPABASE_URL : '';
const globalSupabaseAnonKey = typeof SUPABASE_ANON_KEY === 'string' ? SUPABASE_ANON_KEY : '';

const SUPABASE_URL = (windowSupabaseUrl || globalSupabaseUrl).trim();
const SUPABASE_ANON_KEY = (windowSupabaseAnonKey || globalSupabaseAnonKey).trim();

const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const hasSupabaseLib = Boolean(window.supabase?.createClient);

const accountStoreReason = !hasSupabaseConfig
  ? 'missing_config'
  : (!hasSupabaseLib ? 'missing_library' : 'ok');

const supabaseClient = accountStoreReason === 'ok'
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

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

window.accountStore = {
  enabled: Boolean(supabaseClient),
  reason: accountStoreReason,

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
};
