# Daily Riddle Clan Website

Eine kleine statische Website mit Startscreen, Clan-Passwort-Login und Daily-Riddle-Dashboard.

## Nutzung

1. `index.html` im Browser öffnen.
2. Einen Namen eingeben.
3. Eines der Clan-Passwörter verwenden, um dem passenden Clan beizutreten 
4. Ein eigenes Zugangspasswort festlegen (bei späteren Logins muss es wieder eingegeben werden).
5. Auf dem Dashboard das tägliche Rätsel lösen und einmal pro Tag 100 R coin erhalten.

## Supabase aktivieren

Die App speichert Accounts ausschließlich in Supabase (kein Local-Storage-Fallback).


> Hinweis: Die Datei liegt direkt im Projekt-Root als `supabase-config.js`.
> Wenn sie fehlt: `cp supabase-config.example.js supabase-config.js`

1. In Supabase eine Tabelle `daily_riddle_accounts` anlegen:

```sql
create table if not exists public.daily_riddle_accounts (
  account_key text primary key,
  name text not null,
  clan text not null,
  points integer not null default 0, -- wird im UI als R coin angezeigt
  last_solved_date text,
  personal_password text not null,
  updated_at timestamptz not null default now()
);
```

Zusätzlich für das R coin Tauschhaus diese Tabelle anlegen:

```sql
create table if not exists public.daily_riddle_marketplace (
  item_key text primary key,
  item_name text not null,
  default_price integer not null,
  price integer not null,
  owner_account_key text,
  owner_name text,
  is_listed boolean not null default true
);
```

2. `supabase-config.js` ausfüllen:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

   Falls die Datei fehlt, kannst du sie aus `supabase-config.example.js` erstellen.

3. Optional: Für öffentlichen Zugriff passende RLS-Policies konfigurieren (oder in einem geschützten Setup arbeiten).

Ohne gültige Supabase-Daten ist kein Login möglich (kein Local-Storage-Fallback).
