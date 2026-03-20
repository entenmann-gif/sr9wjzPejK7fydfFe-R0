const SUPABASE_URL = window.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY ?? '';

const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const hasSupabaseLib = Boolean(window.supabase?.createClient);

const supabaseClient = hasSupabaseConfig && hasSupabaseLib
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const mapRowToAccount = (row) => ({
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
};
