# Roadmap — Julia (ricostruzione tracciata)

Assistente RAG per ricette di dolci, ricostruito da zero con storia Git pulita.
Ogni tappa = un commit.

## Stack
- Node.js
- Ollama in locale: `nomic-embed-text` (embedding) + `llama3.2:3b` (generazione)
- Dati: ricette dolci da GialloZafferano

## Tappe

- [x] 0. Setup: Node, .gitignore, README, repo su GitHub
- [x] 1. Scraper (`scraper.js`) → raccoglie le ricette in `recipes.json`

     **Cosa fa:** scarica la pagina categoria "Dolci-e-Desserts" di GialloZafferano,
     raccoglie i link delle singole ricette, e per ognuna estrae nome, ingredienti,
     tempi e istruzioni dal blocco JSON-LD (schema.org/Recipe) presente nella pagina.

     **Perché così:**
     - URL `Dolci-e-Desserts` e non `Dolci`: il vecchio URL categoria non esiste piu
       e reindirizzava a una pagina vuota.
     - Selettore basato sull'href (`ricette.giallozafferano.it/...html`) invece che
       sulla classe CSS: le classi del sito cambiano spesso e rompono lo scraper,
       mentre la struttura degli URL delle ricette e stabile.
     - Lettura dal JSON-LD invece del parsing dei singoli tag HTML: i dati sono gia
       strutturati e puliti, molto piu robusto che estrarre paragrafo per paragrafo.
     - Istruzioni prese dirette (`data.recipeInstructions`): nel JSON-LD sono un array
       di stringhe, non di oggetti, quindi niente `.map(step => step.text)`.
     - User-Agent negli header: senza, il sito risponde con un redirect e pagina vuota.
- - [x] 2. Stagionalita (`seasonality.js`) → deduce le stagioni dagli ingredienti

     **Cosa fa:** espone `deduciStagionalita(ingredienti)`, che scorre gli ingredienti
     di una ricetta e restituisce le stagioni associate, in base a una mappa
     frutto → stagioni definita a mano.

     **Perché così:**
     - Deduzione automatica invece di taggare 33 ricette a mano: si scrive una sola
       mappa (una ventina di frutti) e la stagionalita si calcola da sola, anche per
       ricette future.
     - Uso le radici delle parole (`aranc`, `limon`, `banan`) perche `.includes()`
       matcha sottostringhe: cosi prende sia singolare che plurale.
     - Ricette senza frutta stagionale restano con lista vuota = "adatta tutto l'anno",
       gestite dopo come "nessun vincolo".
- - [x] 3. Embeddings (`embed.js`) → testo ricette → vettori con nomic-embed-text

     **Cosa fa:** per ogni ricetta costruisce un testo (nome + ingredienti), lo manda
     a Ollama col modello `nomic-embed-text` che restituisce un embedding (vettore di
     768 numeri = significato del testo). Calcola anche la stagionalita e salva tutto
     in `embeddings.json`.

     **Ruolo di Ollama:** qui entra per la prima volta. Esegue il modello di embedding
     in locale, trasformando testo → vettori. Nessun servizio cloud, nessuna chiave API.

     **Perché così:**
     - Embedding su nome + ingredienti (non le istruzioni): le istruzioni sono lunghe e
       procedurali, "diluiscono" il significato e peggiorano la ricerca. Cosi il match
       avviene sugli ingredienti, che e cio che conta per cercare una ricetta.
     - `embeddings.json` e escluso da Git (.gitignore): e grosso e pieno di vettori
       illeggibili, si rigenera in un attimo con `node embed.js`.
     - Fase separata dallo scraping: se cambio il modo di fare gli embedding non devo
       rifare lo scraping, riparto da `recipes.json`.
