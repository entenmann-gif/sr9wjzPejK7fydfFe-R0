# Daily Riddle Clan Website

Eine kleine statische Website mit Startscreen, Clan-Passwort-Login und Daily-Riddle-Dashboard.

## Nutzung

1. `index.html` im Browser öffnen.
2. Einen Namen eingeben.
3. Das Clan-Passwort `dünnschiss` verwenden, um dem Clan `Chaos Crew` beizutreten.
4. Ein eigenes Zugangspasswort festlegen (bei späteren Logins muss es wieder eingegeben werden).
5. Auf dem Dashboard das tägliche Rätsel lösen und einmal pro Tag 100 Punkte erhalten.

## Supabase aktivieren

Die App speichert weiterhin lokal im Browser, kann aber zusätzlich mit Supabase synchronisieren.

1. In Supabase eine Tabelle `daily_riddle_accounts` anlegen:

```sql
create table if not exists public.daily_riddle_accounts (
  account_key text primary key,
  name text not null,
  clan text not null,
  points integer not null default 0,
  last_solved_date text,
  personal_password text not null,
  updated_at timestamptz not null default now()
);
```

2. `supabase-config.js` ausfüllen:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

3. Optional: Für öffentlichen Zugriff passende RLS-Policies konfigurieren (oder in einem geschützten Setup arbeiten).

Wenn keine Supabase-Daten eingetragen sind, läuft die App automatisch nur mit Local Storage.
