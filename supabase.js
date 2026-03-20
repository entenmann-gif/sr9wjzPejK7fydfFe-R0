(() => {
  try {
    const windowSupabaseUrl = typeof window.SUPABASE_URL === 'string' ? window.SUPABASE_URL : '';
    const windowSupabaseAnonKey = typeof window.SUPABASE_ANON_KEY === 'string' ? window.SUPABASE_ANON_KEY : '';

    // Unterstützt zusätzlich Konfigurationen ohne window.-Prefix
    // (z. B. `const SUPABASE_URL = '...'` in supabase-config.js).
    const lexicalSupabaseUrl = typeof SUPABASE_URL === 'string' ? SUPABASE_URL : '';
    const lexicalSupabaseAnonKey = typeof SUPABASE_ANON_KEY === 'string' ? SUPABASE_ANON_KEY : '';

    const globalSupabaseUrl = typeof globalThis.SUPABASE_URL === 'string' ? globalThis.SUPABASE_URL : '';
    const globalSupabaseAnonKey = typeof globalThis.SUPABASE_ANON_KEY === 'string' ? globalThis.SUPABASE_ANON_KEY : '';

    const resolvedSupabaseUrl = (windowSupabaseUrl || lexicalSupabaseUrl || globalSupabaseUrl).trim();
    const resolvedSupabaseAnonKey = (windowSupabaseAnonKey || lexicalSupabaseAnonKey || globalSupabaseAnonKey).trim();

    const hasSupabaseConfig = Boolean(resolvedSupabaseUrl && resolvedSupabaseAnonKey);
    const hasSupabaseLib = Boolean(window.supabase?.createClient);

    const accountStoreReason = !hasSupabaseConfig
      ? 'missing_config'
      : (!hasSupabaseLib ? 'missing_library' : 'ok');

    const supabaseClient = accountStoreReason === 'ok'
      ? window.supabase.createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey)
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
      configDebug: {
        hasUrl: Boolean(resolvedSupabaseUrl),
        hasAnonKey: Boolean(resolvedSupabaseAnonKey),
      },

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
  } catch (error) {
    console.error('Supabase-Initialisierung ist fehlgeschlagen.', error);
    window.accountStore = {
      enabled: false,
      reason: 'init_error',
      configDebug: {
        hasUrl: false,
        hasAnonKey: false,
      },
    };
  }
})();
