# BeerAI — Scaletta e copione della demo

Versione 2.0 · 7 novembre 2026 · Intervento del 12 novembre 2026.

## Obiettivo

Far vedere una collaborazione completa dentro un birrificio 3D esplorabile: Luca descrive un problema a voce, l'agente costruisce o evolve il simulatore in una copia locale predisposta, lo usa nel browser, visita i reparti, apre pannelli e confronta alternative.

Domanda guida: **«Posso accettare un nuovo ordine senza compromettere le consegne già promesse?»**

L'ora qui progettata è il blocco di Luca. Lo slot ufficiale pubblicato per “Dual intelligence” è il 12 novembre, 16:00–17:30, Europe/Rome. La distribuzione degli altri 30 minuti con introduzione organizzatori e discussione resta da concordare. La lingua dell'intervento resta da confermare; le frasi di questo copione sono appunti di lavoro in italiano.

## Materiali da avere pronti

- Brief pubblico `05_BeerAI_COSTRUISCI_IL_SIMULATORE.md`.
- Dataset e preset inclusi nel brief e nella versione stabile.
- Birrificio 3D stabile già costruito e verificato, con navigazione libera e visite guidate; copia separata per la generazione live.
- Build di produzione, asset e runtime già presenti sul Mac; server locale della riserva avviato prima del webinar su una porta diversa dalla copia live.
- Control room 2D autonoma di emergenza, alimentata dalla stessa logica numerica.
- Checklist `07_BeerAI_Test_e_Piano_B.md` aggiornata con gli esiti.
- Breve registrazione della parte critica e, se serve, poche slide di supporto.

Stato attuale: questi documenti preparano il lavoro; simulatore, registrazione e slide non sono ancora prodotti.

## Regia dell'ora

| Tempo | Azione | Cosa vede il pubblico | Messaggio |
|---|---|---|---|
| 00:00–05:00 | Presentazione essenziale e ordine del Festival. Voto iniziale in chat. | Problema, domanda e due alternative: accettare/rinegoziare. | Partiamo da una decisione. |
| 05:00–12:00 | Conversazione vocale, presentazione del brief, chiarimento di obiettivo e vincoli. | Specifiche pubbliche, dati sintetici e domande dell'agente. | Il problema va definito bene. |
| 12:00–25:00 | Costruzione delimitata nel progetto predisposto, apertura del 3D e primo controllo S0. | Si entra nel capannone e si apre il pannello di un serbatoio. Nell'attesa: discussione delle ipotesi. | Da richiesta a strumento verificabile. |
| 25:00–40:00 | S1 nuovo ordine → S2 confezionamento doppio → S3 serbatoio aggiuntivo. | Visita ai reparti, controlli operativi e F5 che compare nella scena. | Misurare dove la capacità serve davvero. |
| 40:00–50:00 | Un imprevisto scelto dal pubblico; ispezione di un risultato. Eventuale piccola modifica della vista. | Scenario ricalcolato, ordini e lotti controllabili. | La fiducia si costruisce verificando. |
| 50:00–60:00 | Voto finale, lettura della decisione e domande. | Riepilogo di ipotesi, alternative e conseguenze. | L'umano decide con evidenze migliori. |

I tempi di costruzione sono un budget da misurare in prova, non una durata garantita. Se l'app arriva prima, usare il tempo per l'ispezione. Se al minuto 22 non c'è una versione navigabile, aprire la versione stabile e arrivare comunque al confronto scenari entro il minuto 25.

La prova generale stabilirà se la costruzione live può includere l'intero prototipo o un modulo delimitato. La base già predisposta deve essere dichiarata. La versione completa e scenograficamente curata è costruita e verificata prima del 12; runtime, dipendenze e asset non vengono scaricati sul palco.

## Scena 1 — Il problema

> «Gestiamo un piccolo birrificio. Le consegne che abbiamo promesso sono sostenibili. Arriva un Festival che vuole altri 40 ettolitri al giorno 21. Accettiamo? Scrivete in chat la vostra scelta e una cosa che vorreste sapere prima di decidere.»

Non anticipare subito l'esito degli scenari. Presentare A e B come prodotti didattici e chiarire che i tempi sono sintetici.

## Scena 2 — La conversazione con l'agente

> «Ti passo il brief del nostro birrificio 3D. Voglio entrare nei reparti e aprire i pannelli dei macchinari per capire se accettare l'ordine del Festival senza penalizzare gli altri clienti. Prima chiariscimi quali dati userai, quali vincoli rispetterai e come controlleremo il risultato.»

Poi:

> «Prendi questo file e costruisci il simulatore 3D nel progetto locale predisposto. Esegui i controlli previsti e aprilo nel browser. Procedi nella copia di lavoro, tenendo separata la versione stabile.»

Il file deve essere davvero disponibile nel task dell'agente prima del comando. Se l'agente ha già tutto ciò che serve e non fa domande, chiedere un riepilogo breve delle ipotesi, senza forzare un dialogo artificiale.

Durante la costruzione, coinvolgere il pubblico su tre domande:

1. Cosa significa “riuscire a consegnare”: prima o poi, oppure entro la scadenza?
2. Un lotto nei serbatoi è già una scorta vendibile?
3. Se l'ordine nuovo è puntuale, possiamo dire che accettarlo è stata una buona scelta?

## Scena 3 — Baseline S0

> «Apri il birrificio e portaci nell'area fermentazione. Seleziona F1 e apri il suo pannello. Poi esegui il caso degli impegni esistenti e segui un lotto dal serbatoio al cliente.»

