# Squadra agenti FORGIA / TLZ (senza intelligenza artificiale, zero token)

Sono programmi nostri, scritti in questo repository. Girano su GitHub Actions (gratis per un repository pubblico),
non usano chiavi, non chiamano servizi esterni, non leggono il database: leggono solo il codice del repository.

| Agente | Cosa controlla |
|---|---|
| collaudatore | fa leggere al riconoscimento reale dell'app le schede in `schede/*.txt` (con `.json` di risultati attesi) |
| revisore-alimenti | kcal contro macro, macro oltre 100 g, alias duplicati |
| sicurezza | chiavi/token nel codice, tabelle senza RLS, workflow avviabili da estranei |
| rilascio | versione, build, cache `sw.js` e note coerenti |

Per insegnare un caso nuovo: aggiungi un file `.txt` (e un `.json`) in `schede/`.
Se trovano problemi, il programma apre una Issue; non modificano mai il codice e non pubblicano.
