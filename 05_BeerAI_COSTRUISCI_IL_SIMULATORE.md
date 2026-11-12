# BeerAI — Costruisci il birrificio 3D

Versione 2.0 · 7 novembre 2026 · Demo del 12 novembre 2026.

Aggiornamento richiesto da Luca: ambiente 3D esplorabile, macchinari selezionabili e pannelli operativi. È autorizzata un'architettura locale articolata. Il requisito di un singolo HTML come prodotto principale è sostituito dal pacchetto locale 3D; un HTML 2D rimane una riserva tecnica.

## Istruzione da dare all'agente

> Prendi questo file e costruisci Brewery Control Room 3D: un birrificio locale nel quale possiamo muoverci, selezionare macchinari e aprire pannelli realmente collegati alla simulazione. Implementa l'app, esegui i controlli numerici e verifica navigazione e interazioni nel browser. Consegna sorgenti, build con tutti gli asset locali, avvio semplice e riserva 2D. Segnala chiaramente ciò che hai verificato e ciò che resta da provare.

Questo file è autosufficiente: contiene obiettivo, dati, regole, scenari e criteri di accettazione. Il suo contenuto è visibile al pubblico; non contiene risultati aziendali reali o dati riservati.

## 1. Obiettivo e stato

Costruire **Brewery Control Room 3D**, un simulatore didattico interattivo ambientato in un birrificio industriale esplorabile. Luca e l'agente potranno entrare nel capannone, avvicinarsi ai serbatoi, aprire il pannello del macchinario e modificarne i parametri. L'agente userà il browser durante una conversazione vocale per cambiare condizioni, confrontare scenari e controllare risultati.

Applicazione, motore numerico, dati, modelli, texture e salvataggi devono funzionare localmente e senza rete dopo la preparazione. Il client dell'agente vocale è esterno al simulatore e richiede la propria connessione; non è previsto in questo brief un modello linguistico eseguito offline sul Mac.

La domanda narrativa è: **«Posso accettare un nuovo ordine senza compromettere le consegne già promesse?»**

I dati sono interamente sintetici. I tempi dei prodotti sono ipotesi didattiche, non ricette o parametri produttivi validati. Il modello illustra capacità, scorte, priorità e ritardi. Non riproduce il simulatore ufficiale BeerAI né le sue regole di gara.

Stato alla redazione: specifiche e riferimenti numerici preparati; applicazione ancora da costruire e collaudare. Non dichiarare superati test che non hai eseguito.

## 2. Consegne obbligatorie

1. Progetto locale **React + TypeScript + Vite + Three.js / React Three Fiber + Drei**, con build di produzione già compilata in `dist/`. Tutti gli asset e i moduli devono essere inclusi nella consegna.
2. `Avvia_BeerAI.command` per macOS e comando documentato equivalente: avvio della build su un server statico locale e apertura del browser. Servire soltanto su `127.0.0.1`. Verificare il runtime necessario sul Mac prima della demo. Il lanciatore non installa dipendenze, non compila e non scarica file durante l'avvio.
3. Sorgenti leggibili, con moduli separati per calcolo, stato, scena 3D, navigazione, pannelli e scenari.
4. Riserva `fallback/beerai-control-2d.html`, autonoma e apribile senza WebGL né server, compilata dalla stessa logica numerica e con gli stessi preset. Nessun secondo motore mantenuto a mano.
5. Configurazioni JSON esportabili per gli scenari S0–S5 descritti sotto.
6. Test numerici eseguibili, controlli delle interazioni 3D e resoconto degli esiti effettivi.
7. `README.md` con requisiti locali, avvio, arresto, apertura della riserva, reset, importazione, esportazione e limiti del modello.

Usare release stabili compatibili tra loro e un lockfile. Versionare la versione di Node e verificare l'installazione una volta in preparazione. React Three Fiber deve essere compatibile con la major di React scelta. Rendering WebGL su browser collaudato; eventuali esperimenti WebGPU non sono necessari alla demo.

