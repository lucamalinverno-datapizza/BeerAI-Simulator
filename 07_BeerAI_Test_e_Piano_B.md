# BeerAI — Piano di lavoro, test e riserva

Versione 2.0 · 7 novembre 2026 · Data demo: 12 novembre 2026, Europe/Rome.

## Stato iniziale

Preparati: brief di costruzione autosufficiente, dataset sintetico, riferimenti numerici, scaletta dell'ora e questo piano.

Da realizzare e verificare: birrificio 3D esplorabile, pannelli dei macchinari, test dell'app, integrazione voce/agente/browser, pacchetto locale offline con avvio semplice, riserva 2D, registrazione e prova generale. Tutte le caselle sotto sono inizialmente aperte. I valori numerici derivano da un calcolo separato delle regole; non sono risultati di un collaudo dell'app.

## 1. Piano proposto fino al 12 novembre

| Entro | Risultato da ottenere | Criterio di completamento |
|---|---|---|
| 8 novembre | Prima versione 3D funzionante | Impianto esplorabile, selezione serbatoio, pannello reale e motore S0–S3; test numerici principali superati. |
| 9 novembre | Versione completa di riserva | S0–S5, visite guidate, import/export, confronto, asset locali e avvio offline verificati; riserva 2D pronta. |
| 10 novembre | Prova voce e computer use | Sequenza reale provata sul Mac di Luca, con browser e condivisione Teams. |
| 11 novembre | Prova generale e congelamento | Demo cronometrata, copia stabile separata, JSON e video pronti. |
| 12 novembre, prima delle 16:00 | Controllo finale | Audio, finestre, permessi e riserva verificati; niente aggiornamenti o modifiche sostanziali. |

Sono obiettivi di preparazione, non appuntamenti già inseriti in calendario. La divisione dello slot ufficiale 16:00–17:30 e la lingua vanno confermate con gli organizzatori.

## 2. Costruire e controllare la versione stabile

- [ ] Dare all'agente `05_BeerAI_COSTRUISCI_IL_SIMULATORE.md` e far produrre l'app completa.
- [ ] Verificare che consegni un'app realmente eseguibile e non soltanto mockup o istruzioni.
- [ ] Verificare che numeri, serbatoi e grafici siano alimentati dallo stesso motore.
- [ ] Eseguire T1–T5 e i controlli di bilancio definiti nel brief.
- [ ] Controllare maturazione, pulizia, capacità condivisa e consegne parziali.
- [ ] Controllare il rispetto dei calendari di indisponibilità e il rifiuto delle configurazioni incoerenti.
- [ ] Confrontare S0–S5 con tutti i riferimenti nel brief.
- [ ] Ispezionare le consegne di O05/O06 in S1 e il ritardo residuo di O06 in S3.
- [ ] Controllare domanda zero, capacità zero, assenza di serbatoi compatibili e WIP oltre l'orizzonte.
- [ ] Controllare input negativi, giorni non interi, valori non finiti, ID duplicati e riferimenti inesistenti.
- [ ] Eseguire due volte lo stesso scenario: eventi e indicatori devono coincidere.
- [ ] Controllare l'indipendenza fra scenari e il reset esatto a S0.
- [ ] Verificare i risultati dopo import/export e dopo una riapertura.
- [ ] Provare l'app nel browser di presentazione con rete disattivata: preset, calcoli, grafici, import ed export devono funzionare.
- [ ] Documentare i limiti: euristica, buffer illimitato, resa 100%, nessun costo o tempo di installazione.

### 2.1 Navigazione, grafica e pannelli 3D

