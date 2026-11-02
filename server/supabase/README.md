# Server THE LIFTING ZONE (Supabase)

Serve solo alla versione della palestra. FORGIA personale resta senza server.

1. Crea un progetto Supabase in regione UE (Frankfurt). Authentication → Providers → Email: disattiva "Confirm email" e le email di sistema.
2. SQL Editor: incolla ed esegui `schema.sql`.
3. Authentication → Users → "Add user" per te (email e password a scelta), copia l'UUID e esegui l'`insert into profiles ... 'dev'` in fondo a `schema.sql`.
4. Funzione di gestione accessi: `supabase functions deploy admin-users` (imposta `LOGIN_DOMAIN` se vuoi un dominio diverso da `login.tlz.app`; non deve ricevere posta).
5. Nell'app: in `scripts/build-www.js` imposta `server: { url: "https://XXXX.supabase.co", anonKey: "..." }` (chiave *anon*, pubblica per progetto). Non inserire mai la `service_role`.
6. Prima di usarla con clienti reali: informativa privacy, consenso al trattamento dei dati sulla salute (anche dei minori, firmato dal genitore), nomina del responsabile del trattamento e verifica di un consulente privacy.

Ruoli: `client` (vede e scarica solo i propri dati), `coach` (allenatore: clienti assegnati), `owner` (titolare: tutti i clienti e gli accessi), `dev` (sviluppatore: controllo totale, registro accessi, impostazioni).