Font, texture, modelli glTF/GLB, ambienti di illuminazione ed eventuali decoder devono essere locali, con provenienza/licenza documentate. Nessuna dipendenza da CDN, texture remote o servizi in cloud durante l'uso del simulatore. La simulazione non deve chiamare un modello linguistico per ottenere i numeri.

La voce appartiene al client dell'agente: non costruire un assistente vocale interno all'app. La prima architettura usa un server statico locale, senza backend applicativo o database obbligatorio. È possibile aggiungere un involucro desktop Tauri dopo il collaudo della versione browser, se porta un vantaggio concreto all'avvio; non deve bloccare la consegna del birrificio 3D. Non occorre pubblicare il sito.

## 3. Esperienza da mostrare

### Ambiente e navigazione

- Capannone in 3D con aree riconoscibili: sala cotta, fermentatori F1–F4, spazio per F5, linea di confezionamento, magazzino e punto di spedizione. Un terminale nella sala controllo apre il pannello generale.
- Aspetto industriale curato: serbatoi cilindro-conici in acciaio, tubazioni, valvole, passerelle o corridoi, pavimento, luce e ombre coerenti. Dettaglio sufficiente per una visita ravvicinata. Il layout è illustrativo e non rappresenta un impianto reale misurato.
- Modalità `Explore`: movimento WASD/frecce e orientamento con mouse/trackpad, altezza della camera stabile e collisioni semplici con pareti e macchinari. Niente attraversamento degli oggetti o cadute fuori dal pavimento.
- Modalità `Overview`: vista generale orbitabile con zoom; passaggio immediato da e verso la prima persona.
- Viste guidate con pulsanti HTML: `Overview`, `Brewhouse`, `Fermentation`, `Packaging`, `Warehouse`, `Control room`. L'agente può raggiungere un reparto con un clic; la passeggiata libera resta disponibile a Luca.
- Selezione del macchinario da clic sulla geometria o da elenco accessibile. Entrambi devono aprire lo stesso pannello e identificare lo stesso oggetto. Pulsante `Focus selected` per portare la camera sul macchinario.
- `Esc` esce dal blocco del puntatore e rende accessibili i pannelli. Quando un campo è in modifica, WASD/frecce non devono muovere la camera. La cattura del mouse deve richiedere un gesto esplicito ed essere reversibile.
- Piccola mappa del capannone e comando di ritorno alla vista iniziale per evitare di perdersi. Le animazioni di camera devono essere brevi, interrompibili e rispettare la riduzione del movimento.

### Macchinari e pannelli collegati al motore

- Un fermentatore selezionato mostra ID, prodotto, lotto, volume, capacità, giorno di rilascio, stato e pulizia. La modalità di ispezione può mostrare il contenuto del serbatoio senza alterare lo stato numerico.
- Il pannello permette di modificare capacità e indisponibilità; la permanenza dipende dal prodotto e si modifica nel pannello ricette. I cambiamenti sono input di un nuovo scenario ricalcolato dal giorno 0.
- La linea di confezionamento apre la capacità in hL/giorno, il buffer e i volumi lavorati. Modificare 30 → 60 deve alimentare davvero S2.
- Il magazzino mostra scorte per prodotto; la spedizione apre gli ordini, le consegne parziali e i ritardi.
- In S3 compare fisicamente F5, selezionabile e collegato al motore. Tornando a S0 deve scomparire. I quattro serbatoi iniziali mantengono identità e corrispondenza con i dati.
- Timeline per serbatoio con lotti e pulizie; animazione con Play/Pause, selettore del giorno e velocità. La pausa del tempo simulato lascia libera la camera.
- Pannello generale: volume richiesto, consegnato e puntuale, servizio in volume, ordini completi in tempo, arretrato finale, tabella ordini e log ispezionabile.
- Confronto di scenari con variazioni di input e risultati affiancati. Un solo viewport 3D è sufficiente: non occorrono due scene pesanti renderizzate contemporaneamente.
- Sezione visibile “Model assumptions”, con politica, unità e semplificazioni. La vista 2D deve essere raggiungibile anche se il 3D non si inizializza.

### Regole di rappresentazione