- [ ] Il capannone contiene sala cotta, F1–F4, confezionamento, magazzino e area spedizioni con percorsi accessibili.
- [ ] Provare camminata WASD/frecce, orientamento mouse/trackpad e ritorno a Overview.
- [ ] Verificare collisioni semplici con pareti/macchinari, pavimento e altezza camera stabile.
- [ ] Provare tutte le viste guidate e `Focus selected`; il percorso della demo non deve dipendere dalla sola camminata manuale.
- [ ] Verificare che clic su serbatoio e selezione dall'elenco aprano lo stesso oggetto/pannello.
- [ ] Provare Esc, uscita dalla cattura del mouse e scrittura nei campi senza spostare la camera.
- [ ] Controllare nei pannelli volume, prodotto, lotto, rilascio e pulizia rispetto allo snapshot dello stesso giorno.
- [ ] Modificare la capacità di confezionamento dal pannello della macchina e verificare che il motore riceva il nuovo valore.
- [ ] Controllare che F5 compaia in S3, sia selezionabile e scompaia tornando a S0.
- [ ] Verificare che Play/Pause e variazioni di velocità non alterino i risultati; la camera deve muoversi anche in pausa.
- [ ] Passare rapidamente fra scenari: un risultato vecchio non deve sovrascrivere quello corrente.
- [ ] Verificare che il livello del serbatoio corrisponda al volume, senza calare durante la fermentazione solo perché passa il tempo.
- [ ] Controllare che gli effetti visivi di flusso siano chiaramente illustrativi e non introducano dati o sensori inventati.
- [ ] Misurare fluidità durante il percorso principale con Teams in condivisione; obiettivo almeno 30 fps sul Mac effettivo, da verificare.
- [ ] Provare qualità ridotta, risoluzione interna limitata e ombre meno costose, preservando controlli e leggibilità.
- [ ] Verificare tutti i modelli, le texture, i font, l'illuminazione e gli eventuali decoder con rete disattivata.
- [ ] Provare un caricamento iniziale con cache del browser pulita, asset esclusivamente locali e build di produzione.
- [ ] Verificare che la control room 2D sia accessibile anche quando la scena 3D fallisce e che la riserva autonoma non richieda WebGL.
- [ ] Confrontare i risultati del worker, della vista 3D e della riserva 2D sullo stesso JSON: devono coincidere.
- [ ] Provare la continuità dei controlli durante l'apertura/chiusura di pannelli e i ridimensionamenti della finestra.

## 3. Provare voce, agente e browser insieme

La catena da dimostrare è: **voce di Luca → task dell'agente con brief disponibile → costruzione/app → azione sul browser → verifica → risposta**. Le singole funzionalità disponibili non bastano a certificare la catena completa.

- [ ] Confermare quale client/task sarà usato il 12 e mantenerlo uguale nelle prove.
- [ ] Verificare se il setup consente una conversazione vocale continua nello stesso task che costruisce e usa il browser.
- [ ] Distinguere voce conversazionale e dettatura: se si usa la seconda, provarne invio, correzione e tempi reali.
- [ ] Verificare che il brief sia accessibile al task e che l'agente ne possa leggere l'intero contenuto.
- [ ] Provare le parole “ettolitri”, “fermentatore”, “confezionamento”, i nomi dei prodotti e i numeri delle scadenze.
- [ ] Dopo un comando che cambia quantità o date, far riepilogare i parametri prima di eseguire il confronto.
- [ ] Verificare che l'agente possa creare/aprire l'app e poi usare i suoi controlli nel browser scelto.
- [ ] Provare selezione scenario, modifica capacità, avvio simulazione, confronto e ispezione ordine tramite interfaccia.
- [ ] Provare il comando “portaci alla fermentazione e apri F1” usando le viste guidate e i controlli visibili.
- [ ] Provare “vai al confezionamento e porta la capacità a 60” e controllare che l'agente modifichi il parametro corretto.
- [ ] Verificare che un pannello aperto o il puntatore catturato non blocchino l'agente; provare la via di recupero con Esc e Overview.
- [ ] Provare una domanda di stato mentre l'agente sta costruendo, senza perdere il task.
- [ ] Provare interruzione vocale e ripresa della conversazione.
- [ ] Provare un cambio di direzione: “riparti da S1”, senza accumulare involontariamente modifiche.
- [ ] Controllare permessi di microfono, accesso al browser e contesto schermo necessari sul Mac.
- [ ] Eseguire il comando principale da una sessione pulita, senza fare affidamento sulla memoria delle prove precedenti.
- [ ] Cronometrare la ricostruzione nel progetto predisposto. Scegliere il perimetro live in base al tempo misurato, senza presumere che tutto il birrificio 3D nasca da zero in 13 minuti.
- [ ] Preparare una frase che esplicita quali dipendenze, asset o moduli sono già pronti e quali parti l'agente sta effettivamente costruendo.

Se una funzione manca, aggiornare il copione al comportamento realmente disponibile. La riserva operativa è dettatura/prompt scritti e uso manuale dei controlli; non promettere una conversazione continua che non sia stata provata.

## 4. Verificare la regia Teams

