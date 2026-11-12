# BeerAI — Materiali per il coding agent

Aggiornato il 7 novembre 2026. Demo: 12 novembre 2026.

## Da dove partire

Il documento di costruzione è **05_BeerAI_COSTRUISCI_IL_SIMULATORE.md**, versione 2.0: contiene tutti i dati, le regole numeriche, i risultati di riferimento e i requisiti del birrificio 3D. È autosufficiente per sviluppare il simulatore.

Gli altri file di lavoro sono:

- **06_BeerAI_Scaletta_Demo_60min.md**: copione della demo, visita dei reparti e interazioni vocali.
- **07_BeerAI_Test_e_Piano_B.md**: collaudo, prove sul Mac, prestazioni con Teams e riserve da preparare.
- **fonti/FONTI_ORIGINALI.md**: collegamenti ai documenti originali dell'evento; i PDF non sono incorporati in questo pacchetto. Il precedente contesto generale non sostituisce le specifiche 3D aggiornate.

## Comando da dare al coding agent

> Leggi 05_BeerAI_COSTRUISCI_IL_SIMULATORE.md e costruisci qui Brewery Control Room 3D. Voglio poter camminare nel birrificio, selezionare i macchinari e aprire pannelli che modificano davvero la simulazione. Implementa il progetto locale completo, verifica i calcoli e le interazioni, aprilo nel browser e prepara una build offline con avvio semplice e riserva 2D. Usa la scaletta e la checklist per il collaudo. Procedi con le scelte tecniche necessarie e distingui chiaramente i test eseguiti da quelli ancora da provare.

## Punti fermi

- Applicazione locale React/TypeScript, scena Three.js/React Three Fiber, motore numerico separato.
- Ambiente 3D esplorabile, viste guidate, serbatoi selezionabili, pannelli operativi e F5 che compare nello scenario con serbatoio aggiuntivo.
- Tutti gli asset e i calcoli disponibili offline dopo la preparazione; il client dell'agente vocale resta un servizio esterno.
- I dati sono sintetici. La scena rappresenta gli stati del motore; nessuna metrica inserita a mano o animazione scollegata dai risultati.
- Prima costruire e collaudare una versione completa stabile; la ricostruzione e le modifiche live avvengono in una copia distinta.
- Tenere separate la logica numerica e la grafica, conservando il contratto e i riferimenti dei sei scenari nel brief.

## Stato alla consegna

Questo pacchetto contiene specifiche e materiali di preparazione. **Il codice del simulatore non è ancora stato realizzato.** Le caselle del piano di test sono da compilare solo dopo prove effettive.

I tre documenti numerati conservano i loro nomi per rendere semplici i comandi del copione. Creare il progetto e i relativi sorgenti nella cartella di lavoro del coding agent, mantenendo questi documenti come riferimento.
