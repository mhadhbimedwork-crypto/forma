-- THE LIFTING ZONE – schema Supabase (PostgreSQL) v2: palestre, ruoli e sicurezza a livello di riga (RLS).
-- Ruoli: admin (fornitore, SOLA LETTURA sui dati dei clienti), head (allenatore principale della palestra), coach (allenatore), client.
-- Eseguire una sola volta dal SQL Editor di Supabase (progetto in regione UE). Nessun dato personale è contenuto in questo file.
create extension if not exists pgcrypto;

do $$ begin create type app_role as enum ('client','coach','head','admin'); exception when duplicate_object then null; end $$;

create table if not exists gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  role app_role not null default 'client',
  birth date,
  gym_id uuid references gyms(id) on delete restrict,
  coach_id uuid references profiles(id) on delete set null,
  can_see_all boolean not null default false,   -- allenatore: vede tutti i clienti della palestra
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
$$ select p.role from profiles p left join gyms g on g.id = p.gym_id where p.id = auth.uid() and p.active and (p.role = 'admin' or g.active) $$;

create or replace function my_gym() returns uuid language sql stable security definer set search_path = public as
$$ select gym_id from profiles where id = auth.uid() $$;

create or replace function is_staff() returns boolean language sql stable security definer set search_path = public as
$$ select coalesce(my_role() in ('coach','head','admin'), false) $$;

-- L'amministratore deve aver superato la verifica a due passaggi (AAL2) per leggere i dati degli altri.
create or replace function aal2() returns boolean language sql stable as
$$ select coalesce(auth.jwt() ->> 'aal', '') = 'aal2' $$;

-- Chi può LEGGERE i dati dell'utente uid.
create or replace function can_see(uid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select uid = auth.uid()
      or (my_role() = 'admin' and aal2())
      or (my_role() = 'head' and exists (select 1 from profiles t where t.id = uid and t.gym_id = my_gym()))
      or (my_role() = 'coach' and exists (select 1 from profiles t, profiles m where t.id = uid and m.id = auth.uid() and t.gym_id = m.gym_id and t.role = 'client' and (t.coach_id = m.id or m.can_see_all))) $$;

alter table gyms enable row level security;
alter table profiles enable row level security;
alter table client_data enable row level security;
alter table assigned_plans enable row level security;
alter table consents enable row level security;
alter table audit_log enable row level security;
alter table app_config enable row level security;

drop policy if exists gyms_read on gyms;
create policy gyms_read on gyms for select using ((my_role() = 'admin' and aal2()) or id = my_gym());

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
create policy al_read on audit_log for select using ((my_role() = 'admin' and aal2()) or (my_role() = 'head' and exists (select 1 from profiles a where a.id = actor and a.gym_id = my_gym())));
drop policy if exists al_ins on audit_log;
create policy al_ins on audit_log for insert with check (actor = auth.uid());

drop policy if exists cfg_read on app_config;
create policy cfg_read on app_config for select using (auth.uid() is not null);
drop policy if exists cfg_write on app_config;
create policy cfg_write on app_config for all using (my_role() = 'admin' and aal2()) with check (my_role() = 'admin' and aal2());

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

-- Blocco di sicurezza dell'amministratore: di base l'admin legge ma NON scrive nei dati degli altri.
-- Lo gestisce solo l'admin (con verifica a due passaggi), con un click: sblocca e blocca quando vuole, senza scadenze. Ogni cambio è registrato.
create table if not exists admin_lock (
  id boolean primary key default true check (id),
  open boolean not null default false
);
insert into admin_lock(id, open) values (true, false) on conflict do nothing;
alter table admin_lock enable row level security;
drop policy if exists lock_read on admin_lock;
create policy lock_read on admin_lock for select using (my_role() = 'admin' and aal2());

create or replace function admin_unlocked() returns boolean language sql stable security definer set search_path = public as
$$ select coalesce((select open from admin_lock where id), false) and my_role() = 'admin' and aal2() $$;

create or replace function set_admin_lock(unlock boolean) returns boolean language plpgsql security definer set search_path = public as
$$ begin
  if my_role() <> 'admin' or not aal2() then raise exception 'non autorizzato'; end if;
  update admin_lock set open = unlock where id;
  insert into audit_log(actor, action) values (auth.uid(), case when unlock then 'lock_off' else 'lock_on' end);
  return unlock;
end $$;

drop policy if exists cd_admin_ins on client_data;
create policy cd_admin_ins on client_data for insert with check (admin_unlocked());
drop policy if exists cd_admin_upd on client_data;
create policy cd_admin_upd on client_data for update using (admin_unlocked()) with check (admin_unlocked());

-- Primo amministratore (UNA volta, dopo aver creato il proprio utente in Authentication > Users):
--   insert into profiles(id, username, full_name, role, must_change_password) values ('<uuid-utente>', 'admin', 'Amministratore', 'admin', false);
-- Poi attiva la verifica a due passaggi (TOTP) dalla console: senza di essa l'amministratore non legge nulla degli altri.

-- 1.26.0: massimali (1RM) dei minorenni, attivabili solo da staff
alter table public.profiles add column if not exists rm_enabled boolean not null default false;
create or replace function public.set_rm_enabled(target uuid, enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
declare me record; t record;
begin
  select id, role, gym_id, can_see_all, active into me from profiles where id = auth.uid();
  if me.id is null or not me.active then raise exception 'non autorizzato'; end if;
  select id, role, gym_id, coach_id into t from profiles where id = target;
  if t.id is null or t.role <> 'client' then raise exception 'utente non valido'; end if;
  if me.role = 'admin' then null;
  elsif me.role = 'head' and me.gym_id = t.gym_id then null;
  elsif me.role = 'coach' and me.gym_id = t.gym_id and (t.coach_id = me.id or me.can_see_all) then null;
  else raise exception 'non autorizzato su questo utente'; end if;
  update profiles set rm_enabled = enabled where id = target;
  insert into audit_log(actor, action, target, detail) values (me.id, 'set_rm_enabled', target, jsonb_build_object('enabled', enabled));
end $$;
revoke all on function public.set_rm_enabled(uuid, boolean) from public, anon;
grant execute on function public.set_rm_enabled(uuid, boolean) to authenticated;