- [ ] Confermare con gli organizzatori lingua, durata del blocco di Luca e accesso alla prova tecnica.
- [ ] Provare sul webinar/ambiente Teams effettivamente previsto, appena disponibile.
- [ ] Verificare cosa vedono i partecipanti quando l'agente apre finestre o cambia tab.
- [ ] Scegliere finestra o schermo da condividere per rendere visibili sia costruzione sia browser.
- [ ] Controllare leggibilità dei KPI e dei dettagli a 1920×1080 e 1440×900; regolare zoom.
- [ ] Provare la passeggiata 3D in condivisione e chiedere all'ascoltatore se il movimento è fluido e comprensibile.
- [ ] Verificare che i partecipanti sentano la voce di Luca e quella dell'agente senza eco o ritorni nel microfono.
- [ ] Provare la condivisione dell'audio di sistema nel setup effettivo; se non funziona, preparare una regia con risposte dell'agente visibili e commentate da Luca.
- [ ] Verificare che l'agente non scambi la propria voce, il pubblico o l'audio Teams per nuovi comandi.
- [ ] Chiudere finestre estranee, usare dati sintetici e attivare la modalità concentrazione.
- [ ] Verificare alimentazione del Mac e cuffie/microfono scelti.
- [ ] Tenere una connessione alternativa già provata, se disponibile.

## 5. Preparare il pacchetto di riserva

Da far produrre dopo il collaudo, con questi nomi o equivalenti chiaramente identificabili:

```text
BeerAI_Demo_Stable_2026-11-11/
  Avvia_BeerAI.command
  dist/
    index.html
    assets/
  scripts/
    serve.mjs
  fallback/
    beerai-control-2d.html
  scenarios/
    S0_existing.json
    S1_new_order.json
    S2_packaging_x2.json
    S3_extra_tank.json
    S4_demand_plus30.json
    S5_tank_unavailable.json
  README_APRI_QUI.md
  RISULTATI_VERIFICATI.md
  demo-registrata.mp4
```

La cartella sopra descrive una consegna futura: non indica file già esistenti.

- [ ] Salvare la build 3D di produzione, tutti gli asset e il lanciatore; verificarli dalla cartella finale con rete disattivata.
- [ ] Verificare prima il runtime necessario sul Mac e registrare la versione; il lanciatore non deve installare, compilare o scaricare nulla.
- [ ] Verificare avvio/arresto del server statico, permessi del file `.command`, apertura del browser e comportamento con porta già occupata.
- [ ] Servire la riserva soltanto su `127.0.0.1`, su porta diversa dalla copia live. Avviarla prima della sessione e verificarne l'URL effettivo.
- [ ] Salvare la riserva 2D autonoma e provarla separatamente dal server e da WebGL.
- [ ] Conservare i JSON dei sei scenari e un riepilogo degli esiti dei test.
- [ ] Documentare in `RISULTATI_VERIFICATI.md` data, versione, browser, test eseguiti e problemi residui.
- [ ] Separare la cartella stabile dalla cartella di generazione/modifica live.
- [ ] Impedire nel task live che la versione stabile venga sovrascritta; tutte le modifiche avvengono nella copia di lavoro.
- [ ] Tenere una copia della riserva fuori dalla cartella di lavoro e provarne l'apertura.
- [ ] Registrare 3–5 minuti di interazione riuscita con voce, browser e passaggi principali. Usare soltanto dati demo.
- [ ] Verificare il video offline, audio compreso, e il passaggio rapido alla sua riproduzione.
- [ ] Aprire una tab dedicata al simulatore stabile prima del webinar, senza lasciare un confronto già alterato dalle prove.
- [ ] Verificare che anche senza localStorage il reset e i preset funzionino.
- [ ] Conservare i prompt del copione pronti da copiare se la voce non è disponibile.

## 6. Soglie operative per passare alla riserva

| Problema | Tentativo consentito | Passaggio successivo |
|---|---|---|
| Generazione troppo lenta | Chiedere un aggiornamento e una prima versione utilizzabile. | Al minuto 22, se manca una vista navigabile, aprire la versione stabile. |
| Voce non recepita o bloccata | Un tentativo rapido di ripresa/correzione, circa 30 secondi. | Prompt scritto o dettatura, dichiarando il cambio. |
| Browser non controllabile dall'agente | Ripetere una sola azione semplice. | Luca aziona i controlli; l'agente interpreta i risultati se disponibile. |
| Errore dell'app live | Un reset o una riapertura, circa 60 secondi. | Aprire la tab del birrificio 3D stabile già avviato e il preset necessario. |
| Grafica lenta o contesto WebGL perso | Passare una volta a qualità ridotta o ricaricare. | Control room 2D con gli stessi preset; video per mostrare il 3D, se serve. |
| Camera o mouse bloccati | Esc, poi Overview. | Vista guidata del reparto o elenco macchinari; proseguire dai pannelli. |
| Server live non raggiungibile | Controllare una volta l'URL/porta predisposti. | Tab della riserva già avviata oppure HTML 2D autonomo. |
| Risultato numerico dubbio | Ispezionare un evento e le ipotesi, senza inventare una spiegazione. | Usare il caso verificato della versione stabile; registrare il dubbio per dopo. |
| Connessione assente | Connessione alternativa solo se già pronta. | Simulatore offline; poi video se serve mostrare la parte agente. |
| Problema audio dell'agente | Mostrare la risposta testuale e commentarla. | Proseguire con la stessa analisi senza perdere tempo sulla configurazione. |

