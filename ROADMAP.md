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
- [ ] 4. Ricerca semantica (`search.js`) → similarita coseno query/ricette
- [ ] 5. RAG ibrido (`julia.js`) → filtri (stagione + tempo) + generazione con llama3.2
       Guardia anti-allucinazione: prompt severo + stop su zero risultati
- [ ] 6. Interfaccia web → server Express + pagina HTML

## Concetto chiave
L'IA non e "addestrata" sulle ricette: i dati restano nei file e vengono
recuperati e passati al modello al momento della domanda (Retrieval-Augmented
Generation). Aggiungere ricette non richiede ri-addestramento.
