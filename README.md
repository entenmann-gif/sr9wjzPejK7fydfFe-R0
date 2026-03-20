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

## GitHub Secrets: Ja, aber mit Einschränkung

Du kannst `SUPABASE_URL` und `SUPABASE_ANON_KEY` in GitHub Secrets speichern und z. B. im Deploy-Workflow in `supabase-config.js` schreiben.

**Wichtig:** Diese App läuft komplett im Browser. Alles, was an den Browser ausgeliefert wird, ist für Nutzer sichtbar. Daher:

- Der **anon key** darf öffentlich im Frontend verwendet werden.
- Der **service_role key** darf **niemals** im Frontend landen (nur Server/Edge Functions).

Das heißt: GitHub Secrets helfen dir beim sicheren Build/Deploy-Prozess, aber der anon key ist danach trotzdem im ausgelieferten JavaScript sichtbar.

## RLS-Befehle für „öffentlich nutzbar“

Wenn die App ohne Login (anonym) lesen und schreiben können soll, aktiviere RLS und erlaube `anon` explizit per Policy:

```sql
alter table public.daily_riddle_accounts enable row level security;

create policy "Public read accounts"
on public.daily_riddle_accounts
for select
to anon
using (true);

create policy "Public insert accounts"
on public.daily_riddle_accounts
for insert
to anon
with check (true);

create policy "Public update accounts"
on public.daily_riddle_accounts
for update
to anon
using (true)
with check (true);
```

Falls du alte Policies ersetzen willst, vorher löschen:

```sql
drop policy if exists "Public read accounts" on public.daily_riddle_accounts;
drop policy if exists "Public insert accounts" on public.daily_riddle_accounts;
drop policy if exists "Public update accounts" on public.daily_riddle_accounts;
```

> Sicherheitshinweis: Diese Policies erlauben **jedem** anonymen Client, alle Accounts zu lesen und zu ändern. Für produktive Nutzung besser Auth + nutzergebundene Policies einsetzen.