Luca può fare una breve passeggiata libera; l'agente usa le viste di reparto e i comandi di focus per arrivare rapidamente ai controlli. Uscire dalla cattura del mouse prima di modificare i campi. Gli indicatori del serbatoio devono corrispondere al giorno visualizzato.

Riferimento: 155 hL richiesti, 155 consegnati puntuali, 7 ordini su 7 completi in tempo.

Aprire ipotesi e unità. Chiedere come vengono rispettati permanenza e pulizia. La prima verifica può essere breve: non leggere un log intero sul palco.

## Scena 4 — Il nuovo ordine S1

> «Aggiungi l'ordine del Festival: 40 ettolitri di A, da consegnare al giorno 21. Ricalcola e mostrami anche gli effetti sugli ordini già accettati.»

Riferimento: l'ordine nuovo è puntuale; il servizio complessivo scende a 180/195 hL in tempo, 92,31%, con 6 ordini su 8 completi in tempo. O05 riceve gli ultimi 10 hL al giorno 33 anziché 28; O06 riceve gli ultimi 5 al giorno 42 anziché 35.

Punto da far emergere: a fine periodo è tutto consegnato e l'arretrato è zero, ma due clienti hanno subito ritardi. La metrica “totale consegnato” da sola nasconde il problema.

## Scena 5 — Confronto degli interventi S2 e S3

> «Portaci alla linea di confezionamento e apri il suo pannello. Raddoppia la capacità. Salva lo scenario e confrontalo con il nuovo ordine senza investimento.»

S2 resta a 180/195 hL puntuali: il confezionamento più veloce non migliora questo caso.

> «Ora riparti dal caso con il nuovo ordine e aggiungi un fermentatore da 20 ettolitri, disponibile dall'inizio. Mostrami F5 nel birrificio e apri il suo pannello. Confronta i risultati e mostrami cosa resta irrisolto.»

S3 arriva a 190/195 hL puntuali, 97,44%, e 7 ordini su 8 completi in tempo. Resta un ritardo di 5 hL di O06, che arrivano al giorno 37 anziché 35.

L'agente deve qualificare i risultati: il motore usa un'euristica di pianificazione, non certifica l'ottimo. Il confronto assume il serbatoio già disponibile dal giorno 0 e non include costi o tempi di installazione.

## Scena 6 — L'imprevisto del pubblico

Far scegliere una sola perturbazione per contenere i tempi:

- S4: domanda degli ordini esistenti +30%, ripartendo da S0.
- S5: F4 indisponibile nei primi 21 giorni, ripartendo da S0.
- Alternativa libera, solo se c'è margine: cambiare una scadenza e osservare il risultato, senza prometterne l'esito.

> «Applica questa modifica, indica da quale scenario stai partendo e ricalcola l'intero orizzonte. Fammi vedere quali clienti cambiano situazione.»

Si tratta di nuovi scenari dal giorno 0: l'animazione non è un sistema connesso a un impianto reale e non conserva una storia operativa già avvenuta.

## Scena 7 — La verifica umana

> «Prima di suggerirmi una decisione, mostrami le ipotesi più importanti. Hai incluso le pulizie? Stai distinguendo birra in lavorazione, confezionata e consegnata? Apriamo un ordine in ritardo e seguiamo i suoi lotti.»

Il comportamento dell'agente è da verificare, non da dare per garantito. Se confonde una metrica o propone un cambiamento non giustificato, fermarsi e chiedere evidenza. Non inscenare un errore fingendo che sia spontaneo.

Estensione live facoltativa, se l'app e i tempi lo consentono:

> «Rendi più evidente la vista dei clienti in ritardo, con quantità mancanti e giorni di ritardo. Usa i risultati già calcolati e non cambiare il motore.»

Questa modifica avviene nella copia di lavoro. La versione stabile rimane disponibile.

Alternativa scenografica delimitata, se già provata: aggiungere una vista guidata che porta dal serbatoio all'area spedizioni dell'ordine selezionato, riusando geometrie e dati esistenti.

## Chiusura

Riproporre il voto iniziale: accettare, rinegoziare, oppure accettare a certe condizioni? Chiedere quale evidenza ha cambiato la scelta.

Tre osservazioni da collegare all'esperienza appena vista:

1. L'umano ha definito obiettivo, vincoli e conseguenze rilevanti.
2. L'agente ha costruito uno strumento e lo ha usato per esplorare alternative.
3. Il controllo di dati, eventi e metriche ha reso discutibile e verificabile la raccomandazione.

## Passaggio trasparente alla riserva

Se si interrompe la generazione:

> «La costruzione live si è fermata. Apro la versione che abbiamo già collaudato con le stesse specifiche e continuiamo a verificare le decisioni.»

Se la voce smette di funzionare, passare ai prompt scritti. Se l'agente non riesce a usare l'interfaccia, Luca può azionare i controlli e mantenere il confronto. Se si usa un video, dichiarare che è una registrazione.

Se il problema è solo grafico, passare al profilo di qualità ridotta; se il contesto WebGL non si riprende, aprire la control room 2D di emergenza. La riserva 3D stabile è già servita localmente: non avviare installazioni o compilazioni. Il simulatore funziona offline; la conversazione con l'agente esterno resta dipendente dalla connessione.

Evitare debugging prolungato: un tentativo rapido, poi passaggio alla riserva secondo la checklist. L'obiettivo è completare il ragionamento sulla decisione entro l'ora.