- Il motore è l'unica fonte di quantità, stati, consegne e tempi. La scena legge snapshot ed eventi; il frame rate e i movimenti della camera non influenzano il calcolo.
- La fermentazione non consuma artificialmente il volume nel serbatoio: il livello visuale corrisponde a volume/capacità, non alla percentuale di tempo trascorso. Un indicatore separato mostra l'avanzamento temporale.
- Movimenti nei tubi e bottiglie sul nastro sono rappresentazioni illustrative degli eventi. Non promettere fluidodinamica, chimica o conteggio fisico di ogni bottiglia.
- Non inventare sensori di temperatura/pressione o controlli di valvole con effetti produttivi non presenti nel contratto del modello.
- Occupazione elevata e colli di bottiglia sono concetti distinti: un'evidenziazione può segnalare un candidato da indagare, mentre il confronto controfattuale mostra l'effetto di aggiungere capacità.
- I pannelli sono veri componenti HTML sovrapposti al 3D, con campi e pulsanti leggibili e accessibili. Eventuali monitor nella scena aprono questi pannelli: non devono contenere schermate decorative spacciate per controlli.

Comandi visibili e semanticamente accessibili: `Explore`, `Overview`, `Focus selected`, viste di reparto, `Run simulation`, `Reset to baseline`, `Save scenario`, `Compare scenarios`, `Export JSON`, `Import JSON`, `Play`, `Pause`, `2D control room`.

Etichette proposte in inglese per il pubblico internazionale; mantenere il testo centralizzato per poterlo tradurre. La lingua dell'intervento sarà confermata separatamente.

Le schermate devono essere leggibili in condivisione Teams a 1920×1080 e a 1440×900. La scena occupa la maggior parte dello schermo, con pannelli contestuali apribili invece di molte card permanenti. Usare parole e simboli oltre al colore per comunicare gli stati.

Adattamento visivo suggerito del brand Datapizza: fondo bianco o `#EDF3FF`, testo navy `#111F2D`, blu `#2467FF`, secondario `#526170`, bordi `#D5DDE5`, rosso `#D7342B` per criticità esplicitamente etichettate. Niente gradienti. Poppins e Roboto Mono se disponibili localmente; fallback di sistema dichiarato altrimenti. Non inventare il logo Datapizza: se manca l'asset originale, usare un titolo testuale.

I colori sopra regolano l'interfaccia. Per la scena usare materiali industriali coerenti, acciaio e illuminazione fisicamente plausibile: non trasformare tutti gli oggetti in blocchi dei colori del brand.

### 3.1 Architettura locale di riferimento

| Livello | Scelta | Responsabilità |
|---|---|---|
| Applicazione | React + TypeScript + Vite | Interfaccia, pannelli, scenari, build e asset. |
| Rendering | Three.js + React Three Fiber | Geometrie, materiali, luci, selezione e animazioni. |
| Navigazione | Drei e logica locale di movimento | Camere, visite guidate, controlli e interazioni; collisioni semplici applicative. |
| Stato | Store condiviso, ad esempio Zustand | Configurazione, scenario, risultato attivo, giorno e oggetto selezionato. |
| Simulazione | Modulo TypeScript puro, eseguibile anche in Web Worker | Regole della sezione 4, eventi, snapshot e KPI; testabile senza canvas. |
| Persistenza | JSON locale e salvataggio browser facoltativo | Import/export, preset e recupero; nessun database necessario per la prima versione. |
| Avvio | Build statica + piccolo server locale | Servire file e worker da localhost, senza runtime Vite di sviluppo sul palco. |

Percorso dei dati: un pannello modifica una copia di configurazione → un comando esplicito avvia il motore → arrivano risultati con ID della corsa → lo store li rende disponibili a scena, tabelle e grafici. Scartare risultati di corse vecchie se l'utente cambia scenario rapidamente.

Struttura indicativa:

```text
src/
  simulation/engine.ts
  simulation/simulation.worker.ts
  simulation/types.ts
  scenarios/presets.ts
  state/store.ts
  scene/BreweryScene.tsx
  scene/machines/
  scene/navigation/
  panels/
  app/
public/assets/
scripts/serve.mjs
tests/
```

