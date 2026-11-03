# Server THE LIFTING ZONE (Supabase)

Serve solo alla versione della palestra. FORGIA personale resta senza server.

1. Crea un progetto Supabase in regione UE (Frankfurt). Authentication → Providers → Email: disattiva "Confirm email" e le email di sistema.
2. SQL Editor: incolla ed esegui `schema.sql`.
3. Authentication → Users → "Add user" per te (email e password a scelta), copia l'UUID ed esegui l'`insert into profiles ... 'admin'` in fondo a `schema.sql`. Poi Authentication → Multi-Factor: attiva TOTP.
4. Funzione di gestione accessi: `supabase functions deploy admin-users` (imposta `LOGIN_DOMAIN` se vuoi un dominio diverso da `login.tlz.app`; non deve ricevere posta).
5. Nell'app: in `scripts/build-www.js` imposta `server: { url: "https://XXXX.supabase.co", anonKey: "..." }` (chiave *anon*, pubblica per progetto). Non inserire mai la `service_role`.
6. Prima di usarla con clienti reali: informativa privacy, consenso al trattamento dei dati sulla salute (anche dei minori, firmato dal genitore), nomina del responsabile del trattamento e verifica di un consulente privacy.

Ruoli: `admin` (fornitore: console separata su `/admin/`, verifica a due passaggi obbligatoria, tutte le palestre), `head` (allenatore principale: la sua palestra, crea allenatori e clienti), `coach` (allenatore: i suoi clienti, o tutti quelli della palestra se l'allenatore principale lo consente), `client` (vede e scarica solo i propri dati).

Regole di sicurezza: nessuno può leggere le password (si reimpostano). L'amministratore legge tutto ma di base non scrive nei dati degli altri: il blocco in scrittura lo gestisce solo lui dalla console (sblocca per il tempo che sceglie, ogni cambio è nel registro). L'accesso dell'amministratore va dichiarato nel contratto e nell'informativa privacy.

Indirizzi: app dei clienti e allenatori `.../gym/`, console amministratore `.../admin/` (non collegata da nessuna parte, `noindex`).

## Sicurezza e backup
- L'app ha una Content-Security-Policy (niente script esterni) e non invia l'indirizzo di provenienza.
- Funzione `admin-users`: imposta `ALLOWED_ORIGINS` (indirizzi di /gym/ e /admin/ separati da virgola) per accettare solo quelli.
- Console amministratore: disconnessione automatica dopo 15 minuti di inattività; verifica a due passaggi obbligatoria.
- Dopo ogni aggiornamento la console propone (l'admin: parte da sola) il backup Excel di tutti gli utenti da tenere sul PC.

## Stato installazione
- Progetto Supabase `the-lifting-zone` (eu-central-1): tabelle, regole di sicurezza, funzioni `admin-users` e `bootstrap-admin` installate.
- Il primo amministratore si crea dall'app con la «Prima configurazione» (codice monouso `bootstrap_setup`, che si cancella dopo l'uso). Fatto il 2026-11-03.
- Le app FORGIA (principale) e THE LIFTING ZONE usano lo stesso server: stesso accesso con nome e password, ruolo dall'account. Sul server va solo l'allenamento (lista `SHARE` in account.js): dieta, alimenti ed esami restano sul dispositivo.
- Facoltativo: disattivare 'Allow new users to sign up' in Authentication > Sign In / Providers.