- - [x] 4. Ricerca semantica (`search.js`) → similarita coseno query/ricette

     **Cosa fa:** trasforma la domanda dell'utente in embedding (via Ollama), calcola
     la similarita coseno con tutte le ricette, ordina e mostra le piu pertinenti.

     **Ruolo di Ollama:** genera l'embedding della domanda. Il confronto tra vettori
     (similarita coseno) e invece puro JavaScript.

     **Cosa dimostra (pregi e limiti):**
     - Pregio: trova ricette per SIGNIFICATO, non per parola esatta ("torta cioccolato
       veloce" trova i dolci al cioccolato giusti senza cercare le parole precise).
     - Limite: la semantica pura non applica vincoli precisi. Alla query "frutta estiva"
       mette in cima torte al cioccolato e la cheesecake ai frutti di bosco solo 4a: non
       "sa" cosa sia di stagione, anche se il dato esiste nel campo seasonality.
     - Questo limite e la MOTIVAZIONE della tappa 5: aggiungere filtri strutturati
       (stagione, tempo) sopra la ricerca semantica = RAG ibrido.
- [x] 5. RAG ibrido (`julia.js`) → filtri (stagione + tempo) + generazione con llama3.2

     **Cosa fa:** unisce tutto. Fa la ricerca semantica, applica i filtri strutturati,
     prende le migliori ricette e le passa a llama3.2:3b che genera la risposta di Julia.

     **Ruolo di Ollama:** due modelli. nomic-embed-text per l'embedding della domanda,
     llama3.2:3b per generare la risposta finale in linguaggio naturale.

     **I filtri (il "RAG ibrido"):**
     - Stagione (morbido): se la query nomina una stagione, tiene solo ricette di quella
       stagione o neutre (seasonality vuota). Non esclude i dolci "sempre validi".
     - Tempo: se la query dice "veloce", tiene solo ricette con preparazione <= 30 min.
       Si guarda prepTime (lavoro attivo), non la cottura (tempo passivo nel forno).

     **Difese anti-allucinazione (3 livelli):**
     - Prompt severo: "consiglia SOLO ricette dall'elenco, non inventare".
     - Temperatura 0.2: il modello e piu conservativo, si aggrappa al contesto reale.
     - Guardia zero-risultati: se i filtri non lasciano ricette, Julia lo dice e si ferma
       invece di ricevere un contesto vuoto e inventare.

     **Limite noto:** con un modello piccolo (3B) in locale l'allucinazione si riduce
     molto ma non sempre si azzera del tutto. Trade-off accettato per girare gratis
     e offline.
- [x] 6. Interfaccia web → server Express + pagina HTML

     **Cosa fa:** un server Express (`server.js`) espone la logica RAG su un endpoint
     web `/api/chiedi`, e serve una pagina (`public/`) con campo domanda, bottone e area
     risposta. L'utente scrive, il browser chiama il server, Julia risponde nella pagina.

     **Struttura (separazione delle responsabilita):**
     - `server.js` importa `chiediAJulia` da julia.js (nessuna duplicazione di logica).
     - julia.js rifattorizzato: `chiediAJulia(query)` riutilizzabile + `main()` per il
       terminale, lanciato solo se il file e eseguito direttamente (`require.main === module`).
     - Frontend diviso in tre file: index.html (struttura), style.css (stile), script.js (logica).

## Raffinamenti realizzati (dopo la tappa 6)
- Dataset ampliato: da 33 a 125 ricette, raccolte da piu sottocategorie di
  GialloZafferano (Torte, Biscotti, Cheesecakes, Gelati-e-Semifreddi, ecc.).
- Filtro esclusione ingredienti: `estraiEsclusioni()` rileva "senza/niente/no + ingrediente"
  (su una lista di ingredienti noti) e scarta le ricette che li contengono. Risolve
  richieste tipo "niente cioccolato".
- Prompt anti-allucinazione rafforzato: elenco esplicito dei nomi ammessi, divieto di
  inventare o di modificare/sostituire ingredienti, divieto di fingere memoria di
  ricerche precedenti. Bilanciato per proporre le ricette piu vicine quando esistono,
  e rifiutare solo quando davvero nessuna e pertinente.

## Sviluppi futuri
- Esclusioni combinate con negazione piu precisa (evitare falsi esclusi in frasi complesse).
- Mostrare all'utente i nomi reali delle ricette trovate accanto alla risposta (trasparenza).
- Modello piu grande per ridurre ulteriormente le imprecisioni residue del 3B.

## Concetto chiave
L'IA non e "addestrata" sulle ricette: i dati restano nei file e vengono
recuperati e passati al modello al momento della domanda (Retrieval-Augmented
Generation). Aggiungere ricette non richiede ri-addestramento.