Geometrie curate possono essere generate in modo parametrico per ottenere subito un impianto completo. Modelli GLB possono migliorare il dettaglio mantenendo gli stessi ID e punti di interazione. Salvare localmente anche ambiente di illuminazione, texture ed eventuali decoder: evitare loader che scaricano risorse implicite dalla rete.

Obiettivo prestazionale da misurare sul Mac di Luca: almeno 30 fps durante il percorso principale con Teams in condivisione. È un criterio di prova, non una prestazione già dimostrata. Prevedere profili qualità normale/ridotta: limite della risoluzione interna, ombre controllate e riduzione dei dettagli costosi. Se WebGL non è disponibile o perde il contesto, offrire il passaggio alla control room 2D con gli stessi dati.

Documentazione di riferimento consultata il 7 novembre 2026: [React Three Fiber](https://r3f.docs.pmnd.rs/), [controlli Drei](https://drei.docs.pmnd.rs/controls/introduction), [Tauri, involucro desktop opzionale](https://v2.tauri.app/start/). La scelta dell'architettura è una proposta per questa demo.

## 4. Contratto del modello

### Tempo e unità

- Volume interno in ettolitri (hL); `1 hL = 100 L`. Nessuna conversione implicita in bottiglie.
- Giorni interi. Eseguire gli eventi ai giorni `0, 1, …, horizon_day`, estremi compresi. Con `horizon_day=42` il giorno 42 è un istante di consegna valido; la finestra temporale è di 42 giorni e contiene 43 istanti campionati.
- Un lotto avviato al giorno `s` con permanenza `r` diventa disponibile al giorno `s+r`.
- Fermentazione e maturazione sono riunite in un'unica permanenza nel serbatoio.
- Il serbatoio resta occupato in `[s, s+r)` e in pulizia in `[s+r, s+r+cleaning_days)`. Il riuso è ammesso da `s+r+cleaning_days`.
- Per i lotti iniziali, contare l'occupazione residua da giorno 0 a `ready_day` e poi la pulizia; non conteggiare l'occupazione precedente all'orizzonte.

### Risorse e flussi

- La sala cotta può avviare al massimo `max_batches_per_day` lotti al giorno.
- Ogni lotto nuovo ha il volume fisso `batch_volume_hl`. Serve un serbatoio libero con capacità sufficiente, assegnato interamente al lotto.
- Un serbatoio ospita un solo lotto per volta. Non sono ammessi sovrapposizioni, riempimenti concorrenti o volumi oltre capacità.
- La cotta e il trasferimento sono istantanei nell'istante giornaliero, soggetti al limite di avvii. Questa semplificazione deve essere esplicita.
- Al termine della permanenza il lotto viene trasferito a un buffer astratto prima del confezionamento, separato dai fermentatori. Il buffer è illimitato nel modello iniziale: indicarlo tra le ipotesi.
- Il confezionamento ha una capacità condivisa in hL/giorno e può lavorare parzialmente un lotto. Ordine FIFO per `(ready_day, batch_id)`.
- Confezionamento, magazzino e consegna mantengono il prodotto A/B distinto.
- Resa del 100%, nessuno scarto, materie prime disponibili, nessun vincolo di personale o trasporto, nessun costo o ROI nella prima versione. Le consegne non hanno un tempo di trasporto aggiuntivo.
- Le scorte iniziali di prodotto finito sono già confezionate. I lotti iniziali nei serbatoi hanno `ready_day` esplicito; il loro residuo temporale non si ricalcola dai tempi delle nuove cotte.
- Un'indisponibilità vieta l'assegnazione di lotti il cui intervallo di occupazione più pulizia intersechi `[start_day, end_day)`. Se interseca un lotto iniziale, segnalare una configurazione incoerente, senza correggerla silenziosamente.

### Ordine degli eventi in ciascun giorno

1. Rilasciare i lotti che raggiungono `ready_day` e aggiornare pulizia/disponibilità.
2. Confezionare il buffer nei limiti della capacità giornaliera.
3. Consegnare agli ordini con `due_day <= giorno`, in ordine `(due_day, order_id)`, consumando solo scorte confezionate. Sono ammesse consegne parziali. Non anticipare le consegne prima della scadenza.
4. Pianificare e avviare nuove cotte secondo la regola seguente. Ricalcolare la copertura dopo ogni avvio.
5. Salvare lo stato giornaliero e controllare i bilanci.

Il rilascio di un lotto può quindi alimentare una consegna nello stesso giorno. Una cotta avviata nell'ultimo giorno resta in lavorazione a fine orizzonte e non va conteggiata come prodotto pronto.

### Politica deterministica di pianificazione

Usare questa euristica riproducibile, senza presentarla come piano ottimo:

1. Per ogni prodotto calcolare la fornitura impegnabile: scorte confezionate + buffer da confezionare + volumi di tutti i lotti in lavorazione, compresi quelli che matureranno oltre l'orizzonte.
2. Scorrere tutti gli ordini ancora aperti, anche futuri, ordinati per `(due_day, order_id)`.
3. Per ciascun ordine consumare virtualmente la fornitura del suo prodotto fino alla quantità residua. Il primo ordine con una quota non coperta identifica il prodotto della prossima cotta.
4. Tra i serbatoi compatibili, liberi e senza conflitti di calendario scegliere l'ID più piccolo. Se non esiste un serbatoio per quel prodotto, non avviare altre cotte quel giorno. Se non esistono ordini scoperti, non produrre.
5. Avviare un lotto completo e ripetere fino al limite giornaliero.

La copertura è una prenotazione quantitativa: un lotto futuro non rende puntuale una consegna. Tempi e ritardi derivano dagli eventi reali della simulazione. La scelta euristica può lasciare margini di miglioramento anche aggiungendo risorse.

### Indicatori e verifiche

- Domanda del periodo: somma degli ordini con scadenza entro `horizon_day`.
- Consegnato: somma delle quantità effettivamente spedite entro l'orizzonte.
- In tempo: quantità spedita entro la scadenza di ciascun ordine.
- Servizio in volume: `volume_in_tempo / domanda_del_periodo`. Se la domanda è zero, mostrare `N/A`.
- Ordini completi in tempo: ordini integralmente consegnati entro scadenza / ordini in scadenza nel periodo. Non confondere questo indicatore con il servizio in volume.
- Arretrato finale: domanda scaduta meno consegnato, non il volume consegnato tardi.
- Ritardo di un ordine completato: `max(0, giorno_completamento - due_day)`.
- Per un ordine aperto: mostrare separatamente volume mancante e anzianità del ritardo, senza attribuire una data di completamento inventata.
- Utilizzo serbatoi: distinguere permanenza, pulizia, indisponibilità e inattività; dichiarare il denominatore e usare intervalli temporali, non il conteggio degli snapshot.

Per ogni prodotto e ogni snapshot deve valere, con tolleranza numerica `1e-8 hL`:

`scorte_finite_iniziali + WIP_iniziale + volume_nuove_cotte = consegnato_cumulato + scorte_finite + buffer + WIP_residuo`

Mostrare le quantità con una precisione leggibile, ma non arrotondare gli stati interni a ogni passaggio.

## 5. Dataset iniziale S0

Tutti i dati sotto sono sintetici e modificabili. A e B sono prodotti didattici.

```json
{
  "schema_version": 1,
  "scenario_id": "S0",
  "name": "Existing commitments",
  "synthetic_data": true,
  "horizon_day": 42,
  "batch_volume_hl": 20,
  "max_batches_per_day": 1,
  "packaging_capacity_hl_per_day": 30,
  "cleaning_days": 1,
  "products": [
    {"id": "A", "name": "Beer A", "residence_days": 14},
    {"id": "B", "name": "Beer B", "residence_days": 21}
  ],
  "tanks": [
    {"id": "F1", "capacity_hl": 20, "unavailable": []},
    {"id": "F2", "capacity_hl": 20, "unavailable": []},
    {"id": "F3", "capacity_hl": 20, "unavailable": []},
    {"id": "F4", "capacity_hl": 20, "unavailable": []}
  ],
  "initial_finished_stock_hl": {"A": 10, "B": 5},
  "initial_wip": [
    {"id": "I1", "tank_id": "F1", "product_id": "A", "volume_hl": 20, "ready_day": 3},
    {"id": "I2", "tank_id": "F2", "product_id": "A", "volume_hl": 20, "ready_day": 7},
    {"id": "I3", "tank_id": "F3", "product_id": "B", "volume_hl": 20, "ready_day": 5}
  ],
  "orders": [
    {"id": "O01", "customer": "North pub", "product_id": "A", "quantity_hl": 20, "due_day": 7},
    {"id": "O02", "customer": "City pub", "product_id": "B", "quantity_hl": 15, "due_day": 10},
    {"id": "O03", "customer": "Lake distributor", "product_id": "A", "quantity_hl": 30, "due_day": 14},
    {"id": "O04", "customer": "Station pub", "product_id": "B", "quantity_hl": 15, "due_day": 21},
    {"id": "O05", "customer": "West distributor", "product_id": "A", "quantity_hl": 30, "due_day": 28},
    {"id": "O06", "customer": "Market hall", "product_id": "B", "quantity_hl": 20, "due_day": 35},
    {"id": "O07", "customer": "South pub", "product_id": "A", "quantity_hl": 25, "due_day": 42}
  ]
}
```

I lotti nuovi hanno ID `L001`, `L002`, ecc. nell'ordine di avvio, ripartendo da `L001` per ciascuna simulazione. Gli ID sono confrontati lessicograficamente.

## 6. Scenari da predisporre

Ogni scenario è una copia indipendente del punto di partenza indicato; non accumulare modifiche passando da un preset all'altro. L'aggiunta di risorse è una valutazione controfattuale: la risorsa è disponibile dal giorno 0, senza tempi di acquisto/installazione.

| ID | Punto di partenza | Modifica |
|---|---|---|
| S0 | Dataset iniziale | Impegni esistenti. |
| S1 | S0 | Aggiungere O08, cliente Festival, prodotto A, 40 hL, scadenza giorno 21. |
| S2 | S1 | Portare il confezionamento da 30 a 60 hL/giorno. |
| S3 | S1 | Aggiungere F5 vuoto, capacità 20 hL, disponibile dal giorno 0. |
| S4 | S0 | Moltiplicare per 1,30 tutte le quantità degli ordini esistenti; non modificare le scorte né aggiungere O08. |
| S5 | S0 | Impostare F4 indisponibile in `[0,21)`; nessun altro cambiamento. |

S0–S3 sono il percorso principale della demo. S4–S5 sono alternative per la scelta del pubblico. Consentire anche modifiche manuali con ricalcolo completo dal giorno 0.

## 7. Risultati numerici di riferimento

Riferimenti calcolati separatamente il 6 novembre 2026 applicando le regole sopra. Servono al collaudo del software futuro e non attestano che l'app sia già stata costruita o verificata nel browser. Se emerge una discrepanza, ispezionare gli eventi e la specifica; non inserire questi valori fissi nell'interfaccia.

| Scenario | Domanda hL | Consegnato hL | In tempo hL | Servizio in volume | Ordini completi in tempo | Arretrato finale hL |
|---|---:|---:|---:|---:|---:|---:|
| S0 | 155 | 155 | 155 | 100,00% | 7/7 | 0 |
| S1 | 195 | 195 | 180 | 92,31% | 6/8 | 0 |
| S2 | 195 | 195 | 180 | 92,31% | 6/8 | 0 |
| S3 | 195 | 195 | 190 | 97,44% | 7/8 | 0 |
| S4 | 201,5 | 201,5 | 167,5 | 83,13% | 5/7 | 0 |
| S5 | 155 | 155 | 145 | 93,55% | 5/7 | 0 |

Dettagli utili alla verifica:

- S0: nuove cotte ai giorni 0/F4/B, 4/F1/A, 6/F3/A, 8/F2/B, 19/F1/A. Nuove cotte totali 100 hL; scorte finali A=5 hL e B=15 hL.
- S1: O08 arriva interamente al giorno 21. O05 riceve 20 hL al giorno 28 e 10 al giorno 33; O06 riceve 15 hL al giorno 35 e 5 al giorno 42. Nuove cotte totali 140 hL; scorte finali A=5 hL e B=15 hL.
- S2: stessi risultati e consegne di S1. Raddoppiare questa risorsa non risolve il vincolo di questo caso.
- S3: O05 torna puntuale. O06 riceve 15 hL al giorno 35 e gli ultimi 5 al giorno 37. L'euristica lascia quindi un ritardo residuo: non sostenere che un serbatoio in più risolva ogni problema.
- S4: scorte finali A=13,5 hL, B=0; O04 riceve gli ultimi 14 hL al giorno 25 e O06 gli ultimi 20 al giorno 36.
- S5: O04 riceve gli ultimi 5 hL al giorno 25; O06 gli ultimi 5 al giorno 42.
- Tutti questi scenari terminano senza WIP e senza buffer residuo. Le scorte positive e l'assenza di arretrato finale non cancellano i ritardi avvenuti prima.

## 8. Test minimi obbligatori del motore

Usare anche casi piccoli verificabili a mano, indipendenti dal dataset della demo. Per T1–T3: prodotto unico, lotto e serbatoio da 20 hL, permanenza 2 giorni, pulizia 1 giorno, massimo 1 avvio/giorno, confezionamento 20 hL/giorno, nessuna scorta o WIP iniziale, nessun fermo, salvo le modifiche indicate.

| Test | Configurazione | Risultato atteso |
|---|---|---|
| T1 — Maturazione | Ordine 20 hL al giorno 2; orizzonte 2. | Avvio al giorno 0; nessuna consegna fino al giorno 1; 20 hL consegnati al giorno 2. |
| T2 — Pulizia | Ordini 20 hL ai giorni 2 e 5; orizzonte 5. | Avvii ai giorni 0 e 3, mai al giorno 2; entrambe le consegne puntuali. |
| T3 — Lavorazione residua | Ordine 40 hL al giorno 2; orizzonte 4. | 20 hL consegnati e in tempo; 20 hL di arretrato; 20 hL ancora in lavorazione. |
| T4 — Confezionamento | Come T1, ma 10 hL/giorno e orizzonte 3. | 10 hL consegnati al giorno 2, 10 al giorno 3; servizio in volume 50%; ordini completi in tempo 0/1; arretrato finale 0. |
| T5 — Scorta disponibile | Scorta finita 10 hL, ordine 20 hL al giorno 0, massimo avvii 0, orizzonte 3. | 10 hL consegnati al giorno 0, 10 hL di arretrato, nessuna produzione. |

Verificare inoltre: bilancio per prodotto a ogni istante; capacità condivisa di confezionamento; nessuna sovrapposizione di serbatoi; rispetto dei fermi; ripetibilità; domanda zero; capacità zero; nessun serbatoio compatibile; input negativi, ID duplicati e riferimenti a prodotti inesistenti; import/export equivalente; confronto isolato fra scenari.

## 9. Interazioni, salvataggio e controllabilità

- Validare prima dell'esecuzione: orizzonte e giorni interi non negativi, permanenza intera di almeno 1 giorno, pulizia intera non negativa, massimo avvii intero non negativo, capacità non negative, volume del lotto positivo, quantità degli ordini positiva, scorte non negative e valori tutti finiti. ID univoci e riferimenti esistenti. Il WIP iniziale deve rispettare capacità e assegnazione unica al serbatoio; `ready_day=0` è ammesso. Nessun serbatoio o nessuna capacità di avvio è un caso valido con produzione nuova nulla.
- Separare configurazione modificabile, scenario salvato e risultato. Segnalare risultati non aggiornati quando cambiano gli input.
- `Run simulation` ricalcola da zero senza sommare residui della corsa precedente.
- `Reset to baseline` torna esattamente a S0, inclusi ordini, WIP e scorte.
- Export JSON con `schema_version`, configurazione e nome; import tramite selezione locale del file, senza `fetch` di file adiacenti.
- Conservare la configurazione nel browser se possibile, gestendo l'assenza di localStorage. Il funzionamento e la riapertura non devono dipendere da quel salvataggio: build locale e riserva includono i preset e il JSON permette il recupero esplicito.
- Pulsanti con nomi visibili, campi etichettati, tabelle HTML accessibili e selettori stabili. Il computer use deve poter operare senza affidarsi soltanto alle coordinate di un canvas.
- In una vista di diagnostica facoltativa esporre configurazione, risultati e log in JSON. Durante la demo il computer use deve utilizzare i controlli visibili.

## 10. Costruzione e accettazione

Ordine di lavoro: motore e test numerici → scena completa con navigazione → selezione e pannelli collegati → S0–S3 → S4–S5 e confronto → import/export → qualità visiva e prestazioni → build locale offline e riserva 2D. La visita 3D e i pannelli sono requisiti del prodotto principale. Una dashboard 2D da sola non soddisfa questa versione del brief.

L'app è pronta solo quando:

- [ ] S0–S5 riproducono i riferimenti numerici e T1–T5 passano.
- [ ] Le metriche e le visualizzazioni provengono dal motore, senza numeri dimostrativi inseriti a mano.
- [ ] Modifiche ai parametri cambiano effettivamente calcoli e grafici.
- [ ] È possibile spiegare un risultato risalendo a lotti e consegne.
- [ ] Import/export, reset e confronto funzionano.
- [ ] Si può camminare nel birrificio, tornare alla vista generale e raggiungere i reparti con i pulsanti guidati.
- [ ] Collisioni, selezione, focus della camera, Esc e interazione con i campi funzionano senza conflitti.
- [ ] I pannelli dei macchinari modificano gli input reali e i loro stati coincidono con gli snapshot numerici.
- [ ] F5 compare in S3 e scompare tornando agli scenari senza quel serbatoio.
- [ ] Cambiare velocità di riproduzione o navigare non cambia i risultati numerici; una corsa vecchia non può sostituire il risultato di una più recente.
- [ ] La build 3D finale è stata avviata da una cartella pulita e utilizzata con rete disattivata, inclusi texture, font, modelli e worker.
- [ ] Prestazioni e leggibilità sono state misurate sul Mac effettivo con condivisione Teams; la modalità a qualità ridotta è utilizzabile.
- [ ] La riserva 2D funziona senza WebGL e produce gli stessi risultati dal medesimo motore.
- [ ] I comandi principali sono stati provati nel browser; sono dichiarate eventuali verifiche non eseguibili nell'ambiente disponibile.
- [ ] È consegnata una versione stabile separata dalla copia usata per modifiche live.

Possibili estensioni live: una vista più evidente “Who is late?”, un punto camera guidato o una modalità di ispezione che riusano dati e componenti già disponibili. Un solver di ottimizzazione, costi economici, supply chain completa, ricette reali e modelli probabilistici restano estensioni successive.

## 11. Comando breve per l'uso sul palco

> Prendi il file `05_BeerAI_COSTRUISCI_IL_SIMULATORE.md` e costruisci Brewery Control Room 3D nel progetto locale predisposto. Usa questi dati sintetici e queste regole, verifica i risultati e apri il birrificio nel browser. Voglio poter entrare, selezionare i macchinari e usare i loro pannelli. Poi lo useremo insieme per decidere se accettare l'ordine del Festival.

La preparazione deve produrre prima un birrificio 3D completo e collaudato. Per il palco, predisporre una copia separata con runtime, dipendenze e risorse già locali. Dichiarare esattamente al pubblico quali basi sono pronte e cosa viene effettivamente generato live. Non promettere che la generazione completa di codice, ambiente e risorse da zero avvenga entro i 13 minuti della scaletta: misurarlo in prova.

Se la ricostruzione completa richiede troppo tempo, mostrare il brief, affidare all'agente una costruzione delimitata nella copia predisposta e usare il birrificio stabile per il confronto. Una sequenza di modifiche reali al simulatore resta una demo di collaborazione, purché sia presentata come tale. La copia live non deve sovrascrivere la riserva.
