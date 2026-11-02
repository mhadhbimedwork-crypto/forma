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
