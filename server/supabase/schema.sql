-- THE LIFTING ZONE / FORGIA – schema Supabase (PostgreSQL) con sicurezza a livello di riga (RLS).
-- Eseguire una sola volta dal SQL Editor di Supabase (progetto in regione UE). Nessun dato personale è contenuto in questo file.
create extension if not exists pgcrypto;

do $$ begin create type app_role as enum ('client','coach','owner','dev'); exception when duplicate_object then null; end $$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  role app_role not null default 'client',
  birth date,
  coach_id uuid references profiles(id) on delete set null,
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid
);

-- Un record per cliente: il profilo completo dell'app (sedute, dolori, misure, schede) come JSON.
create table if not exists client_data (
  user_id uuid primary key references profiles(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  device text
);

-- Scheda scritta dall'allenatore e consegnata al cliente (il cliente la importa con un tocco).
create table if not exists assigned_plans (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  coach_id uuid references profiles(id) on delete set null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  imported_at timestamptz
);

-- Consensi (anche dei minori: nome del genitore/tutore e contatto).
create table if not exists consents (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null,                 -- privacy | dati_salute | termini
  version text not null,
  accepted_at timestamptz not null default now(),
  is_minor boolean not null default false,
  guardian_name text,
  guardian_contact text,
  recorded_by uuid
);

-- Registro accessi e modifiche (chi ha visto o cambiato cosa).
create table if not exists audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  target uuid,
  detail jsonb
);

-- Impostazioni modificabili dallo sviluppatore senza aggiornare l'app.
create table if not exists app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function my_role() returns app_role language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() and active $$;

create or replace function is_staff() returns boolean language sql stable security definer set search_path = public as
$$ select coalesce(my_role() in ('coach','owner','dev'), false) $$;

create or replace function can_see(uid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select uid = auth.uid()
      or my_role() in ('owner','dev')
      or (my_role() = 'coach' and exists (select 1 from profiles c where c.id = uid and (c.coach_id = auth.uid() or c.coach_id is null) and c.role = 'client')) $$;

alter table profiles enable row level security;
alter table client_data enable row level security;
alter table assigned_plans enable row level security;
alter table consents enable row level security;
alter table audit_log enable row level security;
alter table app_config enable row level security;

drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (can_see(id));

drop policy if exists cd_read on client_data;
create policy cd_read on client_data for select using (can_see(user_id));
drop policy if exists cd_ins on client_data;
create policy cd_ins on client_data for insert with check (user_id = auth.uid() and my_role() is not null);
drop policy if exists cd_upd on client_data;
create policy cd_upd on client_data for update using (user_id = auth.uid() and my_role() is not null) with check (user_id = auth.uid());

drop policy if exists ap_read on assigned_plans;
create policy ap_read on assigned_plans for select using (can_see(user_id));
drop policy if exists ap_ins on assigned_plans;
create policy ap_ins on assigned_plans for insert with check (is_staff() and can_see(user_id) and coach_id = auth.uid());
drop policy if exists ap_upd on assigned_plans;
create policy ap_upd on assigned_plans for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists co_read on consents;
create policy co_read on consents for select using (can_see(user_id));
drop policy if exists co_ins on consents;
create policy co_ins on consents for insert with check (user_id = auth.uid() or (is_staff() and can_see(user_id)));

drop policy if exists al_read on audit_log;
create policy al_read on audit_log for select using (my_role() in ('owner','dev'));
drop policy if exists al_ins on audit_log;
create policy al_ins on audit_log for insert with check (actor = auth.uid());

drop policy if exists cfg_read on app_config;
create policy cfg_read on app_config for select using (auth.uid() is not null);
drop policy if exists cfg_write on app_config;
create policy cfg_write on app_config for all using (my_role() = 'dev') with check (my_role() = 'dev');

-- Versione e data di modifica gestite dal server (evita sovrascritture involontarie).
create or replace function bump_client_data() returns trigger language plpgsql as
$$ begin new.version := coalesce(old.version, 0) + 1; new.updated_at := now(); return new; end $$;
drop trigger if exists trg_bump on client_data;
create trigger trg_bump before update on client_data for each row execute function bump_client_data();

-- L'utente segna di aver cambiato la password iniziale.
create or replace function password_changed() returns void language sql security definer set search_path = public as
$$ update profiles set must_change_password = false where id = auth.uid() $$;

-- Registra la consultazione dei dati di un cliente da parte dello staff.
create or replace function log_access(target uuid, act text) returns void language sql security definer set search_path = public as
$$ insert into audit_log(actor, action, target) select auth.uid(), act, target where is_staff() and can_see(target) $$;

-- Primo sviluppatore (eseguire UNA volta dopo aver creato il proprio utente in Authentication > Users):
--   insert into profiles(id, username, full_name, role, must_change_password) values ('<uuid-utente>', 'dev', 'Sviluppatore', 'dev', false);