Obiettivo di prova: raggiungere una vista utile della versione stabile in meno di 60 secondi dal punto di interruzione. Misurarlo davvero. Nessun piano B richiede una nuova installazione, un login o un download sul palco.

## 7. Prova generale

- [ ] Eseguire la sequenza S0 → S1 → S2 → S3 senza scorciatoie invisibili al pubblico.
- [ ] Eseguire la visita: ingresso → fermentazione/F1 → confezionamento → F5 → spedizioni, alternando passeggiata di Luca e viste guidate dell'agente.
- [ ] Far scegliere S4 oppure S5 a una persona presente alla prova.
- [ ] Verificare che “ordine nuovo puntuale” e “clienti esistenti penalizzati” emergano chiaramente.
- [ ] Verificare che il confezionamento doppio non cambi S1 e che il serbatoio extra lasci il ritardo residuo previsto.
- [ ] Provare una piccola modifica della vista, solo nella copia live.
- [ ] Cronometrare costruzione, apertura, azioni nel browser, risposta vocale e spiegazione umana.
- [ ] Eseguire almeno una prova completa cronometrata con condivisione e audio; ripetere solo dopo correzioni che cambiano la regia.
- [ ] Simulare un'interruzione e completare il passaggio alla riserva.
- [ ] Riservare davvero gli ultimi 10 minuti a voto finale e domande.
- [ ] Tradurre/provare il copione nella lingua concordata.

## 8. Controllo finale del 12 novembre

- [ ] Mac alimentato, notifiche disattivate, browser e task corretti già aperti.
- [ ] Microfono e audio di sistema provati con un ascoltatore esterno.
- [ ] Brief presente nel task e copia live separata dalla stabile.
- [ ] Tab della riserva aperta su S0; video e prompt pronti.
- [ ] Server locale della riserva avviato; versione 3D stabile aperta almeno una volta con rete disattivata sul Mac effettivo.
- [ ] Profilo grafico scelto in prova e HTML 2D autonomo pronti; cattura del mouse disattivata all'inizio.
- [ ] Nessun aggiornamento applicativo, installazione o modifica importante dopo il controllo.
- [ ] Primo prompt e primo voto del pubblico pronti.

## 9. Registro delle prove

Compilare una riga per ogni gruppo di verifiche realmente eseguito. Usare stati `PASS`, `FAIL`, `DA PROVARE`, `BLOCCATO`. Una dichiarazione dell'agente senza evidenza di esecuzione non vale come PASS.

| Data/ora | Versione app | Ambiente/browser | Prova | Atteso | Osservato | Stato | Correzione/prossima azione |
|---|---|---|---|---|---|---|---|
| — | — | — | Motore T1–T5 | Come brief | — | DA PROVARE | Costruire l'app. |
| — | — | — | Scenari S0–S5 | Come brief | — | DA PROVARE | Eseguire e confrontare gli eventi. |
| — | — | — | Import/export/reset | Stato ripristinato correttamente | — | DA PROVARE | Verificare nel browser. |
| — | — | — | Voce → agente → browser | Sequenza completata nello stesso setup | — | DA PROVARE | Prova sul Mac di Luca. |
| — | — | — | Teams e audio | Partecipante vede e sente la demo | — | DA PROVARE | Prova con ascoltatore. |
| — | — | — | Navigazione 3D e pannelli | Visita, selezione e controlli collegati al motore | — | DA PROVARE | Percorso completo nei reparti. |
| — | — | — | Prestazioni con Teams | Almeno 30 fps sul percorso principale | — | DA PROVARE | Misurare sul Mac effettivo. |
| — | — | — | Avvio locale e asset offline | Scena completa e calcoli senza rete | — | DA PROVARE | Avviare la build finale con cache pulita. |
| — | — | — | Riserva 2D | Stessi risultati senza WebGL né server | — | DA PROVARE | Aprire l'HTML di emergenza. |
| — | — | — | Passaggio alla riserva | Vista utile entro 60 secondi | — | DA PROVARE | Simulare l'interruzione. |
| — | — | — | Ora completa | Conclusione e domande entro 60 minuti | — | DA PROVARE | Prova cronometrata. |
