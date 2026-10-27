# FORGIA – allenamento e benessere su misura

App web installabile (PWA) per allenamento, alimentazione e progressi, personalizzata per ogni profilo.
Dati salvati sul dispositivo. Nessun account.

## Usarla subito
Apri `index.html` nel browser (Chrome/Edge). Per installarla sul telefono serve servirla via http(s): vedi sotto.

## Cosa fa
- **Profili multipli** (età, altezza, peso, obiettivo, stile, livello, mesi di stop).
- **Calcolatore**: metabolismo, calorie, proteine, carboidrati, grassi. Regole di tutela per i minorenni.
- **Scheda su misura** (calisthenics, palestra o misto) oppure **import della scheda dell'allenatore** (testo; da foto col server IA).
- **Mappa del corpo**: tocca la zona, dolore 1-10 → esclusione/sostituzione degli esercizi, serie ridotte, versione adattata della scheda.
- **Registro sedute**: peso, ripetizioni, RPE per serie; timer di recupero; suggerimenti di progressione.
- **Progressi**: peso corporeo, forza stimata per esercizio, regolazione automatica dell'alimentazione.
- Backup/ripristino JSON, eliminazione di schede e profili.

## App Android (APK) e aggiornamenti
- **Scarica l'APK:** https://github.com/mhadhbimedwork-crypto/forma/releases/download/apk/FORGIA.apk (si costruisce da solo su GitHub). Sul telefono: apri il file e consenti l'installazione da questa origine.
- **Aggiornamenti:** l'APK è un guscio che carica l'app da https://mhadhbimedwork-crypto.github.io/forma/. Ogni modifica caricata su `main` va online in 1-2 minuti e arriva al telefono alla prossima apertura, senza reinstallare. In app: Profilo → Aggiornamenti e richieste → Controlla aggiornamenti.
- **Richieste dall'app:** Profilo → Aggiornamenti e richieste → scrivi cosa vuoi → "Invia richiesta" (apre una Issue su GitHub già scritta) oppure "Copia per la chat".
- L'APK va ricostruito solo se cambiano icona, nome o parti native (`android/`): parte da solo al push, o da Actions → "Costruisci APK" → Run workflow.
- **Firma:** l'APK è firmato con una chiave generata da GitHub e conservata nella sua cache (non nel codice). Finché la cache esiste, un nuovo APK si installa sopra a quello vecchio; se la cache scade la firma cambia e bisogna prima esportare il backup (Profilo → Dati), disinstallare e reinstallare. Per una firma stabile o per il Play Store usa una chiave privata salvata nei Secrets di GitHub.

## Server (opzionale) e IA
```
ANTHROPIC_API_KEY=sk-... node server/server.js     # http://localhost:8080
# oppure
docker build -t forma . && docker run -p 8080:8080 -e ANTHROPIC_API_KEY=sk-... forma
```
Poi in app: Profilo → Server IA → `http://indirizzo-del-server:8080`. Abilita la lettura della scheda da foto e l'analista IA.
Per l'uso fuori casa metti il server dietro HTTPS (reverse proxy) e proteggilo con accesso privato (VPN o autenticazione).

## Struttura
`data.js` esercizi e schede di esempio · `engine.js` regole · `body.js` corpo SVG · `app.js` interfaccia · `server/` server opzionale.

## Note importanti
- Indicazioni generali, non sostituiscono medico, fisioterapista o allenatore.
- Con utenti esterni servono privacy policy e consenso (dati di salute; minori: consenso dei genitori).
- Le immagini degli esercizi sono diagrammi dei muscoli coinvolti; foto reali si possono aggiungere da database aperti (wger, free-exercise-db).
